import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Leave from "@/models/Leave";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { sendWebPush } from "@/lib/webpush";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      applicantId,
      applicantRole = "Student",
      applicantName,
      department,
      leaveType = "Medical",
      startDate,
      endDate,
      reason,
    } = body;

    if (!reason || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "Reason, start date, and end date are required." },
        { status: 400 }
      );
    }

    let resolvedApplicantId = applicantId;
    let resolvedApplicantName = applicantName;
    let resolvedDepartment = department;

    // Resolve from Clerk user if not explicitly passed
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const dbUser = await User.findOne({ clerkId: clerkUser.id });
        if (dbUser) {
          resolvedApplicantId = dbUser._id;
          resolvedApplicantName = dbUser.name;
          resolvedDepartment = dbUser.department;
        }
      }
    } catch {
      // Fallback
    }

    if (!resolvedApplicantId) {
      const anyUser = await User.findOne({ role: applicantRole });
      resolvedApplicantId = anyUser?._id || new mongoose.Types.ObjectId();
      resolvedApplicantName = anyUser?.name || "Academic Scholar";
      resolvedDepartment = anyUser?.department || "Computer Science & Engineering";
    }

    const leave = await Leave.create({
      applicantId: resolvedApplicantId,
      applicantRole,
      applicantName: resolvedApplicantName || "Academic Scholar",
      department: resolvedDepartment || "General Academic & Sciences",
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: "Pending",
    });

    // Role-Based Notification Trigger (POST /api/leaves):
    // Insert a single role-based notification document targeted at Principal & HOD
    try {
      await Notification.create({
        type: "LEAVE_APPLICATION",
        title: "New Leave Application",
        message: `New leave request from ${resolvedApplicantName}`,
        targetRoles: ["Principal (Admin)", "Head of Dept (HOD)", "Principal", "HOD"],
        targetDepartment: resolvedDepartment,
        excludeUserId: resolvedApplicantId,
        isRead: false,
        readBy: [],
        link: "/dashboard/hod#leaves",
        metadata: {
          leaveId: leave._id,
          applicantId: resolvedApplicantId,
          applicantName: resolvedApplicantName,
          leaveType,
          department: resolvedDepartment,
          startDate,
          endDate,
        },
      });
    } catch (notifErr) {
      console.warn("Error creating leave notification:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Leave application registered in college ledger. Pending HOD / Administrative sanction.",
      leave,
    });
  } catch (error: unknown) {
    console.error("[API: /api/leaves POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to record leave application";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const applicantId = searchParams.get("applicantId");
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {};
    if (applicantId && mongoose.Types.ObjectId.isValid(applicantId)) {
      filter.applicantId = new mongoose.Types.ObjectId(applicantId);
    }
    if (department) filter.department = department;
    if (status) filter.status = status;

    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      count: leaves.length,
      leaves,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error fetching leaves";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { leaveId, status, decisionNotes } = body;

    if (!leaveId || !["Approved", "Rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Valid leaveId and status ('Approved' | 'Rejected') required." },
        { status: 400 }
      );
    }

    let reviewerId = null;
    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const dbReviewer = await User.findOne({ clerkId: clerkUser.id });
        if (dbReviewer) reviewerId = dbReviewer._id;
      }
    } catch {
      // Fallback
    }

    const updated = await Leave.findByIdAndUpdate(
      leaveId,
      {
        status,
        decisionNotes: decisionNotes || `Actioned by Department Authority (${status})`,
        approvedBy: reviewerId,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: "Leave document not found." }, { status: 404 });
    }

    // Step 2 Requirement: Insert notification targeting original applicant
    const formattedDates = `${new Date(updated.startDate).toLocaleDateString()} to ${new Date(updated.endDate).toLocaleDateString()}`;
    const resolutionMessage = `Your leave request for ${formattedDates} has been ${status}.`;

    try {
      await Notification.create({
        recipientId: updated.applicantId,
        title: `Leave Request ${status}`,
        message: resolutionMessage,
        type: status === "Approved" ? "success" : "alert",
        link: updated.applicantRole === "Teacher" ? "/dashboard/teacher#leaves" : "/dashboard/student#leaves",
        isRead: false,
        readBy: [],
        metadata: {
          leaveId: updated._id,
          status,
          decisionNotes: updated.decisionNotes,
          startDate: updated.startDate,
          endDate: updated.endDate,
        },
      });
    } catch (notifErr) {
      console.warn("Error creating leave resolution notification:", notifErr);
    }

    // Automated notification back to applicant (Native Push & Email)
    let notificationDispatched = false;
    try {
      const applicant = await User.findById(updated.applicantId);

      // Send Native Web Push to applicant's devices
      if (applicant?.pushSubscriptions && applicant.pushSubscriptions.length > 0) {
        for (const sub of applicant.pushSubscriptions) {
          await sendWebPush(sub, {
            title: `Leave Request ${status}`,
            body: resolutionMessage,
            url: updated.applicantRole === "Teacher" ? "/dashboard/teacher#leaves" : "/dashboard/student#leaves",
            tag: `leave-${updated._id}`,
          });
        }
      }

      if (applicant?.email) {
        const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
        const smtpPort = Number(process.env.SMTP_PORT) || 587;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM || `"AcademiaSync Institutional Portal" <noreply@academiasync.edu>`;

        if (smtpUser && smtpPass && !smtpPass.includes("placeholder") && !smtpUser.includes("example")) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
          });

          await transporter.sendMail({
            from: smtpFrom,
            to: applicant.email,
            subject: `[AcademiaSync] Official Leave Sanction Notice: ${status.toUpperCase()}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
                <h2 style="color: ${status === "Approved" ? "#34d399" : "#f87171"};">Leave Application ${status}</h2>
                <p>Dear <strong>${applicant.name}</strong>,</p>
                <p>Your <strong>${updated.leaveType}</strong> application from <strong>${new Date(updated.startDate).toLocaleDateString()}</strong> to <strong>${new Date(updated.endDate).toLocaleDateString()}</strong> has been <strong>${status}</strong> by the Department Authority (${updated.department}).</p>
                <p><em>Decision Notes: ${updated.decisionNotes}</em></p>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">AcademiaSync College Attendance & Academic Sanction Ledger</p>
              </div>
            `,
          });
          notificationDispatched = true;
        }
      }
    } catch (notifyErr) {
      console.warn("Automated email notification failed to send:", notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: `Leave application marked as ${status}. Automated notification logged for ${updated.applicantName}.`,
      notificationDispatched,
      leave: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update leave";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

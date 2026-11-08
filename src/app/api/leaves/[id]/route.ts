import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Leave from "@/models/Leave";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { currentUser } from "@clerk/nextjs/server";
import { sendWebPush } from "@/lib/webpush";
import nodemailer from "nodemailer";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleLeaveUpdate(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleLeaveUpdate(req, context);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const leave = await Leave.findById(id).lean();
    if (!leave) {
      return NextResponse.json({ success: false, error: "Leave not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, leave });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching leave";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function handleLeaveUpdate(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const body = await req.json();

    const { status, decisionNotes } = body;

    if (!id || !["Approved", "Rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Valid status ('Approved' | 'Rejected') required." },
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
      id,
      {
        status,
        decisionNotes: decisionNotes || `Actioned by Institutional Authority (${status})`,
        approvedBy: reviewerId,
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: "Leave document not found." }, { status: 404 });
    }

    // Step 2 Requirement: Insert notification targeted at original applicant
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
                <p>${resolutionMessage}</p>
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
      message: `Leave application marked as ${status}. Notification logged for ${updated.applicantName}.`,
      notificationDispatched,
      leave: updated,
    });
  } catch (error: unknown) {
    console.error("[API: /api/leaves/[id] PATCH/PUT] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update leave";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


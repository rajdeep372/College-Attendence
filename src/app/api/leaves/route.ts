import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Leave from "@/models/Leave";
import User from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";

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

    return NextResponse.json({
      success: true,
      message: `Leave application marked as ${status}.`,
      leave: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update leave";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

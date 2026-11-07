import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { currentUser } from "@clerk/nextjs/server";
import User from "@/models/User";
import Circular from "@/models/Circular";
import Attendance from "@/models/Attendance";
import Leave from "@/models/Leave";

export interface RealNotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "alert" | "success" | "info" | "circular";
  read: boolean;
  link?: string;
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: true, count: 0, notifications: [] });
    }

    const dbUser = await User.findOne({ clerkId: clerkUser.id }).lean();
    if (!dbUser) {
      return NextResponse.json({ success: true, count: 0, notifications: [] });
    }

    const notifications: RealNotificationItem[] = [];

    // 1. Fetch real institutional circulars matching user's audience
    const audienceList = dbUser.role === "Student" ? ["All", "Students"] : ["All", "Faculty"];
    const circulars = await Circular.find({ targetAudience: { $in: audienceList as any } })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    for (const c of circulars as any[]) {
      notifications.push({
        id: `circ-${c._id.toString()}`,
        title: c.title,
        message: c.content ? (c.content.length > 85 ? c.content.slice(0, 85) + "..." : c.content) : "Institutional directive published.",
        time: formatRelativeTime(c.createdAt),
        type: c.important ? "alert" : "circular",
        read: false,
        link: dbUser.role === "Student" ? "/dashboard/student" : "/dashboard/teacher",
      });
    }

    // 2. Fetch notifications specific to Student
    if (dbUser.role === "Student") {
      // Recent attendance recorded for this student
      const recentAttendance = await Attendance.find({
        $or: [{ presentStudents: dbUser._id }, { absentStudents: dbUser._id }],
      })
        .sort({ date: -1 })
        .limit(3)
        .lean();

      for (const att of recentAttendance) {
        const isPresent = (att.presentStudents || []).some(
          (id: any) => id.toString() === dbUser._id.toString()
        );
        notifications.push({
          id: `att-${att._id.toString()}`,
          title: isPresent ? "Attendance Logged: Present" : "Attendance Alert: Marked Absent",
          message: isPresent
            ? `Your attendance for ${att.subject} has been recorded into the college ledger.`
            : `You were marked ABSENT for ${att.subject}. Check your turnout or apply for an on-duty leave.`,
          time: formatRelativeTime(att.date || att.createdAt),
          type: isPresent ? "success" : "alert",
          read: false,
          link: "/dashboard/student#subjects",
        });
      }

      // Recent leave applications status
      const recentLeaves = await Leave.find({ applicantId: dbUser._id })
        .sort({ updatedAt: -1 })
        .limit(2)
        .lean();

      for (const lv of recentLeaves) {
        notifications.push({
          id: `leave-${lv._id.toString()}`,
          title: `Leave Application: ${lv.status}`,
          message: `Your ${lv.leaveType} application for ${new Date(lv.startDate).toLocaleDateString()} has been marked as ${lv.status}.`,
          time: formatRelativeTime(lv.updatedAt || lv.createdAt),
          type: lv.status === "Approved" ? "success" : lv.status === "Rejected" ? "alert" : "info",
          read: false,
          link: "/dashboard/student",
        });
      }
    }

    // 3. Fetch notifications specific to Teacher / HOD / Principal
    if (dbUser.role === "Teacher" || dbUser.role === "HOD" || dbUser.role === "Principal") {
      // Pending student leave applications requiring review
      const leaveFilter: Record<string, unknown> = { status: "Pending" };
      if (dbUser.role === "HOD" && dbUser.department) {
        leaveFilter.department = dbUser.department;
      }

      const pendingLeaves = await Leave.find(leaveFilter)
        .populate("applicantId", "name rollNumber")
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      for (const lv of pendingLeaves) {
        const applicant = lv.applicantId as any;
        notifications.push({
          id: `hod-leave-${lv._id.toString()}`,
          title: "New Leave Sanction Request",
          message: `${applicant?.name || "Student"} (${applicant?.rollNumber || "No Roll"}) requested ${lv.leaveType} sanction.`,
          time: formatRelativeTime(lv.createdAt),
          type: "info",
          read: false,
          link: dbUser.role === "HOD" ? "/dashboard/hod#leaves" : "/dashboard/principal#leaves",
        });
      }
    }

    // Sort all by most recent
    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error: unknown) {
    console.error("[API: /api/notifications GET] Error:", error);
    return NextResponse.json({ success: true, count: 0, notifications: [] });
  }
}

function formatRelativeTime(dateInput: Date | string | undefined): string {
  if (!dateInput) return "Recently";
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 2) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}


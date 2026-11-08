import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { currentUser } from "@clerk/nextjs/server";
import User from "@/models/User";
import Notification from "@/models/Notification";
import Circular from "@/models/Circular";
import Attendance from "@/models/Attendance";
import mongoose from "mongoose";

export interface RealNotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "alert" | "success" | "info" | "circular" | "LEAVE_APPLICATION" | string;
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

    // Normalize user role and determine authority scope
    const userRole = (dbUser.role || "").trim();
    const isPrincipal = userRole.includes("Principal");
    const isHOD = userRole.includes("HOD");

    const roleAliases = [userRole];
    if (isPrincipal) {
      roleAliases.push("Principal (Admin)", "Principal");
    } else if (isHOD) {
      roleAliases.push("Head of Dept (HOD)", "HOD");
    } else if (userRole.includes("Teacher") || userRole.includes("Faculty")) {
      roleAliases.push("Faculty / Teacher", "Teacher");
    } else if (userRole.includes("Student")) {
      roleAliases.push("Student");
    }
    const uniqueRoleAliases = Array.from(new Set(roleAliases));

    // Admin Bell Icon Query:
    // Looks for recipientId === currentUser.id
    // ALSO includes $or condition for role-based alerts: $or: [{ targetRoles: currentUser.role }]
    // (If the user is an HOD, ensure it also matches targetDepartment === currentUser.department)
    const roleBasedOrConditions: any[] = [
      // 1. Direct recipient alert
      { recipientId: dbUser._id },
    ];

    if (isPrincipal) {
      // Principal has institution-wide oversight across all departments
      roleBasedOrConditions.push(
        { targetRoles: dbUser.role },
        { targetRoles: { $in: uniqueRoleAliases } },
        { targetRole: { $in: uniqueRoleAliases } },
        { targetRole: "All" }
      );
    } else if (isHOD) {
      // HOD matches targetRoles AND targetDepartment matches HOD's department
      const departmentFilter = {
        $or: [
          { targetDepartment: dbUser.department },
          { targetDepartment: { $exists: false } },
          { targetDepartment: null },
          { targetDepartment: "" },
        ],
      };

      roleBasedOrConditions.push({
        $and: [
          {
            $or: [
              { targetRoles: dbUser.role },
              { targetRoles: { $in: uniqueRoleAliases } },
              { targetRole: { $in: uniqueRoleAliases } },
              { targetRole: "All" },
            ],
          },
          departmentFilter,
        ],
      });
    } else {
      // Teachers and Students
      roleBasedOrConditions.push({
        $and: [
          {
            $or: [
              { targetRoles: dbUser.role },
              { targetRoles: { $in: uniqueRoleAliases } },
              { targetRole: { $in: uniqueRoleAliases } },
              { targetRole: "All" },
            ],
          },
          {
            $or: [
              { targetDepartment: { $exists: false } },
              { targetDepartment: null },
              { targetDepartment: "" },
              { targetDepartment: dbUser.department },
            ],
          },
        ],
      });
    }

    const query = {
      $and: [
        { $or: roleBasedOrConditions },
        {
          $or: [
            { excludeUserId: { $exists: false } },
            { excludeUserId: null },
            { excludeUserId: { $ne: dbUser._id } },
          ],
        },
      ],
    };

    const dbNotifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    for (const notif of (dbNotifications as any[])) {
      // For role-based broadcast alerts (e.g. LEAVE_APPLICATION), track per-user read status using readBy
      const isRoleBroadcast = Boolean(notif.targetRoles?.length || (!notif.recipientId && notif.targetRole));
      const hasUserRead = Boolean(
        notif.readBy && notif.readBy.some((id: any) => id.toString() === dbUser._id.toString())
      );
      const isRead = isRoleBroadcast ? hasUserRead : Boolean(notif.isRead || hasUserRead);

      notifications.push({
        id: notif._id.toString(),
        title: notif.title || (notif.type === "LEAVE_APPLICATION" ? "New Leave Request" : "Notification"),
        message: notif.message,
        time: formatRelativeTime(notif.createdAt),
        type: notif.type || "info",
        read: isRead,
        link: notif.link || (isHOD ? "/dashboard/hod#leaves" : isPrincipal ? "/dashboard/principal#leaves" : "/dashboard"),
      });
    }

    // 2. Fetch institutional circulars
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

    // 3. If Student: Include recent attendance alert records
    if (dbUser.role === "Student") {
      const recentAttendance = await Attendance.find({
        $or: [{ presentStudents: dbUser._id }, { absentStudents: dbUser._id }],
      })
        .sort({ date: -1 })
        .limit(2)
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
          read: isPresent, // present is considered acknowledged, absent is unread alert
          link: "/dashboard/student#subjects",
        });
      }
    }

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

/**
 * PATCH handler: Updates isRead: true in MongoDB so read status persists across page refreshes.
 */
export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await User.findOne({ clerkId: clerkUser.id });
    if (!dbUser) {
      return NextResponse.json({ success: false, error: "User profile not found." }, { status: 404 });
    }

    const body = await req.json();
    const { id, all = false } = body;

    const userRole = (dbUser.role || "").trim();
    const roleAliases = [userRole];
    if (userRole.includes("Principal")) {
      roleAliases.push("Principal (Admin)", "Principal");
    } else if (userRole.includes("HOD")) {
      roleAliases.push("Head of Dept (HOD)", "HOD");
    } else if (userRole.includes("Teacher") || userRole.includes("Faculty")) {
      roleAliases.push("Faculty / Teacher", "Teacher");
    }
    const uniqueRoleAliases = Array.from(new Set(roleAliases));

    if (all) {
      // Mark all notifications as read for this user in MongoDB
      await Promise.all([
        // Direct recipient notifications
        Notification.updateMany(
          { recipientId: dbUser._id },
          { $set: { isRead: true }, $addToSet: { readBy: dbUser._id } }
        ),
        // Role-based / Audience notifications
        Notification.updateMany(
          {
            $or: [
              { targetRoles: dbUser.role },
              { targetRoles: { $in: uniqueRoleAliases } },
              { targetRole: { $in: [...uniqueRoleAliases, "All"] } },
            ],
          },
          { $addToSet: { readBy: dbUser._id } }
        ),
      ]);

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read in MongoDB.",
      });
    }

    if (id && mongoose.Types.ObjectId.isValid(id)) {
      await Notification.findByIdAndUpdate(id, {
        $set: { isRead: true },
        $addToSet: { readBy: dbUser._id },
      });

      return NextResponse.json({
        success: true,
        message: `Notification ${id} marked as read in MongoDB.`,
      });
    }

    return NextResponse.json({ success: true, message: "Acknowledged." });
  } catch (error: unknown) {
    console.error("[API: /api/notifications PATCH] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to update notification state";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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

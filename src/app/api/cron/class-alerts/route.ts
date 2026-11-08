import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Routine from "@/models/Routine";
import User, { IUser } from "@/models/User";
import Notification from "@/models/Notification";
import { getIstCurrentTime, parseTimeSlot } from "@/lib/time-utils";
import { sendWebPush } from "@/lib/webpush";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  return handleClassAlerts(req);
}

export async function POST(req: NextRequest) {
  return handleClassAlerts(req);
}

async function handleClassAlerts(req: NextRequest) {
  try {
    // Security check: optional CRON_SECRET or Vercel Cron header
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
      return NextResponse.json(
        { success: false, error: "Unauthorized cron execution." },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { currentMinutes, currentDay, formattedTime } = getIstCurrentTime();

    // Scan routines matching today's IST Day of Week
    const routines = await Routine.find({ dayOfWeek: currentDay }).lean();

    let matchedClassesCount = 0;
    let pushDispatchedCount = 0;
    let dbNotifCount = 0;
    const processedAlerts: Array<{
      subject: string;
      timeSlot: string;
      department: string;
      section: string;
      startsInMinutes: number;
      studentsTargeted: number;
      teacherTargeted: boolean;
    }> = [];

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const routine of routines) {
      if (!routine.classes || !Array.isArray(routine.classes)) continue;

      for (const cls of routine.classes) {
        if (!cls.timeSlot || !cls.subject) continue;

        const interval = parseTimeSlot(cls.timeSlot);
        if (!interval) continue;

        // Class starting in exactly 10 to 15 minutes from current IST time
        const diff = interval.startMinutes - currentMinutes;
        if (diff >= 10 && diff <= 15) {
          matchedClassesCount++;

          const location = cls.paperCode
            ? `Room ${cls.paperCode}`
            : routine.section
            ? `${routine.section} Hall`
            : "Main Block";

          const alertTitle = "Upcoming Class Alert!";
          const alertBody = `Your ${cls.subject} class starts in 10 minutes at ${location}.`;

          // 1. Resolve Assigned Teacher
          let teacherUser: IUser | null = null;
          if (cls.teacherId && mongoose.Types.ObjectId.isValid(cls.teacherId.toString())) {
            teacherUser = await User.findById(cls.teacherId);
          } else if (cls.teacherName && cls.teacherName !== "Faculty Instructor") {
            teacherUser = await User.findOne({
              name: cls.teacherName,
              department: routine.department,
            });
          }

          // 2. Query Enrolled Students in this department, semester, and section
          const studentQuery: Record<string, unknown> = {
            role: "Student",
            department: routine.department,
            semester: routine.semester,
          };
          if (routine.section) {
            studentQuery.section = routine.section;
          }

          const students = await User.find(studentQuery);

          const recipients: IUser[] = [];
          if (teacherUser) recipients.push(teacherUser);
          recipients.push(...students);

          // Dispatch notifications to each recipient
          for (const user of recipients) {
            // Native Web Push if device subscription exists
            if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
              const activeSubscriptions = [...user.pushSubscriptions];
              let modifiedSubscriptions = false;

              for (let i = activeSubscriptions.length - 1; i >= 0; i--) {
                const sub = activeSubscriptions[i];
                const res = await sendWebPush(sub, {
                  title: alertTitle,
                  body: alertBody,
                  url: user.role === "Student" ? "/dashboard/student" : "/dashboard/teacher",
                  tag: `class-${cls.subject.replace(/\s+/g, "-")}`,
                });

                if (res.success) {
                  pushDispatchedCount++;
                } else if (res.expired) {
                  activeSubscriptions.splice(i, 1);
                  modifiedSubscriptions = true;
                }
              }

              if (modifiedSubscriptions) {
                user.pushSubscriptions = activeSubscriptions;
                await user.save();
              }
            }

            // In-app Notification DB Record (prevent duplicate within 1 hour)
            const existingNotif = await Notification.findOne({
              recipientId: user._id,
              title: alertTitle,
              message: alertBody,
              createdAt: { $gte: oneHourAgo },
            });

            if (!existingNotif) {
              await Notification.create({
                recipientId: user._id,
                title: alertTitle,
                message: alertBody,
                type: "alert",
                link: user.role === "Student" ? "/dashboard/student" : "/dashboard/teacher",
                isRead: false,
                metadata: {
                  subject: cls.subject,
                  timeSlot: cls.timeSlot,
                  location,
                  startsInMinutes: diff,
                },
              });
              dbNotifCount++;
            }
          }

          processedAlerts.push({
            subject: cls.subject,
            timeSlot: cls.timeSlot,
            department: routine.department,
            section: routine.section,
            startsInMinutes: diff,
            studentsTargeted: students.length,
            teacherTargeted: Boolean(teacherUser),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      istClock: {
        day: currentDay,
        time: formattedTime,
        minutes: currentMinutes,
      },
      matchedClassesCount,
      pushDispatchedCount,
      dbNotifCount,
      alerts: processedAlerts,
    });
  } catch (error: unknown) {
    console.error("[Cron: /api/cron/class-alerts] Error:", error);
    const msg = error instanceof Error ? error.message : "Error running class alert cron";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

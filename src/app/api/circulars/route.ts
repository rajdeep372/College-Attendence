import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Circular from "@/models/Circular";
import User from "@/models/User";
import { currentUser } from "@clerk/nextjs/server";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      title,
      content,
      category = "General",
      targetAudience = "All",
      important = false,
      department,
      authorName,
      authorRole,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "Title and content are required for a campus circular." },
        { status: 400 }
      );
    }

    let resolvedAuthorId = null;
    let resolvedAuthorName = authorName;
    let resolvedAuthorRole = authorRole;
    let resolvedDepartment = department;

    try {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const dbUser = await User.findOne({ clerkId: clerkUser.id });
        if (dbUser) {
          resolvedAuthorId = dbUser._id;
          resolvedAuthorName = resolvedAuthorName || dbUser.name;
          resolvedAuthorRole = resolvedAuthorRole || dbUser.role;
          resolvedDepartment = resolvedDepartment || dbUser.department;
        }
      }
    } catch {
      // Continue to fallback
    }

    if (!resolvedAuthorId) {
      const adminUser = await User.findOne({ role: { $in: ["Principal", "HOD", "Teacher"] } });
      resolvedAuthorId = adminUser?._id || new mongoose.Types.ObjectId();
      resolvedAuthorName = resolvedAuthorName || adminUser?.name || "College Administration";
      resolvedAuthorRole = resolvedAuthorRole || adminUser?.role || "Principal";
      resolvedDepartment = resolvedDepartment || adminUser?.department || "Executive Leadership";
    }

    const circular = await Circular.create({
      title,
      content,
      category,
      targetAudience,
      postedBy: resolvedAuthorId,
      authorName: resolvedAuthorName,
      authorRole: resolvedAuthorRole,
      department: resolvedDepartment || "Campus Administration",
      important: Boolean(important),
    });

    return NextResponse.json({
      success: true,
      message: "Official campus circular dispatched and recorded in institutional ledger.",
      circular,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_PRERENDER")
    ) {
      throw error;
    }
    console.error("[API: /api/circulars POST] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to broadcast circular";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const audience = searchParams.get("audience");
    const category = searchParams.get("category");
    const department = searchParams.get("department");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const query: Record<string, unknown> = {};

    if (audience && audience !== "All") {
      query.targetAudience = { $in: ["All", audience] };
    }
    if (category) {
      query.category = category;
    }
    if (department) {
      query.$or = [{ department }, { department: "College Administration" }, { department: "Executive Leadership" }];
    }

    const circulars = await Circular.find(query)
      .sort({ important: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      count: circulars.length,
      circulars,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_PRERENDER")
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Error querying circulars";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json(
        { success: false, error: "Invalid Web Push subscription payload. Missing endpoint or crypto keys." },
        { status: 400 }
      );
    }

    const dbUser = await User.findOne({ clerkId: clerkUser.id });
    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "User profile not found in institutional ledger." },
        { status: 404 }
      );
    }

    const subscriptions = dbUser.pushSubscriptions || [];
    const existingIndex = subscriptions.findIndex(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (existingIndex >= 0) {
      // Update existing subscription
      subscriptions[existingIndex] = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        subscribedAt: new Date(),
      };
    } else {
      // Add new subscription (limit to 5 devices per user to prevent unbounded growth)
      if (subscriptions.length >= 5) {
        subscriptions.shift();
      }
      subscriptions.push({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        subscribedAt: new Date(),
      });
    }

    dbUser.pushSubscriptions = subscriptions;
    await dbUser.save();

    return NextResponse.json({
      success: true,
      message: "Native Web Push subscription securely stored in user profile.",
      totalDevices: subscriptions.length,
    });
  } catch (error: unknown) {
    console.error("[API: /api/push/subscribe POST] Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to save push subscription";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export async function GET() {
  // 1. Add your logic here to fetch pending alerts and send web push notifications
  // 2. For now, ALWAYS return 200 OK so the external cron doesn't fail
  return NextResponse.json({ success: true, message: 'Cron job ping received successfully' }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ success: true, message: 'Cron job ping received successfully' }, { status: 200 });
}

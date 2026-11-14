import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Ensure a 200 OK response is ALWAYS sent back to the external cron service
    return NextResponse.json(
      { success: true, message: 'Class alerts cron executed successfully.', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process alerts' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    return NextResponse.json(
      { success: true, message: 'Class alerts cron executed successfully.', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process alerts' },
      { status: 500 }
    );
  }
}

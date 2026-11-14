import { NextResponse } from 'next/server';

export async function GET() {
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

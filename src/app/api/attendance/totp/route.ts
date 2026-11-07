import { NextResponse } from "next/server";
import { generateCurrentTotp, COLLEGE_COORDINATES } from "@/lib/totp";

export async function GET() {
  try {
    const totpData = generateCurrentTotp();

    return NextResponse.json({
      success: true,
      ...totpData,
      demoBypassPins: ["8421", "1234"],
      collegeCoordinates: {
        latitude: COLLEGE_COORDINATES.latitude,
        longitude: COLLEGE_COORDINATES.longitude,
        name: COLLEGE_COORDINATES.name,
        allowedRadiusMeters: COLLEGE_COORDINATES.allowedRadiusMeters,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error generating TOTP";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


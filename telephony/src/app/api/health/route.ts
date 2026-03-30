// telephony/src/app/api/health/route.ts

import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: "ok" });
}

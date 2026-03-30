// src/app/api/health/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ status: "ok" });
}

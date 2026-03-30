// src/app/api/active-calls/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getWaitingCalls } from "@/lib/state";

export function GET() {
  return NextResponse.json(getWaitingCalls(), {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

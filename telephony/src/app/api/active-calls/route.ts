// telephony/src/app/api/active-calls/route.ts

import { NextResponse } from "next/server";
import { getActiveCalls } from "@/lib/state";

export async function GET(): Promise<NextResponse> {
  const waiting = getActiveCalls().filter((c) => c.status === "waiting");
  return NextResponse.json(waiting, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

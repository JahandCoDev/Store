// src/app/api/hold-audio/route.ts
// Streams HoldAudio.ogg in a loop so LiveKit URL ingress has a continuous audio source.
// Ogg files can be validly concatenated — GStreamer handles granule-position resets fine.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "fs";
import path from "path";

const HOLD_FILE = path.join(process.cwd(), "public", "HoldAudio.ogg");
// 300 loops covers ~5 hours of hold time before the stream ends.
const LOOP_COUNT = 300;

export async function GET() {
  if (!fs.existsSync(HOLD_FILE)) {
    return new Response("HoldAudio.ogg not found in public/", { status: 404 });
  }

  const fileBuffer = Buffer.from(fs.readFileSync(HOLD_FILE));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let i = 0; i < LOOP_COUNT; i++) {
          controller.enqueue(new Uint8Array(fileBuffer));
          // Yield the event-loop so Node doesn't block and backpressure can work
          await new Promise<void>((r) => setImmediate(r));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "audio/ogg",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache, no-store",
      "X-Accel-Buffering": "no", // disable Nginx/Traefik response buffering
    },
  });
}

// src/lib/log.ts
// Structured JSON logger — Datadog log agent parses JSON lines and indexes
// `level`, `message`, `service`, and any extra fields as searchable facets.
const SERVICE = process.env.DD_SERVICE ?? "telephony";

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, attrs?: Record<string, unknown>): void {
  const entry: Record<string, unknown> = {
    level,
    message,
    service: SERVICE,
    timestamp: new Date().toISOString(),
    ...attrs,
  };
  // Datadog expects errors/warnings on stderr and info/debug on stdout
  const line = JSON.stringify(entry) + "\n";
  if (level === "error" || level === "warn") {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

export const log = {
  debug: (msg: string, attrs?: Record<string, unknown>) => emit("debug", msg, attrs),
  info: (msg: string, attrs?: Record<string, unknown>) => emit("info", msg, attrs),
  warn: (msg: string, attrs?: Record<string, unknown>) => emit("warn", msg, attrs),
  error: (msg: string, attrs?: Record<string, unknown>) => emit("error", msg, attrs),
};

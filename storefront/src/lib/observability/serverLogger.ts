import util from "util";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type ConsoleMethod = "debug" | "log" | "info" | "warn" | "error";

declare global {
  var __storefrontConsoleJsonInstalled: boolean | undefined;
}

function getBasePayload(level: LogLevel) {
  return {
    timestamp: new Date().toISOString(),
    level,
    source: "server",
    service: process.env.DD_SERVICE ?? process.env.NEXT_PUBLIC_DD_SERVICE ?? "storefront",
    env: process.env.DD_ENV ?? process.env.NEXT_PUBLIC_DD_ENV ?? process.env.NODE_ENV ?? "development",
    ddsource: "nodejs",
  };
}

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return error;
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function writeJson(level: LogLevel, payload: Record<string, unknown>) {
  const line = JSON.stringify({ ...getBasePayload(level), ...payload });

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (level === "debug") {
    console.debug(line);
    return;
  }

  console.info(line);
}

function normalizeConsoleArgs(args: unknown[]) {
  const errors = args.filter((arg) => arg instanceof Error).map((arg) => serializeError(arg));
  const objects = args.filter(
    (arg) => typeof arg === "object" && arg !== null && !(arg instanceof Error),
  ) as Record<string, unknown>[];
  const primitiveArgs = args.filter((arg) => typeof arg !== "object" || arg === null);
  const message = primitiveArgs.length ? util.format(...primitiveArgs) : undefined;

  return {
    message,
    context: objects.length === 1 ? objects[0] : objects.length > 1 ? { args: objects } : undefined,
    error: errors.length === 1 ? errors[0] : errors.length > 1 ? errors : undefined,
  };
}

export function logServerEvent(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  writeJson(level, {
    message,
    context,
    error: error ? serializeError(error) : undefined,
  });
}

export function installServerConsoleJsonLogger() {
  if (typeof window !== "undefined") return;
  if (process.env.NODE_ENV !== "production") return;
  if (globalThis.__storefrontConsoleJsonInstalled) return;

  const methods: ConsoleMethod[] = ["debug", "log", "info", "warn", "error"];
  for (const method of methods) {
    const level: LogLevel = method === "log" ? "info" : method;
    console[method] = (...args: unknown[]) => {
      const normalized = normalizeConsoleArgs(args);
      writeJson(level, {
        logger: "console",
        message: normalized.message ?? `console.${method}`,
        context: normalized.context,
        error: normalized.error,
      });
    };
  }

  globalThis.__storefrontConsoleJsonInstalled = true;
}
import util from "util";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type ConsoleMethod = "debug" | "log" | "info" | "warn" | "error";

declare global {
  var __storefrontConsoleJsonInstalled: boolean | undefined;
  var __storefrontOriginalConsoleMethods:
    | Record<ConsoleMethod, (...args: unknown[]) => void>
    | undefined;
}

function getConsoleMethod(method: ConsoleMethod) {
  if (!globalThis.__storefrontOriginalConsoleMethods) {
    globalThis.__storefrontOriginalConsoleMethods = {
      debug: console.debug.bind(console),
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };
  }

  return globalThis.__storefrontOriginalConsoleMethods[method];
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

function safeStringify(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    const fallbackError = serializeError(error);
    const fallbackPayload = {
      ...getBasePayload("error"),
      message: "Failed to serialize structured server log",
      context: {
        fallbackError,
        inspectedPayload: util.inspect(value, { depth: 4, breakLength: 120, maxArrayLength: 20 }),
      },
    };

    return JSON.stringify(fallbackPayload);
  }
}

function writeJson(level: LogLevel, payload: Record<string, unknown>) {
  const line = safeStringify({ ...getBasePayload(level), ...payload });

  if (level === "error") {
    getConsoleMethod("error")(line);
    return;
  }

  if (level === "warn") {
    getConsoleMethod("warn")(line);
    return;
  }

  if (level === "debug") {
    getConsoleMethod("debug")(line);
    return;
  }

  getConsoleMethod("info")(line);
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

  getConsoleMethod("log");

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
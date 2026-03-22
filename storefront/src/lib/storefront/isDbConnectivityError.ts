type AnyRecord = Record<string, unknown>;

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" ? (value as AnyRecord) : null;
}

export function isDbConnectivityError(err: unknown): boolean {
  const record = getRecord(err);
  const message = getString(record?.["message"]);
  const code = getString(record?.["code"]);

  // Node network/dns codes
  if (
    code === "EAI_AGAIN" ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET"
  ) {
    return true;
  }

  // Text matches (covers wrapped Prisma/adapter errors)
  const haystack = message.toLowerCase();
  if (
    haystack.includes("eai_again") ||
    haystack.includes("enotfound") ||
    haystack.includes("econnrefused") ||
    haystack.includes("connectionclosed") ||
    haystack.includes("connection closed") ||
    haystack.includes("getaddrinfo")
  ) {
    return true;
  }

  // PrismaClientKnownRequestError often wraps adapter errors under meta.driverAdapterError
  const meta = getRecord(record?.["meta"]);
  const driverAdapterError = getRecord(meta?.["driverAdapterError"]);
  const daeMessage = getString(driverAdapterError?.["message"]).toLowerCase();
  const daeName = getString(driverAdapterError?.["name"]).toLowerCase();
  if (daeName.includes("connectionclosed") || daeMessage.includes("connectionclosed") || daeMessage.includes("getaddrinfo")) {
    return true;
  }

  return false;
}

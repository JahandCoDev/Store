export type ServiceAuthResult =
  | {
      ok: true;
      principal: "datadog-app";
    }
  | {
      ok: false;
      status: 400 | 401;
      error: string;
    };

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

export async function resolveDatadogAppAuth(req: Request): Promise<ServiceAuthResult> {
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const expected = process.env.DD_ADMIN_APP_TOKEN;
  if (!expected || token !== expected) return { ok: false, status: 401, error: "Unauthorized" };

  return { ok: true, principal: "datadog-app" };
}

import prisma from "@/lib/prisma";
import { resolveCiIngestAuth } from "@/lib/ciIngestAuth";

type IncomingPipeline = {
  unique_id: string;
  name: string;
  git: {
    repository_url: string;
    author_email?: string;
    sha: string;
  };
  status: string;
  start: string;
  end?: string;
  partial_retry?: boolean;
  url?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = source[key];
  return isRecord(value) ? value : null;
}

function isIncomingPipeline(value: unknown): value is IncomingPipeline {
  if (!isRecord(value)) return false;
  const git = getNestedRecord(value, "git");
  if (!git) return false;

  return (
    typeof value.unique_id === "string" &&
    typeof value.name === "string" &&
    typeof value.status === "string" &&
    typeof value.start === "string" &&
    typeof git.repository_url === "string" &&
    typeof git.sha === "string" &&
    (git.author_email === undefined || typeof git.author_email === "string") &&
    (value.end === undefined || typeof value.end === "string") &&
    (value.partial_retry === undefined || typeof value.partial_retry === "boolean") &&
    (value.url === undefined || typeof value.url === "string")
  );
}

function coercePipeline(body: unknown): { pipeline: IncomingPipeline; log: string | null } | null {
  if (!isRecord(body)) return null;

  const rootPipeline = body.pipeline;
  const data = getNestedRecord(body, "data");
  const attributes = data ? getNestedRecord(data, "attributes") : null;
  const resource = attributes ? getNestedRecord(attributes, "resource") : null;
  const nestedPipeline = resource?.pipeline;

  const pipelineCandidate = isIncomingPipeline(rootPipeline)
    ? rootPipeline
    : isIncomingPipeline(resource)
      ? resource
      : isIncomingPipeline(nestedPipeline)
        ? nestedPipeline
        : null;

  const log = typeof body.log === "string" ? body.log : null;

  if (!pipelineCandidate) return null;
  return { pipeline: pipelineCandidate, log };
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  const auth = await resolveCiIngestAuth(req);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const coerced = coercePipeline(body);
  if (!coerced) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { pipeline, log } = coerced;

  if (!pipeline.unique_id || !pipeline.name || !pipeline.git?.repository_url || !pipeline.git?.sha || !pipeline.status) {
    return Response.json({ error: "Missing required pipeline fields" }, { status: 400 });
  }

  const start = parseDate(pipeline.start);
  const end = parseDate(pipeline.end);
  if (!start) {
    return Response.json({ error: "Invalid start timestamp" }, { status: 400 });
  }

  const data = {
    shopId: auth.shopId,
    uniqueId: pipeline.unique_id,
    name: pipeline.name,
    repositoryUrl: pipeline.git.repository_url,
    authorEmail: pipeline.git.author_email ?? null,
    sha: pipeline.git.sha,
    status: pipeline.status,
    start,
    end,
    partialRetry: Boolean(pipeline.partial_retry),
    url: pipeline.url ?? null,
    log,
  };

  const saved = await prisma.ciPipelineRun.upsert({
    where: { shopId_uniqueId: { shopId: auth.shopId, uniqueId: pipeline.unique_id } },
    create: data,
    update: data,
    select: { id: true, uniqueId: true },
  });

  return Response.json({ ok: true, run: saved });
}

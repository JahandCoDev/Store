import { S3Client } from "@aws-sdk/client-s3";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

export type ObjectStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
};

export function getObjectStorageConfig(): ObjectStorageConfig {
  return {
    endpoint: requiredEnv("S3_ENDPOINT"),
    region: (process.env.S3_REGION ?? "us-east-1").trim(),
    bucket: requiredEnv("S3_BUCKET"),
    accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true").trim().toLowerCase() === "true",
    publicBaseUrl: (process.env.S3_PUBLIC_BASE_URL ?? "").trim() || undefined,
  };
}

export function getS3Client(): S3Client {
  const cfg = getObjectStorageConfig();
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: cfg.forcePathStyle,
  });
}

export function publicObjectUrl(storageKey: string): string {
  const cfg = getObjectStorageConfig();
  if (cfg.publicBaseUrl) {
    const base = cfg.publicBaseUrl.replace(/\/$/, "");
    return `${base}/${encodeURIComponent(storageKey).replace(/%2F/g, "/")}`;
  }

  const endpoint = cfg.endpoint.replace(/\/$/, "");
  if (cfg.forcePathStyle) {
    return `${endpoint}/${cfg.bucket}/${encodeURIComponent(storageKey).replace(/%2F/g, "/")}`;
  }

  // virtual-host style
  const u = new URL(endpoint);
  return `${u.protocol}//${cfg.bucket}.${u.host}/${encodeURIComponent(storageKey).replace(/%2F/g, "/")}`;
}

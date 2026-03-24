import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const IMAGE_MIME_PREFIX = "image/";

function slugifyFilenamePart(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function resolveExtension(filename: string, mimeType: string) {
  const explicit = path.extname(filename).toLowerCase();
  if (explicit) return explicit;
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
}

function getRootPaths(shopId: string, fileName: string) {
  const storageKey = path.posix.join("uploads", shopId, fileName);
  return {
    storageKey,
    adminPath: path.resolve(process.cwd(), "public", storageKey),
    storefrontPath: path.resolve(process.cwd(), "..", "storefront", "public", storageKey),
  };
}

async function ensureParentDirs(pathsToPrepare: string[]) {
  await Promise.all(pathsToPrepare.map((targetPath) => mkdir(path.dirname(targetPath), { recursive: true })));
}

export function getMediaAssetUrl(storageKey: string) {
  return `/${storageKey.replace(/^\/+/, "")}`;
}

export async function storeImageUpload(shopId: string, file: File) {
  if (!file.type.startsWith(IMAGE_MIME_PREFIX)) {
    throw new Error("Only image uploads are supported");
  }

  const originalName = file.name || "upload";
  const baseName = slugifyFilenamePart(path.basename(originalName, path.extname(originalName))) || "asset";
  const extension = resolveExtension(originalName, file.type);
  const fileName = `${Date.now()}-${baseName}-${randomUUID().slice(0, 8)}${extension}`;
  const { storageKey, adminPath, storefrontPath } = getRootPaths(shopId, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await ensureParentDirs([adminPath, storefrontPath]);
  await Promise.all([writeFile(adminPath, buffer), writeFile(storefrontPath, buffer)]);

  return {
    storageKey,
    originalFilename: originalName,
    mimeType: file.type,
    sizeBytes: buffer.byteLength,
  };
}

export async function deleteStoredAsset(storageKey: string) {
  const normalized = storageKey.replace(/^\/+/, "");
  const adminPath = path.resolve(process.cwd(), "public", normalized);
  const storefrontPath = path.resolve(process.cwd(), "..", "storefront", "public", normalized);

  await Promise.all([
    rm(adminPath, { force: true }),
    rm(storefrontPath, { force: true }),
  ]);
}

export async function readStoredAsset(storageKey: string) {
  const normalized = storageKey.replace(/^\/+/, "");
  const adminPath = path.resolve(process.cwd(), "public", normalized);
  return readFile(adminPath);
}
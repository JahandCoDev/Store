import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const IMAGE_MIME_PREFIX = "image/";
const PROJECT_PRODUCT_IMAGES_DIR = path.resolve(process.cwd(), "public", "Product_Images");
const STATIC_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

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

function buildStoredImageFileName(originalName: string, mimeType: string) {
  const baseName = slugifyFilenamePart(path.basename(originalName, path.extname(originalName))) || "asset";
  const extension = resolveExtension(originalName, mimeType);
  return `${Date.now()}-${baseName}-${randomUUID().slice(0, 8)}${extension}`;
}

async function mirrorStoredFile(sourcePath: string, adminPath: string, storefrontPath: string) {
  await ensureParentDirs([adminPath, storefrontPath]);
  await Promise.all([copyFile(sourcePath, adminPath), copyFile(sourcePath, storefrontPath)]);
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
  const fileName = buildStoredImageFileName(originalName, file.type);
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

export type ProjectProductImage = {
  filename: string;
  originalFilename: string;
  url: string;
  sizeBytes: number;
};

export async function listProjectProductImages(): Promise<ProjectProductImage[]> {
  try {
    const entries = await readdir(PROJECT_PRODUCT_IMAGES_DIR, { withFileTypes: true });
    const images = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && STATIC_IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
        .map(async (entry) => {
          const filePath = path.join(PROJECT_PRODUCT_IMAGES_DIR, entry.name);
          const fileStats = await stat(filePath);
          return {
            filename: entry.name,
            originalFilename: entry.name,
            url: `/Product_Images/${encodeURIComponent(entry.name)}`,
            sizeBytes: fileStats.size,
          } satisfies ProjectProductImage;
        })
    );

    return images.sort((left, right) => left.originalFilename.localeCompare(right.originalFilename));
  } catch {
    return [];
  }
}

export async function importProjectProductImage(shopId: string, filename: string) {
  const normalizedName = path.basename(filename);
  const sourcePath = path.join(PROJECT_PRODUCT_IMAGES_DIR, normalizedName);
  const sourceStats = await stat(sourcePath);
  if (!sourceStats.isFile()) {
    throw new Error("Selected project image was not found");
  }

  const extension = path.extname(normalizedName).toLowerCase();
  if (!STATIC_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error("Selected file is not a supported image");
  }

  const mimeType =
    extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : extension === ".gif"
          ? "image/gif"
          : extension === ".avif"
            ? "image/avif"
            : "image/jpeg";

  const fileName = buildStoredImageFileName(normalizedName, mimeType);
  const { storageKey, adminPath, storefrontPath } = getRootPaths(shopId, fileName);
  await mirrorStoredFile(sourcePath, adminPath, storefrontPath);

  return {
    storageKey,
    originalFilename: normalizedName,
    mimeType,
    sizeBytes: sourceStats.size,
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
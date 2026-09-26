import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

const UPLOAD_EXPIRY_SECONDS = 60 * 5; // 5 minutes
const VIEW_EXPIRY_SECONDS = 60 * 60; // 1 hour

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucketPrefix = process.env.R2_BUCKET_PREFIX || "fortune-";
const rawBucket = process.env.R2_BUCKET || "chat-media";
const isPublicBucket = process.env.R2_PUBLIC === "true";
const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");

export function getFullBucketName(name: string = rawBucket): string {
  if (name.startsWith(bucketPrefix)) return name;
  return `${bucketPrefix}${name}`;
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Checks whether remote Cloudflare R2 is enabled and explicitly configured.
 * Default is resilient local server storage if R2 is not explicitly activated with R2_ENABLED=true.
 */
export function isR2Configured(): boolean {
  if (process.env.STORAGE_DRIVER === "local") return false;
  if (process.env.R2_ENABLED === "false") return false;
  return Boolean(process.env.R2_ENABLED === "true" && accountId && accessKeyId && secretAccessKey);
}

/**
 * Deterministic object path structure per TL Spec Section 11:
 * chat/rooms/{roomId}/{uuid}{extension}
 * Never uses raw user-supplied filename in the key.
 */
export function buildDeterministicKey(roomId: string, fileName: string): string {
  const extensionMatch = /\.[a-zA-Z0-9]+$/.exec(fileName);
  const ext = extensionMatch ? extensionMatch[0].toLowerCase() : "";
  const uuid = uuidv4();
  return `chat/rooms/${roomId}/${uuid}${ext}`;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string | null;
  expiresIn: number;
}

export async function createPresignedUploadUrl(
  roomId: string,
  fileName: string,
  contentType: string,
  fileSizeBytes: number
): Promise<PresignedUploadResult> {
  const key = buildDeterministicKey(roomId, fileName);
  const bucket = getFullBucketName();

  if (isR2Configured()) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const uploadUrl = await getSignedUrl(r2Client, command, {
        expiresIn: UPLOAD_EXPIRY_SECONDS,
      });

      return {
        uploadUrl,
        key,
        publicUrl: isPublicBucket && publicBaseUrl ? `${publicBaseUrl}/${key}` : null,
        expiresIn: UPLOAD_EXPIRY_SECONDS,
      };
    } catch (e) {
      console.warn("R2 presigned URL generation failed, falling back to local storage:", e);
    }
  }

  // Resilient fallback: internal server storage endpoint
  return {
    uploadUrl: `/api/upload?key=${encodeURIComponent(key)}`,
    key,
    publicUrl: `/uploads/${key}`,
    expiresIn: UPLOAD_EXPIRY_SECONDS,
  };
}

export async function createPresignedViewUrl(key: string): Promise<string> {
  // Check if file was stored locally in public/uploads/
  const localRelative = key.replace(/\\/g, "/");
  const localDiskPath = path.join(process.cwd(), "public", "uploads", ...localRelative.split("/"));

  if (fs.existsSync(localDiskPath)) {
    return `/uploads/${localRelative}`;
  }

  if (isPublicBucket && publicBaseUrl) {
    return `${publicBaseUrl}/${key}`;
  }

  if (isR2Configured()) {
    try {
      const bucket = getFullBucketName();
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      return await getSignedUrl(r2Client, command, {
        expiresIn: VIEW_EXPIRY_SECONDS,
      });
    } catch {
      return `/uploads/${localRelative}`;
    }
  }

  return `/uploads/${localRelative}`;
}

export async function deleteR2Object(key: string): Promise<void> {
  // Delete local file if present
  try {
    const localRelative = key.replace(/\\/g, "/");
    const localDiskPath = path.join(process.cwd(), "public", "uploads", ...localRelative.split("/"));
    if (fs.existsSync(localDiskPath)) {
      fs.unlinkSync(localDiskPath);
    }
  } catch {}

  if (isR2Configured()) {
    try {
      const bucket = getFullBucketName();
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    } catch {}
  }
}

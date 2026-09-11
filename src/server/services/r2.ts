import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

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

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSizeBytes,
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
}

export async function createPresignedViewUrl(key: string): Promise<string> {
  if (isPublicBucket && publicBaseUrl) {
    return `${publicBaseUrl}/${key}`;
  }

  const bucket = getFullBucketName();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(r2Client, command, {
    expiresIn: VIEW_EXPIRY_SECONDS,
  });
}

export async function deleteR2Object(key: string): Promise<void> {
  const bucket = getFullBucketName();
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

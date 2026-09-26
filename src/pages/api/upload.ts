import { type NextApiRequest, type NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser so we can stream large binary uploads
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT" && req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use PUT or POST." });
  }

  const rawKey = req.query.key;
  if (!rawKey || typeof rawKey !== "string") {
    return res.status(400).json({ error: "Missing required 'key' query parameter." });
  }

  // Security: Prevent Directory Traversal
  const normalizedKey = path.normalize(rawKey).replace(/^(\.\.[\/\\])+/, "");
  if (normalizedKey.includes("..") || path.isAbsolute(normalizedKey)) {
    return res.status(400).json({ error: "Invalid key format." });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const targetFilePath = path.join(uploadDir, normalizedKey);

  // Ensure target directory exists
  const targetDir = path.dirname(targetFilePath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  try {
    const fileWriteStream = fs.createWriteStream(targetFilePath);
    await pipeline(req, fileWriteStream);

    const publicUrl = `/uploads/${normalizedKey.replace(/\\/g, "/")}`;

    return res.status(200).json({
      success: true,
      key: normalizedKey,
      url: publicUrl,
    });
  } catch (err: any) {
    console.error("Local storage stream upload error:", err);
    return res.status(500).json({ error: "Failed to persist uploaded file stream." });
  }
}

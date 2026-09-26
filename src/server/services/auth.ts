import { db } from "../db";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface JWTPayload {
  sub: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Encodes payload into URL-safe base64 string
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Decodes URL-safe base64 string
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Generates an HMAC SHA-256 signed JWT
 */
export function signJwtToken(payload: JWTPayload, expiresInSeconds: number = 86400): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const completePayload: JWTPayload = {
    ...payload,
    iat: payload.iat || now,
    exp: payload.exp || now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(completePayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${signature}`;
}

/**
 * Verifies and decodes an HMAC SHA-256 signed JWT
 */
export function verifyJwtToken(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;

    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(data)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    // Timing-safe signature comparison to protect against timing attacks
    const sigBuffer = Buffer.from(signatureB64);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadB64));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Clean Enterprise Auth Boundary (TL Spec Section 13).
 * Extracts authenticated user from session or JWT bearer token.
 * In production mode (process.env.NODE_ENV === "production"):
 *  - Rejects unverified x-user-id headers
 *  - Enforces cryptographically signed JWT bearer tokens
 *  - Disables arbitrary fallback users
 */
export async function authenticateUser(
  headers: Headers | Record<string, string | string[] | undefined>
): Promise<SessionUser | null> {
  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    const val = headers[name] || headers[name.toLowerCase()];
    if (Array.isArray(val)) return val[0] || null;
    return typeof val === "string" ? val : null;
  };

  const authHeader = getHeader("authorization");
  const xUserIdHeader = getHeader("x-user-id");

  let userId: string | null = null;
  let tokenPayload: JWTPayload | null = null;

  // 1. Attempt JWT Bearer Token verification
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    tokenPayload = verifyJwtToken(token);
    if (tokenPayload && tokenPayload.sub) {
      userId = tokenPayload.sub;
    }
  }

  // 2. Production Security Enforcement
  if (IS_PRODUCTION) {
    if (!userId) {
      // In production, unverified tokens or missing auth are rejected immediately
      return null;
    }
  } else {
    // Development / Testing fallback
    if (!userId) {
      if (typeof authHeader === "string" && !authHeader.toLowerCase().startsWith("bearer ")) {
        userId = authHeader;
      } else if (xUserIdHeader) {
        userId = xUserIdHeader;
      } else {
        userId = "usr_demo_saifan";
      }
    }
  }

  if (!userId) {
    return null;
  }

  // Ensure shadow user profile exists in local DB projection
  let user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    user = await db.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        username:
          tokenPayload?.username ||
          (userId === "usr_demo_saifan" ? "saifan" : `user_${userId.slice(0, 6)}`),
        displayName:
          tokenPayload?.displayName ||
          (userId === "usr_demo_saifan" ? "Saifan Ahmed" : "Team Member"),
        avatarUrl:
          tokenPayload?.avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        isOnline: true,
      },
      update: {
        isOnline: true,
      },
    });
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

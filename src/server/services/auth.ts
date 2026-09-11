import { db } from "../db";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

/**
 * Clean Auth boundary (TL Spec Section 13).
 * Extracts authenticated user from session or header.
 * Allows effortless transition to future shared IAM/Auth foundation.
 */
export async function authenticateUser(headers: Headers | Record<string, string | string[] | undefined>): Promise<SessionUser | null> {
  const authHeader =
    (headers instanceof Headers ? headers.get("authorization") : headers["authorization"]) ||
    (headers instanceof Headers ? headers.get("x-user-id") : headers["x-user-id"]);

  // In development / demo mode, fallback to default seed user if not provided
  let userId = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : null;
  if (!userId || userId.length === 0) {
    userId = "usr_demo_saifan";
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
        username: userId === "usr_demo_saifan" ? "saifan" : `user_${userId.slice(0, 6)}`,
        displayName: userId === "usr_demo_saifan" ? "Saifan Ahmed" : "Team Member",
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
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

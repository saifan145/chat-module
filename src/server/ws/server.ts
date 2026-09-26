import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { db } from "../db";
import { authenticateUser, type SessionUser } from "../services/auth";
import { createPresignedViewUrl } from "../services/r2";
import {
  type ChatEvent,
  type MessageSendPayload,
  type MessageNewPayload,
  type TypingUpdatePayload,
  type PresenceUpdatePayload,
} from "../../types/chat";
import { processMessageNotifications } from "../services/notification";

interface AuthedSocket extends Socket {
  user?: SessionUser;
}

let globalIO: SocketIOServer | null = null;

export const getIO = (): SocketIOServer | null => {
  return globalIO || (globalThis as any).__socketIO || null;
};

export const roomChannel = (roomId: string) => `room:${roomId}`;
export const userChannel = (userId: string) => `user:${userId}`;

export const emitToUser = (userId: string, event: string, payload: any) => {
  const io = getIO();
  if (io) {
    io.to(userChannel(userId)).emit(event, payload);
  }
};

export function setupWebSocketServer(httpServer: HTTPServer) {
  const isProduction = process.env.NODE_ENV === "production";
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const allowedOrigins = [
    configuredAppUrl,
    configuredAppUrl.replace(/\/$/, ""),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (e.g. mobile native clients or curl)
        if (!requestOrigin) {
          return callback(null, true);
        }

        if (isProduction) {
          if (allowedOrigins.includes(requestOrigin)) {
            return callback(null, true);
          }
          console.warn(`[Security Alert] Blocked WebSocket connection from untrusted origin: ${requestOrigin}`);
          return callback(new Error("Origin not allowed by WebSocket CORS policy"), false);
        }

        // Permissive in local development
        return callback(null, true);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socketio",
  });

  globalIO = io;
  (globalThis as any).__socketIO = io;

  // Authentication Middleware (Section 13)
  io.use(async (socket: AuthedSocket, next) => {
    try {
      const rawToken =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.headers?.authorization as string) ||
        (socket.handshake.headers?.["x-user-id"] as string);

      const normalizedAuth =
        rawToken && !rawToken.toLowerCase().startsWith("bearer ") && rawToken.includes(".")
          ? `Bearer ${rawToken}`
          : rawToken;

      const user = await authenticateUser({
        authorization: normalizedAuth,
        "x-user-id": socket.handshake.headers?.["x-user-id"] as string,
      });

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    // Join personal user room for multi-tab/device fan-out
    socket.join(userChannel(user.id));

    // Asynchronously join active rooms & broadcast presence without blocking listener registration
    (async () => {
      try {
        const memberships = await db.chatRoomMember.findMany({
          where: { userId: user.id },
          select: { roomId: true },
        });

        for (const { roomId } of memberships) {
          socket.join(roomChannel(roomId));
        }

        await db.user.update({
          where: { id: user.id },
          data: { isOnline: true },
        });

        const presencePayload: PresenceUpdatePayload = {
          userId: user.id,
          isOnline: true,
        };
        io.emit("presence:update", presencePayload);
      } catch (err) {
        console.error("Background presence setup error:", err);
      }
    })();

    // --- Events (Section 6) --------------------------------------------------

    // 1. Join Room
    socket.on("room:join", async (data: { roomId: string }) => {
      const isMember = await db.chatRoomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: data.roomId,
            userId: user.id,
          },
        },
      });
      if (isMember) {
        await socket.join(roomChannel(data.roomId));
      }
    });

    // 2. Leave Room
    socket.on("room:leave", async (data: { roomId: string }) => {
      await socket.leave(roomChannel(data.roomId));
    });

    // 3. Send Message (DB write first, then broadcast - Section 5)
    socket.on("message:send", async (dto: MessageSendPayload, callback?: (ack: any) => void) => {
      try {
        // Authorization check
        const member = await db.chatRoomMember.findUnique({
          where: {
            roomId_userId: {
              roomId: dto.roomId,
              userId: user.id,
            },
          },
        });

        if (!member) {
          if (callback) callback({ error: "Forbidden" });
          return;
        }

        const otherMembers = await db.chatRoomMember.findMany({
          where: { roomId: dto.roomId, userId: { not: user.id } },
          select: { userId: true },
        });

        // Persist message to PostgreSQL
        const message = await db.$transaction(async (tx) => {
          const created = await tx.chatMessage.create({
            data: {
              roomId: dto.roomId,
              senderId: user.id,
              content: dto.content,
              type: dto.type || "TEXT",
              mediaUrl: dto.mediaUrl,
              replyToId: dto.replyToId,
              attachments: dto.attachments
                ? {
                    create: dto.attachments.map((a) => ({
                      objectKey: a.objectKey,
                      fileName: a.fileName,
                      mimeType: a.mimeType,
                      size: BigInt(a.size),
                    })),
                  }
                : undefined,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              replyTo: {
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
              attachments: true,
            },
          });

          // Insert receipts
          if (otherMembers.length > 0) {
            await tx.messageReceipt.createMany({
              data: otherMembers.map((m) => ({
                messageId: created.id,
                userId: m.userId,
                status: "SENT",
              })),
            });
          }

          // Update room timestamp
          await tx.chatRoom.update({
            where: { id: dto.roomId },
            data: { updatedAt: new Date() },
          });

          return created;
        });

        // Augment attachments with presigned view URLs for real-time delivery
        const attachmentsWithUrls = await Promise.all(
          message.attachments.map(async (a) => ({
            id: a.id,
            messageId: a.messageId,
            objectKey: a.objectKey,
            fileName: a.fileName,
            mimeType: a.mimeType,
            size: Number(a.size),
            url: await createPresignedViewUrl(a.objectKey),
          }))
        );

        const formattedPayload: MessageNewPayload = {
          roomId: dto.roomId,
          message: {
            id: message.id,
            roomId: message.roomId,
            senderId: message.senderId,
            content: message.content,
            type: message.type,
            mediaUrl: message.mediaUrl,
            replyToId: message.replyToId,
            replyTo: message.replyTo
              ? {
                  id: message.replyTo.id,
                  content: message.replyTo.content,
                  type: message.replyTo.type,
                  sender: message.replyTo.sender
                    ? {
                        ...message.replyTo.sender,
                        isOnline: false,
                        lastSeenAt: new Date().toISOString(),
                      }
                    : undefined,
                }
              : null,
            createdAt: message.createdAt.toISOString(),
            sender: {
              ...message.sender,
              isOnline: true,
              lastSeenAt: new Date().toISOString(),
            },
            attachments: attachmentsWithUrls,
          },
        };

        // Ensure sender socket is in roomChannel
        await socket.join(roomChannel(dto.roomId));

        // Broadcast to conversation room (including sender socket and other member tabs)
        io.to(roomChannel(dto.roomId)).emit("message:new", formattedPayload);

        // Asynchronously process notifications (mentions, DMs, thread replies)
        processMessageNotifications({
          messageId: message.id,
          roomId: message.roomId,
          senderId: user.id,
          content: message.content,
          replyToId: message.replyToId,
        }).catch((err) => {
          console.error("[Notification trigger error]", err);
        });

        if (callback) callback({ status: "ok", messageId: message.id, message: formattedPayload.message });
      } catch (err) {
        if (callback) callback({ error: (err as Error).message });
      }
    });

    // 4. Typing Start / Stop
    socket.on("typing:start", (data: { roomId: string }) => {
      const payload: TypingUpdatePayload = {
        roomId: data.roomId,
        userId: user.id,
        isTyping: true,
      };
      socket.to(roomChannel(data.roomId)).emit("typing:start", payload);
    });

    socket.on("typing:stop", (data: { roomId: string }) => {
      const payload: TypingUpdatePayload = {
        roomId: data.roomId,
        userId: user.id,
        isTyping: false,
      };
      socket.to(roomChannel(data.roomId)).emit("typing:stop", payload);
    });

    // 5. Read Receipt
    socket.on("message:read", async (data: { roomId: string }) => {
      await db.$transaction([
        db.messageReceipt.updateMany({
          where: {
            userId: user.id,
            status: { in: ["SENT", "DELIVERED"] },
            message: { roomId: data.roomId },
          },
          data: { status: "READ" },
        }),
        db.chatRoomMember.update({
          where: {
            roomId_userId: {
              roomId: data.roomId,
              userId: user.id,
            },
          },
          data: { lastReadAt: new Date() },
        }),
      ]);

      io.to(roomChannel(data.roomId)).emit("message:read", {
        roomId: data.roomId,
        userId: user.id,
        readAt: new Date().toISOString(),
      });
    });

    // 6. Message Reaction Sync (Real-time Emojis)
    socket.on(
      "message:react",
      (data: { roomId: string; messageId: string; emoji: string; userId: string }) => {
        io.to(roomChannel(data.roomId)).emit("message:react", data);
      }
    );

    // 7. Message Edit Sync
    socket.on(
      "message:edit",
      (data: { roomId: string; messageId: string; content: string; updatedAt: string }) => {
        io.to(roomChannel(data.roomId)).emit("message:edit", data);
      }
    );

    // 8. Message Delete Sync
    socket.on("message:delete", (data: { roomId: string; messageId: string }) => {
      io.to(roomChannel(data.roomId)).emit("message:delete", data);
    });

    // 9. Room Update Sync (Name change, avatar update)
    socket.on("room:update", (data: { roomId: string; name?: string; avatarUrl?: string }) => {
      io.emit("room:updated", data); // broadcast so all members and active room listeners receive update
    });

    // 10. Member Added Sync
    socket.on(
      "member:add",
      (data: { roomId: string; member: any; actorName: string; targetName: string }) => {
        io.to(roomChannel(data.roomId)).emit("member:added", data);
        // Also notify the target user's direct channel
        if (data.member?.userId) {
          io.to(userChannel(data.member.userId)).emit("member:added", data);
        }
      }
    );

    // 11. Member Removed Sync
    socket.on(
      "member:remove",
      (data: { roomId: string; userId: string; actorName: string; removedName: string }) => {
        io.to(roomChannel(data.roomId)).emit("member:removed", data);
        io.to(userChannel(data.userId)).emit("member:removed", data);
      }
    );

    // 12. User Profile / Handle Update Sync
    socket.on(
      "user:update",
      (data: { userId: string; displayName?: string; username?: string; avatarUrl?: string }) => {
        io.emit("user:updated", data);
      }
    );

    // Disconnection
    socket.on("disconnect", async () => {
      const remaining = await io.in(userChannel(user.id)).fetchSockets();
      if (remaining.length === 0) {
        await db.user.update({
          where: { id: user.id },
          data: { isOnline: false, lastSeenAt: new Date() },
        });
        io.emit("presence:update", {
          userId: user.id,
          isOnline: false,
        });
      }
    });
  });

  return io;
}

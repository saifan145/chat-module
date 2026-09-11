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

interface AuthedSocket extends Socket {
  user?: SessionUser;
}

const roomChannel = (roomId: string) => `room:${roomId}`;
const userChannel = (userId: string) => `user:${userId}`;

export function setupWebSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/api/socketio",
  });

  // Authentication Middleware (Section 13)
  io.use(async (socket: AuthedSocket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.headers?.authorization as string) ||
        (socket.handshake.headers?.["x-user-id"] as string);

      const user = await authenticateUser({
        authorization: token,
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

  io.on("connection", async (socket: AuthedSocket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect();
      return;
    }

    // Join personal user room for multi-tab/device fan-out
    await socket.join(userChannel(user.id));

    // Automatically join all active conversation rooms the user is in
    const memberships = await db.chatRoomMember.findMany({
      where: { userId: user.id },
      select: { roomId: true },
    });

    for (const { roomId } of memberships) {
      await socket.join(roomChannel(roomId));
    }

    // Update user online status
    await db.user.update({
      where: { id: user.id },
      data: { isOnline: true },
    });

    // Broadcast presence
    const presencePayload: PresenceUpdatePayload = {
      userId: user.id,
      isOnline: true,
    };
    io.emit("presence:update", presencePayload);

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
            createdAt: message.createdAt.toISOString(),
            sender: {
              ...message.sender,
              isOnline: true,
              lastSeenAt: new Date().toISOString(),
            },
            attachments: attachmentsWithUrls,
          },
        };

        // Broadcast to conversation room (including sender tabs)
        io.to(roomChannel(dto.roomId)).emit("message:new", formattedPayload);

        if (callback) callback({ status: "ok", messageId: message.id });
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

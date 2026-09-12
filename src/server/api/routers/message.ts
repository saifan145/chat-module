import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { createPresignedViewUrl } from "../../services/r2";

export const messageRouter = createTRPCRouter({
  // Message history with efficient cursor pagination (Section 8)
  list: protectedProcedure
    .input(
      z.object({
        roomId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(30),
        cursor: z.string().optional(), // message id
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Assert room membership (Section 14)
      const member = await ctx.db.chatRoomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: input.roomId,
            userId,
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this chat room",
        });
      }

      let cursorFilter = {};
      if (input.cursor) {
        const cursorMsg = await ctx.db.chatMessage.findUnique({
          where: { id: input.cursor },
          select: { createdAt: true },
        });
        if (cursorMsg) {
          cursorFilter = {
            createdAt: { lt: cursorMsg.createdAt },
          };
        }
      }

      const messages = await ctx.db.chatMessage.findMany({
        where: {
          roomId: input.roomId,
          deletedAt: null,
          ...cursorFilter,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
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
          receipts: {
            where: { userId },
            select: { status: true },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      // Format & augment attachments with presigned view URLs
      const formatted = await Promise.all(
        messages.reverse().map(async (msg) => {
          const attachmentsWithUrls = await Promise.all(
            msg.attachments.map(async (att) => ({
              id: att.id,
              messageId: att.messageId,
              objectKey: att.objectKey,
              fileName: att.fileName,
              mimeType: att.mimeType,
              size: Number(att.size),
              url: await createPresignedViewUrl(att.objectKey),
            }))
          );

          return {
            id: msg.id,
            roomId: msg.roomId,
            senderId: msg.senderId,
            content: msg.content,
            type: msg.type,
            mediaUrl: msg.mediaUrl,
            replyToId: msg.replyToId,
            replyTo: msg.replyTo
              ? {
                  id: msg.replyTo.id,
                  content: msg.replyTo.content,
                  type: msg.replyTo.type,
                  sender: msg.replyTo.sender
                    ? {
                        ...msg.replyTo.sender,
                        isOnline: false,
                        lastSeenAt: new Date().toISOString(),
                      }
                    : undefined,
                }
              : null,
            createdAt: msg.createdAt.toISOString(),
            sender: {
              ...msg.sender,
              isOnline: false,
              lastSeenAt: new Date().toISOString(),
            },
            attachments: attachmentsWithUrls,
            receipts: msg.receipts.map((r) => ({
              userId,
              status: r.status,
            })),
          };
        })
      );

      return {
        messages: formatted,
        nextCursor,
      };
    }),

  // Fallback REST / tRPC message creation where appropriate (Section 3 & 4)
  create: protectedProcedure
    .input(
      z.object({
        roomId: z.string().uuid(),
        content: z.string().optional(),
        type: z.enum(["TEXT", "IMAGE", "FILE"]).default("TEXT"),
        mediaUrl: z.string().optional(),
        replyToId: z.string().optional(),
        attachments: z
          .array(
            z.object({
              objectKey: z.string(),
              fileName: z.string(),
              mimeType: z.string(),
              size: z.number(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.user.id;

      // Assert membership
      const member = await ctx.db.chatRoomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: input.roomId,
            userId: senderId,
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this chat room",
        });
      }

      const otherMembers = await ctx.db.chatRoomMember.findMany({
        where: { roomId: input.roomId, userId: { not: senderId } },
        select: { userId: true },
      });

      const message = await ctx.db.$transaction(async (tx) => {
        const created = await tx.chatMessage.create({
          data: {
            roomId: input.roomId,
            senderId,
            content: input.content,
            type: input.type,
            mediaUrl: input.mediaUrl,
            replyToId: input.replyToId,
            attachments: input.attachments
              ? {
                  create: input.attachments.map((att) => ({
                    objectKey: att.objectKey,
                    fileName: att.fileName,
                    mimeType: att.mimeType,
                    size: BigInt(att.size),
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

          // Initialize receipts for all other participants
          if (otherMembers.length > 0) {
            await tx.messageReceipt.createMany({
              data: otherMembers.map((m) => ({
                messageId: created.id,
                userId: m.userId,
                status: "SENT",
              })),
            });
          }

          // Update room updatedAt
          await tx.chatRoom.update({
            where: { id: input.roomId },
            data: { updatedAt: new Date() },
          });

          return created;
        });

        return {
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
            isOnline: false,
            lastSeenAt: new Date().toISOString(),
          },
        attachments: message.attachments.map((a) => ({
          id: a.id,
          messageId: a.messageId,
          objectKey: a.objectKey,
          fileName: a.fileName,
          mimeType: a.mimeType,
          size: Number(a.size),
        })),
      };
    }),

  // Mark room messages as READ
  read: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      await ctx.db.$transaction([
        ctx.db.messageReceipt.updateMany({
          where: {
            userId,
            status: { in: ["SENT", "DELIVERED"] },
            message: { roomId: input.roomId },
          },
          data: { status: "READ" },
        }),
        ctx.db.chatRoomMember.update({
          where: {
            roomId_userId: {
              roomId: input.roomId,
              userId,
            },
          },
          data: { lastReadAt: new Date() },
        }),
      ]);

      return { success: true };
    }),

  // Edit message content
  edit: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const message = await ctx.db.chatMessage.findUnique({
        where: { id: input.messageId },
      });

      if (!message || message.senderId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own messages",
        });
      }

      const updated = await ctx.db.chatMessage.update({
        where: { id: input.messageId },
        data: {
          content: input.content,
          updatedAt: new Date(),
        },
      });

      return {
        id: updated.id,
        roomId: updated.roomId,
        content: updated.content,
        updatedAt: updated.updatedAt.toISOString(),
      };
    }),

  // Soft-delete message
  delete: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const message = await ctx.db.chatMessage.findUnique({
        where: { id: input.messageId },
      });

      if (!message || message.senderId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own messages",
        });
      }

      await ctx.db.chatMessage.update({
        where: { id: input.messageId },
        data: {
          deletedAt: new Date(),
        },
      });

      return { success: true, messageId: input.messageId, roomId: message.roomId };
    }),

  // List thread replies for a specific message
  listReplies: protectedProcedure
    .input(z.object({ parentMessageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const replies = await ctx.db.chatMessage.findMany({
        where: {
          replyToId: input.parentMessageId,
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
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
      });

      return replies.map((r) => ({
        id: r.id,
        roomId: r.roomId,
        senderId: r.senderId,
        content: r.content,
        type: r.type,
        createdAt: r.createdAt.toISOString(),
        sender: {
          ...r.sender,
          isOnline: false,
          lastSeenAt: new Date().toISOString(),
        },
      }));
    }),
});

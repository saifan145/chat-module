import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const roomRouter = createTRPCRouter({
  // List all rooms the authenticated user belongs to
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const rooms = await ctx.db.chatRoom.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeenAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
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
      },
      orderBy: { updatedAt: "desc" },
    });

    return rooms.map((room) => {
      const myMembership = room.members.find((m) => m.userId === userId);
      return {
        id: room.id,
        type: room.type,
        name: room.name,
        avatarUrl: room.avatarUrl,
        createdBy: room.createdBy,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
        members: room.members.map((m) => ({
          id: m.id,
          roomId: m.roomId,
          userId: m.userId,
          isAdmin: m.isAdmin,
          joinedAt: m.joinedAt.toISOString(),
          lastReadAt: m.lastReadAt?.toISOString() ?? null,
          user: {
            ...m.user,
            lastSeenAt: m.user.lastSeenAt.toISOString(),
          },
        })),
        lastMessage: room.messages[0]
          ? {
              id: room.messages[0].id,
              roomId: room.messages[0].roomId,
              senderId: room.messages[0].senderId,
              content: room.messages[0].content,
              type: room.messages[0].type,
              mediaUrl: room.messages[0].mediaUrl,
              replyToId: room.messages[0].replyToId,
              createdAt: room.messages[0].createdAt.toISOString(),
              sender: {
                ...room.messages[0].sender,
                isOnline: false,
                lastSeenAt: new Date().toISOString(),
              },
            }
          : null,
      };
    });
  }),

  // Get specific room details with authorization check (Section 14)
  get: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.chatRoomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: input.roomId,
            userId: ctx.user.id,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this chat room",
        });
      }

      const room = await ctx.db.chatRoom.findUnique({
        where: { id: input.roomId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  isOnline: true,
                  lastSeenAt: true,
                },
              },
            },
          },
        },
      });

      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }

      return {
        ...room,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
        members: room.members.map((m) => ({
          ...m,
          joinedAt: m.joinedAt.toISOString(),
          lastReadAt: m.lastReadAt?.toISOString() ?? null,
          user: {
            ...m.user,
            lastSeenAt: m.user.lastSeenAt.toISOString(),
          },
        })),
      };
    }),

  // Create a DIRECT or GROUP room
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["DIRECT", "GROUP"]).default("DIRECT"),
        name: z.string().optional(),
        avatarUrl: z.string().url().optional(),
        participantIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const creatorId = ctx.user.id;

      if (input.type === "DIRECT") {
        const otherUserId = input.participantIds[0];
        if (!otherUserId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Direct chat requires 1 other user",
          });
        }

        // Reuse existing DIRECT room if exists
        const existing = await ctx.db.chatRoom.findFirst({
          where: {
            type: "DIRECT",
            AND: [
              { members: { some: { userId: creatorId } } },
              { members: { some: { userId: otherUserId } } },
            ],
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isOnline: true,
                    lastSeenAt: true,
                  },
                },
              },
            },
          },
        });

        if (existing) {
          return {
            ...existing,
            createdAt: existing.createdAt.toISOString(),
            updatedAt: existing.updatedAt.toISOString(),
            members: existing.members.map((m) => ({
              ...m,
              joinedAt: m.joinedAt.toISOString(),
              lastReadAt: m.lastReadAt?.toISOString() ?? null,
              user: {
                ...m.user,
                lastSeenAt: m.user.lastSeenAt.toISOString(),
              },
            })),
          };
        }

        // Ensure other user exists
        await ctx.db.user.upsert({
          where: { id: otherUserId },
          create: {
            id: otherUserId,
            username: `user_${otherUserId.slice(0, 6)}`,
            displayName: "Team Member",
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUserId}`,
          },
          update: {},
        });

        const created = await ctx.db.chatRoom.create({
          data: {
            type: "DIRECT",
            createdBy: creatorId,
            members: {
              create: [
                { userId: creatorId, isAdmin: true },
                { userId: otherUserId, isAdmin: false },
              ],
            },
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isOnline: true,
                    lastSeenAt: true,
                  },
                },
              },
            },
          },
        });

        return {
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
          members: created.members.map((m) => ({
            ...m,
            joinedAt: m.joinedAt.toISOString(),
            lastReadAt: m.lastReadAt?.toISOString() ?? null,
            user: {
              ...m.user,
              lastSeenAt: m.user.lastSeenAt.toISOString(),
            },
          })),
        };
      }

      // GROUP Room
      if (!input.name || input.name.trim().length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Group chat requires a name",
        });
      }

      const allMembers = Array.from(new Set([...input.participantIds, creatorId]));

      // Ensure all users exist
      for (const uid of allMembers) {
        await ctx.db.user.upsert({
          where: { id: uid },
          create: {
            id: uid,
            username: `user_${uid.slice(0, 6)}`,
            displayName: "Team Member",
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
          },
          update: {},
        });
      }

      const groupRoom = await ctx.db.chatRoom.create({
        data: {
          type: "GROUP",
          name: input.name,
          avatarUrl: input.avatarUrl,
          createdBy: creatorId,
          members: {
            create: allMembers.map((userId) => ({
              userId,
              isAdmin: userId === creatorId,
            })),
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  isOnline: true,
                  lastSeenAt: true,
                },
              },
            },
          },
        },
      });

      return {
        ...groupRoom,
        createdAt: groupRoom.createdAt.toISOString(),
        updatedAt: groupRoom.updatedAt.toISOString(),
        members: groupRoom.members.map((m) => ({
          ...m,
          joinedAt: m.joinedAt.toISOString(),
          lastReadAt: m.lastReadAt?.toISOString() ?? null,
          user: {
            ...m.user,
            lastSeenAt: m.user.lastSeenAt.toISOString(),
          },
        })),
      };
    }),

  // Members list
  members: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.chatRoomMember.findMany({
        where: { roomId: input.roomId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isOnline: true,
              lastSeenAt: true,
            },
          },
        },
      });
    }),
});

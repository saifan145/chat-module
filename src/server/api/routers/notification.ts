import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { type NotificationType, type NotificationItem } from "@/types/chat";

export const notificationRouter = createTRPCRouter({
  /**
   * List paginated notifications for the current user, newest first.
   * Optional unreadOnly filter.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          unreadOnly: z.boolean().default(false),
          limit: z.number().min(1).max(50).default(20),
          cursor: z.string().uuid().optional(),
        })
        .default({})
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      let cursorFilter = {};
      if (input.cursor) {
        const cursorItem = await ctx.db.notification.findUnique({
          where: { id: input.cursor },
          select: { createdAt: true },
        });
        if (cursorItem) {
          cursorFilter = {
            createdAt: { lt: cursorItem.createdAt },
          };
        }
      }

      const notifications = await ctx.db.notification.findMany({
        where: {
          userId,
          ...(input.unreadOnly ? { isRead: false } : {}),
          ...cursorFilter,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (notifications.length > input.limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem?.id;
      }

      const items: NotificationItem[] = notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type as NotificationType,
        actorId: n.actorId,
        roomId: n.roomId,
        messageId: n.messageId,
        previewText: n.previewText,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        actor: n.actor,
        room: n.room,
      }));

      return {
        items,
        nextCursor,
      };
    }),

  /**
   * Fast unread count query for the notification bell badge.
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const count = await ctx.db.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
    return { count };
  }),

  /**
   * Mark a single notification read (when user clicks it).
   */
  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const notification = await ctx.db.notification.findUnique({
        where: { id: input.id },
      });

      if (!notification || notification.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Notification not found or access denied",
        });
      }

      const updated = await ctx.db.notification.update({
        where: { id: input.id },
        data: { isRead: true },
      });

      return { success: true, id: updated.id };
    }),

  /**
   * Mark all notifications read for the current user.
   */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    await ctx.db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }),
});

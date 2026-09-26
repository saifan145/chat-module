import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  // Search or list all users
  list: protectedProcedure
    .input(
      z.object({
        query: z.string().trim().max(100).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const q = input?.query?.trim().replace(/^@/, "").toLowerCase();
      return ctx.db.user.findMany({
        where: q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { displayName: { contains: q, mode: "insensitive" } },
                { id: { contains: q, mode: "insensitive" } },
              ],
            }
          : undefined,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          about: true,
          isOnline: true,
          lastSeenAt: true,
        },
        orderBy: { displayName: "asc" },
      });
    }),

  // Update current user profile: name, @username handle, about
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().trim().min(1).max(60).optional(),
        username: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, and dots").optional(),
        about: z.string().trim().max(200).optional(),
        avatarUrl: z.string().url().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // If updating username, check uniqueness
      if (input.username) {
        const cleanHandle = input.username.replace(/^@/, "").toLowerCase();
        const existing = await ctx.db.user.findUnique({
          where: { username: cleanHandle },
        });

        if (existing && existing.id !== userId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `@${cleanHandle} is already taken by another teammate`,
          });
        }
      }

      const updated = await ctx.db.user.update({
        where: { id: userId },
        data: {
          displayName: input.displayName?.trim(),
          username: input.username ? input.username.replace(/^@/, "").toLowerCase() : undefined,
          about: input.about?.trim(),
          avatarUrl: input.avatarUrl,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          about: true,
          isOnline: true,
          lastSeenAt: true,
        },
      });

      return {
        ...updated,
        lastSeenAt: updated.lastSeenAt.toISOString(),
      };
    }),
});

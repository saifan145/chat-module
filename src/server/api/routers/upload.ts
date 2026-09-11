import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { createPresignedUploadUrl } from "../../services/r2";

export const uploadRouter = createTRPCRouter({
  // Initiate upload with authorization & deterministic key generation (Section 10, 11, 12)
  initiate: protectedProcedure
    .input(
      z.object({
        roomId: z.string().uuid(),
        fileName: z.string().min(1),
        contentType: z.string().min(1),
        fileSizeBytes: z.number().max(50 * 1024 * 1024), // Max 50MB per file
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate authenticated user is a room member (Section 12, step 5)
      const member = await ctx.db.chatRoomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: input.roomId,
            userId: ctx.user.id,
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not permitted to upload to this chat room",
        });
      }

      // Generate deterministic R2 upload authorization
      const result = await createPresignedUploadUrl(
        input.roomId,
        input.fileName,
        input.contentType,
        input.fileSizeBytes
      );

      return result;
    }),
});

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { createPresignedUploadUrl, createPresignedViewUrl } from "../../services/r2";
import { uploadRateLimiter } from "../../services/rateLimiter";

export const uploadRouter = createTRPCRouter({
  // Initiate upload with authorization & deterministic key generation (Section 10, 11, 12)
  initiate: protectedProcedure
    .input(
      z.object({
        roomId: z.string().uuid(),
        fileName: z.string().trim().min(1).max(255),
        contentType: z.string().trim().min(1).max(100),
        fileSizeBytes: z
          .number()
          .min(1)
          .max(20 * 1024 * 1024, "File size exceeds maximum allowed limit of 20MB"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Enforce upload rate limiting (max 10 uploads per minute per user)
      const rateLimit = uploadRateLimiter.check(ctx.user.id);
      if (!rateLimit.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Upload rate limit exceeded. Please wait ${Math.ceil(
            rateLimit.resetMs / 1000
          )} seconds before requesting another upload.`,
        });
      }

      // 2. Validate authenticated user is a room member (Section 12, step 5)
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

      // 3. Generate deterministic R2 upload authorization
      const result = await createPresignedUploadUrl(
        input.roomId,
        input.fileName,
        input.contentType,
        input.fileSizeBytes
      );

      return result;
    }),

  // List all real files & attachments uploaded across rooms the user belongs to
  listFiles: protectedProcedure
    .input(
      z
        .object({
          ownership: z.enum(["all", "created", "shared"]).default("all"),
          search: z.string().optional(),
          type: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const ownership = input?.ownership || "all";
      const search = input?.search?.trim().toLowerCase() || "";
      const typeFilter = input?.type || "all";

      // 1. Find all rooms the user has access to
      const memberships = await ctx.db.chatRoomMember.findMany({
        where: { userId },
        select: { roomId: true },
      });
      const roomIds = memberships.map((m) => m.roomId);

      if (roomIds.length === 0) return [];

      // 2. Query attachments from messages in those rooms
      const attachments = await ctx.db.chatAttachment.findMany({
        where: {
          message: {
            roomId: { in: roomIds },
            deletedAt: null,
            ...(ownership === "created"
              ? { senderId: userId }
              : ownership === "shared"
              ? { senderId: { not: userId } }
              : {}),
          },
        },
        include: {
          message: {
            include: {
              sender: {
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
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // 3. Format into rich workspace files with signed download URLs
      const formatted = await Promise.all(
        attachments.map(async (att) => {
          const fileName = att.fileName;
          const ext = fileName.split(".").pop()?.toLowerCase() || "";
          let fileType: "docx" | "pdf" | "xlsx" | "image" | "canvas" = "docx";
          if (ext === "pdf") fileType = "pdf";
          else if (ext === "xlsx" || ext === "xls" || ext === "csv") fileType = "xlsx";
          else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) fileType = "image";
          else if (ext === "canvas") fileType = "canvas";

          // Generate view/download url
          let downloadUrl: string | null = null;
          try {
            downloadUrl = await createPresignedViewUrl(att.objectKey);
          } catch (e) {
            // fallback
          }

          return {
            id: att.id,
            name: att.fileName,
            type: fileType,
            uploaderId: att.message.sender.id,
            uploaderName:
              att.message.sender.id === userId
                ? `${att.message.sender.displayName} [You]`
                : att.message.sender.displayName,
            uploaderAvatar: att.message.sender.avatarUrl || undefined,
            uploadedAt: new Date(att.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
            }),
            size:
              Number(att.size) > 1024 * 1024
                ? `${(Number(att.size) / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.round(Number(att.size) / 1024)} KB`,
            roomName:
              att.message.room.name ||
              (att.message.room.type === "DIRECT" ? "Direct Chat" : "General"),
            url: downloadUrl,
            isStarred: false,
          };
        })
      );

      // 4. Apply search & type filter in-memory if needed
      return formatted.filter((f) => {
        if (typeFilter !== "all" && f.type !== typeFilter) return false;
        if (search) {
          const matchName = f.name.toLowerCase().includes(search);
          const matchUser = f.uploaderName.toLowerCase().includes(search);
          if (!matchName && !matchUser) return false;
        }
        return true;
      });
    }),
});

import { createTRPCRouter } from "./trpc";
import { roomRouter } from "./routers/room";
import { messageRouter } from "./routers/message";
import { uploadRouter } from "./routers/upload";

/**
 * Main application tRPC router (Section 4)
 */
export const appRouter = createTRPCRouter({
  room: roomRouter,
  message: messageRouter,
  upload: uploadRouter,
});

export type AppRouter = typeof appRouter;

import { createTRPCRouter } from "./trpc";
import { roomRouter } from "./routers/room";
import { messageRouter } from "./routers/message";
import { uploadRouter } from "./routers/upload";
import { userRouter } from "./routers/user";
import { notificationRouter } from "./routers/notification";

/**
 * Main application tRPC router (Section 4)
 */
export const appRouter = createTRPCRouter({
  room: roomRouter,
  message: messageRouter,
  upload: uploadRouter,
  user: userRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;

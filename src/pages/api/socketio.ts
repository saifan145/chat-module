import { type NextApiRequest, type NextApiResponse } from "next";
import { type Server as NetServer } from "http";
import { type Socket } from "net";
import { type Server as SocketIOServer } from "socket.io";
import { setupWebSocketServer } from "@/server/ws/server";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    console.log("⚡ Initializing Socket.io server on Next.js HTTP server...");
    const io = setupWebSocketServer(res.socket.server);
    res.socket.server.io = io;
  }
  res.end();
}

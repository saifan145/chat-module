import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { type ConnectionState, type MessageNewPayload } from "@/types/chat";

export function useChatSocket(userId: string) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("DISCONNECTED");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;
    setConnectionState("CONNECTING");

    // Connect to Next.js API socket route
    fetch("/api/socketio").finally(() => {
      if (!isMounted) return;

      const socket = io({
        path: "/api/socketio",
        auth: {
          token: userId,
        },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        if (!isMounted) return;
        setConnectionState("CONNECTED");
      });

      socket.on("disconnect", (reason) => {
        if (!isMounted) return;
        setConnectionState(reason === "io client disconnect" ? "DISCONNECTED" : "RECONNECTING");
      });

      socket.on("connect_error", () => {
        if (!isMounted) return;
        setConnectionState("RECONNECTING");
      });

      socketRef.current = socket;
    });

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userId]);

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("room:join", { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit("room:leave", { roomId });
  }, []);

  const sendMessage = useCallback(
    (payload: {
      roomId: string;
      content?: string;
      type?: "TEXT" | "IMAGE" | "FILE";
      mediaUrl?: string;
      attachments?: any[];
    }) => {
      return new Promise<{ status?: string; messageId?: string; error?: string }>((resolve) => {
        if (!socketRef.current) {
          resolve({ error: "Socket not connected" });
          return;
        }
        socketRef.current.emit("message:send", payload, (response: any) => {
          resolve(response || { status: "ok" });
        });
      });
    },
    []
  );

  const startTyping = useCallback((roomId: string) => {
    socketRef.current?.emit("typing:start", { roomId });
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    socketRef.current?.emit("typing:stop", { roomId });
  }, []);

  const markRead = useCallback((roomId: string) => {
    socketRef.current?.emit("message:read", { roomId });
  }, []);

  return {
    socket: socketRef.current,
    connectionState,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    markRead,
  };
}

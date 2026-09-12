import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { type ConnectionState, type MessageData, type MessageNewPayload } from "@/types/chat";

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
      replyToId?: string;
      attachments?: any[];
    }) => {
      return new Promise<{ status?: string; messageId?: string; message?: MessageData; error?: string }>((resolve) => {
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

  const reactMessage = useCallback((roomId: string, messageId: string, emoji: string) => {
    socketRef.current?.emit("message:react", { roomId, messageId, emoji, userId });
  }, [userId]);

  const editMessage = useCallback((roomId: string, messageId: string, content: string) => {
    socketRef.current?.emit("message:edit", {
      roomId,
      messageId,
      content,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const deleteMessage = useCallback((roomId: string, messageId: string) => {
    socketRef.current?.emit("message:delete", { roomId, messageId });
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
    reactMessage,
    editMessage,
    deleteMessage,
  };
}

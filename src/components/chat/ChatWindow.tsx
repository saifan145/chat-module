import React, { useState, useEffect } from "react";
import { type RoomData, type MessageData } from "@/types/chat";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { TypingIndicator } from "./TypingIndicator";
import { Users, Info, MoreVertical } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { type Socket } from "socket.io-client";

interface ChatWindowProps {
  room: RoomData;
  currentUserId: string;
  socket: Socket | null;
  onSendMessage: (payload: any) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onMarkRead: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  room,
  currentUserId,
  socket,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onMarkRead,
}) => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Fetch message history using tRPC query with cursor pagination (Section 4 & 8)
  const messagesQuery = trpc.message.list.useQuery(
    { roomId: room.id, limit: 40 },
    { refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (messagesQuery.data?.messages) {
      setMessages(messagesQuery.data.messages as MessageData[]);
      onMarkRead();
    }
  }, [messagesQuery.data, onMarkRead]);

  // Listen to live WebSocket events (Section 6 & 16)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: { roomId: string; message: MessageData }) => {
      if (payload.roomId === room.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
        onMarkRead();
      }
    };

    const handleTypingStart = (payload: { roomId: string; userId: string }) => {
      if (payload.roomId === room.id && payload.userId !== currentUserId) {
        setTypingUsers((prev) => Array.from(new Set([...prev, payload.userId])));
      }
    };

    const handleTypingStop = (payload: { roomId: string; userId: string }) => {
      if (payload.roomId === room.id) {
        setTypingUsers((prev) => prev.filter((id) => id !== payload.userId));
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, room.id, currentUserId, onMarkRead]);

  const otherMember = room.type === "DIRECT"
    ? room.members.find((m) => m.userId !== currentUserId)
    : null;

  const title = room.type === "DIRECT"
    ? otherMember?.user.displayName || otherMember?.user.username || "Direct Chat"
    : room.name || "Group Room";

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Top chat header */}
      <div className="h-16 px-6 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            {room.type === "DIRECT" && otherMember?.user.avatarUrl ? (
              <img
                src={otherMember.user.avatarUrl}
                alt={title}
                className="w-10 h-10 rounded-full object-cover border border-slate-700/80"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-500 border border-slate-700">
                <Users className="w-5 h-5" />
              </div>
            )}
            {room.type === "DIRECT" && (
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                  otherMember?.user.isOnline ? "bg-emerald-500" : "bg-slate-500"
                }`}
              />
            )}
          </div>

          <div>
            <h3 className="font-semibold text-slate-100 text-sm md:text-base leading-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-400">
              {room.type === "DIRECT"
                ? otherMember?.user.isOnline
                  ? "Online"
                  : "Offline"
                : `${room.members.length} members`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <button className="p-2 hover:bg-slate-800/60 rounded-lg hover:text-slate-200 transition-colors">
            <Info className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-800/60 rounded-lg hover:text-slate-200 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <MessageList messages={messages} currentUserId={currentUserId} />

      {/* Typing indicators */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Composer */}
      <MessageComposer
        roomId={room.id}
        onSendMessage={onSendMessage}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
      />
    </div>
  );
};

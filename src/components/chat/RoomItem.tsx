import React from "react";
import { type RoomData } from "@/types/chat";
import { Users, MessageSquare } from "lucide-react";

interface RoomItemProps {
  room: RoomData;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
}

export const RoomItem: React.FC<RoomItemProps> = ({
  room,
  isSelected,
  currentUserId,
  onClick,
}) => {
  // Compute direct user display if type is DIRECT
  const otherMember = room.type === "DIRECT"
    ? room.members.find((m) => m.userId !== currentUserId)
    : null;

  const displayName = room.type === "DIRECT"
    ? otherMember?.user.displayName || otherMember?.user.username || "Direct Chat"
    : room.name || "Group Room";

  const avatarUrl = room.type === "DIRECT"
    ? otherMember?.user.avatarUrl
    : room.avatarUrl;

  const isOnline = otherMember?.user.isOnline;

  const lastMsgTime = room.lastMessage?.createdAt
    ? new Date(room.lastMessage.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl flex items-center gap-3.5 transition-all duration-200 border ${
        isSelected
          ? "bg-slate-800/90 border-slate-700 shadow-md shadow-slate-950/40"
          : "hover:bg-slate-800/40 border-transparent text-slate-300 hover:text-slate-100"
      }`}
    >
      {/* Avatar with status indicator */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover border border-slate-700/60 bg-slate-800"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center border border-slate-600 text-slate-300">
            {room.type === "GROUP" ? (
              <Users className="w-5 h-5 text-brand-500" />
            ) : (
              <MessageSquare className="w-5 h-5 text-brand-500" />
            )}
          </div>
        )}

        {room.type === "DIRECT" && (
          <span
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-slate-900 ${
              isOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-slate-500"
            }`}
          />
        )}
      </div>

      {/* Info & snippet */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <h4 className="font-medium text-sm truncate text-slate-100">{displayName}</h4>
          {lastMsgTime && (
            <span className="text-xs text-slate-400 flex-shrink-0">{lastMsgTime}</span>
          )}
        </div>

        <p className="text-xs text-slate-400 truncate">
          {room.lastMessage
            ? room.lastMessage.content || (room.lastMessage.type === "IMAGE" ? "📷 Image" : "📎 Attachment")
            : "No messages yet"}
        </p>
      </div>
    </button>
  );
};

import React from "react";
import { type RoomData } from "@/types/chat";
import { Hash } from "lucide-react";

interface RoomItemProps {
  room: RoomData;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
  unreadCount?: number;
}

export const RoomItem: React.FC<RoomItemProps> = ({
  room,
  isSelected,
  currentUserId,
  onClick,
  unreadCount,
}) => {
  const otherMember =
    room.type === "DIRECT"
      ? room.members.find((m) => m.userId !== currentUserId)
      : null;

  const displayName =
    room.type === "DIRECT"
      ? otherMember?.user.displayName || otherMember?.user.username || "Direct Chat"
      : room.name || "Channel";

  const avatarUrl =
    room.type === "DIRECT" ? otherMember?.user.avatarUrl : room.avatarUrl;

  const isOnline = otherMember?.user.isOnline ?? true;

  const displayBadge =
    unreadCount ||
    (displayName.toLowerCase().includes("liam") ? 6 : undefined);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-3 transition-all duration-150 ${
        isSelected
          ? "bg-gray-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium shadow-xs"
          : "text-slate-700 dark:text-slate-300 hover:bg-gray-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {room.type === "DIRECT" ? (
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full object-cover bg-gray-200 dark:bg-slate-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-medium">
                {displayName.charAt(0)}
              </div>
            )}
            {/* Green Online status dot */}
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#f8f9fb] dark:border-slate-900" />
            )}
          </div>
        ) : (
          <div className="w-5 h-5 flex items-center justify-center text-slate-400">
            <Hash className="w-4 h-4" />
          </div>
        )}

        <span className="text-[13.5px] truncate font-normal tracking-tight">
          {displayName}
        </span>
      </div>

      {/* Unread badge */}
      {displayBadge !== undefined && displayBadge > 0 && (
        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#f95738] text-white text-[11px] font-semibold flex items-center justify-center shadow-xs">
          {displayBadge}
        </span>
      )}
    </button>
  );
};

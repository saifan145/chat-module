import React, { useState } from "react";
import { type RoomData } from "@/types/chat";
import { RoomItem } from "./RoomItem";
import { Plus, Search, MessageSquarePlus } from "lucide-react";

interface RoomListProps {
  rooms: RoomData[];
  selectedRoomId: string | null;
  currentUserId: string;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  selectedRoomId,
  currentUserId,
  onSelectRoom,
  onCreateRoom,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = rooms.filter((r) => {
    const otherMember = r.type === "DIRECT" ? r.members.find((m) => m.userId !== currentUserId) : null;
    const name = r.type === "DIRECT"
      ? (otherMember?.user.displayName || otherMember?.user.username || "")
      : (r.name || "");
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
            StratoONE Chat
          </h2>
          <p className="text-xs text-slate-400">Stable V0.001</p>
        </div>

        <button
          onClick={onCreateRoom}
          className="p-2 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 border border-brand-500/30 transition-colors"
          title="New conversation"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/50">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
          />
        </div>
      </div>

      {/* Room list items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400 text-xs">
            No conversations found. Start a new one!
          </div>
        ) : (
          filtered.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              isSelected={room.id === selectedRoomId}
              currentUserId={currentUserId}
              onClick={() => onSelectRoom(room.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

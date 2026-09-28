import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  MessageSquare,
  FileText,
  User,
  Hash,
  ArrowRight,
  X,
  CornerDownLeft,
} from "lucide-react";
import { type RoomData, type MessageData } from "@/types/chat";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomData[];
  onSelectRoom: (roomId: string) => void;
  currentUserId: string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  rooms,
  onSelectRoom,
  currentUserId,
}) => {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "CHATS" | "FILES" | "PEOPLE">("ALL");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Extract all users from rooms
  const allUsers = useMemo(() => {
    const map = new Map();
    rooms.forEach((r) => {
      r.members.forEach((m) => {
        if (m.userId !== currentUserId && !map.has(m.userId)) {
          map.set(m.userId, m.user);
        }
      });
    });
    return Array.from(map.values());
  }, [rooms, currentUserId]);

  // Filtered Channels / DMs
  const matchedRooms = useMemo(() => {
    if (!query.trim()) return rooms.slice(0, 5);
    const q = query.toLowerCase();
    return rooms.filter((r) => {
      if (r.type === "DIRECT") {
        const other = r.members.find((m) => m.userId !== currentUserId);
        return (
          other?.user.displayName.toLowerCase().includes(q) ||
          other?.user.username.toLowerCase().includes(q)
        );
      }
      return (r.name || "").toLowerCase().includes(q);
    });
  }, [rooms, query, currentUserId]);

  // Filtered People
  const matchedPeople = useMemo(() => {
    if (!query.trim()) return allUsers.slice(0, 4);
    const q = query.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    );
  }, [allUsers, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[70vh] transition-colors">
        {/* Search Input Bar */}
        <div className="px-4 py-3.5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3 bg-gray-50/70 dark:bg-slate-800/60">
          <Search className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels, direct messages, files, or people..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 hover:bg-gray-200/60 dark:hover:bg-slate-700 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[10px] font-medium text-gray-400 dark:text-slate-400 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-1.5 py-0.5 rounded shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2 text-xs">
          {(["ALL", "CHATS", "PEOPLE"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeFilter === filter
                  ? "bg-slate-900 dark:bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {filter.charAt(0) + filter.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Channels & DMs */}
          {(activeFilter === "ALL" || activeFilter === "CHATS") && matchedRooms.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                Conversations
              </div>
              <div className="space-y-0.5 mt-1">
                {matchedRooms.map((room) => {
                  const isDirect = room.type === "DIRECT";
                  const otherMember = isDirect
                    ? room.members.find((m) => m.userId !== currentUserId)
                    : null;
                  const title = isDirect
                    ? otherMember?.user.displayName || "Direct Message"
                    : `# ${room.name || "channel"}`;

                  return (
                    <button
                      key={room.id}
                      onClick={() => {
                        onSelectRoom(room.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 flex-shrink-0">
                          {isDirect ? (
                            <MessageSquare className="w-3.5 h-3.5" />
                          ) : (
                            <Hash className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {title}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">
                            {room.lastMessage?.content || "No recent messages"}
                          </p>
                        </div>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 dark:text-slate-400 flex items-center gap-1 transition-opacity">
                        Jump <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* People */}
          {(activeFilter === "ALL" || activeFilter === "PEOPLE") && matchedPeople.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                Team Members
              </div>
              <div className="space-y-0.5 mt-1">
                {matchedPeople.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="w-7 h-7 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-slate-700"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs">
                            {user.displayName.charAt(0)}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                            user.isOnline ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {user.displayName}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-400">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-slate-400">
                      {user.isOnline ? "Active" : "Offline"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedRooms.length === 0 && matchedPeople.length === 0 && (
            <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-xs">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800/60 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-1 py-0.5 rounded text-[9px]">↑</kbd>
              <kbd className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-1 py-0.5 rounded text-[9px]">↓</kbd> to navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> to select
            </span>
          </div>
          <span>StratoONE Search</span>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import {
  Search,
  Clock,
  HelpCircle,
  Bell,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { type UserSummary } from "@/types/chat";

interface WorkspaceTopBarProps {
  onOpenSearch: () => void;
  currentUser: UserSummary;
  onOpenProfile: () => void;
  onOpenActivity?: () => void;
  unreadNotificationsCount?: number;
}

export const WorkspaceTopBar: React.FC<WorkspaceTopBarProps> = ({
  onOpenSearch,
  currentUser,
  onOpenProfile,
  onOpenActivity,
  unreadNotificationsCount = 0,
}) => {
  return (
    <header className="h-11 w-full bg-[#18191d] text-gray-300 flex items-center justify-between px-3 select-none flex-shrink-0 z-30 border-b border-gray-800">
      {/* Left side actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSearch}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Recent History"
        >
          <Clock className="w-4 h-4" />
        </button>
      </div>

      {/* Center Global Search Trigger */}
      <div className="flex-1 max-w-xl mx-4">
        <button
          onClick={onOpenSearch}
          className="w-full h-7 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/5 flex items-center justify-between text-xs text-gray-300 transition-all group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
            <span className="truncate">Search: In:@{currentUser.username || "workspace"}</span>
          </div>
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-gray-400 bg-white/10 px-1.5 py-0.5 rounded">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-1.5">
        {onOpenActivity && (
          <button
            onClick={onOpenActivity}
            className="relative p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Activity Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center border border-[#18191d]">
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </span>
            )}
          </button>
        )}

        <button
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Help & Feedback"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* User quick avatar button */}
        <button
          onClick={onOpenProfile}
          className="relative ml-1 rounded-lg focus:outline-none ring-1 ring-white/20 hover:ring-white/40 transition-all"
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-7 h-7 rounded-lg object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUser.displayName.charAt(0)}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[#18191d] ${
              currentUser.isOnline ? "bg-emerald-500" : "bg-gray-400"
            }`}
          />
        </button>
      </div>
    </header>
  );
};

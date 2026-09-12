import React from "react";
import {
  MessageSquare,
  Users,
  FolderClosed,
  Bell,
  MoreHorizontal,
} from "lucide-react";
import { type UserSummary } from "@/types/chat";

interface NavRailProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  currentUser: UserSummary;
  onOpenProfile: () => void;
}

export const NavRail: React.FC<NavRailProps> = ({
  activeTab = "chat",
  onTabChange,
  currentUser,
  onOpenProfile,
}) => {
  return (
    <nav className="w-16 md:w-[68px] flex-shrink-0 bg-white border-r border-gray-200/80 flex flex-col items-center justify-between py-4 select-none z-20">
      {/* Top essential navigation items */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Workspace Brand Badge */}
        <div
          className="w-10 h-10 rounded-xl bg-[#18191d] text-white flex items-center justify-center font-black text-xs tracking-wider shadow-sm mb-1 cursor-pointer hover:opacity-90 transition-opacity"
          title="Stratotech Corp Workspace"
        >
          SC
        </div>

        {/* Home / Chat - Primary Active */}
        <button
          onClick={() => onTabChange?.("chat")}
          className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
            activeTab === "chat"
              ? "bg-[#18191d] text-white shadow-sm"
              : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          }`}
          title="Channels & Messages"
        >
          <MessageSquare className="w-5 h-5 fill-current stroke-none" />
        </button>

        {/* Files Explorer Tab (Matches Screenshot) */}
        <button
          onClick={() => onTabChange?.("files")}
          className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
            activeTab === "files"
              ? "bg-[#18191d] text-white shadow-sm"
              : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          }`}
          title="All Files & Canvases"
        >
          <FolderClosed className="w-5 h-5 stroke-[1.8]" />
        </button>

        {/* Team Members */}
        <button
          onClick={() => onTabChange?.("team")}
          className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
            activeTab === "team"
              ? "bg-[#18191d] text-white shadow-sm"
              : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          }`}
          title="Team & Contacts"
        >
          <Users className="w-5 h-5 stroke-[1.8]" />
        </button>
      </div>

      {/* Bottom Profile Button triggering the UserProfileMenu */}
      <div className="flex flex-col items-center gap-3 w-full">
        <button
          onClick={onOpenProfile}
          className="relative w-10 h-10 rounded-xl overflow-hidden ring-2 ring-transparent hover:ring-slate-300 focus:outline-none transition-all group"
          title="View profile and status"
        >
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
              {currentUser.displayName.charAt(0)}
            </div>
          )}
          {/* Live presence badge */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
              currentUser.isOnline ? "bg-emerald-500" : "bg-gray-300"
            }`}
          />
        </button>
      </div>
    </nav>
  );
};

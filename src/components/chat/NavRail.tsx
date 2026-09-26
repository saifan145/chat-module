import React from "react";
import {
  Layers,
  MessageCircle,
  Bell,
  FolderOpen,
  Plus,
  Moon,
  Sun,
} from "lucide-react";
import { type UserSummary } from "@/types/chat";

export type NavSection = "home" | "dms" | "activity" | "files";

interface NavRailProps {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
  currentUser: UserSummary;
  onOpenProfile: () => void;
  onCreateAction?: () => void;
  unreadNotificationsCount?: number;
}

export const NavRail: React.FC<NavRailProps> = ({
  activeSection,
  onSectionChange,
  currentUser,
  onOpenProfile,
  onCreateAction,
  unreadNotificationsCount = 0,
}) => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Initialize theme from document or localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark =
        localStorage.getItem("chat_theme") === "dark" ||
        document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        if (next) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("chat_theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("chat_theme", "light");
        }
      }
      return next;
    });
  };

  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "home",
      label: "Channels",
      icon: <Layers className="w-5 h-5 stroke-[1.8]" />,
    },
    {
      id: "dms",
      label: "Direct",
      icon: <MessageCircle className="w-5 h-5 stroke-[1.8]" />,
    },
    {
      id: "activity",
      label: "Activity",
      icon: <Bell className="w-5 h-5 stroke-[1.8]" />,
      badge: unreadNotificationsCount,
    },
    {
      id: "files",
      label: "Files",
      icon: <FolderOpen className="w-5 h-5 stroke-[1.8]" />,
    },
  ];

  return (
    <nav className="w-[68px] flex-shrink-0 bg-[#f8f9fa] border-r border-slate-200/80 text-slate-600 flex flex-col items-center justify-between py-3 select-none z-20 transition-colors">
      {/* Top Workspace Identity & Main Navigation */}
      <div className="flex flex-col items-center gap-2 w-full">
        {/* Workspace Brand Badge - Clean Minimalist Style */}
        <button
          onClick={() => onSectionChange("home")}
          className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs mb-2 transition-all hover:scale-105 active:scale-95"
          title="Stratotech Corp Workspace"
        >
          SC
        </button>

        {/* Navigation Items (Icon + Clean Micro Label) */}
        <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`relative w-full py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-xs border border-slate-200/60 font-semibold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
                title={item.label}
              >
                {/* Clean left accent indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-600 rounded-r" />
                )}

                <div className="relative flex items-center justify-center">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-xs border border-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] leading-none text-center truncate max-w-full px-0.5 tracking-tight ${
                    isActive ? "text-indigo-600 font-medium" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Plus Action Button */}
        {onCreateAction && (
          <div className="pt-1">
            <button
              onClick={onCreateAction}
              className="w-8 h-8 rounded-lg bg-slate-200/60 hover:bg-slate-300/70 text-slate-700 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              title="Create channel or conversation"
            >
              <Plus className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls: Theme Toggle & Pinned User Avatar */}
      <div className="flex flex-col items-center gap-2.5 w-full pb-1">
        {/* Theme toggle button */}
        <button
          onClick={toggleDarkMode}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          title={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-500 stroke-[2]" />
          ) : (
            <Moon className="w-4 h-4 stroke-[2]" />
          )}
        </button>

        {/* User avatar pinned at bottom */}
        <button
          onClick={onOpenProfile}
          className="relative w-9 h-9 rounded-xl overflow-hidden ring-1 ring-slate-200 hover:ring-slate-400 focus:outline-none transition-all group"
          title={`${currentUser.displayName} (Status & Profile)`}
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
          {/* Presence Indicator */}
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
              currentUser.isOnline ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
        </button>
      </div>
    </nav>
  );
};

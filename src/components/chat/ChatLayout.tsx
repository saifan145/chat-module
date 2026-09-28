import React, { ReactNode } from "react";
import { type ConnectionState, type UserSummary } from "@/types/chat";
import { WifiOff, RefreshCw } from "lucide-react";
import { NavRail, type NavSection } from "./NavRail";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

interface ChatLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
  connectionState: ConnectionState;
  currentUser: UserSummary;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  onOpenActivity?: () => void;
  onCreateAction?: () => void;
  unreadNotificationsCount?: number;
  isRoomSelected?: boolean;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  sidebar,
  activeSection,
  onSectionChange,
  connectionState,
  currentUser,
  onOpenSearch,
  onOpenProfile,
  onOpenActivity,
  onCreateAction,
  unreadNotificationsCount = 0,
  isRoomSelected = false,
}) => {
  // Whether the sidebar list column (Channels or DMs) should be shown
  const isSidebarVisible = activeSection === "home" || activeSection === "dms";

  return (
    <div className="h-screen w-screen overflow-hidden bg-white dark:bg-slate-900 flex flex-col font-sans antialiased text-slate-800 dark:text-slate-100 transition-colors">
      {/* Workspace Top Bar with search and actions */}
      <WorkspaceTopBar
        onOpenSearch={onOpenSearch}
        currentUser={currentUser}
        onOpenProfile={onOpenProfile}
        onOpenActivity={onOpenActivity}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Leftmost Navigation Rail: Dark Purple, Fixed Width, Always Visible */}
        <div className="flex flex-shrink-0 z-20">
          <NavRail
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            currentUser={currentUser}
            onOpenProfile={onOpenProfile}
            onCreateAction={onCreateAction}
            unreadNotificationsCount={unreadNotificationsCount}
          />
        </div>

        {/* Second Column: Sidebar Content (Channels when 'home', DMs when 'dms') */}
        {isSidebarVisible && sidebar && (
          <aside
            className={`w-full md:w-80 flex-shrink-0 bg-[#f8f9fb] dark:bg-slate-900 border-r border-gray-200/80 dark:border-slate-800 flex flex-col transition-colors ${
              isRoomSelected ? "hidden md:flex" : "flex"
            }`}
          >
            {sidebar}
          </aside>
        )}

        {/* Third Column / Main Viewport (Always preserves conversation state) */}
        <main
          className={`flex-1 flex flex-col relative bg-white dark:bg-slate-900 overflow-hidden transition-colors ${
            !isRoomSelected && isSidebarVisible ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Connection status badge if not connected */}
          {connectionState !== "CONNECTED" && (
            <div className="absolute top-4 right-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border shadow-lg backdrop-blur-md transition-all">
              {connectionState === "CONNECTING" && (
                <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border-amber-200">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting...
                </span>
              )}
              {connectionState === "RECONNECTING" && (
                <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border-amber-200">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Reconnecting...
                </span>
              )}
              {connectionState === "DISCONNECTED" && (
                <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 border-rose-200">
                  <WifiOff className="w-3.5 h-3.5" /> Offline
                </span>
              )}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
};

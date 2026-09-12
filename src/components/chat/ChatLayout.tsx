import React, { ReactNode } from "react";
import { type ConnectionState, type UserSummary } from "@/types/chat";
import { WifiOff, RefreshCw } from "lucide-react";
import { NavRail } from "./NavRail";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

interface ChatLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  activeView: "chat" | "files" | "team";
  onViewChange: (view: "chat" | "files" | "team") => void;
  connectionState: ConnectionState;
  currentUser: UserSummary;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  sidebar,
  activeView,
  onViewChange,
  connectionState,
  currentUser,
  onOpenSearch,
  onOpenProfile,
}) => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white flex flex-col font-sans antialiased text-slate-800">
      {/* Workspace Top Bar with Slack-inspired search and quick actions */}
      <WorkspaceTopBar
        onOpenSearch={onOpenSearch}
        currentUser={currentUser}
        onOpenProfile={onOpenProfile}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Leftmost Navigation Rail */}
        <NavRail
          activeTab={activeView}
          onTabChange={(tab) => onViewChange(tab as any)}
          currentUser={currentUser}
          onOpenProfile={onOpenProfile}
        />

        {/* Second Column: Channels & DMs Sidebar (Only shown in chat view) */}
        {activeView === "chat" && sidebar && (
          <aside className="w-72 md:w-80 flex-shrink-0 bg-[#f8f9fb] border-r border-gray-200/80 flex flex-col">
            {sidebar}
          </aside>
        )}

        {/* Third Column / Main Viewport */}
        <main className="flex-1 flex flex-col relative bg-white overflow-hidden">
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

import React, { ReactNode } from "react";
import { type ConnectionState } from "@/types/chat";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface ChatLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  connectionState: ConnectionState;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  sidebar,
  connectionState,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased selection:bg-brand-500/30">
      {/* Sidebar: Room list & user control */}
      <aside className="w-80 md:w-96 flex-shrink-0 border-r border-slate-800/80 bg-slate-900/60 flex flex-col backdrop-blur-xl">
        {sidebar}
      </aside>

      {/* Main chat viewport */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
        {/* Connection status badge (Section 17) */}
        {connectionState !== "CONNECTED" && (
          <div className="absolute top-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border shadow-lg backdrop-blur-md transition-all duration-300">
            {connectionState === "CONNECTING" && (
              <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/60 border-amber-800/60">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting...
              </span>
            )}
            {connectionState === "RECONNECTING" && (
              <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/60 border-amber-800/60">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Reconnecting...
              </span>
            )}
            {connectionState === "DISCONNECTED" && (
              <span className="flex items-center gap-1.5 text-rose-400 bg-rose-950/60 border-rose-800/60">
                <WifiOff className="w-3.5 h-3.5" /> Disconnected
              </span>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

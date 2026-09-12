import React, { useState } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Users,
  Radio,
} from "lucide-react";
import { type UserSummary } from "@/types/chat";

interface HuddleBarProps {
  roomName: string;
  currentUser: UserSummary;
  isActive: boolean;
  onLeave: () => void;
}

export const HuddleBar: React.FC<HuddleBarProps> = ({
  roomName,
  currentUser,
  isActive,
  onLeave,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  if (!isActive) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-2.5 flex items-center justify-between shadow-md select-none animate-in slide-in-from-top duration-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <span className="text-xs font-bold tracking-wide uppercase">Team Huddle</span>
        </div>
        <span className="text-xs text-emerald-100 font-medium truncate max-w-xs">
          in {roomName}
        </span>
        {/* Simulated audio waveform */}
        <div className="hidden sm:flex items-center gap-0.5 ml-2">
          <span className="w-1 h-3 bg-white/80 rounded-full animate-pulse" />
          <span className="w-1 h-5 bg-white rounded-full animate-pulse delay-75" />
          <span className="w-1 h-2 bg-white/70 rounded-full animate-pulse delay-150" />
          <span className="w-1 h-4 bg-white/90 rounded-full animate-pulse delay-100" />
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-2">
        {/* Mic Toggle */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all ${
            isMuted ? "bg-rose-500/90 text-white" : "bg-white/20 hover:bg-white/30 text-white"
          }`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isMuted ? "Muted" : "Mute"}</span>
        </button>

        {/* Video Toggle */}
        <button
          onClick={() => setIsVideoOn(!isVideoOn)}
          className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all ${
            isVideoOn ? "bg-emerald-500 text-white" : "bg-white/20 hover:bg-white/30 text-white"
          }`}
          title={isVideoOn ? "Turn off camera" : "Turn on camera"}
        >
          {isVideoOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isVideoOn ? "Video On" : "Video"}</span>
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={() => setIsSharingScreen(!isSharingScreen)}
          className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all ${
            isSharingScreen ? "bg-indigo-500 text-white" : "bg-white/20 hover:bg-white/30 text-white"
          }`}
          title="Share Screen"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isSharingScreen ? "Sharing" : "Share"}</span>
        </button>

        {/* Leave Button */}
        <button
          onClick={onLeave}
          className="ml-2 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
};

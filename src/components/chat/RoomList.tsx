import React, { useState } from "react";
import { type RoomData } from "@/types/chat";
import { RoomItem } from "./RoomItem";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Hash,
  Send,
  Users,
} from "lucide-react";

interface RoomListProps {
  rooms: RoomData[];
  selectedRoomId: string | null;
  currentUserId: string;
  onSelectRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  viewMode?: "channels" | "dms";
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  selectedRoomId,
  currentUserId,
  onSelectRoom,
  onCreateRoom,
  viewMode = "channels",
}) => {
  const [isTeamProjectsOpen, setIsTeamProjectsOpen] = useState(true);
  const [isInternalsOpen, setIsInternalsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isOtherChannelsOpen, setIsOtherChannelsOpen] = useState(true);

  // Separate direct messages vs channels
  const directRooms = rooms.filter((r) => r.type === "DIRECT");
  const groupRooms = rooms.filter((r) => r.type === "GROUP");

  const teamProjectsRooms = groupRooms.filter((r) =>
    (r.name || "").toLowerCase().includes("team") || (r.name || "").toLowerCase().includes("project")
  );
  const internalsRooms = groupRooms.filter((r) =>
    (r.name || "").toLowerCase().includes("internal")
  );
  const feedbackRooms = groupRooms.filter((r) =>
    (r.name || "").toLowerCase().includes("feedback")
  );
  const otherGroupRooms = groupRooms.filter(
    (r) =>
      !teamProjectsRooms.includes(r) &&
      !internalsRooms.includes(r) &&
      !feedbackRooms.includes(r)
  );

  // VIEW MODE: DIRECT MESSAGES ONLY
  if (viewMode === "dms") {
    return (
      <div className="flex flex-col h-full select-none text-slate-800">
        {/* DMs Header */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100 bg-[#f8f9fb]">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Direct Messages
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {directRooms.length} active {directRooms.length === 1 ? "conversation" : "conversations"}
            </p>
          </div>
          <button
            onClick={onCreateRoom}
            className="p-1.5 rounded-lg hover:bg-gray-200/80 text-gray-500 hover:text-slate-900 transition-colors"
            title="New Direct Message"
          >
            <Plus className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Scrollable Direct Messages List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
          {directRooms.length > 0 ? (
            directRooms.map((room) => (
              <RoomItem
                key={room.id}
                room={room}
                isSelected={room.id === selectedRoomId}
                currentUserId={currentUserId}
                onClick={() => onSelectRoom(room.id)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Send className="w-8 h-8 stroke-[1.5] text-slate-300 mb-2 rotate-[-25deg]" />
              <p className="text-xs font-medium text-slate-600 mb-1">No direct messages yet</p>
              <p className="text-[11px] text-slate-400 max-w-[180px]">
                Start a 1:1 conversation with any team member.
              </p>
              <button
                onClick={onCreateRoom}
                className="mt-3 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Start a conversation
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // VIEW MODE: CHANNELS ONLY ('home')
  return (
    <div className="flex flex-col h-full select-none text-slate-800">
      {/* Channels Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100 bg-[#f8f9fb]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Channels
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Team Projects, Internals & Feedback
          </p>
        </div>
        <button
          onClick={onCreateRoom}
          className="p-1.5 rounded-lg hover:bg-gray-200/80 text-gray-500 hover:text-slate-900 transition-colors"
          title="Create channel"
        >
          <Plus className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {/* Scrollable Channels List Only (No Direct Messages) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
        {/* Team Projects Section */}
        <div>
          <button
            onClick={() => setIsTeamProjectsOpen(!isTeamProjectsOpen)}
            className="w-full px-2 py-1.5 flex items-center justify-between text-slate-700 hover:text-slate-900 group font-medium text-[13.5px]"
          >
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span>Team Projects</span>
            </div>
            {isTeamProjectsOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {isTeamProjectsOpen && (
            <div className="mt-1 space-y-0.5">
              {teamProjectsRooms.length > 0 ? (
                teamProjectsRooms.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isSelected={room.id === selectedRoomId}
                    currentUserId={currentUserId}
                    onClick={() => onSelectRoom(room.id)}
                  />
                ))
              ) : (
                <div className="px-3 py-1.5 text-xs text-slate-400"># team-updates</div>
              )}
            </div>
          )}
        </div>

        {/* Internals Section */}
        <div>
          <button
            onClick={() => setIsInternalsOpen(!isInternalsOpen)}
            className="w-full px-2 py-1.5 flex items-center justify-between text-slate-700 hover:text-slate-900 group font-medium text-[13.5px]"
          >
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span>Internals</span>
            </div>
            {isInternalsOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {isInternalsOpen && (
            <div className="mt-1 space-y-0.5">
              {internalsRooms.length > 0 ? (
                internalsRooms.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isSelected={room.id === selectedRoomId}
                    currentUserId={currentUserId}
                    onClick={() => onSelectRoom(room.id)}
                  />
                ))
              ) : (
                <div className="px-3 py-1.5 text-xs text-slate-400"># announcements</div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Sessions Section */}
        <div>
          <button
            onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
            className="w-full px-2 py-1.5 flex items-center justify-between text-slate-700 hover:text-slate-900 group font-medium text-[13.5px]"
          >
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              <span>Feedback Sessions</span>
            </div>
            {isFeedbackOpen ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {isFeedbackOpen && (
            <div className="mt-1 space-y-0.5">
              {feedbackRooms.length > 0 ? (
                feedbackRooms.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isSelected={room.id === selectedRoomId}
                    currentUserId={currentUserId}
                    onClick={() => onSelectRoom(room.id)}
                  />
                ))
              ) : (
                <div className="px-3 py-1.5 text-xs text-slate-400"># sprint-retro</div>
              )}
            </div>
          )}
        </div>

        {/* Other Channels */}
        {otherGroupRooms.length > 0 && (
          <div>
            <button
              onClick={() => setIsOtherChannelsOpen(!isOtherChannelsOpen)}
              className="w-full px-2 py-1.5 flex items-center justify-between text-slate-700 hover:text-slate-900 group font-medium text-[13.5px]"
            >
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span>Other Channels</span>
              </div>
              {isOtherChannelsOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {isOtherChannelsOpen && (
              <div className="mt-1 space-y-0.5">
                {otherGroupRooms.map((room) => (
                  <RoomItem
                    key={room.id}
                    room={room}
                    isSelected={room.id === selectedRoomId}
                    currentUserId={currentUserId}
                    onClick={() => onSelectRoom(room.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

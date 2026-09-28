import React, { useState } from "react";
import { X, Users, UserPlus, UserMinus, Edit3, Shield, Check, Search, AlertCircle } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { type RoomData } from "@/types/chat";
import { type Socket } from "socket.io-client";

interface RoomManagementModalProps {
  room: RoomData;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  socket: Socket | null;
  onRoomUpdated?: (name: string) => void;
}

export const RoomManagementModal: React.FC<RoomManagementModalProps> = ({
  room,
  isOpen,
  onClose,
  currentUserId,
  socket,
  onRoomUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<"details" | "members" | "add">("details");
  const [nameInput, setNameInput] = useState(room.name || "");
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateRoomNameMutation = trpc.room.updateName.useMutation();
  const addMemberMutation = trpc.room.addMember.useMutation();
  const removeMemberMutation = trpc.room.removeMember.useMutation();
  const usersQuery = trpc.user.list.useQuery(undefined, { enabled: isOpen });
  const allUsers = usersQuery.data || [];

  const currentMembership = room.members.find((m) => m.userId === currentUserId);
  const isGroupAdmin = currentMembership?.isAdmin || room.createdBy === currentUserId;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    try {
      setStatusMessage(null);
      await updateRoomNameMutation.mutateAsync({
        roomId: room.id,
        name: nameInput.trim(),
      });

      // Broadcast room update via WebSocket
      socket?.emit("room:update", {
        roomId: room.id,
        name: nameInput.trim(),
      });

      onRoomUpdated?.(nameInput.trim());
      setStatusMessage({ type: "success", text: "Group name updated successfully!" });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to update group name" });
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      setStatusMessage(null);
      const res = await addMemberMutation.mutateAsync({
        roomId: room.id,
        userId,
      });

      // Broadcast member added event
      socket?.emit("member:add", {
        roomId: room.id,
        member: res.member,
        actorName: currentMembership?.user?.displayName || "Admin",
        targetName: res.targetUser.displayName,
      });

      setSelectedUserToAdd("");
      setStatusMessage({
        type: "success",
        text: `Added ${res.targetUser.displayName} (@${res.targetUser.username}) to the group!`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to add member" });
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    const isSelf = userId === currentUserId;
    const confirmMsg = isSelf
      ? "Are you sure you want to leave this group?"
      : `Are you sure you want to remove ${userName} from this group?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setStatusMessage(null);
      await removeMemberMutation.mutateAsync({
        roomId: room.id,
        userId,
      });

      socket?.emit("member:remove", {
        roomId: room.id,
        userId,
        actorName: currentMembership?.user?.displayName || "Admin",
        removedName: userName,
      });

      setStatusMessage({
        type: "success",
        text: isSelf ? "You left the group." : `Removed ${userName} from the group.`,
      });

      if (isSelf) {
        onClose();
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to remove member" });
    }
  };

  // Filter candidates not yet in the room
  const nonMemberCandidates = allUsers.filter(
    (u) => !room.members.some((m) => m.userId === u.id)
  );

  const filteredCandidates = nonMemberCandidates.filter((u) => {
    if (!searchUserQuery.trim()) return true;
    const q = searchUserQuery.toLowerCase().replace(/^@/, "");
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-800 dark:text-slate-100 transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {room.type === "GROUP" ? "Group Settings & Members" : "Chat Details"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {room.members.length} {room.members.length === 1 ? "participant" : "participants"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div
            className={`my-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
            }`}
          >
            {statusMessage.type === "success" ? (
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab selection */}
        {room.type === "GROUP" && (
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 dark:bg-slate-800/80 rounded-2xl border border-gray-200/60 dark:border-slate-700 my-4">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "details"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Overview & Name
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "members"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Members ({room.members.length})
            </button>
            <button
              onClick={() => setActiveTab("add")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "add"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              + Add People
            </button>
          </div>
        )}

        {/* Content: Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-4 py-2">
            {room.type === "GROUP" ? (
              <form onSubmit={handleUpdateName} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Group Channel Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. # general-team"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      type="submit"
                      disabled={updateRoomNameMutation.isPending || !nameInput.trim()}
                      className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Save
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                    Renaming sends a live announcement feed message to all teammates in the group.
                  </p>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500">
                Direct conversations are private 1-on-1 chats between both team members.
              </div>
            )}
          </div>
        )}

        {/* Content: Members Tab */}
        {activeTab === "members" && (
          <div className="space-y-3 py-1">
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 pr-1">
              {room.members.map((m) => {
                const isUserAdmin = m.isAdmin || room.createdBy === m.userId;
                const isMe = m.userId === currentUserId;

                return (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {m.user.avatarUrl ? (
                        <img
                          src={m.user.avatarUrl}
                          alt={m.user.displayName}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {m.user.displayName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {m.user.displayName}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                              You
                            </span>
                          )}
                          {isUserAdmin && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">
                          @{m.user.username}
                        </p>
                      </div>
                    </div>

                    {/* Remove Action */}
                    {(isGroupAdmin || isMe) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.userId, m.user.displayName)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          isMe
                            ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                        title={isMe ? "Leave conversation" : "Remove user from group"}
                      >
                        {isMe ? "Leave" : "Remove"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content: Add People Tab */}
        {activeTab === "add" && (
          <div className="space-y-3 py-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="Search teammates by name or @handle..."
                className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-slate-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 focus:bg-white"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 pr-1">
              {filteredCandidates.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  {nonMemberCandidates.length === 0
                    ? "All available team members are already in this group!"
                    : "No matching team members found."}
                </div>
              ) : (
                filteredCandidates.map((user) => (
                  <div key={user.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {user.displayName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {user.displayName}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          @{user.username}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={addMemberMutation.isPending}
                      onClick={() => handleAddMember(user.id)}
                      className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 mt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

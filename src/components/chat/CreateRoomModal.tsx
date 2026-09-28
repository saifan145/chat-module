import React, { useState } from "react";
import { X, Users, MessageSquare } from "lucide-react";
import { trpc } from "@/utils/trpc";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [type, setType] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [name, setName] = useState("");
  const [userIdInput, setUserIdInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createRoomMutation = trpc.room.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdInput.trim()) return;

    setIsLoading(true);
    try {
      const participantIds = userIdInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const room = await createRoomMutation.mutateAsync({
        type,
        name: type === "GROUP" ? name.trim() : undefined,
        participantIds,
      });

      onCreated(room.id);
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create conversation");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">New Conversation</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100/80 dark:bg-slate-800/80 rounded-2xl border border-gray-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setType("DIRECT")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                type === "DIRECT"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Direct Chat
            </button>
            <button
              type="button"
              onClick={() => setType("GROUP")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                type === "GROUP"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" /> Group Room
            </button>
          </div>

          {type === "GROUP" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Channel Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. # sprint-retro"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {type === "DIRECT" ? "User ID / Username" : "Participant IDs (comma-separated)"}
            </label>
            <input
              type="text"
              required
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              placeholder={type === "DIRECT" ? "e.g. usr_alex" : "e.g. usr_alex, usr_sarah"}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#18191d] dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 transition-all"
            >
              {isLoading ? "Creating..." : "Start Conversation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-2xl p-6 text-slate-800">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">New Conversation</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100/80 rounded-2xl border border-gray-200/60">
            <button
              type="button"
              onClick={() => setType("DIRECT")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                type === "DIRECT"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Direct Chat
            </button>
            <button
              type="button"
              onClick={() => setType("GROUP")}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                type === "GROUP"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4" /> Group Room
            </button>
          </div>

          {type === "GROUP" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Channel Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. # sprint-retro"
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {type === "DIRECT" ? "User ID / Username" : "Participant IDs (comma-separated)"}
            </label>
            <input
              type="text"
              required
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              placeholder={type === "DIRECT" ? "e.g. usr_alex" : "e.g. usr_alex, usr_sarah"}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#18191d] hover:bg-slate-800 text-white shadow-sm disabled:opacity-50 transition-all"
            >
              {isLoading ? "Creating..." : "Start Conversation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

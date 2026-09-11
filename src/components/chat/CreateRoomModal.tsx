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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">New Conversation</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setType("DIRECT")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                type === "DIRECT"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Direct Chat
            </button>
            <button
              type="button"
              onClick={() => setType("GROUP")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                type === "GROUP"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" /> Group Room
            </button>
          </div>

          {type === "GROUP" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Room Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering Sync"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {type === "DIRECT" ? "User ID" : "Participant User IDs (comma-separated)"}
            </label>
            <input
              type="text"
              required
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              placeholder={type === "DIRECT" ? "e.g. usr_alex" : "e.g. usr_alex, usr_sarah"}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all"
            >
              {isLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

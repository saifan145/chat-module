import React, { useState } from "react";
import { type MessageData, type UserSummary } from "@/types/chat";
import { X, MessageSquare, Send, CornerDownRight } from "lucide-react";
import { FormattedText } from "./FormattedText";
import { trpc } from "@/utils/trpc";

interface ThreadDrawerProps {
  parentMessage: MessageData;
  onClose: () => void;
  currentUserId: string;
  currentUser?: UserSummary;
  onSendReply: (content: string) => Promise<any>;
}

export const ThreadDrawer: React.FC<ThreadDrawerProps> = ({
  parentMessage,
  onClose,
  currentUserId,
  currentUser,
  onSendReply,
}) => {
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localReplies, setLocalReplies] = useState<MessageData[]>([]);

  // Query thread replies via tRPC
  const repliesQuery = trpc.message.listReplies.useQuery(
    { parentMessageId: parentMessage.id },
    { refetchInterval: 5000 }
  );

  const serverReplies = (repliesQuery.data as MessageData[]) || [];
  const allReplies = [...serverReplies, ...localReplies];

  const handleSend = async () => {
    if (!replyText.trim() || isSending) return;
    const content = replyText.trim();
    setReplyText("");
    setIsSending(true);

    const tempReply: MessageData = {
      id: "temp_thread_" + Date.now(),
      roomId: parentMessage.roomId,
      senderId: currentUserId,
      content,
      type: "TEXT",
      createdAt: new Date().toISOString(),
      sender: currentUser || {
        id: currentUserId,
        username: "user",
        displayName: "You",
        avatarUrl: null,
        isOnline: true,
        lastSeenAt: new Date().toISOString(),
      },
    };

    setLocalReplies((prev) => [...prev, tempReply]);

    try {
      await onSendReply(content);
      repliesQuery.refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside className="w-80 md:w-96 border-l border-gray-200 bg-white flex flex-col h-full z-20 select-none animate-in slide-in-from-right duration-200 shadow-lg">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Thread</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-200/70 text-gray-400 hover:text-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Thread Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Parent Message Card */}
        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80">
          <div className="flex items-center gap-2.5 mb-1.5">
            {parentMessage.sender?.avatarUrl ? (
              <img
                src={parentMessage.sender.avatarUrl}
                alt={parentMessage.sender.displayName}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                {parentMessage.sender?.displayName?.charAt(0) || "U"}
              </div>
            )}
            <div>
              <span className="text-xs font-bold text-slate-900">
                {parentMessage.sender?.displayName || "Member"}
              </span>
              <span className="text-[10px] text-gray-400 block">
                {new Date(parentMessage.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
          {parentMessage.content && (
            <FormattedText
              content={parentMessage.content}
              className="text-xs text-slate-800 font-normal leading-relaxed"
            />
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-semibold uppercase tracking-wider px-1">
          <span>{allReplies.length} Replies</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {/* Replies List */}
        {allReplies.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No replies in this thread yet. Start the conversation!
          </div>
        ) : (
          allReplies.map((reply) => {
            const isSelfReply = reply.senderId === currentUserId;
            return (
              <div
                key={reply.id}
                className={`flex items-end gap-2 text-xs ${
                  isSelfReply ? "justify-end" : "justify-start"
                }`}
              >
                {!isSelfReply && (
                  <div className="flex-shrink-0 w-6 h-6 mb-1">
                    {reply.sender?.avatarUrl ? (
                      <img
                        src={reply.sender.avatarUrl}
                        alt={reply.sender.displayName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                        {reply.sender?.displayName?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] p-2.5 rounded-2xl ${
                    isSelfReply
                      ? "bg-[#18191d] text-white rounded-tr-xs"
                      : "bg-[#f1f3f5] text-slate-900 border border-gray-200/70 rounded-tl-xs"
                  }`}
                >
                  {!isSelfReply && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-bold text-indigo-600 text-[11.5px]">
                        {reply.sender?.displayName || "Member"}
                      </span>
                    </div>
                  )}
                  {reply.content && (
                    <div className="break-words">
                      <FormattedText
                        content={reply.content}
                        className={`text-[12px] leading-relaxed ${
                          isSelfReply ? "text-white" : "text-slate-800"
                        }`}
                      />
                    </div>
                  )}
                  <div
                    className={`text-[10px] mt-1 text-right select-none ${
                      isSelfReply ? "text-gray-400" : "text-gray-400"
                    }`}
                  >
                    {new Date(reply.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Thread Composer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/40">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-2 focus-within:border-slate-400 shadow-2xs">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Reply in thread..."
            className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!replyText.trim() || isSending}
            className="p-1 rounded-lg text-slate-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-3.5 h-3.5 fill-current stroke-none" />
          </button>
        </div>
      </div>
    </aside>
  );
};

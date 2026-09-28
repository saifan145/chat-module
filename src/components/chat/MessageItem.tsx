import React, { useState } from "react";
import { type MessageData } from "@/types/chat";
import {
  Reply,
  FileText,
  Download,
  Smile,
  Edit2,
  Trash2,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import { FormattedText } from "./FormattedText";
import { AudioPlayer } from "./AudioPlayer";

interface MessageItemProps {
  message: MessageData;
  isSelf: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onQuoteReply?: (message: MessageData) => void;
  onOpenThread?: (message: MessageData) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  currentUserId: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSelf,
  isFirstInGroup = true,
  isLastInGroup = true,
  onQuoteReply,
  onOpenThread,
  onReact,
  onEdit,
  onDelete,
  currentUserId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const displayName =
    message.sender?.displayName || message.sender?.username || "Unknown";
  const avatarUrl = message.sender?.avatarUrl;

  const quotedMsg = message.replyTo;
  const quotedSenderName =
    quotedMsg?.sender?.displayName || quotedMsg?.sender?.username || "Original Message";
  const quotedAvatar = quotedMsg?.sender?.avatarUrl;

  const quickReactions = ["👍", "❤️", "🚀", "👀", "😂", "🎉"];

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  // If soft-deleted
  if (message.deletedAt) {
    return (
      <div className={`py-1.5 px-3 flex ${isSelf ? "justify-end" : "justify-start"}`}>
        <div className="py-1.5 px-3 text-xs text-gray-400 italic rounded-2xl bg-gray-100/70 border border-gray-200/50 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          This message was deleted
        </div>
      </div>
    );
  }

  // System activity feed notice (group renamed, member added, member removed, etc.)
  const isActivityNotice =
    message.content &&
    (message.content.startsWith("📢") ||
      message.content.startsWith("🎉") ||
      message.content.startsWith("👋") ||
      message.content.startsWith("🚪"));

  if (isActivityNotice) {
    return (
      <div className="py-2.5 my-1 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100/90 border border-slate-200/60 text-slate-700 text-xs font-medium shadow-2xs backdrop-blur-xs">
          <span>{message.content}</span>
          <span className="text-[10px] text-gray-400 font-normal">({time})</span>
        </div>
      </div>
    );
  }

  // Determine WhatsApp-style rounded corners depending on self vs others and grouping
  // Own messages: rounded with tail pointing to top-right (rounded-tr-xs) or bottom-right
  // Others: rounded with tail pointing to top-left (rounded-tl-xs)
  const bubbleCorners = isSelf
    ? isFirstInGroup
      ? "rounded-2xl rounded-tr-xs"
      : "rounded-2xl rounded-r-md"
    : isFirstInGroup
    ? "rounded-2xl rounded-tl-xs"
    : "rounded-2xl rounded-l-md";

  return (
    <div
      className={`group relative flex items-end gap-2.5 px-2 py-0.5 transition-colors ${
        isSelf ? "justify-end" : "justify-start"
      } ${isFirstInGroup ? "mt-2" : "mt-0.5"}`}
    >
      {/* Other user's Avatar: only show if not self, and only on the first message of a group */}
      {!isSelf && (
        <div className="flex-shrink-0 w-8 h-8 mb-1">
          {isFirstInGroup ? (
            avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover bg-gray-100 dark:bg-slate-800 ring-1 ring-gray-200/80 dark:ring-slate-700 shadow-2xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold text-xs shadow-2xs">
                {displayName.charAt(0)}
              </div>
            )
          ) : (
            <div className="w-8 h-8" />
          )}
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[62%] flex flex-col shadow-xs transition-shadow ${bubbleCorners} ${
          isSelf
            ? "bg-[#18191d] dark:bg-indigo-600 text-white selection:bg-indigo-500 selection:text-white"
            : "bg-[#f1f3f5] dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-200/70 dark:border-slate-700/80"
        } p-3`}
      >
        {/* Header: Sender Name (only on others' messages when first in group) */}
        {!isSelf && isFirstInGroup && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12.5px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
              {displayName}
            </span>
          </div>
        )}

        {/* Quoted Message Box if replyTo exists */}
        {quotedMsg && (
          <div
            className={`my-1 p-2 rounded-xl border flex flex-col gap-0.5 text-xs ${
              isSelf
                ? "bg-white/10 dark:bg-black/20 border-white/15 dark:border-white/10 text-white/90"
                : "bg-white dark:bg-slate-900/80 border-gray-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-[11.5px]">
              {quotedAvatar && (
                <img
                  src={quotedAvatar}
                  alt={quotedSenderName}
                  className="w-3.5 h-3.5 rounded-full object-cover"
                />
              )}
              <span className={isSelf ? "text-indigo-300 dark:text-indigo-200" : "text-indigo-600 dark:text-indigo-400"}>
                {quotedSenderName}
              </span>
            </div>
            <p className={`truncate text-[11px] ${isSelf ? "text-gray-300 dark:text-indigo-100" : "text-gray-600 dark:text-slate-400"}`}>
              {quotedMsg.content || "Attachment"}
            </p>
          </div>
        )}

        {/* Attachments / Media */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-1.5 my-1.5">
            {message.attachments.map((att) => {
              const isImage = att.mimeType.startsWith("image/");
              const isAudio =
                att.mimeType.startsWith("audio/") ||
                att.fileName.endsWith(".webm") ||
                att.fileName.endsWith(".mp3") ||
                att.fileName.endsWith(".wav");

              if (isAudio) {
                return (
                  <div key={att.id} className="my-1">
                    <AudioPlayer audioUrl={att.url || ""} />
                  </div>
                );
              }

              return isImage ? (
                <a
                  key={att.id}
                  href={att.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-black/10 dark:border-white/10 hover:opacity-95 transition-opacity"
                >
                  <img
                    src={att.url || ""}
                    alt={att.fileName}
                    className="w-full h-auto object-cover max-h-72"
                  />
                </a>
              ) : (
                <a
                  key={att.id}
                  href={att.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                    isSelf
                      ? "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                      : "bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <FileText
                    className={`w-4 h-4 flex-shrink-0 ${
                      isSelf ? "text-indigo-300" : "text-indigo-500 dark:text-indigo-400"
                    }`}
                  />
                  <div className="min-w-0 pr-1 text-left">
                    <p className="text-xs font-medium truncate">{att.fileName}</p>
                    <p
                      className={`text-[10px] ${
                        isSelf ? "text-gray-400 dark:text-indigo-200" : "text-gray-500 dark:text-slate-400"
                      }`}
                    >
                      {(Number(att.size) / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Download
                    className={`w-3.5 h-3.5 ml-auto ${
                      isSelf ? "text-gray-400 dark:text-indigo-200" : "text-gray-500 dark:text-slate-400"
                    }`}
                  />
                </a>
              );
            })}
          </div>
        )}

        {/* Text Content / Inline Editor */}
        {isEditing ? (
          <div className="mt-1 space-y-1.5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
              rows={2}
              autoFocus
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleSaveEdit}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md font-semibold text-[11px] flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-slate-600"
              >
                <Check className="w-3 h-3" /> Save
              </button>
              <button
                onClick={() => {
                  setEditContent(message.content || "");
                  setIsEditing(false);
                }}
                className="px-2 py-1 text-gray-300 dark:text-slate-400 hover:text-white text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          message.content && (
            <div className="break-words">
              <FormattedText
                content={message.content}
                className={`text-[13.5px] leading-relaxed ${
                  isSelf ? "text-white font-normal" : "text-slate-800 dark:text-slate-100 font-normal"
                }`}
              />
            </div>
          )
        )}

        {/* Bubble Footer: Timestamp & Edited tag */}
        <div
          className={`flex items-center gap-1.5 mt-1 select-none ${
            isSelf ? "justify-end text-gray-300 dark:text-indigo-200" : "justify-end text-gray-400 dark:text-slate-400"
          }`}
        >
          {message.isEdited && (
            <span className="text-[10px] italic">edited</span>
          )}
          <span className="text-[10.5px]">{time}</span>
        </div>

        {/* Reactions Bar inside bubble */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1 border-t border-black/5 dark:border-white/10">
            {message.reactions.map((r) => {
              const hasReacted = r.users.includes(currentUserId);
              return (
                <button
                  key={r.emoji}
                  onClick={() => onReact?.(message.id, r.emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border ${
                    hasReacted
                      ? isSelf
                        ? "bg-indigo-600 border-indigo-400 text-white font-semibold"
                        : "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : isSelf
                      ? "bg-white/10 border-white/20 text-gray-200 hover:bg-white/20"
                      : "bg-white dark:bg-slate-700/60 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600"
                  }`}
                  title={`${r.users.length} person reacted with ${r.emoji}`}
                >
                  <span>{r.emoji}</span>
                  <span className="text-[10.5px]">{r.users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread Link Button if replies exist */}
        {message.threadCount && message.threadCount > 0 && (
          <button
            onClick={() => onOpenThread?.(message)}
            className={`mt-1.5 pt-1.5 border-t flex items-center gap-1.5 text-xs font-semibold hover:underline transition-colors ${
              isSelf
                ? "border-white/15 text-indigo-200 hover:text-white"
                : "border-gray-200/80 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>
              {message.threadCount} {message.threadCount === 1 ? "reply" : "replies"}
            </span>
            <span className="opacity-75 font-normal text-[11px]">View thread</span>
          </button>
        )}
      </div>

      {/* Hover Action Bar (Mirrored position: left side of bubble for self, right side for others) */}
      <div
        className={`opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm flex items-center p-0.5 z-10 ${
          isSelf ? "right-[calc(100%-80px)] sm:right-auto sm:left-auto" : "left-[calc(100%-80px)] sm:left-auto"
        }`}
        style={isSelf ? { right: "calc(100% - 10px)" } : { left: "calc(100% - 10px)" }}
      >
        {/* Quick Emojis */}
        <div className="flex items-center">
          {quickReactions.slice(0, 3).map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact?.(message.id, emoji)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-xs hover:scale-125 transition-transform"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* More Emojis */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs transition-colors"
            title="Add reaction"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          {showEmojiPicker && (
            <div
              className={`absolute top-7 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 flex gap-1 z-30 ${
                isSelf ? "right-0" : "left-0"
              }`}
            >
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact?.(message.id, emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1 text-sm hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-3 w-px bg-gray-200 dark:bg-slate-700 mx-1" />

        {/* Reply in Thread */}
        <button
          onClick={() => onOpenThread?.(message)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs transition-colors"
          title="Reply in thread"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        {/* Quote Reply */}
        <button
          onClick={() => onQuoteReply?.(message)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs transition-colors"
          title="Quote in channel"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        {/* Edit & Delete for self */}
        {isSelf && (
          <>
            <div className="h-3 w-px bg-gray-200 dark:bg-slate-700 mx-1" />
            <button
              onClick={() => {
                setEditContent(message.content || "");
                setIsEditing(true);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs transition-colors"
              title="Edit message"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this message?")) onDelete?.(message.id);
              }}
              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs transition-colors"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

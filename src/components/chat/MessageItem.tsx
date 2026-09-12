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

interface MessageItemProps {
  message: MessageData;
  isSelf: boolean;
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
      <div className="py-2 px-3 text-xs text-gray-400 italic flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        This message was deleted
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-3 py-2 px-3 hover:bg-gray-50/80 rounded-xl transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-9 h-9 rounded-full object-cover bg-gray-100 ring-1 ring-gray-200/80"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-medium text-xs">
            {displayName.charAt(0)}
          </div>
        )}
      </div>

      {/* Message Content Container */}
      <div className="flex-1 min-w-0">
        {/* Header: Sender & Time */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13.5px] font-semibold text-slate-900">
            {displayName}
          </span>
          <span className="text-xs text-gray-400 font-normal">{time}</span>
          {message.isEdited && (
            <span className="text-[10px] text-gray-400 font-normal italic">
              (edited)
            </span>
          )}
        </div>

        {/* Quoted Message Box if replyTo exists */}
        {quotedMsg && (
          <div className="my-1.5 p-2 rounded-lg bg-gray-50 border border-gray-200/80 max-w-xl flex flex-col gap-0.5 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
              {quotedAvatar && (
                <img
                  src={quotedAvatar}
                  alt={quotedSenderName}
                  className="w-4 h-4 rounded-full object-cover"
                />
              )}
              <span>{quotedSenderName}</span>
            </div>
            <p className="text-xs text-slate-600 truncate">
              {quotedMsg.content || "Attachment"}
            </p>
          </div>
        )}

        {/* Attachments / Media */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2 my-2">
            {message.attachments.map((att) => {
              const isImage = att.mimeType.startsWith("image/");
              return isImage ? (
                <a
                  key={att.id}
                  href={att.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border border-gray-200 max-w-md hover:opacity-95 transition-opacity"
                >
                  <img
                    src={att.url || ""}
                    alt={att.fileName}
                    className="w-full h-auto object-cover max-h-80"
                  />
                </a>
              ) : (
                <a
                  key={att.id}
                  href={att.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200/70 border border-gray-200 transition-colors"
                >
                  <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-medium text-slate-800 truncate">
                      {att.fileName}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {(Number(att.size) / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 hover:text-slate-700" />
                </a>
              );
            })}
          </div>
        )}

        {/* Text Content / Inline Editor */}
        {isEditing ? (
          <div className="mt-1 space-y-1.5 max-w-xl">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500"
              rows={2}
              autoFocus
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleSaveEdit}
                className="px-2.5 py-1 bg-slate-900 text-white rounded-md font-semibold text-[11px] flex items-center gap-1 hover:bg-slate-800"
              >
                <Check className="w-3 h-3" /> Save
              </button>
              <button
                onClick={() => {
                  setEditContent(message.content || "");
                  setIsEditing(false);
                }}
                className="px-2 py-1 text-gray-500 hover:text-slate-800 text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          message.content && (
            <FormattedText
              content={message.content}
              className="text-[13.5px] text-slate-800 font-normal"
            />
          )
        )}

        {/* Reactions Bar */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            {message.reactions.map((r) => {
              const hasReacted = r.users.includes(currentUserId);
              return (
                <button
                  key={r.emoji}
                  onClick={() => onReact?.(message.id, r.emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border ${
                    hasReacted
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold"
                      : "bg-gray-100/80 border-gray-200 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={`${r.users.length} person reacted with ${r.emoji}`}
                >
                  <span>{r.emoji}</span>
                  <span className="text-[11px]">{r.users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread Link Button if replies exist */}
        {message.threadCount && message.threadCount > 0 && (
          <button
            onClick={() => onOpenThread?.(message)}
            className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>
              {message.threadCount} {message.threadCount === 1 ? "reply" : "replies"}
            </span>
            <span className="text-gray-400 font-normal text-[11px]">View thread</span>
          </button>
        )}
      </div>

      {/* Hover Action Bar */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-2 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center p-0.5 z-10">
        {/* Quick Emojis */}
        <div className="flex items-center">
          {quickReactions.slice(0, 3).map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact?.(message.id, emoji)}
              className="p-1 hover:bg-gray-100 rounded text-xs hover:scale-125 transition-transform"
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
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-slate-800 text-xs transition-colors"
            title="Add reaction"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          {showEmojiPicker && (
            <div className="absolute right-0 top-7 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 flex gap-1 z-30">
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

        <div className="h-3 w-px bg-gray-200 mx-1" />

        {/* Reply in Thread */}
        <button
          onClick={() => onOpenThread?.(message)}
          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-slate-800 text-xs transition-colors"
          title="Reply in thread"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        {/* Quote Reply */}
        <button
          onClick={() => onQuoteReply?.(message)}
          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-slate-800 text-xs transition-colors"
          title="Quote in channel"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        {/* Edit & Delete for self */}
        {isSelf && (
          <>
            <div className="h-3 w-px bg-gray-200 mx-1" />
            <button
              onClick={() => {
                setEditContent(message.content || "");
                setIsEditing(true);
              }}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-slate-800 text-xs transition-colors"
              title="Edit message"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this message?")) onDelete?.(message.id);
              }}
              className="p-1 hover:bg-rose-50 rounded text-gray-400 hover:text-rose-600 text-xs transition-colors"
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

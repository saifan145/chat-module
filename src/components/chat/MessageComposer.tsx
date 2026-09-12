import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  X,
  Smile,
  AtSign,
  Loader2,
  Reply,
  Bold,
  Italic,
  Code,
  Quote,
} from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import { type MessageData } from "@/types/chat";

interface MessageComposerProps {
  roomId: string;
  onSendMessage: (payload: {
    content?: string;
    type?: "TEXT" | "IMAGE" | "FILE";
    replyToId?: string;
    attachments?: any[];
  }) => Promise<any>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  replyingTo?: MessageData | null;
  onCancelReply?: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  roomId,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  replyingTo,
  onCancelReply,
}) => {
  const [content, setContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { uploadFile, isUploading } = useUpload(roomId);

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    onStartTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const addEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const addMention = () => {
    setContent((prev) => (prev ? prev + " @" : "@"));
    textareaRef.current?.focus();
  };

  const applyFormat = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || "text";
    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent = content.slice(0, start) + replacement + content.slice(end);
    setContent(nextContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  const handleSend = async () => {
    if ((!content.trim() && attachedFiles.length === 0) || isSending || isUploading) return;

    const sendingContent = content.trim();
    const sendingFiles = [...attachedFiles];
    const sendingReplyToId = replyingTo ? replyingTo.id : undefined;

    // Reset inputs immediately so the user can keep typing!
    setContent("");
    setAttachedFiles([]);
    if (onCancelReply) onCancelReply();
    onStopTyping();

    setIsSending(true);

    try {
      let uploadedAttachments: any[] = [];
      let messageType: "TEXT" | "IMAGE" | "FILE" = "TEXT";

      if (sendingFiles.length > 0) {
        for (const file of sendingFiles) {
          const result = await uploadFile(file);
          uploadedAttachments.push(result);
          if (file.type.startsWith("image/")) {
            messageType = "IMAGE";
          } else {
            messageType = "FILE";
          }
        }
      }

      await onSendMessage({
        content: sendingContent || undefined,
        type: messageType,
        replyToId: sendingReplyToId,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });
    } catch (err: any) {
      console.error("Failed to send message:", err);
      alert(err?.message || "Failed to upload file or send message.");
    } finally {
      setIsSending(false);
    }
  };

  const canSend = (content.trim().length > 0 || attachedFiles.length > 0) && !isSending && !isUploading;

  const quickEmojis = ["🤔", "💡", "🚀", "✅", "👍", "❤️", "🙌", "😊", "🔥", "🎉"];

  return (
    <div className="p-4 md:px-6 md:pb-5 bg-white">
      <div className="relative rounded-2xl bg-[#f5f6f8] border border-gray-200/90 p-3 transition-all focus-within:border-gray-300 focus-within:bg-[#f2f4f7]">
        {/* Reply Quote Banner */}
        {replyingTo && (
          <div className="mb-2 p-2 rounded-xl bg-white border border-gray-200/80 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Reply className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-800">
                Replying to {replyingTo.sender?.displayName || "message"}:
              </span>
              <span className="text-xs text-slate-500 truncate flex-1">
                {replyingTo.content || "Attachment"}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attached file previews */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs text-slate-700 shadow-xs"
              >
                <Paperclip className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[160px] font-medium">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="hover:text-rose-500 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        {/* Textarea Input */}
        <textarea
          ref={textareaRef}
          rows={2}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          disabled={isSending || isUploading}
          className="w-full bg-transparent text-slate-900 placeholder:text-gray-400 text-[13.5px] leading-relaxed focus:outline-none resize-none px-1"
        />

        {/* Bottom Toolbar Row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 mt-1">
          {/* Functional action tools */}
          <div className="flex items-center gap-1 text-gray-400">
            {/* Emoji picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 hover:text-slate-700 hover:bg-gray-200/60 rounded-lg transition-colors"
                title="Add Emoji"
              >
                <Smile className="w-4 h-4 stroke-[1.8]" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-9 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-2 flex gap-1 z-30">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="p-1 text-base hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mention */}
            <button
              type="button"
              onClick={addMention}
              className="p-1.5 hover:text-slate-700 hover:bg-gray-200/60 rounded-lg transition-colors"
              title="Mention user"
            >
              <AtSign className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* Attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSending}
              className="p-1.5 hover:text-slate-700 hover:bg-gray-200/60 rounded-lg transition-colors"
              title="Attach file or image"
            >
              <Paperclip className="w-4 h-4 stroke-[1.8]" />
            </button>

            <div className="h-3.5 w-px bg-gray-300/70 mx-0.5" />

            {/* Rich Text Format Tools */}
            <button
              type="button"
              onClick={() => applyFormat("**")}
              className="p-1.5 hover:text-slate-700 hover:bg-gray-200/60 rounded-lg transition-colors"
              title="Bold (**text**)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => applyFormat("*")}
              className="p-1.5 hover:text-slate-700 hover:bg-gray-200/60 rounded-lg transition-colors"
              title="Italic (*text*)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => applyFormat("`")}
              className="p-1.5 hover:text-slate-700 hover:bg-gray-200/60 rounded-lg transition-colors"
              title="Inline Code (`code`)"
            >
              <Code className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => applyFormat("> ", "")}
              className="p-1.5 hover:text-slate-700 hover:bg-gray-200/60 rounded-lg transition-colors"
              title="Quote (> text)"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Send button on right */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`p-1.5 rounded-xl transition-all ${
              canSend
                ? "text-slate-900 hover:bg-gray-200/80 active:scale-95"
                : "text-gray-300 cursor-not-allowed"
            }`}
            title="Send message"
          >
            {isSending || isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <Send className="w-4 h-4 fill-current stroke-none" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

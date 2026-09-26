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
  AlertCircle,
  FileText,
} from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import { type MessageData } from "@/types/chat";
import { trpc } from "@/utils/trpc";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB limit

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { uploadFile, isUploading, uploadProgress } = useUpload(roomId);

  // Fetch available users for @mention auto-complete
  const usersQuery = trpc.user.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
  const allUsers = usersQuery.data || [];

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    // Detect @ mention cursor
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
      if (charBeforeAt === " " || charBeforeAt === "\n") {
        const queryAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        if (!queryAfterAt.includes(" ") && queryAfterAt.length <= 20) {
          setMentionQuery(queryAfterAt.toLowerCase());
          setShowMentionMenu(true);
        } else {
          setShowMentionMenu(false);
        }
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowMentionMenu(false);
    }

    onStartTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleSelectMention = (user: { username: string; displayName: string }) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const prefix = content.slice(0, lastAtIndex);
      const suffix = content.slice(cursor);
      const inserted = `@${user.username} `;
      const nextVal = prefix + inserted + suffix;
      setContent(nextVal);
      setShowMentionMenu(false);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = lastAtIndex + inserted.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && (e.key === "Escape" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
      if (e.key === "Escape") {
        setShowMentionMenu(false);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      if (showMentionMenu && filteredUsers.length > 0) {
        e.preventDefault();
        handleSelectMention(filteredUsers[0]);
        return;
      }
      e.preventDefault();
      handleSend();
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    if (!mentionQuery) return true;
    return (
      u.username.toLowerCase().includes(mentionQuery) ||
      u.displayName.toLowerCase().includes(mentionQuery)
    );
  });

  const processFiles = (files: File[]) => {
    setFileError(null);
    const validFiles: File[] = [];
    const rejectedFiles: { name: string; size: string }[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectedFiles.push({
          name: file.name,
          size: formatFileSize(file.size),
        });
      } else {
        // Prevent adding duplicate files
        const alreadyAttached = attachedFiles.some(
          (f) => f.name === file.name && f.size === file.size
        );
        if (!alreadyAttached) {
          validFiles.push(file);
        }
      }
    }

    if (rejectedFiles.length > 0) {
      const errorMsg =
        rejectedFiles.length === 1
          ? `File "${rejectedFiles[0].name}" (${rejectedFiles[0].size}) exceeds the maximum allowed limit of 20MB.`
          : `${rejectedFiles.length} files exceed the 20MB limit: ${rejectedFiles
              .map((f) => `"${f.name}" (${f.size})`)
              .join(", ")}`;
      setFileError(errorMsg);
    }

    if (validFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    // Reset file input value so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
    if (attachedFiles.length <= 1) {
      setFileError(null);
    }
  };

  const addEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const addMention = () => {
    setContent((prev) => (prev ? prev + " @" : "@"));
    setMentionQuery("");
    setShowMentionMenu(true);
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

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="p-4 md:px-6 md:pb-5 bg-white">
      {/* Uploading progress indicator */}
      {isUploading && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between text-xs text-indigo-700 animate-pulse">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span className="font-medium">Uploading attachment to secure cloud...</span>
          </div>
          <span className="font-bold">{uploadProgress > 0 ? `${uploadProgress}%` : "In progress"}</span>
        </div>
      )}

      {/* File Size Error Banner */}
      {fileError && (
        <div className="mb-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start justify-between gap-2.5 shadow-2xs animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 leading-snug">
              <span className="font-bold">Cannot attach file: </span>
              {fileError}
              <span className="block text-[11px] text-rose-600/90 font-medium mt-0.5">
                Maximum allowed file size is 20MB. Please select a smaller file or compress it.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFileError(null)}
            className="p-1 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors flex-shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-2xl border p-3 transition-all ${
          isDragging
            ? "border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200"
            : "bg-[#f5f6f8] border-gray-200/90 focus-within:border-gray-300 focus-within:bg-[#f2f4f7]"
        }`}
      >
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

        {/* Attached file previews with file size */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-xs text-slate-700 shadow-xs hover:border-gray-300 transition-all"
              >
                <Paperclip className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span className="truncate max-w-[150px] font-medium text-slate-800" title={file.name}>
                  {file.name}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="hover:text-rose-500 hover:bg-rose-50 rounded p-0.5 text-gray-400 transition-colors"
                  title="Remove attachment"
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

        {/* Floating @mention autocomplete suggestion menu */}
        {showMentionMenu && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <span>Mention Teammate</span>
              <span className="text-[10px] text-gray-400 font-normal">Press Enter to select</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
              {filteredUsers.slice(0, 6).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectMention(u)}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-indigo-50/80 transition-colors group"
                >
                  {u.avatarUrl ? (
                    <img
                      src={u.avatarUrl}
                      alt={u.displayName}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {u.displayName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 truncate">
                      {u.displayName}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">
                      @{u.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Textarea Input */}
        <textarea
          ref={textareaRef}
          rows={2}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a message... (type @ to mention a teammate)"
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
              title="Attach files or media (Max 20MB each)"
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

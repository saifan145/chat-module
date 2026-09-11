import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";

interface MessageComposerProps {
  roomId: string;
  onSendMessage: (payload: {
    content?: string;
    type?: "TEXT" | "IMAGE" | "FILE";
    attachments?: any[];
  }) => Promise<void>;
  onStartTyping: () => void;
  onStopTyping: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  roomId,
  onSendMessage,
  onStartTyping,
  onStopTyping,
}) => {
  const [content, setContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { uploadFile, isUploading } = useUpload(roomId);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Typing debounce indicators (Section 6)
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

  const handleSend = async () => {
    if ((!content.trim() && attachedFiles.length === 0) || isSending || isUploading) return;

    setIsSending(true);
    onStopTyping();

    try {
      let uploadedAttachments: any[] = [];
      let messageType: "TEXT" | "IMAGE" | "FILE" = "TEXT";

      // Upload files via Cloudflare R2 presigned URL flow (Section 10, 11, 12)
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
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
        content: content.trim() || undefined,
        type: messageType,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });

      setContent("");
      setAttachedFiles([]);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-3 md:p-4 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      {/* Attached file previews */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200"
            >
              <Paperclip className="w-3.5 h-3.5 text-brand-500" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="hover:text-rose-400 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/20 transition-all">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isSending}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition-colors"
          title="Attach files (Upload to Cloudflare R2)"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          rows={1}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isSending || isUploading}
          className="flex-1 max-h-32 min-h-[38px] bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none resize-none py-2 px-1"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={(!content.trim() && attachedFiles.length === 0) || isSending || isUploading}
          className="p-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all"
        >
          {isSending || isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

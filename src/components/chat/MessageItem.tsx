import React from "react";
import { type MessageData } from "@/types/chat";
import { Check, CheckCheck, FileText, Download } from "lucide-react";

interface MessageItemProps {
  message: MessageData;
  isSelf: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isSelf }) => {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-col mb-4 ${isSelf ? "items-end" : "items-start"}`}>
      {/* Sender name for group context if not self */}
      {!isSelf && message.sender && (
        <span className="text-xs text-slate-400 font-medium mb-1 px-1">
          {message.sender.displayName || message.sender.username}
        </span>
      )}

      {/* Bubble container */}
      <div
        className={`max-w-[75%] md:max-w-[65%] rounded-2xl p-3 shadow-md backdrop-blur-sm border ${
          isSelf
            ? "bg-brand-600/90 text-white rounded-tr-none border-brand-500/40"
            : "bg-slate-800/90 text-slate-100 rounded-tl-none border-slate-700/60"
        }`}
      >
        {/* Attachments / Media (Cloudflare R2) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2 mb-2">
            {message.attachments.map((att) => {
              const isImage = att.mimeType.startsWith("image/");
              return isImage ? (
                <a
                  key={att.id}
                  href={att.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border border-slate-700/40 max-h-72 hover:opacity-95 transition-opacity"
                >
                  <img
                    src={att.url || ""}
                    alt={att.fileName}
                    className="w-full h-auto object-cover"
                  />
                </a>
              ) : (
                <a
                  key={att.id}
                  href={att.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:bg-slate-900/80 transition-colors"
                >
                  <FileText className="w-5 h-5 text-brand-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{att.fileName}</p>
                    <p className="text-[10px] text-slate-400">
                      {(Number(att.size) / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </a>
              );
            })}
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        )}

        {/* Timestamp & receipts */}
        <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[10px] opacity-75">
          <span>{time}</span>
          {isSelf && (
            <span title="Delivered / Read">
              <CheckCheck className="w-3.5 h-3.5 text-brand-200" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

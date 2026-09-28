import React, { useEffect, useRef } from "react";
import { type MessageData } from "@/types/chat";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: MessageData[];
  currentUserId: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onQuoteReply?: (message: MessageData) => void;
  onOpenThread?: (message: MessageData) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  hasMore,
  onLoadMore,
  onQuoteReply,
  onOpenThread,
  onReact,
  onEdit,
  onDelete,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 scrollbar-thin">
      {hasMore && (
        <div className="text-center my-3">
          <button
            onClick={onLoadMore}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200/70 dark:hover:bg-slate-700 transition-colors"
          >
            Load older messages
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-xs">
          No messages in this conversation yet. Send the first message!
        </div>
      ) : (
        messages.map((msg, idx) => {
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

          const isActivity =
            msg.content &&
            (msg.content.startsWith("📢") ||
              msg.content.startsWith("🎉") ||
              msg.content.startsWith("👋") ||
              msg.content.startsWith("🚪"));

          const isFirstInGroup =
            !prevMsg ||
            prevMsg.senderId !== msg.senderId ||
            Boolean(
              prevMsg.content &&
                (prevMsg.content.startsWith("📢") ||
                  prevMsg.content.startsWith("🎉") ||
                  prevMsg.content.startsWith("👋") ||
                  prevMsg.content.startsWith("🚪"))
            ) ||
            new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() >
              5 * 60 * 1000;

          const isLastInGroup =
            !nextMsg ||
            nextMsg.senderId !== msg.senderId ||
            Boolean(
              nextMsg.content &&
                (nextMsg.content.startsWith("📢") ||
                  nextMsg.content.startsWith("🎉") ||
                  nextMsg.content.startsWith("👋") ||
                  nextMsg.content.startsWith("🚪"))
            ) ||
            new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() >
              5 * 60 * 1000;

          return (
            <MessageItem
              key={msg.id}
              message={msg}
              isSelf={msg.senderId === currentUserId}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              onQuoteReply={onQuoteReply}
              onOpenThread={onOpenThread}
              onReact={onReact}
              onEdit={onEdit}
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          );
        })
      )}

      <div ref={bottomRef} />
    </div>
  );
};

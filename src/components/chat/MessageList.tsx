import React, { useEffect, useRef } from "react";
import { type MessageData } from "@/types/chat";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: MessageData[];
  currentUserId: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  hasMore,
  onLoadMore,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-800">
      {hasMore && (
        <div className="text-center mb-4">
          <button
            onClick={onLoadMore}
            className="text-xs text-brand-500 hover:text-brand-400 font-medium px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60"
          >
            Load older messages
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-400 text-xs">
          No messages in this conversation yet. Send the first hello!
        </div>
      ) : (
        messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            isSelf={msg.senderId === currentUserId}
          />
        ))
      )}

      <div ref={bottomRef} />
    </div>
  );
};

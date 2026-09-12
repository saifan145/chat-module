import React from "react";

interface TypingIndicatorProps {
  typingUsers: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  return (
    <div className="px-6 py-1.5 flex items-center gap-2 text-xs text-slate-500 font-normal">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
      </div>
      <span>
        {typingUsers.length === 1
          ? "Someone is typing..."
          : `${typingUsers.length} people are typing...`}
      </span>
    </div>
  );
};

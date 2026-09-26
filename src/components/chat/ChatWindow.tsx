import React, { useState, useEffect, useRef } from "react";
import { type RoomData, type MessageData, type UserSummary } from "@/types/chat";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { TypingIndicator } from "./TypingIndicator";
import { ThreadDrawer } from "./ThreadDrawer";
import { HuddleBar } from "./HuddleBar";
import { RoomManagementModal } from "./RoomManagementModal";
import { Phone, MoreHorizontal, Hash, FileText, Radio, ArrowLeft } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { type Socket } from "socket.io-client";
import { soundManager } from "@/utils/sound";

interface ChatWindowProps {
  room: RoomData;
  currentUserId: string;
  socket: Socket | null;
  onSendMessage: (payload: any) => Promise<any>;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onMarkRead: () => void;
  onBack?: () => void;
  onReactMessage?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onRoomRenamed?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  room,
  currentUserId,
  socket,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onMarkRead,
  onBack,
  onReactMessage,
  onEditMessage,
  onDeleteMessage,
  onRoomRenamed,
}) => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"messages" | "files">("messages");
  const [replyingTo, setReplyingTo] = useState<MessageData | null>(null);
  const [activeThreadMessage, setActiveThreadMessage] = useState<MessageData | null>(null);
  const [isHuddleActive, setIsHuddleActive] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [activeRoomName, setActiveRoomName] = useState(room.name);

  // Stable references for callbacks to prevent socket listener churn
  const onMarkReadRef = useRef(onMarkRead);
  const onRoomRenamedRef = useRef(onRoomRenamed);
  useEffect(() => {
    onMarkReadRef.current = onMarkRead;
    onRoomRenamedRef.current = onRoomRenamed;
  });

  // Sync active room name when room prop changes
  useEffect(() => {
    setActiveRoomName(room.name);
  }, [room.name]);

  // Edit mutation
  const editMutation = trpc.message.edit.useMutation();
  // Delete mutation
  const deleteMutation = trpc.message.delete.useMutation();

  // Fetch message history using tRPC query with cursor pagination
  const messagesQuery = trpc.message.list.useQuery(
    { roomId: room.id, limit: 50 },
    { refetchOnWindowFocus: false }
  );

  // When room changes, clear previous room messages
  useEffect(() => {
    setMessages([]);
    setReplyingTo(null);
    setTypingUsers([]);
    setActiveThreadMessage(null);
    setIsHuddleActive(false);
  }, [room.id]);

  useEffect(() => {
    if (messagesQuery.data?.messages) {
      const serverMessages = messagesQuery.data.messages as MessageData[];
      setMessages((prev) => {
        // Keep any active optimistic messages that haven't been resolved yet
        const activeOptimistics = prev.filter(
          (m) =>
            m.id.startsWith("temp_") &&
            !serverMessages.some(
              (sm) =>
                sm.senderId === m.senderId &&
                (sm.content === m.content || (!sm.content && !m.content))
            )
        );
        return [...serverMessages, ...activeOptimistics];
      });
      onMarkReadRef.current();
    }
  }, [messagesQuery.data]);

  // Listen to live WebSocket events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: { roomId: string; message: MessageData }) => {
      if (payload.roomId === room.id) {
        setMessages((prev) => {
          // Play incoming audio chime if message is from someone else
          if (payload.message.senderId !== currentUserId) {
            soundManager.playIncoming();
          } else {
            soundManager.playSent();
          }

          // If this was a thread reply, increment parent thread count
          if (payload.message.replyToId) {
            return prev.map((m) => {
              if (m.id === payload.message.replyToId) {
                return { ...m, threadCount: (m.threadCount || 0) + 1 };
              }
              return m;
            });
          }

          // If already exists with exact id, do not duplicate
          if (prev.some((m) => m.id === payload.message.id)) return prev;

          // If this replaces an optimistic message from the same sender with matching content
          const tempIdx = prev.findIndex(
            (m) =>
              m.id.startsWith("temp_") &&
              m.senderId === payload.message.senderId &&
              (m.content === payload.message.content || !m.content)
          );

          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = payload.message;
            return next;
          }

          return [...prev, payload.message];
        });
        onMarkReadRef.current();
      }
    };

    const handleReaction = (payload: {
      roomId: string;
      messageId: string;
      emoji: string;
      userId: string;
    }) => {
      if (payload.roomId === room.id) {
        soundManager.playReaction();
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== payload.messageId) return msg;
            const currentReactions = msg.reactions ? [...msg.reactions] : [];
            const rIdx = currentReactions.findIndex((r) => r.emoji === payload.emoji);

            if (rIdx !== -1) {
              const r = currentReactions[rIdx];
              const uIdx = r.users.indexOf(payload.userId);
              if (uIdx !== -1) {
                // User already reacted: remove (toggle off)
                const nextUsers = r.users.filter((id) => id !== payload.userId);
                if (nextUsers.length === 0) {
                  currentReactions.splice(rIdx, 1);
                } else {
                  currentReactions[rIdx] = { ...r, users: nextUsers };
                }
              } else {
                // Add user to existing emoji
                currentReactions[rIdx] = { ...r, users: [...r.users, payload.userId] };
              }
            } else {
              // Add new reaction emoji
              currentReactions.push({ emoji: payload.emoji, users: [payload.userId] });
            }

            return { ...msg, reactions: currentReactions };
          })
        );
      }
    };

    const handleMessageEdit = (payload: {
      roomId: string;
      messageId: string;
      content: string;
      updatedAt: string;
    }) => {
      if (payload.roomId === room.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId
              ? { ...m, content: payload.content, isEdited: true, updatedAt: payload.updatedAt }
              : m
          )
        );
      }
    };

    const handleMessageDelete = (payload: { roomId: string; messageId: string }) => {
      if (payload.roomId === room.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId ? { ...m, deletedAt: new Date().toISOString() } : m
          )
        );
      }
    };

    const handleTypingStart = (payload: { roomId: string; userId: string }) => {
      if (payload.roomId === room.id && payload.userId !== currentUserId) {
        setTypingUsers((prev) => Array.from(new Set([...prev, payload.userId])));
      }
    };

    const handleTypingStop = (payload: { roomId: string; userId: string }) => {
      if (payload.roomId === room.id) {
        setTypingUsers((prev) => prev.filter((id) => id !== payload.userId));
      }
    };

    const handleRoomUpdated = (payload: { roomId: string; name?: string }) => {
      if (payload.roomId === room.id && payload.name) {
        setActiveRoomName(payload.name);
        onRoomRenamedRef.current?.();
      }
    };

    const handleMemberAdded = (payload: { roomId: string; targetName: string }) => {
      if (payload.roomId === room.id) {
        onRoomRenamedRef.current?.();
      }
    };

    const handleMemberRemoved = (payload: { roomId: string; removedName: string }) => {
      if (payload.roomId === room.id) {
        onRoomRenamedRef.current?.();
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:react", handleReaction);
    socket.on("message:edit", handleMessageEdit);
    socket.on("message:delete", handleMessageDelete);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("room:updated", handleRoomUpdated);
    socket.on("member:added", handleMemberAdded);
    socket.on("member:removed", handleMemberRemoved);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:react", handleReaction);
      socket.off("message:edit", handleMessageEdit);
      socket.off("message:delete", handleMessageDelete);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("room:updated", handleRoomUpdated);
      socket.off("member:added", handleMemberAdded);
      socket.off("member:removed", handleMemberRemoved);
    };
  }, [socket, room.id, currentUserId]);

  const otherMember =
    room.type === "DIRECT"
      ? room.members.find((m) => m.userId !== currentUserId)
      : null;

  const currentMember = room.members.find((m) => m.userId === currentUserId);
  const mySender: UserSummary = currentMember?.user || {
    id: currentUserId,
    username: "saifan",
    displayName: "Saifan",
    avatarUrl: null,
    isOnline: true,
    lastSeenAt: new Date().toISOString(),
  };

  const title =
    room.type === "DIRECT"
      ? otherMember?.user.displayName || otherMember?.user.username || "Direct Chat"
      : activeRoomName || room.name || "Channel";

  const avatarUrl =
    room.type === "DIRECT" ? otherMember?.user.avatarUrl : room.avatarUrl;

  // Immediate Optimistic Send Handler: User sees message right away!
  const handleOptimisticSendMessage = async (payload: {
    content?: string;
    type?: "TEXT" | "IMAGE" | "FILE";
    replyToId?: string;
    attachments?: any[];
  }) => {
    const tempId = "temp_" + Date.now();
    const optimisticMessage: MessageData = {
      id: tempId,
      roomId: room.id,
      senderId: currentUserId,
      content: payload.content || null,
      type: payload.type || "TEXT",
      replyToId: payload.replyToId,
      replyTo: replyingTo,
      createdAt: new Date().toISOString(),
      sender: mySender,
      attachments: payload.attachments,
    };

    // 1. Immediately append to message list so it is visible right away!
    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Perform background socket / API dispatch
    try {
      const response = await onSendMessage(payload);
      if (response?.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? response.message : m))
        );
      }
      messagesQuery.refetch();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Reactions handler
  const handleReact = (messageId: string, emoji: string) => {
    socket?.emit("message:react", {
      roomId: room.id,
      messageId,
      emoji,
      userId: currentUserId,
    });
  };

  // Edit handler
  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      await editMutation.mutateAsync({ messageId, content: newContent });
      socket?.emit("message:edit", {
        roomId: room.id,
        messageId,
        content: newContent,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to edit message:", e);
    }
  };

  // Delete handler
  const handleDelete = async (messageId: string) => {
    try {
      await deleteMutation.mutateAsync({ messageId });
      socket?.emit("message:delete", { roomId: room.id, messageId });
    } catch (e) {
      console.error("Failed to delete message:", e);
    }
  };

  // Extract all files / attachments from messages for the Files tab
  const allAttachments = messages.flatMap((m) =>
    (m.attachments || []).map((att) => ({
      ...att,
      senderName: m.sender?.displayName || "Member",
      createdAt: m.createdAt,
    }))
  );

  return (
    <div className="flex-1 flex h-full bg-white overflow-hidden">
      {/* Main Channel / Conversation Stream */}
      <div className="flex-1 flex flex-col h-full bg-white min-w-0">
        {/* Top Header */}
        <div className="px-6 pt-5 pb-2 border-b border-gray-100 flex flex-col gap-3">
          {/* Contact Info & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Mobile Back Button */}
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-gray-100 transition-colors"
                  title="Back to channels list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              {room.type === "DIRECT" ? (
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={title}
                    className="w-9 h-9 rounded-full object-cover bg-gray-100 ring-1 ring-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {title.charAt(0)}
                  </div>
                )
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                  <Hash className="w-4 h-4" />
                </div>
              )}

              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 text-base leading-snug truncate">
                  {title}
                </h3>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 text-gray-500">
              {/* Start Huddle Button */}
              <button
                onClick={() => setIsHuddleActive((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isHuddleActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-gray-100 hover:bg-gray-200 text-slate-700"
                }`}
                title="Start or join a voice huddle"
              >
                <Radio className={`w-3.5 h-3.5 ${isHuddleActive ? "animate-pulse" : ""}`} />
                <span>Huddle</span>
              </button>

              <button
                onClick={() => setIsHuddleActive(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-slate-900 transition-colors"
                title="Voice Call"
              >
                <Phone className="w-4 h-4 stroke-[1.8]" />
              </button>

              {/* Group Settings / Member Management Modal Trigger */}
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-slate-900 transition-colors"
                title={room.type === "GROUP" ? "Manage group & members" : "Chat options"}
              >
                <MoreHorizontal className="w-4 h-4 stroke-[1.8]" />
              </button>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex items-center gap-6 text-[13px] font-medium pt-1">
            <button
              onClick={() => setActiveTab("messages")}
              className={`pb-2 transition-all relative ${
                activeTab === "messages"
                  ? "text-slate-900 font-semibold"
                  : "text-gray-400 hover:text-slate-600 font-normal"
              }`}
            >
              Messages
              {activeTab === "messages" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("files")}
              className={`pb-2 transition-all relative ${
                activeTab === "files"
                  ? "text-slate-900 font-semibold"
                  : "text-gray-400 hover:text-slate-600 font-normal"
              }`}
            >
              Files {allAttachments.length > 0 && `(${allAttachments.length})`}
              {activeTab === "files" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Live Team Huddle Bar */}
        <HuddleBar
          roomName={title}
          currentUser={mySender}
          isActive={isHuddleActive}
          onLeave={() => setIsHuddleActive(false)}
        />

        {/* Main Viewport Content based on activeTab */}
        {activeTab === "messages" && (
          <>
            {/* Messages Stream */}
            <MessageList
              messages={messages}
              currentUserId={currentUserId}
              onQuoteReply={(msg) => setReplyingTo(msg)}
              onOpenThread={(msg) => setActiveThreadMessage(msg)}
              onReact={handleReact}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />

            {/* Typing Indicator */}
            <TypingIndicator typingUsers={typingUsers} />

            {/* Message Composer with quote reply preview and formatting toolbar */}
            <MessageComposer
              roomId={room.id}
              onSendMessage={handleOptimisticSendMessage}
              onStartTyping={onStartTyping}
              onStopTyping={onStopTyping}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
          </>
        )}

        {activeTab === "files" && (
          <div className="flex-1 overflow-y-auto p-6">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">
              Shared Files & Attachments
            </h4>
            {allAttachments.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">
                No files or media shared in this conversation yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {allAttachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs transition-all flex items-center gap-3"
                  >
                    <FileText className="w-8 h-8 text-indigo-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 truncate">
                        {att.fileName}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {(Number(att.size) / 1024).toFixed(1)} KB • {att.senderName}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Side Drawer Thread Panel */}
      {activeThreadMessage && (
        <ThreadDrawer
          parentMessage={activeThreadMessage}
          onClose={() => setActiveThreadMessage(null)}
          currentUserId={currentUserId}
          currentUser={mySender}
          onSendReply={async (content) => {
            return onSendMessage({
              content,
              type: "TEXT",
              replyToId: activeThreadMessage.id,
            });
          }}
        />
      )}

      {/* Room / Group Management Modal */}
      <RoomManagementModal
        room={room}
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        currentUserId={currentUserId}
        socket={socket}
        onRoomUpdated={(newName) => {
          setActiveRoomName(newName);
          onRoomRenamed?.();
        }}
      />
    </div>
  );
};

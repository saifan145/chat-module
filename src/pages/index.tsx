import Head from "next/head";
import React, { useState, useEffect } from "react";
import { trpc } from "@/utils/trpc";
import { useChatSocket } from "@/hooks/useChatSocket";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { RoomList } from "@/components/chat/RoomList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CreateRoomModal } from "@/components/chat/CreateRoomModal";
import { type RoomData } from "@/types/chat";
import { MessageSquareDashed } from "lucide-react";

export default function Home() {
  const [currentUserId, setCurrentUserId] = useState("usr_demo_saifan");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("chat_user_id");
    if (saved) setCurrentUserId(saved);
  }, []);

  // Socket connection lifecycle hook (Section 17)
  const {
    socket,
    connectionState,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    markRead,
  } = useChatSocket(currentUserId);

  // Fetch rooms list via tRPC (Section 4 & 16)
  const roomsQuery = trpc.room.list.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const rooms = (roomsQuery.data as RoomData[]) || [];
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Manage room selection & socket join
  const handleSelectRoom = (roomId: string) => {
    if (selectedRoomId) leaveRoom(selectedRoomId);
    setSelectedRoomId(roomId);
    joinRoom(roomId);
    markRead(roomId);
  };

  const handleSendMessage = async (payload: {
    content?: string;
    type?: "TEXT" | "IMAGE" | "FILE";
    attachments?: any[];
  }) => {
    if (!selectedRoomId) return;
    await sendMessage({
      roomId: selectedRoomId,
      ...payload,
    });
    roomsQuery.refetch();
  };

  return (
    <>
      <Head>
        <title>StratoONE Chat — Stable V0.001</title>
        <meta
          name="description"
          content="StratoONE Chat Module built with T3 Stack, tRPC, WebSocket, PostgreSQL, and Cloudflare R2"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ChatLayout
        connectionState={connectionState}
        sidebar={
          <RoomList
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            currentUserId={currentUserId}
            onSelectRoom={handleSelectRoom}
            onCreateRoom={() => setIsCreateModalOpen(true)}
          />
        }
      >
        {selectedRoom ? (
          <ChatWindow
            room={selectedRoom}
            currentUserId={currentUserId}
            socket={socket}
            onSendMessage={handleSendMessage}
            onStartTyping={() => selectedRoomId && startTyping(selectedRoomId)}
            onStopTyping={() => selectedRoomId && stopTyping(selectedRoomId)}
            onMarkRead={() => selectedRoomId && markRead(selectedRoomId)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-brand-500 mb-4 shadow-xl">
              <MessageSquareDashed className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-1">
              Select a conversation
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Choose an existing chat room from the sidebar or start a new direct/group conversation.
            </p>
          </div>
        )}
      </ChatLayout>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newRoomId) => {
          roomsQuery.refetch();
          handleSelectRoom(newRoomId);
        }}
      />
    </>
  );
}

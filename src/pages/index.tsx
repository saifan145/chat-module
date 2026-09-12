import Head from "next/head";
import React, { useState, useEffect } from "react";
import { trpc } from "@/utils/trpc";
import { useChatSocket } from "@/hooks/useChatSocket";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { RoomList } from "@/components/chat/RoomList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CreateRoomModal } from "@/components/chat/CreateRoomModal";
import { UserProfileMenu } from "@/components/chat/UserProfileMenu";
import { GlobalSearchModal } from "@/components/chat/GlobalSearchModal";
import { FilesExplorer } from "@/components/files/FilesExplorer";
import { type RoomData, type UserSummary } from "@/types/chat";
import { MessageSquareDashed, Users, LogIn } from "lucide-react";

export default function Home() {
  const [currentUserId, setCurrentUserId] = useState("usr_demo_saifan");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<"chat" | "files" | "team">("chat");

  // Keyboard shortcut Ctrl+K to open global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get("user");
      if (userParam) {
        localStorage.setItem("chat_user_id", userParam);
        setCurrentUserId(userParam);
        return;
      }
      const saved = localStorage.getItem("chat_user_id");
      if (saved) setCurrentUserId(saved);
    }
  }, []);

  // Socket connection lifecycle hook
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

  // Fetch rooms list via tRPC
  const roomsQuery = trpc.room.list.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const rooms = (roomsQuery.data as RoomData[]) || [];
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Derive current user info
  const currentUserSummary: UserSummary = {
    id: currentUserId,
    username:
      currentUserId === "usr_demo_saifan"
        ? "saifan"
        : currentUserId === "usr_sofia_petrovna"
        ? "sofia.petrovna"
        : currentUserId === "usr_noah_brown"
        ? "noah.brown"
        : "user",
    displayName:
      currentUserId === "usr_demo_saifan"
        ? "Saifan"
        : currentUserId === "usr_sofia_petrovna"
        ? "Sofia Petrovna"
        : currentUserId === "usr_noah_brown"
        ? "Noah Brown"
        : "Team Member",
    avatarUrl:
      currentUserId === "usr_demo_saifan"
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
        : currentUserId === "usr_sofia_petrovna"
        ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
        : currentUserId === "usr_noah_brown"
        ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
        : null,
    isOnline: connectionState === "CONNECTED",
    lastSeenAt: new Date().toISOString(),
  };

  // Auto-select Sofia Petrovna conversation on load
  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      const sofiaRoom = rooms.find((r) => {
        const otherMember =
          r.type === "DIRECT"
            ? r.members.find((m) => m.userId !== currentUserId)
            : null;
        return otherMember?.user.displayName.toLowerCase().includes("sofia");
      });
      if (sofiaRoom) {
        handleSelectRoom(sofiaRoom.id);
      } else {
        handleSelectRoom(rooms[0].id);
      }
    }
  }, [rooms, selectedRoomId, currentUserId]);

  // Ensure room:join is emitted whenever socket is connected and room is selected
  useEffect(() => {
    if (connectionState === "CONNECTED" && selectedRoomId) {
      joinRoom(selectedRoomId);
    }
  }, [connectionState, selectedRoomId, joinRoom]);

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
    replyToId?: string;
    attachments?: any[];
  }) => {
    if (!selectedRoomId) return;
    const result = await sendMessage({
      roomId: selectedRoomId,
      ...payload,
    });
    roomsQuery.refetch();
    return result;
  };

  // Sign out / switch user action
  const handleSignOut = () => {
    const nextUser =
      currentUserId === "usr_demo_saifan"
        ? "usr_sofia_petrovna"
        : "usr_demo_saifan";
    localStorage.setItem("chat_user_id", nextUser);
    window.location.href = `/?user=${nextUser}`;
  };

  return (
    <>
      <Head>
        <title>Stratotech Corp Workspace</title>
        <meta
          name="description"
          content="Stratotech Corp modern chat & files workspace built with Next.js, tRPC, WebSocket, and Cloudflare R2"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ChatLayout
        connectionState={connectionState}
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        currentUser={currentUserSummary}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={() => setIsProfileMenuOpen((prev) => !prev)}
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
        {/* Active View Display */}
        {activeView === "files" ? (
          <FilesExplorer rooms={rooms} currentUserId={currentUserId} />
        ) : activeView === "team" ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Stratotech Corp Directory
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mb-4">
              Explore teammates, view active members, and start a new direct conversation.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Start New Conversation
            </button>
          </div>
        ) : selectedRoom ? (
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 bg-white">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-slate-600 mb-3 shadow-sm">
              <MessageSquareDashed className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">
              Select a conversation
            </h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Choose an existing chat room from the sidebar or start a new direct or group conversation.
            </p>
          </div>
        )}
      </ChatLayout>

      {/* User Profile and Status Menu (Bottom Left) */}
      <UserProfileMenu
        currentUser={currentUserSummary}
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        onSignOut={handleSignOut}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        rooms={rooms}
        onSelectRoom={(roomId) => {
          setActiveView("chat");
          handleSelectRoom(roomId);
        }}
        currentUserId={currentUserId}
      />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newRoomId) => {
          roomsQuery.refetch();
          setActiveView("chat");
          handleSelectRoom(newRoomId);
        }}
      />
    </>
  );
}

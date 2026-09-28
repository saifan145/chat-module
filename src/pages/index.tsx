import Head from "next/head";
import React, { useState, useEffect } from "react";
import { trpc } from "@/utils/trpc";
import { useChatSocket } from "@/hooks/useChatSocket";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { type NavSection } from "@/components/chat/NavRail";
import { RoomList } from "@/components/chat/RoomList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CreateRoomModal } from "@/components/chat/CreateRoomModal";
import { UserProfileMenu } from "@/components/chat/UserProfileMenu";
import { GlobalSearchModal } from "@/components/chat/GlobalSearchModal";
import { ActivityPanel } from "@/components/chat/ActivityPanel";
import { FilesExplorer } from "@/components/files/FilesExplorer";
import { type RoomData, type UserSummary, type NotificationItem } from "@/types/chat";
import { MessageSquareDashed, Send } from "lucide-react";
import { soundManager } from "@/utils/sound";

export default function Home() {
  const [currentUserId, setCurrentUserId] = useState("usr_demo_saifan");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>("home");

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

  // tRPC context utils for invalidation
  const trpcUtils = trpc.useUtils();

  // Fetch rooms list via tRPC
  const roomsQuery = trpc.room.list.useQuery(undefined, {
    refetchInterval: 15000,
  });

  // Fetch live unread activity notifications count
  const unreadNotificationsQuery = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const unreadNotificationsCount = unreadNotificationsQuery.data?.count || 0;

  const rooms = (roomsQuery.data as RoomData[]) || [];
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Fetch current user details or users list
  const usersQuery = trpc.user.list.useQuery(undefined, {
    staleTime: 30000,
  });
  const allUsers = usersQuery.data || [];
  const dbUser = allUsers.find((u) => u.id === currentUserId);

  // Derive current user info
  const currentUserSummary: UserSummary = {
    id: currentUserId,
    username:
      dbUser?.username ||
      (currentUserId === "usr_demo_saifan"
        ? "saifan"
        : currentUserId === "usr_sofia_petrovna"
        ? "sofia.petrovna"
        : currentUserId === "usr_noah_brown"
        ? "noah.brown"
        : "user"),
    displayName:
      dbUser?.displayName ||
      (currentUserId === "usr_demo_saifan"
        ? "Saifan"
        : currentUserId === "usr_sofia_petrovna"
        ? "Sofia Petrovna"
        : currentUserId === "usr_noah_brown"
        ? "Noah Brown"
        : "Team Member"),
    avatarUrl:
      dbUser?.avatarUrl ||
      (currentUserId === "usr_demo_saifan"
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
        : currentUserId === "usr_sofia_petrovna"
        ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
        : currentUserId === "usr_noah_brown"
        ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
        : null),
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

  // Real-time listener for personal notification.created WebSocket event
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: NotificationItem) => {
      trpcUtils.notification.unreadCount.invalidate();
      trpcUtils.notification.list.invalidate();
      roomsQuery.refetch();
      soundManager.playIncoming();
    };

    socket.on("notification.created", handleNewNotification);

    return () => {
      socket.off("notification.created", handleNewNotification);
    };
  }, [socket, trpcUtils, roomsQuery]);

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

  // Handle section switching without losing selectedRoomId
  const handleSectionChange = (section: NavSection) => {
    setActiveSection(section);
    if (section === "activity") {
      setIsActivityOpen(true);
    }
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

  const handleSwitchUser = (newUserId: string) => {
    localStorage.setItem("chat_user_id", newUserId);
    window.location.href = `/?user=${newUserId}`;
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
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        currentUser={currentUserSummary}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenProfile={() => setIsProfileMenuOpen((prev) => !prev)}
        onOpenActivity={() => setIsActivityOpen(true)}
        onCreateAction={() => setIsCreateModalOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        isRoomSelected={Boolean(selectedRoomId)}
        sidebar={
          <RoomList
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            currentUserId={currentUserId}
            onSelectRoom={handleSelectRoom}
            onCreateRoom={() => setIsCreateModalOpen(true)}
            viewMode={activeSection === "dms" ? "dms" : "channels"}
          />
        }
      >
        {/* Main Viewport: Persists selected room across section switches */}
        {activeSection === "files" ? (
          <FilesExplorer rooms={rooms} currentUserId={currentUserId} />
        ) : selectedRoom ? (
          /* Main Chat Area: Remains open whether sidebar is Channels or DMs */
          <ChatWindow
            room={selectedRoom}
            currentUserId={currentUserId}
            socket={socket}
            onSendMessage={handleSendMessage}
            onStartTyping={() => selectedRoomId && startTyping(selectedRoomId)}
            onStopTyping={() => selectedRoomId && stopTyping(selectedRoomId)}
            onMarkRead={() => selectedRoomId && markRead(selectedRoomId)}
            onBack={() => setSelectedRoomId(null)}
            onRoomRenamed={() => {
              roomsQuery.refetch();
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-3 shadow-sm">
              <MessageSquareDashed className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
              Select a conversation
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm">
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
        onSwitchUser={handleSwitchUser}
        onProfileUpdated={() => {
          usersQuery.refetch();
          roomsQuery.refetch();
        }}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        rooms={rooms}
        onSelectRoom={(roomId) => {
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
          handleSelectRoom(newRoomId);
        }}
      />

      {/* Activity Notifications Panel */}
      <ActivityPanel
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        onNavigateToRoom={(roomId) => {
          handleSelectRoom(roomId);
        }}
        unreadCount={unreadNotificationsCount}
      />
    </>
  );
}

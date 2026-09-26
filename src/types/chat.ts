export type RoomType = "DIRECT" | "GROUP";
export type MessageType = "TEXT" | "IMAGE" | "FILE";
export type DeliveryStatus = "SENT" | "DELIVERED" | "READ";

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING";

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string;
}

export interface AttachmentData {
  id: string;
  messageId: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  size: number | string;
  url?: string | null;
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // userIds
}

export interface MessageData {
  id: string;
  roomId: string;
  senderId: string;
  content: string | null;
  type: MessageType;
  mediaUrl?: string | null;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string | null;
    type: MessageType;
    sender?: UserSummary;
  } | null;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  deletedAt?: string | null;
  reactions?: MessageReaction[];
  threadCount?: number;
  sender?: UserSummary;
  attachments?: AttachmentData[];
  receipts?: {
    userId: string;
    status: DeliveryStatus;
  }[];
}

export interface RoomMemberData {
  id: string;
  roomId: string;
  userId: string;
  isAdmin: boolean;
  joinedAt: string;
  lastReadAt: string | null;
  user: UserSummary;
}

export interface RoomData {
  id: string;
  type: RoomType;
  name: string | null;
  avatarUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  members: RoomMemberData[];
  lastMessage?: MessageData | null;
  unreadCount?: number;
}

// WebSocket Event Contract
export type ChatEvent =
  | "room:join"
  | "room:leave"
  | "message:send"
  | "message:new"
  | "message:read"
  | "typing:start"
  | "typing:stop"
  | "presence:update"
  | "message:delivered"
  | "message:react"
  | "message:edit"
  | "message:delete"
  | "room:updated"
  | "member:added"
  | "member:removed"
  | "user:updated"
  | "notification.created";

export type NotificationType =
  | "MENTION"
  | "CHANNEL_MENTION"
  | "DIRECT_MESSAGE"
  | "CHANNEL_POST"
  | "THREAD_REPLY";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string;
  roomId: string | null;
  messageId: string | null;
  previewText: string | null;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  room?: {
    id: string;
    name: string | null;
    type: RoomType;
  } | null;
}

export interface MessageSendPayload {
  roomId: string;
  content?: string;
  type?: MessageType;
  mediaUrl?: string;
  replyToId?: string;
  attachments?: {
    objectKey: string;
    fileName: string;
    mimeType: string;
    size: number;
  }[];
}

export interface MessageNewPayload {
  roomId: string;
  message: MessageData;
}

export interface MessageReadPayload {
  roomId: string;
  userId: string;
  readAt: string;
}

export interface TypingUpdatePayload {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceUpdatePayload {
  userId: string;
  isOnline: boolean;
}

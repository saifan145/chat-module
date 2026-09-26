import { db } from "../db";
import { emitToUser } from "../ws/server";
import { type NotificationType, type NotificationItem } from "../../types/chat";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  actorId: string;
  roomId?: string | null;
  messageId?: string | null;
  previewText?: string | null;
}

/**
 * Creates a notification in the database and immediately broadcasts
 * a "notification.created" event to the recipient's personal WebSocket channel.
 */
export async function createAndBroadcastNotification(
  params: CreateNotificationParams
): Promise<NotificationItem | null> {
  // Never notify a user about their own action
  if (params.userId === params.actorId) {
    return null;
  }

  try {
    const notification = await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        actorId: params.actorId,
        roomId: params.roomId || null,
        messageId: params.messageId || null,
        previewText: params.previewText ? params.previewText.slice(0, 150) : null,
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    const formattedNotification: NotificationItem = {
      id: notification.id,
      userId: notification.userId,
      type: notification.type as NotificationType,
      actorId: notification.actorId,
      roomId: notification.roomId,
      messageId: notification.messageId,
      previewText: notification.previewText,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      actor: notification.actor,
      room: notification.room,
    };

    // Real-time broadcast to recipient's individual socket channel
    emitToUser(params.userId, "notification.created", formattedNotification);

    return formattedNotification;
  } catch (error) {
    console.error("[Notification Service] Error creating notification:", error);
    return null;
  }
}

/**
 * Processes a newly sent message in a room and triggers all relevant notifications:
 * 1. Mentions (@username) -> MENTION
 * 2. Broadcast mentions (@channel / @here) -> CHANNEL_MENTION
 * 3. Direct Message -> DIRECT_MESSAGE
 * 4. Thread reply -> THREAD_REPLY
 *
 * Sender is excluded from all notifications.
 */
export async function processMessageNotifications(params: {
  messageId: string;
  roomId: string;
  senderId: string;
  content?: string | null;
  replyToId?: string | null;
}) {
  const { messageId, roomId, senderId, content, replyToId } = params;

  try {
    // 1. Fetch room details and active members
    const room = await db.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!room) return;

    const otherMembers = room.members.filter((m) => m.userId !== senderId);
    if (otherMembers.length === 0) return;

    const notifiedUserIds = new Set<string>();
    const trimmedPreview = content ? content.trim().slice(0, 120) : "Sent an attachment";

    // 2. Thread Reply Notification
    if (replyToId) {
      // Find parent message and all users who participated in this thread
      const [parentMessage, existingReplies] = await Promise.all([
        db.chatMessage.findUnique({
          where: { id: replyToId },
          select: { senderId: true },
        }),
        db.chatMessage.findMany({
          where: { replyToId, deletedAt: null },
          select: { senderId: true },
        }),
      ]);

      const threadParticipants = new Set<string>();
      if (parentMessage?.senderId && parentMessage.senderId !== senderId) {
        threadParticipants.add(parentMessage.senderId);
      }
      for (const reply of existingReplies) {
        if (reply.senderId !== senderId) {
          threadParticipants.add(reply.senderId);
        }
      }

      for (const participantId of threadParticipants) {
        // Confirm user is still a member of the room
        if (otherMembers.some((m) => m.userId === participantId)) {
          await createAndBroadcastNotification({
            userId: participantId,
            type: "THREAD_REPLY",
            actorId: senderId,
            roomId,
            messageId,
            previewText: trimmedPreview,
          });
          notifiedUserIds.add(participantId);
        }
      }
    }

    // 3. Mention Parsing (only if message has text content)
    if (content) {
      const isChannelMention = /@(channel|here)\b/i.test(content);

      if (isChannelMention && room.type === "GROUP") {
        for (const member of otherMembers) {
          if (!notifiedUserIds.has(member.userId)) {
            await createAndBroadcastNotification({
              userId: member.userId,
              type: "CHANNEL_MENTION",
              actorId: senderId,
              roomId,
              messageId,
              previewText: trimmedPreview,
            });
            notifiedUserIds.add(member.userId);
          }
        }
      }

      // Check specific @username mentions
      // Match words following @: @username
      const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
      let match: RegExpExecArray | null;
      const mentionedHandles = new Set<string>();

      while ((match = mentionRegex.exec(content)) !== null) {
        const handle = match[1]?.toLowerCase();
        if (handle && handle !== "channel" && handle !== "here") {
          mentionedHandles.add(handle);
        }
      }

      if (mentionedHandles.size > 0) {
        for (const member of otherMembers) {
          const userHandle = member.user.username.toLowerCase();
          if (mentionedHandles.has(userHandle) && !notifiedUserIds.has(member.userId)) {
            await createAndBroadcastNotification({
              userId: member.userId,
              type: "MENTION",
              actorId: senderId,
              roomId,
              messageId,
              previewText: trimmedPreview,
            });
            notifiedUserIds.add(member.userId);
          }
        }
      }
    }

    // 4. Direct Message Notification
    if (room.type === "DIRECT") {
      for (const member of otherMembers) {
        if (!notifiedUserIds.has(member.userId)) {
          await createAndBroadcastNotification({
            userId: member.userId,
            type: "DIRECT_MESSAGE",
            actorId: senderId,
            roomId,
            messageId,
            previewText: trimmedPreview,
          });
          notifiedUserIds.add(member.userId);
        }
      }
    }
  } catch (error) {
    console.error("[Notification Service] Error processing message notifications:", error);
  }
}

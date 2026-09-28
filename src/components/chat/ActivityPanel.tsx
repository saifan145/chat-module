import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  AtSign,
  Hash,
  Users,
  CornerDownRight,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { type NotificationItem, type NotificationType } from "@/types/chat";
import { soundManager } from "@/utils/sound";

interface ActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRoom: (roomId: string, messageId?: string | null) => void;
  unreadCount?: number;
}

/**
 * Format relative date groupings: Today, Yesterday, Weekday names, or M/D/YYYY
 */
function getDateGroupingLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  // Within the last 6 days: show full weekday name (e.g. Wednesday)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 0 && diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  // Older: Month Day, Year
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Format time of notification (e.g. "10:42 AM" or "3m ago")
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({
  isOpen,
  onClose,
  onNavigateToRoom,
}) => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // tRPC utils for cache invalidation
  const trpcUtils = trpc.useUtils();

  // Notifications query
  const notificationsQuery = trpc.notification.list.useQuery(
    { unreadOnly, limit: 40 },
    {
      enabled: isOpen,
      staleTime: 5000,
    }
  );

  // Mutations
  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      trpcUtils.notification.unreadCount.invalidate();
      trpcUtils.notification.list.invalidate();
    },
  });

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      trpcUtils.notification.unreadCount.invalidate();
      trpcUtils.notification.list.invalidate();
    },
  });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const items = notificationsQuery.data?.items || [];

  // Group notifications by relative date
  const groupedItems = useMemo(() => {
    const groups: { label: string; items: NotificationItem[] }[] = [];
    const groupMap = new Map<string, NotificationItem[]>();

    for (const item of items) {
      const groupLabel = getDateGroupingLabel(item.createdAt);
      if (!groupMap.has(groupLabel)) {
        const groupArr: NotificationItem[] = [];
        groupMap.set(groupLabel, groupArr);
        groups.push({ label: groupLabel, items: groupArr });
      }
      groupMap.get(groupLabel)!.push(item);
    }

    return groups;
  }, [items]);

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate({ id: item.id });
    }

    if (item.roomId) {
      onNavigateToRoom(item.roomId, item.messageId);
      onClose();
    }
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  // Helper description generator
  const getNotificationDescription = (item: NotificationItem) => {
    const channelName = item.room?.name || "channel";
    switch (item.type) {
      case "MENTION":
        return item.room?.type === "DIRECT" ? "Mentioned you" : `Mentioned you in #${channelName}`;
      case "CHANNEL_MENTION":
        return `Channel mention in #${channelName}`;
      case "DIRECT_MESSAGE":
        return "Direct Message";
      case "THREAD_REPLY":
        return `Replied to a thread in #${channelName}`;
      case "CHANNEL_POST":
        return `Posted in #${channelName}`;
      default:
        return "New activity";
    }
  };

  // Type icon badge
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "MENTION":
        return <AtSign className="w-3 h-3 text-amber-600" />;
      case "CHANNEL_MENTION":
        return <Users className="w-3 h-3 text-purple-600" />;
      case "DIRECT_MESSAGE":
        return <MessageSquare className="w-3 h-3 text-blue-600" />;
      case "THREAD_REPLY":
        return <CornerDownRight className="w-3 h-3 text-emerald-600" />;
      case "CHANNEL_POST":
        return <Hash className="w-3 h-3 text-slate-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-auto bg-black/20 backdrop-blur-[1px] transition-opacity">
      <div
        ref={panelRef}
        className="w-full sm:w-[420px] max-w-full h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-r border-gray-200 dark:border-slate-800 animate-in slide-in-from-left duration-200 transition-colors"
      >
        {/* Panel Header */}
        <div className="px-4 py-3.5 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bell className="w-4 h-4 fill-current stroke-none" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                Activity
              </h2>
              <span className="text-[11px] text-gray-500 dark:text-slate-400">Mentions, DMs & thread replies</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mark All Read Button */}
            <button
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending || items.every((i) => i.isRead)}
              className="text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 disabled:hover:text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar: Unreads Toggle */}
        <div className="px-4 py-2 bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-600 dark:text-slate-300">
          <span className="font-medium text-slate-700 dark:text-slate-300">Filter view</span>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className={unreadOnly ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-slate-400"}>
              Unreads only
            </span>
            <div
              onClick={() => setUnreadOnly((prev) => !prev)}
              className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${
                unreadOnly ? "bg-indigo-600" : "bg-gray-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                  unreadOnly ? "translate-x-3.5" : "translate-x-0"
                }`}
              />
            </div>
          </label>
        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 scrollbar-thin">
          {notificationsQuery.isLoading ? (
            <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500">Loading activity feed...</div>
          ) : items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-slate-500 mb-3">
                <Bell className="w-6 h-6 stroke-[1.5]" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {unreadOnly ? "No unread activity" : "All caught up"}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-xs">
                {unreadOnly
                  ? "You don't have any unread notifications. Toggle unreads to see past activity."
                  : "When teammates mention you, reply to your threads, or send direct messages, they'll appear here."}
              </p>
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.label} className="pt-2">
                {/* Date Group Heading */}
                <div className="px-4 py-1.5 text-[11px] font-bold tracking-wider uppercase text-gray-400 dark:text-slate-400 bg-gray-50/50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-sm z-10 border-y border-gray-100 dark:border-slate-800">
                  {group.label}
                </div>

                <div className="divide-y divide-gray-50 dark:divide-slate-800/60">
                  {group.items.map((item) => {
                    const isUnread = !item.isRead;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`group px-4 py-3 cursor-pointer transition-colors relative flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                          isUnread ? "bg-indigo-50/40 dark:bg-indigo-950/30" : "bg-white dark:bg-slate-900"
                        }`}
                      >
                        {/* Actor Avatar with Type Badge */}
                        <div className="relative flex-shrink-0 mt-0.5">
                          {item.actor.avatarUrl ? (
                            <img
                              src={item.actor.avatarUrl}
                              alt={item.actor.displayName}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center">
                              {item.actor.displayName.charAt(0)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-slate-800 shadow-xs border border-gray-100 dark:border-slate-700 flex items-center justify-center">
                            {getTypeIcon(item.type)}
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-baseline justify-between gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {item.actor.displayName}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>

                          <div className="text-[11.5px] font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1 truncate">
                            <span>{getNotificationDescription(item)}</span>
                          </div>

                          {item.previewText && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed bg-white/70 dark:bg-slate-800/80 p-1.5 rounded-lg border border-gray-100/80 dark:border-slate-700/80">
                              {item.previewText}
                            </p>
                          )}
                        </div>

                        {/* Unread indicator dot */}
                        {isUnread && (
                          <div className="flex-shrink-0 self-center">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 block shadow-xs" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Backdrop touch area to dismiss */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};

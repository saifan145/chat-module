import React, { useState, useRef, useEffect } from "react";
import {
  Smile,
  LogOut,
  BellOff,
  User,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";
import { type UserSummary } from "@/types/chat";

interface UserProfileMenuProps {
  currentUser: UserSummary;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onUpdateStatus?: (status: string) => void;
  onTogglePresence?: (isOnline: boolean) => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSignOut,
  onUpdateStatus,
  onTogglePresence,
}) => {
  const [statusText, setStatusText] = useState("");
  const [isAway, setIsAway] = useState(!currentUser.isOnline);
  const [notificationPaused, setNotificationPaused] = useState(false);
  const [showStatusInput, setShowStatusInput] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsAway(!currentUser.isOnline);
  }, [currentUser.isOnline]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleAway = () => {
    const nextAway = !isAway;
    setIsAway(nextAway);
    onTogglePresence?.(!nextAway);
  };

  const statusPresets = [
    { label: "In a meeting", icon: "🗓️" },
    { label: "Deep focus", icon: "🎯" },
    { label: "Commuting", icon: "🚗" },
    { label: "Out sick", icon: "🤒" },
    { label: "Working remotely", icon: "🏡" },
  ];

  const handleApplyStatus = (text: string) => {
    setStatusText(text);
    onUpdateStatus?.(text);
    setShowStatusInput(false);
  };

  return (
    <div
      ref={menuRef}
      className="absolute bottom-16 left-3 z-50 w-72 bg-white rounded-2xl border border-gray-200/90 shadow-2xl py-2 text-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
    >
      {/* User Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <div className="relative flex-shrink-0">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              {currentUser.displayName.charAt(0)}
            </div>
          )}
          {/* Presence indicator */}
          <span
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
              isAway ? "bg-amber-400" : "bg-emerald-500"
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 truncate">
            {currentUser.displayName}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className={`w-2 h-2 rounded-full ${
                isAway ? "bg-amber-400" : "bg-emerald-500"
              }`}
            />
            <span className="truncate">
              {isAway ? "Away" : "Active"}
              {currentUser.username ? ` • @${currentUser.username}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Status Section */}
      <div className="px-3 py-2 border-b border-gray-100">
        {!showStatusInput ? (
          <button
            onClick={() => setShowStatusInput(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-600 hover:text-slate-900 bg-gray-50 hover:bg-gray-100/80 border border-gray-200/80 transition-colors text-left"
          >
            <Smile className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate flex-1">
              {statusText ? statusText : "Update your status"}
            </span>
            {statusText && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleApplyStatus("");
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What's your focus today?"
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-gray-50 border border-gray-200 focus:outline-none focus:border-slate-400 focus:bg-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyStatus(statusText);
                  if (e.key === "Escape") setShowStatusInput(false);
                }}
              />
              <button
                onClick={() => handleApplyStatus(statusText)}
                className="px-2 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Save
              </button>
            </div>
            {/* Quick status tags */}
            <div className="flex flex-wrap gap-1">
              {statusPresets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleApplyStatus(`${p.icon} ${p.label}`)}
                  className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-[11px] text-gray-600 flex items-center gap-1 transition-colors"
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Options */}
      <div className="px-1.5 py-1.5 space-y-0.5 text-xs text-slate-700">
        <button
          onClick={handleToggleAway}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <span>Set yourself as {isAway ? "active" : "away"}</span>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isAway ? "bg-emerald-500" : "bg-amber-400"
            }`}
          />
        </button>

        <button
          onClick={() => setNotificationPaused(!notificationPaused)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BellOff className="w-3.5 h-3.5 text-gray-400" />
            <span>Pause notifications</span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">
            {notificationPaused ? "Paused" : "Off"}
          </span>
        </button>
      </div>

      <div className="my-1 border-t border-gray-100" />

      {/* Secondary Options */}
      <div className="px-1.5 py-1 space-y-0.5 text-xs text-slate-700">
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors text-left"
        >
          <User className="w-3.5 h-3.5 text-gray-400" />
          <span>Profile & Account</span>
        </button>

        <div className="flex items-center justify-between px-3 py-1.5 text-gray-500 text-[11px]">
          <span>Downloads</span>
          <span className="font-mono text-gray-400 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
            Ctrl+Shift+J
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors text-left text-indigo-600 font-medium"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade Stratotech Corp</span>
          </div>
          <ExternalLink className="w-3 h-3 text-indigo-400" />
        </button>
      </div>

      <div className="my-1 border-t border-gray-100" />

      {/* Sign Out */}
      <div className="px-1.5 pt-1">
        <button
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-medium text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out of Stratotech Corp</span>
        </button>
      </div>
    </div>
  );
};

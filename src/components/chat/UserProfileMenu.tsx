import React, { useState, useRef, useEffect } from "react";
import {
  Smile,
  LogOut,
  BellOff,
  User,
  ExternalLink,
  Sparkles,
  X,
  Users,
  Check,
  Edit2,
  AtSign,
  AlertCircle,
} from "lucide-react";
import { type UserSummary } from "@/types/chat";
import { trpc } from "@/utils/trpc";

interface UserProfileMenuProps {
  currentUser?: UserSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onSwitchUser?: (userId: string) => void;
  onUpdateStatus?: (status: string) => void;
  onTogglePresence?: (isOnline: boolean) => void;
  onProfileUpdated?: (updated: { displayName: string; username: string }) => void;
}

const DEMO_USERS = [
  {
    id: "usr_demo_saifan",
    name: "Saifan Ahmed",
    role: "Product Engineer",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_sofia_petrovna",
    name: "Sofia Petrovna",
    role: "Lead Architect",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_noah_brown",
    name: "Noah Brown",
    role: "Frontend Dev",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_liam_johnson",
    name: "Liam Johnson",
    role: "Security Lead",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "usr_ava_davis",
    name: "Ava Davis",
    role: "Cloud Specialist",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
  },
];

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSignOut,
  onSwitchUser,
  onUpdateStatus,
  onTogglePresence,
  onProfileUpdated,
}) => {
  // 1. ALL React Hooks are declared unconditionally at the very top
  const [statusText, setStatusText] = useState("");
  const [isAway, setIsAway] = useState(!currentUser?.isOnline);
  const [notificationPaused, setNotificationPaused] = useState(false);
  const [showStatusInput, setShowStatusInput] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(currentUser?.displayName || "");
  const [editUsername, setEditUsername] = useState(currentUser?.username || "");
  const [profileError, setProfileError] = useState<string | null>(null);

  const updateProfileMutation = trpc.user.updateProfile.useMutation();

  useEffect(() => {
    setIsAway(!currentUser?.isOnline);
  }, [currentUser?.isOnline]);

  useEffect(() => {
    if (currentUser) {
      setEditDisplayName(currentUser.displayName || "");
      setEditUsername(currentUser.username || "");
    }
  }, [currentUser?.displayName, currentUser?.username]);

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

  // 2. Early return guard checks happen ONLY AFTER all hooks have executed
  if (!isOpen || !currentUser) return null;

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    try {
      const res = await updateProfileMutation.mutateAsync({
        displayName: editDisplayName.trim(),
        username: editUsername.replace(/^@/, "").trim(),
      });
      onProfileUpdated?.({
        displayName: res.displayName,
        username: res.username,
      });
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile");
    }
  };

  return (
    <div
      ref={menuRef}
      className="absolute bottom-16 left-3 z-50 w-80 bg-white rounded-2xl border border-gray-200/90 shadow-2xl py-2 text-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none max-h-[85vh] overflow-y-auto"
    >
      {/* User Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0 flex-1">
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
            <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
              {currentUser.displayName}
            </h4>
            <p className="text-xs text-gray-500 truncate">@{currentUser.username}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsEditingProfile(!isEditingProfile);
            setEditDisplayName(currentUser.displayName);
            setEditUsername(currentUser.username);
            setProfileError(null);
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-slate-700 transition-colors flex-shrink-0"
          title="Edit Display Name & @handle"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Edit Profile Form */}
      {isEditingProfile && (
        <form onSubmit={handleSaveProfile} className="p-3 bg-gray-50/90 border-b border-gray-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Edit Your Profile
            </span>
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {profileError && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
              Full Display Name
            </label>
            <input
              type="text"
              required
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white border border-gray-200 focus:outline-none focus:border-slate-400"
              placeholder="e.g. Saifan Ahmed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
              Username Handle (@)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-gray-400 font-mono">@</span>
              <input
                type="text"
                required
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value.replace(/^@/, ""))}
                className="w-full pl-6 pr-2.5 py-1.5 rounded-lg text-xs bg-white border border-gray-200 focus:outline-none focus:border-slate-400 font-mono"
                placeholder="saifan"
              />
            </div>
          </div>

          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="px-2.5 py-1 text-xs text-gray-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}

      {/* Switch Demo Identity Section */}
      <div className="px-3 py-2 bg-indigo-50/60 border-b border-indigo-100/70">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Switch Active User
          </span>
          <button
            onClick={() => setShowUserSwitcher((prev) => !prev)}
            className="text-[11px] text-indigo-600 font-semibold hover:underline"
          >
            {showUserSwitcher ? "Hide" : "Show All"}
          </button>
        </div>

        {showUserSwitcher && (
          <div className="space-y-1 mt-2 pt-1 border-t border-indigo-100/80">
            {DEMO_USERS.map((user) => {
              const isActive = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    onClose();
                    onSwitchUser?.(user.id);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-left text-xs transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-sm"
                      : "bg-white hover:bg-indigo-100 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-[11px] leading-tight font-medium">
                        {user.name}
                      </div>
                      <div className={`truncate text-[9px] ${isActive ? "text-indigo-100" : "text-gray-400"}`}>
                        {user.role}
                      </div>
                    </div>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Section */}
      <div className="px-3 py-2 border-b border-gray-100">
        {!showStatusInput ? (
          <button
            onClick={() => setShowStatusInput(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs text-gray-500 transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Smile className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">
                {statusText || "Update your status..."}
              </span>
            </div>
            {statusText && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusText("");
                  onUpdateStatus?.("");
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
          <span>Switch / Sign Out</span>
        </button>
      </div>
    </div>
  );
};

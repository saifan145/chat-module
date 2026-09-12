import React, { useState, useMemo } from "react";
import {
  Search,
  FileText,
  Download,
  MoreHorizontal,
  ChevronDown,
  Star,
  Trash2,
  Plus,
  FileImage,
  FileCheck,
  UploadCloud,
  Loader2,
  X,
  Save,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { type RoomData } from "@/types/chat";

interface FilesExplorerProps {
  rooms: RoomData[];
  currentUserId: string;
}

interface WorkspaceFile {
  id: string;
  name: string;
  type: "docx" | "pdf" | "xlsx" | "image" | "canvas";
  uploaderName: string;
  uploaderAvatar?: string;
  uploadedAt: string;
  size: string;
  roomName: string;
  url?: string | null;
  isStarred?: boolean;
}

interface CanvasDoc {
  id: string;
  title: string;
  content: string;
  lastEdited: string;
  author: string;
}

export const FilesExplorer: React.FC<FilesExplorerProps> = ({
  rooms,
  currentUserId,
}) => {
  const [activeNav, setActiveNav] = useState<"all" | "canvases" | "deleted" | "starred">("all");
  const [filterOwnership, setFilterOwnership] = useState<"all" | "created" | "shared">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // In-memory Canvas documents created or opened by the user
  const [canvases, setCanvases] = useState<CanvasDoc[]>([
    {
      id: "c-1",
      title: "Sprint Planning & Delivery Goals",
      content: "# Q3 Sprint Deliverables\n\n- [x] WebSockets message threading\n- [x] Live emoji reactions\n- [x] Team Huddle Voice Room\n- [ ] Canvas export to Markdown\n\n### Architectural Notes\nStratoONE uses standard tRPC & Socket.IO real-time channels with PostgreSQL.",
      lastEdited: "Just now",
      author: "Saifan",
    },
    {
      id: "c-2",
      title: "Employee Onboarding Checklist",
      content: "# Welcome to StratoONE!\n\n1. Complete SSO setup\n2. Introduce yourself in #general\n3. Review our engineering guidelines in docs",
      lastEdited: "Yesterday",
      author: "Saifan",
    }
  ]);

  const [activeCanvasModal, setActiveCanvasModal] = useState<CanvasDoc | null>(null);
  const [savedSuccessToast, setSavedSuccessToast] = useState(false);

  // Fetch real uploaded files & attachments from the database backend via tRPC
  const filesQuery = trpc.upload.listFiles.useQuery(
    {
      ownership: filterOwnership,
      search: searchQuery,
      type: selectedType,
    },
    {
      refetchInterval: 10000,
    }
  );

  const realDbFiles: WorkspaceFile[] = useMemo(() => {
    if (!filesQuery.data) return [];
    return filesQuery.data.map((f: any) => ({
      ...f,
      isStarred: starredIds.has(f.id),
    }));
  }, [filesQuery.data, starredIds]);

  // Starter templates matching Slack canvases
  const templates = [
    {
      id: "t1",
      title: "Employee Onboarding",
      description: "Welcome new people with checklists & docs.",
      tag: "Welcome! We're happy you're here.",
      bullets: ["Your First Week Tasks", "Complete setup before end of week"],
      theme: "from-sky-50 to-blue-50 border-sky-100",
      accent: "text-sky-700",
    },
    {
      id: "t2",
      title: "Monthly Newsletter",
      description: "Broadcast announcements & highlights.",
      tag: "Hello Team @ Stratotech Community",
      bullets: ["Monthly product highlights", "Quarterly milestone review"],
      theme: "from-amber-50 to-orange-50 border-amber-100",
      accent: "text-amber-700",
    },
    {
      id: "t3",
      title: "Out of Office Coverage Plan",
      description: "Share how your work will be covered.",
      tag: "OOO Details & Handover",
      bullets: ["Dates offline: Add dates here", "Availability & Emergency contact"],
      theme: "from-rose-50 to-orange-50 border-rose-100",
      accent: "text-rose-700",
    },
  ];

  // Open new canvas modal with template or blank
  const handleOpenNewCanvas = (template?: typeof templates[0]) => {
    const newDoc: CanvasDoc = {
      id: `c-${Date.now()}`,
      title: template ? template.title : "Untitled Canvas Document",
      content: template
        ? `# ${template.title}\n\n> ${template.description}\n\n### Checklist:\n- [ ] ${template.bullets.join("\n- [ ] ")}\n\nStart writing notes or collaborating here...`
        : "# Untitled Note\n\nStart typing notes, specifications, or announcements here...",
      lastEdited: "Just now",
      author: "Saifan",
    };
    setActiveCanvasModal(newDoc);
  };

  const handleSaveCanvas = (updatedDoc: CanvasDoc) => {
    setCanvases((prev) => {
      const exists = prev.some((c) => c.id === updatedDoc.id);
      if (exists) {
        return prev.map((c) => (c.id === updatedDoc.id ? { ...updatedDoc, lastEdited: "Just now" } : c));
      }
      return [updatedDoc, ...prev];
    });
    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 2500);
  };

  // Combine real database attachments with user files
  const allFiles = useMemo(() => {
    return realDbFiles.filter((file) => {
      if (activeNav === "starred" && !file.isStarred) return false;
      if (activeNav === "canvases" && file.type !== "canvas") return false;
      return true;
    });
  }, [realDbFiles, activeNav]);

  const toggleStar = (fileId: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const renderFileIcon = (type: WorkspaceFile["type"]) => {
    switch (type) {
      case "canvas":
        return (
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
        );
      case "docx":
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
            W
          </div>
        );
      case "pdf":
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
            PDF
          </div>
        );
      case "xlsx":
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
            X
          </div>
        );
      case "image":
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <FileImage className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex h-full bg-white overflow-hidden text-slate-800 relative">
      {/* Left Sub-Panel: Files Categories */}
      <aside className="w-64 border-r border-gray-200/80 bg-[#fbfcfd] p-4 flex flex-col justify-between flex-shrink-0 select-none">
        <div>
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Files & Docs</h2>
            <button
              onClick={() => handleOpenNewCanvas()}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
              title="Create Canvas Note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1 text-xs font-medium">
            <button
              onClick={() => setActiveNav("all")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
                activeNav === "all"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-gray-100/80"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>All files</span>
            </button>

            <button
              onClick={() => setActiveNav("canvases")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                activeNav === "canvases"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-gray-100/80"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-4 h-4" />
                <span>Canvases</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeNav === "canvases" ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"
              }`}>
                {canvases.length}
              </span>
            </button>

            <button
              onClick={() => setActiveNav("deleted")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
                activeNav === "deleted"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-gray-100/80"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Deleted</span>
            </button>

            <button
              onClick={() => setActiveNav("starred")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
                activeNav === "starred"
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-gray-100/80"
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Starred ({starredIds.size})</span>
            </button>

            <div className="pt-6 px-2">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Click the star on any document to save it here for quick access. Click + to create a live canvas doc.
              </p>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Files Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Search Header */}
        <div className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-900">
              {activeNav === "canvases" ? "Canvas Notes & Docs" : "All files"}
            </h1>
            <button
              onClick={() => handleOpenNewCanvas()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Canvas</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files, reports, and team documents..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50/80 hover:bg-gray-50 focus:bg-white rounded-xl border border-gray-200 text-xs text-slate-900 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 transition-all"
            />
          </div>
        </div>

        {/* Templates Showcase */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Starter Canvas Templates</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-600">
                Click to Use
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => handleOpenNewCanvas(tpl)}
                className={`p-4 rounded-2xl border bg-gradient-to-br ${tpl.theme} hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group`}
              >
                <div>
                  <span className={`text-[11px] font-bold ${tpl.accent} mb-1 block`}>
                    {tpl.tag}
                  </span>
                  <ul className="space-y-1 mb-3 text-[11px] text-slate-600">
                    {tpl.bullets.map((b, i) => (
                      <li key={i} className="truncate">
                        • {b}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-black/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {tpl.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate">
                      {tpl.description}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter and Action Bar */}
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
          {/* Ownership Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl text-xs font-medium">
            <button
              onClick={() => setFilterOwnership("all")}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterOwnership === "all"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterOwnership("created")}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterOwnership === "created"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Created by you
            </button>
            <button
              onClick={() => setFilterOwnership("shared")}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterOwnership === "shared"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Shared with you
            </button>
          </div>

          {/* Type & Sort Filters */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200/70 text-slate-700 font-medium focus:outline-none cursor-pointer border-none"
            >
              <option value="all">All Types</option>
              <option value="canvas">Canvases</option>
              <option value="docx">Word (.docx)</option>
              <option value="pdf">PDF (.pdf)</option>
              <option value="xlsx">Spreadsheets</option>
              <option value="image">Images</option>
            </select>

            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200/70 text-slate-700 font-medium transition-colors">
              <span>Recently viewed</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Canvases View if activeNav === 'canvases' */}
        {activeNav === "canvases" ? (
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Active Workspace Canvases
              </span>
            </div>
            {canvases.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveCanvasModal(c)}
                className="group flex items-center justify-between p-4 rounded-2xl hover:bg-[#f8f9fb] border border-gray-200/60 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {c.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      Last edited {c.lastEdited} by <span className="font-semibold">{c.author}</span> • StratoONE Canvas
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  Open Note
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* Real Files Listing */
          <div className="p-6 space-y-2">
            {filesQuery.isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span>Loading workspace files...</span>
              </div>
            ) : allFiles.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                No files found matching your filters.
              </div>
            ) : (
              allFiles.map((file) => (
                <div
                  key={file.id}
                  className="group flex items-center justify-between p-3 rounded-2xl hover:bg-[#f8f9fb] border border-transparent hover:border-gray-200/70 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {renderFileIcon(file.type)}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate hover:text-indigo-600 cursor-pointer">
                        {file.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 truncate flex items-center gap-1.5 mt-0.5">
                        <span>{file.uploaderName}</span>
                        <span>•</span>
                        <span>{file.uploadedAt}</span>
                        <span>•</span>
                        <span className="text-gray-400">{file.size}</span>
                        <span>•</span>
                        <span className="text-gray-400">{file.roomName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {/* Star toggle */}
                    <button
                      onClick={() => toggleStar(file.id)}
                      className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-amber-500 transition-colors"
                      title={file.isStarred ? "Unstar" : "Star file"}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          file.isStarred ? "fill-amber-400 text-amber-400" : ""
                        }`}
                      />
                    </button>

                    {/* Download button */}
                    {file.url ? (
                      <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl hover:bg-white text-gray-500 hover:text-slate-900 transition-colors shadow-2xs border border-transparent hover:border-gray-200"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        onClick={() => alert(`Downloading ${file.name}`)}
                        className="p-2 rounded-xl hover:bg-white text-gray-500 hover:text-slate-900 transition-colors shadow-2xs border border-transparent hover:border-gray-200"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      className="p-2 rounded-xl hover:bg-white text-gray-500 hover:text-slate-900 transition-colors shadow-2xs border border-transparent hover:border-gray-200"
                      title="More actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Canvas Interactive Editor Modal */}
      {activeCanvasModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <FileCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={activeCanvasModal.title}
                  onChange={(e) =>
                    setActiveCanvasModal({
                      ...activeCanvasModal,
                      title: e.target.value,
                    })
                  }
                  className="text-base font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-0.5 flex-1 min-w-0"
                  placeholder="Document title..."
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleSaveCanvas(activeCanvasModal);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </button>
                <button
                  onClick={() => setActiveCanvasModal(null)}
                  className="p-1.5 rounded-xl hover:bg-gray-200/80 text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Editor Body */}
            <div className="p-6 flex-1 flex flex-col gap-3 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-gray-100">
                <span>Collaborative Canvas Note • Markdown enabled</span>
                <span>Author: {activeCanvasModal.author}</span>
              </div>
              <textarea
                value={activeCanvasModal.content}
                onChange={(e) =>
                  setActiveCanvasModal({
                    ...activeCanvasModal,
                    content: e.target.value,
                  })
                }
                rows={16}
                className="w-full h-full min-h-[300px] p-4 text-xs font-mono bg-slate-50/70 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:bg-white resize-none text-slate-800 leading-relaxed"
                placeholder="Start typing your team document here in markdown..."
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-slate-50 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-2">
                {savedSuccessToast ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold animate-pulse">
                    <CheckCircle2 className="w-4 h-4" /> Canvas saved to workspace
                  </span>
                ) : (
                  <span>Auto-saved locally • Accessible across the team</span>
                )}
              </div>
              <button
                onClick={() => {
                  handleSaveCanvas(activeCanvasModal);
                  setActiveCanvasModal(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from "react";
import { Bell, FileAudio, FileSpreadsheet, FileText, LogOut, Menu, Search, UserRound, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { notificationService } from "../../services/notification.service";
import { searchService } from "../../services/search.service";
import authService from "../../services/auth.service";
import tokenService from "../../services/token.service";

const fileTypeStyles = {
  audio: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  doc: { Icon: FileText, tone: "bg-blue-50 text-nexus-primary" },
  docx: { Icon: FileText, tone: "bg-blue-50 text-nexus-primary" },
  document: { Icon: FileText, tone: "bg-blue-50 text-nexus-primary" },
  m4a: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  mp3: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  mp4: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  pdf: { Icon: FileText, tone: "bg-red-50 text-red-600" },
  prd: { Icon: FileText, tone: "bg-violet-50 text-violet-700" },
  spreadsheet: { Icon: FileSpreadsheet, tone: "bg-emerald-50 text-emerald-600" },
  wav: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  xls: { Icon: FileSpreadsheet, tone: "bg-emerald-50 text-emerald-600" },
  xlsx: { Icon: FileSpreadsheet, tone: "bg-emerald-50 text-emerald-600" },
};

const getFileTypeStyle = (file) => {
  const fileType = String(file.fileType || file.type || "").toLowerCase();
  const extension = String(file.originalName || file.name || "").split(".").pop()?.toLowerCase();

  return fileTypeStyles[fileType] || fileTypeStyles[extension] || fileTypeStyles.document;
};

const DashboardHeader = ({ onOpenSidebar }) => {
  const navigate = useNavigate();
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

  const getRelativeTime = (dateString) => {
    const diff = (new Date() - new Date(dateString)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
    return `${Math.round(diff / 86400)} days ago`;
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      if (data && data.data) {
        setNotificationItems(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    
    const handleForceRefresh = () => {
      fetchNotifications();
    };
    window.addEventListener("forceNotificationRefresh", handleForceRefresh);
    window.addEventListener("notificationUpdated", fetchNotifications);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("forceNotificationRefresh", handleForceRefresh);
      window.removeEventListener("notificationUpdated", fetchNotifications);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false);
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSignOut = () => {
    tokenService.clearToken();
    setProfileOpen(false);
    navigate("/login");
  };

  const handleInvitationResponse = async (id, response) => {
    try {
      await notificationService.respondToNotification(id, response);
      await fetchNotifications(); // Refresh list after responding
      if (response === "accepted") {
        window.dispatchEvent(new Event("projectListUpdated"));
      }
    } catch (err) {
      console.error("Failed to respond to invitation:", err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleClearRead = async () => {
    try {
      await notificationService.clearReadNotifications();
      setNotificationItems(notificationItems.filter(n => !n.isRead));
    } catch (err) {
      console.error("Failed to clear read notifications:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults(null);
        return;
      }
      setIsSearching(true);
      try {
        const res = await searchService.globalSearch(searchQuery);
        setSearchResults(res.data);
        setSearchOpen(true);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-nexus-border bg-white/80 px-4 backdrop-blur-md lg:px-8">
      <div className="flex flex-1 items-center gap-4">
        <button
          aria-label="Open sidebar"
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary lg:hidden"
          onClick={onOpenSidebar}
          type="button"
        >
          <Menu size={21} />
        </button>
        <div className="relative hidden w-full max-w-xl sm:block" ref={searchRef}>
          <label className="relative flex items-center">
            <span className="sr-only">Search projects or files</span>
            <Search className="absolute left-3 text-slate-400" size={19} />
            <input
              className="h-10 w-full rounded-xl border border-nexus-border bg-[#f3f3f4] pl-10 pr-4 text-sm text-nexus-text outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100"
              placeholder="Search projects or files..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults) setSearchOpen(true); }}
            />
          </label>
          {searchOpen && (searchQuery.trim() !== "") && (
            <div className="absolute left-0 right-0 top-12 max-h-[70vh] overflow-y-auto rounded-2xl border border-nexus-border bg-white p-2 shadow-xl">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
              ) : searchResults && (searchResults.projects?.length > 0 || searchResults.folders?.length > 0 || searchResults.files?.length > 0) ? (
                <div className="flex flex-col gap-1">
                  {searchResults.projects?.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Projects</div>
                      {searchResults.projects.map((p) => (
                        <button
                          key={p._id}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50"
                          onClick={() => {
                            setSearchOpen(false);
                            navigate(`/projects/${p._id}`);
                          }}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-nexus-primary">
                            <span className="text-sm font-bold">P</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-800">{p.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.folders?.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Folders</div>
                      {searchResults.folders.map((f) => (
                        <button
                          key={f._id}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50"
                          onClick={() => {
                            setSearchOpen(false);
                            navigate(`/projects/${f.projectId}`); // Simplify navigation to project for now
                          }}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                            <span className="text-sm font-bold">F</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-800">{f.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.files?.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Files</div>
                      {searchResults.files.map((file) => {
                        const { Icon, tone } = getFileTypeStyle(file);

                        return (
                          <button
                            key={file._id}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 focus:bg-slate-50"
                            onClick={() => {
                              setSearchOpen(false);
                              const fileType = String(file.fileType || "").toLowerCase();
                              const isAudio = ["mp3", "wav", "m4a", "mp4", "audio"].includes(fileType);
                              navigate(`/projects/${file.projectId}/${isAudio ? "transcripts" : "documents"}/${file._id}`);
                            }}
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${tone}`}>
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-slate-800">{file.originalName || file.fileName}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-slate-500">No results found for "{searchQuery}"</div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={notificationRef}>
          <button
            aria-expanded={notificationsOpen}
            aria-label="View notifications"
            className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
            onClick={() => {
              setNotificationsOpen((current) => !current);
              setProfileOpen(false);
            }}
            type="button"
          >
            <Bell size={21} />
            {notificationItems.some(n => !n.isRead) && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-600" />
            )}
          </button>
          {notificationsOpen && (
            <section className="absolute right-0 top-12 w-[min(92vw,432px)] overflow-hidden rounded-2xl border border-nexus-border bg-white text-left shadow-xl">
              <div className="flex items-center justify-between border-b border-nexus-border px-5 py-4">
                <h2 className="text-lg font-bold text-nexus-text">Notifications</h2>
                {notificationItems.some(n => n.isRead) && (
                  <button 
                    onClick={handleClearRead} 
                    className="text-xs font-semibold text-slate-500 hover:text-nexus-primary transition-colors"
                  >
                    Clear Read
                  </button>
                )}
              </div>
              <div>
                {notificationItems.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-slate-500">
                    No new notifications
                  </div>
                ) : (
                  notificationItems.map((notification) => {
                    const isInvite = notification.type === "collaboration_invite";
                    const isSystemPrd = notification.type === "system" && notification.title === "AI PRD Job Completed";
                    const isUnread = !notification.isRead;
                    return (
                      <article 
                        className={`relative flex gap-4 border-b border-nexus-border px-5 py-4 last:border-b-0 cursor-pointer ${isUnread ? 'bg-slate-50' : ''}`} 
                        key={notification._id}
                        onClick={() => {
                          if (isUnread) handleMarkAsRead(notification._id);
                        }}
                      >
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isInvite ? 'bg-blue-50 text-nexus-primary' : 'bg-slate-100 text-slate-700'}`}>
                          {isInvite ? <Users size={22} /> : <Bell size={22} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-sm ${isUnread ? 'font-bold' : 'font-medium'} text-slate-800`}>{notification.title}</h3>
                          <p className={`mt-1 text-sm ${isUnread ? 'font-semibold' : ''} leading-5 text-slate-500`}>{notification.message}</p>
                          <p className="mt-1 text-xs text-slate-400">{getRelativeTime(notification.createdAt)}</p>
                          {isInvite && notification.status !== "accepted" && notification.status !== "rejected" && (
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                className="rounded-lg bg-nexus-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-nexus-action"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInvitationResponse(notification._id, "accepted");
                                }}
                                type="button"
                              >
                                Accept
                              </button>
                              <button
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInvitationResponse(notification._id, "rejected");
                                }}
                                type="button"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {isSystemPrd && (
                            <div className="mt-3">
                              <button
                                className="rounded-lg border border-nexus-border bg-white px-3 py-1.5 text-xs font-bold text-nexus-primary shadow-sm transition hover:border-nexus-primary hover:bg-blue-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isUnread) handleMarkAsRead(notification._id);
                                  setNotificationsOpen(false);
                                  // Navigating to actionPath directly instead of workspace
                                  navigate(notification.actionPath || "/ai-prd-workspace");
                                }}
                                type="button"
                              >
                                View in Workspace
                              </button>
                            </div>
                          )}
                        </div>
                        {isUnread && (
                          <div className="flex shrink-0 items-center">
                            <span className="h-2 w-2 rounded-full bg-nexus-primary"></span>
                          </div>
                        )}
                      </article>
                    );
                  })
                )}</div></section>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            aria-expanded={profileOpen}
            aria-label="Open user profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
            onClick={() => {
              setProfileOpen((current) => !current);
              setNotificationsOpen(false);
            }}
            type="button"
          >
            <UserRound size={20} />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-12 w-48 overflow-hidden rounded-xl border border-nexus-border bg-white py-2 text-sm shadow-xl">
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-left font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/profile");
                }}
                type="button"
              >
                <UserRound size={16} /> View Profile
              </button>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-left font-medium text-red-600 transition hover:bg-red-50"
                onClick={handleSignOut}
                type="button"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;


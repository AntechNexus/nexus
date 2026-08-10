import React, { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Menu, Search, UserRound, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { notificationService } from "../../services/notification.service";

const DashboardHeader = ({ onOpenSidebar }) => {
  const navigate = useNavigate();
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const getRelativeTime = (dateString) => {
    const diff = (new Date() - new Date(dateString)) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
    return `${Math.round(diff / 86400)} days ago`;
  };

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      if (data && data.data) {
        setNotificationItems(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false);
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
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
    setProfileOpen(false);
    localStorage.removeItem("nexus_token");
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
        <label className="relative hidden w-full max-w-xl sm:block">
          <span className="sr-only">Search projects or files</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
          <input
            className="h-10 w-full rounded-xl border border-nexus-border bg-[#f3f3f4] pl-10 pr-4 text-sm text-nexus-text outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100"
            placeholder="Search projects or files..."
            type="search"
          />
        </label>
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
              <div className="border-b border-nexus-border px-5 py-4">
                <h2 className="text-lg font-bold text-nexus-text">Notifications</h2>
              </div>
              <div>
                {notificationItems.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-slate-500">
                    No new notifications
                  </div>
                ) : (
                  notificationItems.map((notification) => {
                    const isInvite = notification.type === "collaboration_invite";
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
                            <div className="mt-3 flex gap-2">
                              <button
                                className="rounded-lg bg-nexus-action px-4 py-1.5 text-xs font-bold text-white transition hover:bg-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInvitationResponse(notification._id, "accepted");
                                }}
                                type="button"
                              >
                                Accept
                              </button>
                              <button
                                className="rounded-lg border border-nexus-border px-4 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
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


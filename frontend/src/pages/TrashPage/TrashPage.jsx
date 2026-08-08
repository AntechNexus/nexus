import React, { useEffect, useRef, useState } from "react";
import { FileAudio, FileSpreadsheet, FileText, Folder, MoreVertical, RotateCcw, Trash2 } from "lucide-react";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import { getTrashItems, removeTrashItem, restoreItemFromTrash, emptyTrash, formatDeletedAt } from "../../services/trashApi";

const typeStyles = {
  folder: { Icon: Folder, tone: "bg-blue-50 text-nexus-primary" },
  pdf: { Icon: FileText, tone: "bg-red-50 text-red-600" },
  docx: { Icon: FileText, tone: "bg-blue-50 text-nexus-primary" },
  xlsx: { Icon: FileSpreadsheet, tone: "bg-emerald-50 text-emerald-600" },
  mp3: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  m4a: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  mp4: { Icon: FileAudio, tone: "bg-pink-50 text-nexus-ai" },
  prd: { Icon: FileText, tone: "bg-violet-50 text-violet-700" },
};

const TrashPage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [openMenuItemId, setOpenMenuItemId] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const [toast, setToast] = useState("");
  const menuRef = useRef(null);

  const loadItems = async () => {
    const data = await getTrashItems();
    
    // Create a set of all folder IDs that are currently in the trash
    const trashedFolderIds = new Set(
      data.filter(item => item.type === "folder").map(folder => String(folder.id))
    );

    // Filter out items whose parent is ALSO in the trash.
    // This ensures only the "root" of the deletion action is visible in the Trash.
    const topLevelItems = data.filter(item => !item.parentId || !trashedFolderIds.has(String(item.parentId)));
    
    setItems(topLevelItems);
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpenMenuItemId(null);
        setMenuPosition(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenMenuItemId(null);
        setMenuPosition(null);
        setEmptyConfirmOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const permanentlyRemove = async (item) => {
    const success = await removeTrashItem(item);
    if (success) {
      await loadItems();
      setToast("Item permanently removed.");
    } else {
      setToast("Failed to remove item.");
    }
    setOpenMenuItemId(null);
    setMenuPosition(null);
  };

  const restoreItem = async (item) => {
    if (!item) return;
    const success = await restoreItemFromTrash(item);
    if (success) {
      await loadItems();
      setToast("Item restored to its original project folder.");
    } else {
      setToast("Failed to restore item.");
    }
    setOpenMenuItemId(null);
    setMenuPosition(null);
  };

  const emptyTrashHandler = async () => {
    const success = await emptyTrash();
    if (success) {
      setItems([]);
      setToast("Trash emptied.");
    } else {
      setToast("Failed to empty trash.");
    }
    setOpenMenuItemId(null);
    setMenuPosition(null);
    setEmptyConfirmOpen(false);
  };

  const toggleMenu = (event, trashId) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOpenMenuItemId((current) => (current === trashId ? null : trashId));
    setMenuPosition((current) =>
      openMenuItemId === trashId && current
        ? null
        : {
            top: Math.min(rect.bottom + 8, window.innerHeight - 104),
            left: Math.max(12, rect.right - 176),
          },
    );
  };

  return (
    <div className="min-h-screen bg-nexus-bg font-sans text-nexus-text">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <div className={`min-w-0 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-[280px]"}`}>
        <DashboardHeader onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-4 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-nexus-text">Trash</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-nexus-muted">
                Files and folders moved from project workspaces appear here.
              </p>
            </div>
            <button
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:pointer-events-none disabled:opacity-50"
              disabled={items.length === 0}
              onClick={() => setEmptyConfirmOpen(true)}
              type="button"
            >
              <Trash2 size={16} /> Empty Trash
            </button>
          </div>

          <section className="overflow-hidden rounded-2xl border border-nexus-border bg-white shadow-sm">
            {items.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-nexus-primary">
                  <RotateCcw size={26} />
                </span>
                <h2 className="text-2xl font-bold text-nexus-text">Trash is empty</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-nexus-muted">
                  When a file or folder is moved to Trash, it will show up here for review.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-bold">Name</th>
                      <th className="px-6 py-4 font-bold">Project</th>
                      <th className="px-6 py-4 font-bold">Type</th>
                      <th className="px-6 py-4 font-bold">Deleted</th>
                      <th className="px-6 py-4 font-bold">Modified By</th>
                      <th className="px-6 py-4 font-bold">Size</th>
                      <th className="px-6 py-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-border">
                    {items.map((item) => {
                      const style = typeStyles[item.type] || typeStyles.docx;
                      const Icon = style.Icon;

                      return (
                        <tr className="transition hover:bg-slate-50" key={item.trashId}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.tone}`}>
                                <Icon size={19} />
                              </span>
                              <div>
                                <p className="font-bold text-nexus-text">{item.name}</p>
                                {item.children?.length > 0 && (
                                  <p className="mt-0.5 text-xs font-medium text-nexus-muted">
                                    Includes {item.children.length} nested item{item.children.length === 1 ? "" : "s"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-nexus-primary">{item.projectName}</td>
                          <td className="px-6 py-4 text-nexus-muted">{item.typeLabel || item.type}</td>
                          <td className="px-6 py-4 text-nexus-muted">{formatDeletedAt(item.deletedAt)}</td>
                          <td className="px-6 py-4 text-nexus-text">{item.modifiedBy || "Current User"}</td>
                          <td className="px-6 py-4 text-nexus-muted">{item.size || "--"}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              aria-label={`Open actions for ${item.name}`}
                              aria-expanded={openMenuItemId === item.trashId}
                              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                              onClick={(event) => toggleMenu(event, item.trashId)}
                              type="button"
                            >
                              <MoreVertical size={19} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p className="px-1 text-sm font-semibold text-amber-700">
            Items in Trash will be permanently deleted after 30 days.
          </p>
        </main>
      </div>
      {openMenuItemId && menuPosition && (
        <div
          className="fixed z-[95] w-44 overflow-hidden rounded-xl border border-nexus-border bg-white py-1 text-left shadow-xl"
          ref={menuRef}
          role="menu"
          style={{ left: menuPosition.left, top: menuPosition.top }}
        >
          <button
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-nexus-text transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary"
            onClick={() => restoreItem(items.find((item) => item.trashId === openMenuItemId))}
            role="menuitem"
            type="button"
          >
            Restore
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
            onClick={() => permanentlyRemove(items.find((item) => item.trashId === openMenuItemId))}
            role="menuitem"
            type="button"
          >
            Delete Permanently
          </button>
        </div>
      )}
      {emptyConfirmOpen && (
        <div aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <Trash2 size={25} />
              <h2 className="text-xl font-semibold text-nexus-text">Empty Trash?</h2>
            </div>
            <p className="mb-6 text-sm leading-6 text-slate-600">
              This will permanently delete all items in Trash. You will not be able to restore them later.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold text-nexus-text transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                onClick={() => setEmptyConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                onClick={emptyTrashHandler}
                type="button"
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default TrashPage;

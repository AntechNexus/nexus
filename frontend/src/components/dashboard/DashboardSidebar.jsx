import React from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Bot,
  FolderTree,
  LayoutDashboard,
  PanelLeft,
  Plus,
  Trash2,
  Users,
  X,
  FileText,
} from "lucide-react";
import nexusLogo from "../../assets/icons/Logo-nexus.png";

const primaryNav = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", to: "/projects", icon: FolderTree },
  { label: "AI PRD Workspace", to: "/ai-prd-workspace", icon: FileText },
  { label: "Teams", to: "/teams", icon: Users },
  { label: "Ask Nexus", to: "/ask-nexus", icon: Bot },
];

const secondaryNav = [{ label: "Trash", to: "/trash", icon: Trash2 }];

const navClass = ({ isActive }, collapsed) =>
  [
    "group relative flex items-center rounded-xl px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2",
    collapsed ? "justify-center" : "gap-3",
    isActive
      ? "bg-blue-50 font-semibold text-nexus-primary"
      : "text-slate-600 hover:bg-slate-100 hover:text-nexus-primary",
  ].join(" ");

const Tooltip = ({ label }) => (
  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block">
    {label}
  </span>
);

/**
 * Renders the sidebar navigation menu for the Dashboard layout.
 *
 * This component acts as the main navigation hub for the user, providing links to all primary sections
 * of the application such as Dashboard, Projects, AI PRD Workspace, Teams, Ask Nexus, and Trash.
 * It adapts its layout dynamically based on the current viewport size and user preferences, supporting
 * both a fully expanded state and a minimized (collapsed) state on desktop, as well as a sliding drawer
 * interface on mobile devices.
 *
 * The component relies entirely on props to manage its visual state (collapsed vs. expanded, mobile visibility)
 * and does not maintain internal React state for these aspects, making it a controlled component. It maps over
 * predefined `primaryNav` and `secondaryNav` arrays to render navigation links using React Router's `NavLink`,
 * which automatically applies active styling based on the current URL path.
 *
 * No complex asynchronous side effects are triggered directly within this component. It primarily handles
 * routing interactions and dispatches layout toggle callbacks provided by its parent container.
 *
 * @param {Object} props - The properties object passed to this component.
 * @param {boolean} props.collapsed - Indicates whether the sidebar should be in a minimized (icon-only) state on desktop viewports.
 * @param {boolean} props.mobileOpen - Indicates whether the sidebar is currently open and visible as an overlay on mobile viewports.
 * @param {Function} props.onCloseMobile - Callback function triggered when the user clicks the close button or the background overlay on mobile devices.
 * @param {Function} props.onToggleCollapse - Callback function triggered when the user clicks the collapse/expand toggle button on desktop devices.
 * @returns {JSX.Element} The rendered `aside` element containing the application logo, "New Project" button, and navigation links.
 */
const DashboardSidebar = ({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}) => (
  <>
    <button
      aria-label="Close sidebar overlay"
      className={`fixed inset-0 z-40 bg-black/40 transition lg:hidden ${mobileOpen ? "block" : "hidden"}`}
      onClick={onCloseMobile}
      type="button"
    />
    <aside
      className={[
        "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-nexus-border bg-[#f3f3f4] p-5 transition-all duration-300",
        collapsed ? "lg:w-20" : "lg:w-[280px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "w-[280px]",
      ].join(" ")}
    >
      <div
        className={`mb-9 flex items-center ${collapsed ? "lg:justify-center" : "justify-between gap-3"}`}
      >
        <div
          className={`flex items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`}
        >
          {collapsed ? (
            <button
              aria-label="Expand sidebar"
              className="group/sidebar relative hidden h-10 w-10 items-center justify-center rounded-xl border border-nexus-border bg-white text-nexus-primary shadow-sm transition hover:border-nexus-primary hover:bg-nexus-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2 lg:inline-flex"
              onClick={onToggleCollapse}
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                className="h-7 w-7 object-contain transition group-hover/sidebar:opacity-0"
                src={nexusLogo}
              />
              <PanelLeft
                className="absolute opacity-0 transition group-hover/sidebar:opacity-100"
                size={20}
              />
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover/sidebar:block">
                Sidebar
              </span>
            </button>
          ) : (
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nexus-border bg-white shadow-sm lg:flex">
              <img
                alt=""
                aria-hidden="true"
                className="h-7 w-7 object-contain"
                src={nexusLogo}
              />
            </div>
          )}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nexus-border bg-white shadow-sm lg:hidden">
            <img
              alt=""
              aria-hidden="true"
              className="h-7 w-7 object-contain"
              src={nexusLogo}
            />
          </div>
          <Link
            className={`text-2xl font-extrabold tracking-tight text-nexus-primary transition ${collapsed ? "lg:hidden" : ""}`}
            to="/dashboard"
          >
            NEXUS
          </Link>
        </div>
        <button
          aria-label="Close mobile sidebar"
          className="rounded-lg p-1.5 text-slate-500 transition hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary lg:hidden"
          onClick={onCloseMobile}
          type="button"
        >
          <X size={20} />
        </button>
        {!collapsed && (
          <button
            aria-label="Collapse sidebar"
            className="hidden rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary lg:inline-flex"
            onClick={onToggleCollapse}
            type="button"
          >
            <PanelLeft size={20} />
          </button>
        )}
      </div>

      <Link
        className={`group relative mb-7 flex items-center justify-center gap-2 rounded-xl bg-nexus-primary px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2 ${collapsed ? "lg:h-11 lg:w-11 lg:px-0" : ""}`}
        to="/projects/new"
      >
        <Plus size={18} />
        <span className={collapsed ? "lg:hidden" : ""}>New Project</span>
        {collapsed && <Tooltip label="New Project" />}
      </Link>

      <nav aria-label="Dashboard" className="flex-1 space-y-1">
        {primaryNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              className={(state) => navClass(state, collapsed)}
              key={item.to}
              to={item.to}
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <span className="absolute left-0 h-6 w-1 rounded-r bg-nexus-primary" />
                  )}
                  <Icon size={19} />
                  <span className={collapsed ? "lg:hidden" : ""}>
                    {item.label}
                  </span>
                  {collapsed && <Tooltip label={item.label} />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <nav
        aria-label="Workspace settings"
        className="border-t border-nexus-border pt-5"
      >
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              className={(state) => navClass(state, collapsed)}
              key={item.to}
              to={item.to}
            >
              <>
                <Icon size={19} />
                <span className={collapsed ? "lg:hidden" : ""}>
                  {item.label}
                </span>
                {collapsed && <Tooltip label={item.label} />}
              </>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  </>
);

export default DashboardSidebar;

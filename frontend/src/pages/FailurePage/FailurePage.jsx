import React from "react";
import { AlertTriangle, ArrowLeft, Ban, Clock, Home, RefreshCw, ServerCrash } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import nexusLogo from "../../assets/icons/Logo-nexus.png";

const pageContent = {
  notFound: {
    code: "404",
    eyebrow: "Page not found",
    title: "We couldn't find that page.",
    description: "The link may be misspelled, or the page may have been moved.",
    icon: AlertTriangle,
    tone: "bg-blue-50 text-nexus-primary",
    primaryLabel: "Back to Home",
    primaryTo: "/",
  },
  forbidden: {
    code: "403",
    eyebrow: "Forbidden",
    title: "You don't have access to this workspace area.",
    description: "This page is restricted.",
    icon: Ban,
    tone: "bg-red-50 text-red-600",
    primaryLabel: "Go to Dashboard",
    primaryTo: "/dashboard",
  },
  serverError: {
    code: "500",
    eyebrow: "Internal server error",
    title: "Something went wrong on our side.",
    description: "The platform hit an unexpected error. Try refreshing the page or come back in a moment.",
    icon: ServerCrash,
    tone: "bg-orange-50 text-orange-600",
    primaryLabel: "Go to Dashboard",
    primaryTo: "/dashboard",
    retry: true,
  },
  maintenance: {
    code: "503",
    eyebrow: "Scheduled maintenance",
    title: "Nexus is temporarily offline.",
    description: "We're performing scheduled maintenance to keep your workspace reliable. Please check back soon.",
    icon: Clock,
    tone: "bg-slate-100 text-slate-700",
    primaryLabel: "Back to Home",
    primaryTo: "/",
  },
};

/**
 * Component for displaying generic error and failure states.
 *
 * This page serves as a catch-all UI for various application-level errors, such as 404 Not Found, 
 * 403 Forbidden, 500 Internal Server Error, or 503 Maintenance Mode. It provides a standardized, 
 * user-friendly error layout with dynamic content, icons, and action buttons based on the specific 
 * failure type.
 *
 * It does not manage complex internal state but relies on a pre-defined `pageContent` configuration 
 * dictionary to render the appropriate text, styling (e.g., color tones), and call-to-action buttons.
 *
 * Key side effects include:
 * - Using the `useNavigate` hook to allow users to navigate back to their previous page when they encounter a non-fatal error.
 * - Allowing a full page reload (`window.location.reload()`) for server errors where a retry might resolve the issue.
 *
 * @param {Object} props The properties object.
 * @param {string} [props.type="notFound"] The specific type of error to display. Expected values map to keys in the `pageContent` object (e.g., "notFound", "forbidden", "serverError", "maintenance").
 * @returns {JSX.Element} The rendered error page displaying a relevant icon, error code, description, and recovery actions.
 */
const FailurePage = ({ type = "notFound" }) => {
  const navigate = useNavigate();
  const content = pageContent[type] || pageContent.notFound;
  const Icon = content.icon;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f3f4] px-4 py-10 font-sans text-nexus-text">
      <section className="w-full max-w-2xl rounded-2xl border border-nexus-border bg-white p-6 text-center shadow-sm sm:p-10">
        <Link
          aria-label="Back to Nexus landing page"
          className="mx-auto inline-flex items-center gap-2 rounded-lg text-sm font-bold uppercase text-nexus-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-4"
          to="/"
        >
          <img alt="Nexus logo" className="h-8 w-8 rounded-md object-contain" src={nexusLogo} />
          Nexus
        </Link>

        <div className={`mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-2xl ${content.tone}`}>
          <Icon size={30} />
        </div>

        <p className="mt-8 text-sm font-bold uppercase tracking-[0.12em] text-nexus-primary">{content.eyebrow}</p>
        <p className="mt-3 text-7xl font-bold tracking-tight text-nexus-text">{content.code}</p>
        <h1 className="mt-4 text-2xl font-bold text-nexus-text sm:text-3xl">{content.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-nexus-muted sm:text-base">{content.description}</p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-nexus-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
            to={content.primaryTo}
          >
            <Home size={17} /> {content.primaryLabel}
          </Link>
          {content.retry ? (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-nexus-border bg-white px-5 py-3 text-sm font-bold text-nexus-text transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
              onClick={() => window.location.reload()}
              type="button"
            >
              <RefreshCw size={17} /> Retry
            </button>
          ) : (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-nexus-border bg-white px-5 py-3 text-sm font-bold text-nexus-text transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
              onClick={() => navigate(-1)}
              type="button"
            >
              <ArrowLeft size={17} /> Go Back
            </button>
          )}
        </div>
      </section>
    </main>
  );
};

export default FailurePage;

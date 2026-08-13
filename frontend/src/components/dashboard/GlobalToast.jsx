import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * GlobalToast component that renders a toast notification globally across the application.
 * This component listens for a custom window event "globalToast" to display notifications 
 * without needing to be wrapped in complex context providers at every level of the application tree.
 * 
 * It manages its own local state to hold the toast object which determines what is displayed. 
 * The side effect defined inside it handles both the event listener registration and auto-dismissal 
 * logic for standard toasts. If a toast includes an action path, the auto-dismiss is bypassed, 
 * requiring the user to explicitly interact with it.
 * 
 * On render, if no toast state is present, it returns null. When a toast is active, it renders 
 * a fixed positioning overlay at the bottom right containing the message, an optional action 
 * button for navigation, and a dismiss button.
 *
 * @returns {JSX.Element|null} The JSX structure representing the toast notification or null if none active.
 */
const GlobalToast = () => {
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleGlobalToast = (e) => {
      setToast(e.detail);
      // Auto dismiss after 10 seconds unless it has an action
      if (!e.detail.actionPath) {
        setTimeout(() => setToast(null), 5000);
      }
    };
    
    window.addEventListener("globalToast", handleGlobalToast);
    return () => window.removeEventListener("globalToast", handleGlobalToast);
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl animate-in slide-in-from-bottom-5">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">{toast.message}</p>
        {toast.actionPath && toast.actionLabel && (
          <button
            className="mt-2 text-xs font-semibold text-nexus-primary hover:underline focus:outline-none"
            onClick={() => {
              navigate(toast.actionPath);
              setToast(null);
            }}
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
      <button
        onClick={() => setToast(null)}
        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default GlobalToast;

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

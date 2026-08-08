import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

const DashboardToast = ({ message, onDismiss }) => {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl" role="status">
      <CheckCircle2 className="text-blue-200" size={20} />
      {message}
    </div>
  );
};

export default DashboardToast;

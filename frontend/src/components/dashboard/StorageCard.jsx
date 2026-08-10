import React, { useEffect, useState } from "react";
import authService from "../../services/auth.service";

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

const StorageCard = ({ compact = false }) => {
  const [storageData, setStorageData] = useState(null);

  useEffect(() => {
    const fetchStorage = () => authService.getStorageInfo().then(setStorageData).catch(console.error);
    fetchStorage();

    window.addEventListener("storageUpdated", fetchStorage);
    return () => window.removeEventListener("storageUpdated", fetchStorage);
  }, []);

  if (!storageData) return null;

  const { limitBytes, usedBytes, breakdown } = storageData;
  
  const pctUsed = Math.min(100, Math.round((usedBytes / limitBytes) * 100));
  
  // Calculate specific percentages for the breakdown graph
  const getPct = (val) => (val / limitBytes) * 100;
  const docsPct = getPct((breakdown.document || 0) + (breakdown.spreadsheet || 0));
  const audioPct = getPct(breakdown.audio || 0);
  const prdPct = getPct(breakdown.prd || 0);

  if (compact) {
    return (
      <div className="rounded-2xl border border-nexus-border bg-white p-3 text-center shadow-sm">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-nexus-primary">
          {pctUsed}%
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, limitBytes - usedBytes);

  return (
    <section className="rounded-2xl border border-nexus-border bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.06)]">
      <h2 className="mb-2 text-sm font-semibold text-nexus-text">Storage</h2>
      <div className="mb-3 flex justify-center">
        <div className="relative">
          <svg aria-hidden="true" className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
            {/* Background ring */}
            <path
              className="text-slate-200"
              d="M18 2.08a15.92 15.92 0 1 1 0 31.84 15.92 15.92 0 0 1 0-31.84"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            {/* Docs & Spreadsheets ring */}
            {docsPct > 0 && (
              <path
                className="text-nexus-primary"
                d="M18 2.08a15.92 15.92 0 1 1 0 31.84 15.92 15.92 0 0 1 0-31.84"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${docsPct} 100`}
                strokeLinecap="round"
                strokeWidth="3"
              />
            )}
            {/* Audio ring */}
            {audioPct > 0 && (
              <path
                className="text-nexus-ai"
                d="M18 2.08a15.92 15.92 0 1 1 0 31.84 15.92 15.92 0 0 1 0-31.84"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${audioPct} 100`}
                strokeDashoffset={-docsPct}
                strokeLinecap="round"
                strokeWidth="3"
              />
            )}
            {/* PRD ring */}
            {prdPct > 0 && (
              <path
                className="text-purple-500"
                d="M18 2.08a15.92 15.92 0 1 1 0 31.84 15.92 15.92 0 0 1 0-31.84"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${prdPct} 100`}
                strokeDashoffset={-(docsPct + audioPct)}
                strokeLinecap="round"
                strokeWidth="3"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-sm font-bold ${pctUsed >= 90 ? "text-red-500" : "text-nexus-text"}`}>
              {pctUsed}%
            </span>
            <span className="text-[9px] font-semibold uppercase text-nexus-muted">Used</span>
          </div>
        </div>
      </div>
      <div className="mb-3 space-y-1.5 text-[10px]">
        {docsPct > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-nexus-muted"><span className="h-2 w-2 rounded-full bg-nexus-primary" />Docs</span>
            <strong>{formatBytes((breakdown.document || 0) + (breakdown.spreadsheet || 0))}</strong>
          </div>
        )}
        {audioPct > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-nexus-muted"><span className="h-2 w-2 rounded-full bg-nexus-ai" />Audio</span>
            <strong>{formatBytes(breakdown.audio || 0)}</strong>
          </div>
        )}
        {prdPct > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-nexus-muted"><span className="h-2 w-2 rounded-full bg-purple-500" />PRD</span>
            <strong>{formatBytes(breakdown.prd || 0)}</strong>
          </div>
        )}
      </div>
      <p className="border-t border-nexus-border pt-2 text-center text-[9px] text-nexus-muted">
        {formatBytes(remaining)} remaining
      </p>
    </section>
  );
};

export default StorageCard;

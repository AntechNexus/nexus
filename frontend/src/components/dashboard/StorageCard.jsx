import React, { useEffect, useState } from "react";
import authService from "../../services/auth.service";

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Displays a visual summary of the user's current storage usage limits and breakdown.
 * 
 * This component fetches the storage information on mount using an authentication service and 
 * listens to a global 'storageUpdated' event to keep the data synchronized without requiring a page refresh.
 * It calculates storage usage percentages and renders an SVG-based donut chart to represent 
 * the breakdown of different file types (e.g., Documents, Audio, PRD) consuming the storage space.
 * 
 * The component supports two rendering modes: a default detailed view and a compact view. 
 * The detailed view presents a comprehensive breakdown including the chart, specific byte counts 
 * per category, and remaining storage space. The compact view renders a minimal circular indicator 
 * showing only the overall usage percentage, suitable for constrained spaces like a sidebar or header.
 * 
 * @param {Object} props - The properties passed to the component.
 * @param {boolean} [props.compact=false] - A flag determining the display mode. If true, renders a simplified, smaller version of the storage usage percentage.
 * @returns {JSX.Element|null} A formatted card presenting storage statistics, or null if storage data has not yet loaded.
 */
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
  const storageItems = [
    {
      label: "Docs",
      value: (breakdown.document || 0) + (breakdown.spreadsheet || 0),
      visible: docsPct > 0,
      tone: "bg-nexus-primary",
    },
    {
      label: "Audio",
      value: breakdown.audio || 0,
      visible: audioPct > 0,
      tone: "bg-nexus-ai",
    },
    {
      label: "PRD",
      value: breakdown.prd || 0,
      visible: prdPct > 0,
      tone: "bg-purple-500",
    },
  ];

  return (
    <section className="rounded-2xl border border-nexus-border bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.06)]">
      <h2 className="mb-4 text-base font-semibold text-nexus-text">Storage</h2>
      <div className="grid gap-5 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center">
        <div className="flex justify-center sm:justify-start">
          <div className="relative">
            <svg aria-hidden="true" className="h-32 w-32 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                d="M18 2.08a15.92 15.92 0 1 1 0 31.84 15.92 15.92 0 0 1 0-31.84"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
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
              <span className={`text-2xl font-bold ${pctUsed >= 90 ? "text-red-500" : "text-nexus-text"}`}>
                {pctUsed}%
              </span>
              <span className="text-[10px] font-semibold uppercase text-nexus-muted">Used</span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="space-y-3">
            {storageItems.filter((item) => item.visible).map((item) => (
              <div className="flex items-center justify-between gap-4" key={item.label}>
                <span className="flex items-center gap-2 text-sm font-medium text-nexus-muted">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} />
                  {item.label}
                </span>
                <strong className="text-sm font-semibold text-nexus-text">{formatBytes(item.value)}</strong>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-nexus-border pt-3 text-sm text-nexus-muted">
            {formatBytes(remaining)} remaining
          </p>
        </div>
      </div>
    </section>
  );
};

export default StorageCard;

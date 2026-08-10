import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  FileAudio,
  FileSpreadsheet,
  FileText,
  MoreVertical,
  SlidersHorizontal,
  SortAsc,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const fileTypeStyles = {
  PDF: {
    badge: "bg-red-50 text-red-600",
    icon: "bg-red-50 text-red-600",
    Icon: FileText,
  },
  Audio: {
    badge: "bg-pink-50 text-nexus-ai",
    icon: "bg-pink-50 text-nexus-ai",
    Icon: FileAudio,
  },
  Transcript: {
    badge: "bg-pink-50 text-nexus-ai",
    icon: "bg-pink-50 text-nexus-ai",
    Icon: FileAudio,
  },
  Video: {
    badge: "bg-pink-50 text-nexus-ai",
    icon: "bg-pink-50 text-nexus-ai",
    Icon: FileAudio,
  },
  Spreadsheet: {
    badge: "bg-emerald-50 text-emerald-600",
    icon: "bg-emerald-50 text-emerald-600",
    Icon: FileSpreadsheet,
  },
  Document: {
    badge: "bg-blue-50 text-nexus-primary",
    icon: "bg-blue-50 text-nexus-primary",
    Icon: FileText,
  },
};

const avatarTones = [
  "bg-blue-100 text-nexus-primary",
  "bg-pink-100 text-nexus-ai",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
];

const sortOptions = [
  { label: "Last Modified", value: "modified-desc" },
  { label: "Oldest Modified", value: "modified-asc" },
  { label: "File Name A-Z", value: "name-asc" },
  { label: "File Name Z-A", value: "name-desc" },
  { label: "Size Smallest", value: "size-asc" },
  { label: "Size Largest", value: "size-desc" },
];

const getAvatarTone = (value = "") => {
  const index = value.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return avatarTones[index % avatarTones.length];
};

const parseFileSize = (size = "") => {
  const [amount, unit = ""] = size.split(" ");
  const numericAmount = Number.parseFloat(amount);

  if (Number.isNaN(numericAmount)) return 0;
  if (unit.toUpperCase() === "GB") return numericAmount * 1024 * 1024;
  if (unit.toUpperCase() === "MB") return numericAmount * 1024;
  if (unit.toUpperCase() === "KB") return numericAmount;
  return numericAmount;
};

const slugify = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const isAudioTranscriptFile = (file) =>
  file.typeLabel === "Transcript" || /\.(mp3|mp4)$/i.test(file.name || "") || ["mp3", "mp4", "audio-transcript"].includes(file.type);

const RecentFilesTable = ({ files }) => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("All Types");
  const [sortMode, setSortMode] = useState("modified-desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);

  const fileTypes = useMemo(
    () => ["All Types", ...Array.from(new Set(files.map((file) => file.typeLabel)))],
    [files],
  );

  const visibleFiles = useMemo(() => {
    const filteredFiles =
      selectedType === "All Types" ? files : files.filter((file) => file.typeLabel === selectedType);

    return [...filteredFiles].sort((firstFile, secondFile) => {
      if (sortMode === "name-asc") return firstFile.name.localeCompare(secondFile.name);
      if (sortMode === "name-desc") return secondFile.name.localeCompare(firstFile.name);
      if (sortMode === "size-asc") return parseFileSize(firstFile.size) - parseFileSize(secondFile.size);
      if (sortMode === "size-desc") return parseFileSize(secondFile.size) - parseFileSize(firstFile.size);
      if (sortMode === "modified-asc") return new Date(firstFile.lastModified) - new Date(secondFile.lastModified);
      return new Date(secondFile.lastModified) - new Date(firstFile.lastModified);
    });
  }, [files, selectedType, sortMode]);

  const activeSortLabel = sortOptions.find((option) => option.value === sortMode)?.label ?? "Last Modified";

  const selectType = (type) => {
    setSelectedType(type);
    setFilterOpen(false);
  };

  const selectSort = (mode) => {
    setSortMode(mode);
    setSortOpen(false);
  };

  const openPreview = (file) => {
    const projectId = file.projectId || slugify(file.project);
    const documentId = file.documentId || file.id;
    navigate(
      isAudioTranscriptFile(file)
        ? `/projects/${projectId}/transcripts/${documentId}`
        : `/projects/${projectId}/documents/${documentId}`,
    );
  };

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-nexus-text">Recent Files</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              aria-expanded={filterOpen}
              className={`flex items-center gap-2 rounded-lg border border-nexus-border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary ${
                selectedType === "All Types" ? "text-slate-600" : "text-nexus-primary"
              }`}
              onClick={() => {
                setFilterOpen((current) => !current);
                setSortOpen(false);
              }}
              type="button"
            >
              <SlidersHorizontal size={16} /> {selectedType} <ChevronDown size={16} />
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-nexus-border bg-white py-1 shadow-lg">
                {fileTypes.map((type) => (
                  <button
                    className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary ${
                      selectedType === type ? "font-semibold text-nexus-primary" : "text-slate-600"
                    }`}
                    key={type}
                    onClick={() => selectType(type)}
                    type="button"
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              aria-expanded={sortOpen}
              className="flex items-center gap-2 rounded-lg border border-nexus-border bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
              onClick={() => {
                setSortOpen((current) => !current);
                setFilterOpen(false);
              }}
              type="button"
            >
              <SortAsc size={16} /> {activeSortLabel} <ChevronDown size={16} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-nexus-border bg-white py-1 shadow-lg">
                {sortOptions.map((option) => (
                  <button
                    className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary ${
                      sortMode === option.value ? "font-semibold text-nexus-primary" : "text-slate-600"
                    }`}
                    key={option.value}
                    onClick={() => selectSort(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-nexus-border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <table className="min-w-[940px] w-full text-left text-sm">
            <thead className="bg-[#f8fafc] text-xs text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">File Name</th>
                <th className="px-6 py-4 font-semibold">Project</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Last Modified</th>
                <th className="px-6 py-4 font-semibold">Modified By</th>
                <th className="px-6 py-4 font-semibold">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nexus-border">
              {visibleFiles.map((file) => {
                const typeStyle = fileTypeStyles[file.typeLabel] ?? fileTypeStyles.DOCX;
                const Icon = typeStyle.Icon;

                return (
                  <tr
                    className={`cursor-pointer transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-nexus-primary ${
                      selectedFileId === file.id ? "bg-blue-50/60" : ""
                    }`}
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    onDoubleClick={() => openPreview(file)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openPreview(file);
                      if (event.key === " ") {
                        event.preventDefault();
                        setSelectedFileId(file.id);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${typeStyle.icon}`}>
                          <Icon size={17} />
                        </span>
                        <span className="font-medium text-nexus-text">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-nexus-primary">{file.project}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${typeStyle.badge}`}>
                        {file.typeLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-nexus-text">{file.lastModified}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${getAvatarTone(
                            file.modifiedBy,
                          )}`}
                        >
                          {file.modifiedByInitials}
                        </span>
                        <span className="text-nexus-text">{file.modifiedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-nexus-muted">{file.size}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="sr-only">
        Current sort mode: {activeSortLabel}. Filter is {selectedType}.
      </p>
    </section>
  );
};

export default RecentFilesTable;

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  FileText,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  Edit2
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import { getProjects } from "../../services/projectApi";
import { fetchAudioTranscriptPreview, getAudioTranscriptAI, updateAudioTranscriptAI, getExportTranscriptUrl, getProjectDocumentSummaryAI } from "../../services/projectDetailApi";

const fallbackDocument = {
  id: "meeting-transcript",
  name: "Meeting Audio",
  type: "mp3",
  typeLabel: "MP3",
  lastModified: "Jul 27, 2026",
  modifiedBy: "User",
  size: "10 MB",
};

const getTranscriptTitle = (document) => {
  const withoutExtension = document.name?.replace(/\.(mp3|mp4|wav|m4a)$/i, "");
  return withoutExtension || "Meeting Audio";
};

const formatTime = (seconds) => {
  if (typeof seconds !== "number" || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const AudioTranscriptPage = () => {
  const { documentId, projectId } = useParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [muted, setMuted] = useState(false);

  // Audio and Summary states
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [aiSummary, setAiSummary] = useState(null);

  // Refs
  const audioRef = useRef(null);
  const activeLineRef = useRef(null);

  // Data states
  const [preview, setPreview] = useState(null);
  const [transcriptObj, setTranscriptObj] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loadingTranscript, setLoadingTranscript] = useState(true);
  
  // Editing state
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValues, setEditValues] = useState({ text: "" });
  const [saving, setSaving] = useState(false);

  const project = useMemo(
    () => getProjects().find((item) => item.id === projectId) || { id: projectId, title: "Project Workspace" },
    [projectId],
  );

  useEffect(() => {
    fetchAudioTranscriptPreview(projectId, documentId)
      .then(setPreview)
      .catch(console.error);

    setLoadingTranscript(true);
    getAudioTranscriptAI(documentId)
      .then(res => {
        if (res && res.transcript) {
          setTranscriptObj(res.transcript);
          if (res.transcript.segments) {
            setSegments(res.transcript.segments);
            if (res.transcript.segments.length > 0) setActiveLineIdx(0);
          }
          // Trigger AI Summary
          getProjectDocumentSummaryAI(documentId)
            .then(summaryRes => {
              if (summaryRes.success && summaryRes.summary) {
                const insights = summaryRes.summary.split('\n')
                  .filter(line => line.trim().length > 0)
                  .map(line => line.replace(/^[\*\-\ ]\s*/, '').trim());
                setAiSummary({ status: "Ready for review", insights });
              } else {
                setAiSummary({ status: "Failed to generate summary", insights: [] });
              }
            })
            .catch(() => setAiSummary({ status: "Error generating summary", insights: [] }));
        }
      })
      .catch(err => {
        console.error(err);
        setSegments([]);
      })
      .finally(() => setLoadingTranscript(false));
  }, [projectId, documentId]);

  // Audio Sync logic
  useEffect(() => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.play().catch(e => {
          console.warn("Autoplay blocked", e);
          setPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [playing]);

  // Volume Sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    
    if (segments.length > 0) {
      const idx = segments.findIndex(seg => time >= seg.start && time < (seg.end || seg.start + 10));
      if (idx !== -1 && idx !== activeLineIdx) {
        setActiveLineIdx(idx);
      }
    }
  };

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLineIdx]);

  const handleLineClick = (idx, segment) => {
    if (editingIdx !== null) return;
    setActiveLineIdx(idx);
    if (audioRef.current) {
      audioRef.current.currentTime = segment.start;
      if (!playing) setPlaying(true);
    }
  };

  const handleSeek = (delta) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + delta, audioDuration || audioRef.current.duration || 0));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  if (!preview) {
    return (
      <div className="min-h-screen bg-nexus-bg flex items-center justify-center font-sans text-nexus-text">
        <p className="text-nexus-muted">Loading preview...</p>
      </div>
    );
  }

  const document = preview.document || fallbackDocument;
  const title = getTranscriptTitle(document);
  const activeLine = segments[activeLineIdx] || (segments.length > 0 ? segments[0] : {});

  const handleEdit = (idx, segment) => {
    setEditingIdx(idx);
    setEditValues({ text: segment.text });
  };

  const handleSaveEdit = async () => {
    if (editingIdx === null) return;
    
    const updatedSegments = [...segments];
    updatedSegments[editingIdx].text = editValues.text;
    
    setSegments(updatedSegments);
    setEditingIdx(null);
    setSaving(true);
    
    try {
      await updateAudioTranscriptAI(transcriptObj._id, { segments: updatedSegments });
    } catch (e) {
      console.error("Failed to save transcript", e);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (transcriptObj && transcriptObj._id) {
      window.open(getExportTranscriptUrl(transcriptObj._id), "_blank");
    }
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
        <main className="mx-auto flex h-[calc(100vh-64px)] w-full max-w-[1440px] flex-col bg-[#f9f9fa] px-4 py-4 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-nexus-primary transition hover:text-nexus-action" to={`/projects/${projectId}`}>
              <ArrowLeft size={17} /> Back to project
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-nexus-muted">
            <span>Transcripts</span>
            <span>/</span>
            <span className="text-nexus-text">{title}</span>
          </div>

          <section className="grid flex-1 gap-6 overflow-hidden lg:grid-cols-[minmax(280px,360px)_1fr]">
            <aside className="flex min-h-[360px] flex-col overflow-hidden rounded-xl border border-nexus-border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <header className="flex items-center gap-2 border-b border-nexus-border px-5 py-4">
                <Sparkles className="text-nexus-primary" size={19} />
                <h1 className="text-lg font-bold text-nexus-text">AI Summary</h1>
              </header>
              <div className="flex-1 overflow-y-auto p-5">
                {!aiSummary ? (
                  <p className="text-sm leading-6 text-nexus-muted text-center italic mt-10">
                    Generating AI Summary...
                  </p>
                ) : aiSummary.insights?.length > 0 ? (
                  <ul className="space-y-3">
                    {aiSummary.insights.map((insight, idx) => (
                      <li key={idx} className="flex gap-3 text-sm leading-6 text-slate-700">
                        <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-nexus-primary" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-6 text-nexus-muted text-center italic mt-10">
                    {aiSummary.status}
                  </p>
                )}
              </div>
            </aside>

            <article className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-nexus-border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <header className="border-b border-nexus-border px-5 py-5 lg:px-6">
                <h1 className="text-2xl font-bold tracking-tight text-nexus-text lg:text-3xl">{title}</h1>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-nexus-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText size={15} /> {document.typeLabel || document.type}
                    </span>
                    <span>{project.title}</span>
                  </div>
                  {saving && <span className="text-xs text-nexus-primary font-semibold">Saving changes...</span>}
                </div>
              </header>

              <div className="flex-1 space-y-2 overflow-y-auto p-5 lg:p-6">
                {loadingTranscript ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexus-primary"></div>
                      <p className="text-sm text-nexus-muted font-medium">Transcribing audio, please wait...</p>
                    </div>
                  </div>
                ) : segments.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-nexus-muted">Failed to load transcript or format unsupported.</p>
                  </div>
                ) : (
                  segments.map((segment, idx) => {
                    const active = idx === activeLineIdx;
                    const isEditing = idx === editingIdx;
                    
                    return (
                      <div
                        ref={active ? activeLineRef : null}
                        className={`group grid w-full grid-cols-[60px_1fr] gap-4 rounded-xl px-3 py-3 text-left transition ${
                          active ? "border-l-4 border-nexus-primary bg-[#dee0ff]" : "hover:bg-slate-50"
                        }`}
                        key={idx}
                        onClick={() => handleLineClick(idx, segment)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLineClick(idx, segment); }}
                          title={`Jump to ${formatTime(segment.start)}`}
                          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold transition-all ${
                            active
                              ? "bg-nexus-primary text-white shadow-sm"
                              : "text-slate-400 hover:bg-nexus-primary/10 hover:text-nexus-primary"
                          }`}
                        >
                          {formatTime(segment.start)}
                        </button>
                        
                        <div className="flex items-start justify-between gap-4">
                          {isEditing ? (
                            <div className="flex-1 space-y-2" onClick={e => e.stopPropagation()}>
                              <textarea 
                                className="block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-nexus-primary focus:outline-none focus:ring-1 focus:ring-nexus-primary"
                                value={editValues.text}
                                onChange={e => setEditValues({ text: e.target.value })}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <button className="rounded bg-nexus-primary px-3 py-1 text-xs font-bold text-white hover:bg-nexus-action" onClick={handleSaveEdit}>Save</button>
                                <button className="rounded bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-300" onClick={() => setEditingIdx(null)}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <span className="flex-1 cursor-text" onDoubleClick={() => handleEdit(idx, segment)}>
                              <span className="block text-sm leading-6 text-nexus-text">
                                {segment.text}
                              </span>
                            </span>
                          )}
                          
                          {!isEditing && (
                            <button 
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-nexus-primary hover:bg-white rounded transition"
                              onClick={(e) => { e.stopPropagation(); handleEdit(idx, segment); }}
                              title="Edit line"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <footer className="border-t border-nexus-border bg-[#eeeeef] px-5 py-4">
                <audio 
                  ref={audioRef} 
                  src={preview?.document?.fileUrl} 
                  onTimeUpdate={handleTimeUpdate} 
                  onEnded={() => setPlaying(false)}
                  onLoadedMetadata={() => {
                    if (audioRef.current) setAudioDuration(audioRef.current.duration || 0);
                  }}
                />
                <div className="mb-3 flex items-center gap-4">
                  <span className="w-14 text-xs font-bold text-slate-500">{formatTime(currentTime)}</span>
                  <div 
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-300 cursor-pointer"
                    onClick={(e) => {
                      if (!audioRef.current || !audioDuration) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;
                      audioRef.current.currentTime = pos * audioDuration;
                      setCurrentTime(audioRef.current.currentTime);
                    }}
                  >
                    <div 
                      className="h-full rounded-full bg-nexus-primary transition-all duration-100" 
                      style={{ width: `${audioDuration ? (currentTime / audioDuration) * 100 : 0}%` }} 
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-bold text-slate-500">{formatTime(audioDuration)}</span>
                </div>
                <div className="grid grid-cols-3 items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium italic">Double-click text to edit</span>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      aria-label="Rewind 10 seconds"
                      onClick={() => handleSeek(-10)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-nexus-primary"
                      type="button"
                      title="-10s"
                    >
                      <SkipBack size={20} />
                    </button>
                    <button
                      aria-label={playing ? "Pause audio" : "Play audio"}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-nexus-primary text-white shadow-lg transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
                      onClick={() => setPlaying((current) => !current)}
                      type="button"
                    >
                      {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                    </button>
                    <button
                      aria-label="Fast forward 10 seconds"
                      onClick={() => handleSeek(10)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-nexus-primary"
                      type="button"
                      title="+10s"
                    >
                      <SkipForward size={20} />
                    </button>
                  </div>
                  {/* Volume Control */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      aria-label={muted ? "Unmute" : "Mute"}
                      onClick={() => setMuted((m) => !m)}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-nexus-primary"
                      type="button"
                    >
                      <Volume2 size={18} className={muted ? "opacity-30" : ""} />
                    </button>
                    <input
                      id="volume-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={muted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        if (val > 0 && muted) setMuted(false);
                        if (val === 0) setMuted(true);
                      }}
                      className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-slate-300 accent-nexus-primary"
                      aria-label="Volume"
                    />
                  </div>
                </div>
              </footer>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AudioTranscriptPage;

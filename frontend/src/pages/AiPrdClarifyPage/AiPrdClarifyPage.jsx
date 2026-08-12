import React, { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import { resetPrdSession, startGeneratePrdJob, getActiveGenerateJob } from "../../services/prdBackgroundService";

const GENERATING_STEPS = [
  "Reading your documents...",
  "Applying clarification answers...",
  "Drafting PRD sections...",
  "Formatting your PRD...",
  "Almost done...",
];

const stepItems = [
  { id: "upload", label: "Upload Documents", state: "complete" },
  { id: "clarify", label: "Clarify Question", state: "active" },
  { id: "review", label: "Review PRD", state: "pending" },
];

const AiPrdClarifyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state ?? {};
  const hasPrdState = Boolean(state.cacheId || state.questions);
  const { cacheId, questions = [], projectId, projectName, allFileIds = [], baseVersion = 0 } = state;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [answers, setAnswers] = useState(() => {
    if (initialState?.answers) return initialState.answers;
    const stored = localStorage.getItem("prd_clarify_answers");
    if (stored) return JSON.parse(stored);
    return {};
  });
  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);

  useEffect(() => {
    if (!hasPrdState) {
      navigate("/ai-prd-workspace", { replace: true });
    }
  }, [hasPrdState, navigate]);

  if (!hasPrdState) {
    return null;
  }

  const unansweredMandatory = questions.filter((q) => {
    if (!q.isMandatory) return false;
    const ans = answers[q.id];
    if (!ans) return true;
    if (Array.isArray(ans) && ans.length === 0) return true;
    if (typeof ans === "string" && !ans.trim()) return true;
    return false;
  });
  
  const remainingQuestions = questions.filter((q) => {
    const ans = answers[q.id];
    if (!ans) return true;
    if (Array.isArray(ans) && ans.length === 0) return true;
    if (typeof ans === "string" && !ans.trim()) return true;
    return false;
  }).length;

  const canGeneratePrd = questions.length === 0 || unansweredMandatory.length === 0;

  const setAnswer = (id, value) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const toggleCheckbox = (id, option) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? prev[id] : [];
      return {
        ...prev,
        [id]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
      };
    });
  };

  const submitAnswers = async () => {
    if (!canGeneratePrd) {
      setToast("Please answer all required questions before generating the PRD.");
      return;
    }
    setGenerating(true);
    setGeneratingStep(0);

    try {
      await startGeneratePrdJob(
        cacheId,
        answers,
        questions,
        projectId,
        projectName,
        allFileIds,
        baseVersion
      );
    } catch (err) {
      setGenerating(false);
      setToast(err.message || "Failed to generate PRD. Please try again.");
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
        <main className="nexus-page-shell">
          <section className="mx-auto w-full max-w-5xl space-y-8">
            <div className="space-y-4">
              <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <button className="text-slate-400 transition hover:text-nexus-primary" onClick={() => navigate("/ai-prd-workspace")} type="button">
                  AI PRD Workspace
                </button>
                <span>/</span>
                <span className="text-slate-500">{projectName || "Project"}</span>
                <span>/</span>
                <span className="text-nexus-primary">Generate PRD</span>
                <span>/</span>
                <span className="font-semibold text-nexus-primary">Clarify Question</span>
              </nav>

              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <h1 className="nexus-page-title">Nexus AI Needs a Few Details</h1>
                <span className="w-fit rounded-full border border-nexus-border bg-white px-4 py-2 text-xs font-semibold text-nexus-muted">
                  {remainingQuestions} clarifying questions remaining
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-nexus-border sm:flex-row sm:items-center">
              {stepItems.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold ${
                        step.state === "pending"
                          ? "bg-slate-200 text-nexus-muted"
                          : "bg-nexus-primary text-white"
                      } ${step.state === "active" ? "ring-4 ring-blue-100" : ""}`}
                    >
                      {step.state === "complete" ? <Check size={17} /> : index + 1}
                    </span>
                    <span className={`whitespace-nowrap text-xs font-bold ${step.state === "pending" ? "text-nexus-muted" : "text-nexus-primary"}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < stepItems.length - 1 && (
                    <span className={`hidden h-px flex-1 sm:block ${step.state === "complete" ? "bg-nexus-primary" : "bg-nexus-border"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <section className="overflow-hidden rounded-2xl border border-nexus-border bg-white/95 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <div className="border-b border-nexus-border bg-blue-50/70 px-6 py-4">
                <p className="text-sm font-semibold italic text-nexus-primary">
                  AI synthesizing uploaded context. Please confirm details below.
                </p>
              </div>

              {generating ? (
                <div className="flex flex-col items-center gap-6 bg-white p-16 text-center">
                  <Loader2 className="animate-spin text-nexus-primary" size={48} />
                  <div>
                    <p className="text-lg font-semibold text-nexus-text">Generating your PRD...</p>
                    <p className="mt-2 text-sm text-nexus-muted">{GENERATING_STEPS[generatingStep]}</p>
                  </div>
                  <div className="flex gap-2">
                    {GENERATING_STEPS.map((_, i) => (
                      <span
                        key={i}
                        className={`h-2 w-2 rounded-full transition-all duration-500 ${
                          i <= generatingStep ? "bg-nexus-primary" : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : questions.length === 0 ? (
                <div className="p-16 text-center">
                  <p className="text-base font-semibold text-nexus-text">
                    Your documents are clear and complete!
                  </p>
                  <p className="mt-2 text-sm text-nexus-muted">
                    No clarifying questions needed. You can proceed to generate the PRD directly.
                  </p>
                </div>
              ) : (
                <div className="space-y-10 p-6 sm:p-10">
                  {questions.map((question, index) => (
                    <section key={question.id}>
                      <div className="mb-4 flex items-start gap-4">
                        <span className="text-xl font-bold text-nexus-primary">{index + 1}.</span>
                        <div>
                          <h2 className="text-lg font-semibold text-nexus-text">
                            {question.question}
                            {question.isMandatory && (
                              <span className="ml-2 text-red-500">*</span>
                            )}
                          </h2>
                          {question.description && (
                            <p className="mt-1 text-sm text-nexus-muted">{question.description}</p>
                          )}
                          {!question.isMandatory && (
                            <p className="mt-0.5 text-xs text-nexus-muted">Optional</p>
                          )}
                        </div>
                      </div>

                      {question.type === "checkbox" && (
                        <div className="ml-9 flex flex-wrap gap-3">
                          {(question.options || []).map((option) => {
                            const active = Array.isArray(answers[question.id]) && answers[question.id].includes(option);
                            return (
                              <button
                                className={`inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary ${
                                  active
                                    ? "border-nexus-primary bg-nexus-primary text-white"
                                    : "border-nexus-border bg-white text-nexus-muted hover:bg-slate-50"
                                }`}
                                key={option}
                                onClick={() => toggleCheckbox(question.id, option)}
                                type="button"
                              >
                                {option}
                                {active && <Check size={15} />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {question.type === "radio" && (
                        <div className="ml-9 space-y-4">
                          <div className="flex flex-wrap gap-6">
                            {(question.options || []).map((option) => (
                              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-nexus-text" key={option}>
                                <input
                                  checked={answers[question.id] === option}
                                  className="h-5 w-5 accent-nexus-primary"
                                  name={question.id}
                                  onChange={() => setAnswer(question.id, option)}
                                  type="radio"
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {question.type === "text" && (
                        <div className="ml-9 w-full max-w-lg">
                          <textarea
                            className="w-full rounded-xl border border-nexus-border bg-white px-4 py-3 text-sm outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100"
                            onChange={(e) => setAnswer(question.id, e.target.value)}
                            placeholder="Type your answer here..."
                            rows={3}
                            value={answers[question.id] || ""}
                          />
                        </div>
                      )}

                      {question.type === "select" && (
                        <div className="ml-9 w-full max-w-lg">
                          <select
                            className="h-12 w-full rounded-xl border border-nexus-border bg-white px-4 text-sm outline-none transition focus:border-nexus-primary focus:ring-4 focus:ring-blue-100"
                            onChange={(e) => setAnswer(question.id, e.target.value)}
                            value={answers[question.id] || ""}
                          >
                            <option value="">Select an option...</option>
                            {(question.options || []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}

              {!generating && (
                <footer className="flex flex-col gap-4 border-t border-nexus-border bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                    <button
                      className="inline-flex items-center gap-2 text-sm font-bold text-nexus-muted transition hover:text-nexus-text"
                      onClick={() => {
                        resetPrdSession();
                        navigate("/ai-prd-workspace");
                      }}
                      type="button"
                    >
                      <ArrowLeft size={17} /> Back to Uploads
                    </button>
                  </div>
                  <button
                    className="inline-flex items-center justify-center gap-3 rounded-xl bg-nexus-primary px-8 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-900/10 transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45"
                    disabled={!canGeneratePrd}
                    onClick={submitAnswers}
                    type="button"
                  >
                    Generate PRD
                  </button>
                </footer>
              )}
            </section>
          </section>
        </main>
      </div>
      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default AiPrdClarifyPage;

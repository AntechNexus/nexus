import React from "react";
import nexusLogoMark from "../../../assets/icons/Logo-nexus-mark-white.png";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  FileAudio,
  FileSpreadsheet,
  FileText,
  Lock,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UsersRound,
} from "lucide-react";

const sourceFiles = [
  { name: "Product Brief.pdf", meta: "2.4 MB • PDF", icon: FileText, className: "bg-red-50 text-red-500" },
  { name: "Market Research.docx", meta: "1.1 MB • DOCX", icon: FileText, className: "bg-blue-50 text-blue-600" },
  { name: "Competitive Analysis.xlsx", meta: "947 KB • XLSX", icon: FileSpreadsheet, className: "bg-emerald-50 text-emerald-600" },
  { name: "Stakeholder Interview.m4a", meta: "12.6 MB • AUDIO", icon: FileAudio, className: "bg-pink-50 text-ai-accent" },
];

const floatingFiles = [
  { label: "PDF", icon: FileText, className: "left-[12%] top-[18%] text-red-500" },
  { label: "DOC", icon: FileText, className: "left-[66%] top-[6%] text-blue-600" },
  { label: "XLSX", icon: FileSpreadsheet, className: "left-[71%] top-[45%] text-emerald-600" },
  { label: "AUDIO", icon: FileAudio, className: "left-[18%] top-[67%] text-ai-accent" },
];

/**
 * The HeroLanding component serves as the main hero section of the landing page for the Nexus application.
 * It provides a highly visual and engaging introduction to the core value proposition of the product, which is
 * turning documents into clear Product Requirements Documents (PRDs) in minutes using AI.
 * 
 * This component does not hold any internal React state or trigger side effects. It relies purely on static
 * structure and predefined mock data arrays (`sourceFiles` and `floatingFiles`) to render a complex, responsive layout.
 * The layout includes a dynamic headline, call-to-action buttons, trust badges, and an interactive-looking preview
 * dashboard that demonstrates the workflow (uploading documents, clarifying questions, and AI insight previews).
 * 
 * @returns {JSX.Element} A comprehensive `<section>` element containing the hero visual structure, marketing copy, and a preview mock UI.
 */
const HeroLanding = () => {
  return (
    <section id="top" className="relative mx-auto max-w-[1440px] px-6 pb-16 pt-[104px] sm:px-10 lg:px-11 lg:pb-20">
      <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-ai-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-ai-accent">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 fill-ai-accent" />
            AI Document Management &amp; PRD Generation
          </div>

          <h1 className="max-w-[640px] text-balance text-4xl font-bold leading-[1.02] text-[#0b1533] sm:text-5xl lg:text-6xl">
            Turn documents into clear <span className="text-primary">PRDs</span> in{" "}
            <span className="relative whitespace-nowrap">
              minutes
              <svg aria-hidden="true" className="absolute -bottom-2 left-0 h-3 w-full overflow-visible" viewBox="0 0 180 16" preserveAspectRatio="none">
                <path d="M2 10 C44 4 126 4 178 9" fill="none" stroke="#EA4C89" strokeLinecap="round" strokeWidth="5" />
              </svg>
            </span>
          </h1>

          <p className="mt-6 max-w-[590px] text-base leading-8 text-[#51647f]">
            Nexus uses AI to analyze your documents, clarify gaps, and generate developer-ready PRDs so your team can build the right product, faster.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-action px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(41,77,227,0.28)] transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Get Started Free
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-soft bg-white px-7 py-3.5 text-sm font-semibold text-[#253654] shadow-sm transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <PlayCircle aria-hidden="true" className="h-4 w-4 text-primary" />
              See How It Works
            </a>
          </div>

          <div className="mt-10 grid max-w-[620px] gap-4 text-xs text-[#51647f] sm:grid-cols-3">
            <TrustBadge icon={ShieldCheck} title="Enterprise-grade security" copy="Your data is protected" />
            <TrustBadge icon={UsersRound} title="Built for teams" copy="Collaborate with ease" />
            <TrustBadge icon={Lock} title="You own your data" copy="We never train on yours" />
          </div>
        </div>

        <div className="relative hidden min-h-[430px] overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(226,228,233,0.9)_1px,transparent_0)] [background-size:16px_16px] opacity-45" />
          <svg aria-hidden="true" className="absolute inset-0 z-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="50" y1="50" x2="22" y2="28" stroke="#D7DBE5" strokeWidth="0.42" />
            <line x1="50" y1="50" x2="74" y2="16" stroke="#D7DBE5" strokeWidth="0.42" />
            <line x1="50" y1="50" x2="79" y2="55" stroke="#D7DBE5" strokeWidth="0.42" />
            <line x1="50" y1="50" x2="25" y2="77" stroke="#D7DBE5" strokeWidth="0.42" />
          </svg>
          <div className="absolute left-[45%] top-[40%] z-20 flex h-16 w-16 items-center justify-center rounded-full bg-primary-action shadow-[0_0_0_10px_rgba(41,77,227,0.08),0_18px_34px_rgba(41,77,227,0.34)]">
            <img alt="Nexus" className="h-11 w-11 object-contain" src={nexusLogoMark} />
          </div>

          {floatingFiles.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className={`absolute z-10 flex h-[82px] w-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-outline-soft bg-white shadow-[0_14px_34px_rgba(26,28,29,0.08)] ${item.className}`}
              >
                <Icon aria-hidden="true" className="h-6 w-6" />
                <span className="text-xs font-bold">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-14 overflow-hidden rounded-[24px] border border-outline-soft bg-white shadow-[0_30px_70px_rgba(26,28,29,0.13)]">
        <div className="flex items-center justify-between border-b border-outline-soft bg-white px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-primary">Nexus</span>
          </div>
          <div className="flex items-center gap-3 text-[#6b7c93]">
            <Circle aria-hidden="true" className="h-2.5 w-2.5 fill-[#ff6b6b] text-[#ff6b6b]" />
            <Circle aria-hidden="true" className="h-2.5 w-2.5 fill-[#f7c948] text-[#f7c948]" />
            <Circle aria-hidden="true" className="h-2.5 w-2.5 fill-[#57c785] text-[#57c785]" />
          </div>
        </div>

        <div className="grid bg-[#fbfbfc] lg:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-outline-soft bg-white p-5 lg:block">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-text-muted">Workspace</p>
            {["Projects", "Documents", "PRDs", "Clarifications", "Templates", "Settings"].map((item, index) => (
              <div
                key={item}
                className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${index === 0 ? "bg-primary-soft text-primary" : "text-[#53647d]"}`}
              >
                <FileText aria-hidden="true" className="h-4 w-4" />
                {item}
              </div>
            ))}
          </aside>

          <div className="p-4 sm:p-6 lg:p-7">
            <div className="grid gap-3 rounded-2xl border border-outline-soft bg-white p-4 sm:grid-cols-4">
              {["Select Project", "Upload Documents", "Clarify Requirements", "Review PRD"].map((step, index) => (
                <div key={step} className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index <= 2 ? "bg-primary text-white" : "bg-surface-soft text-text-muted"}`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#1d2a42]">{step}</p>
                    <p className="mt-1 text-xs leading-4 text-[#64748b]">
                      {index === 0 ? "Acme Mobile App" : index === 1 ? "4 files uploaded" : index === 2 ? "3 open questions" : "Ready to export"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_0.9fr]">
              <PreviewPanel title="Uploaded Documents">
                <div className="space-y-3">
                  {sourceFiles.map((file) => {
                    const Icon = file.icon;

                    return (
                      <div key={file.name} className="flex items-center justify-between rounded-xl border border-outline-soft bg-white px-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${file.className}`}>
                            <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#1d2a42]">{file.name}</p>
                            <p className="text-xs text-[#64748b]">{file.meta}</p>
                          </div>
                        </div>
                        <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                      </div>
                    );
                  })}
                  <div className="rounded-xl border border-dashed border-primary/35 bg-primary-soft/35 px-4 py-4 text-center text-sm font-bold text-primary">
                    <UploadCloud aria-hidden="true" className="mx-auto mb-2 h-5 w-5" />
                    Upload more files
                  </div>
                </div>
              </PreviewPanel>

              <PreviewPanel title="Clarification Needed">
                <div className="space-y-3">
                  {["Who are the primary end users?", "What is the expected MVP timeline?", "Do we have a preferred tech stack?"].map((question) => (
                    <div key={question} className="rounded-xl border border-outline-soft bg-white p-4">
                      <div className="mb-3 flex items-start gap-2">
                        <Circle aria-hidden="true" className="mt-1 h-3 w-3 text-outline-strong" />
                        <p className="text-sm font-semibold text-[#1d2a42]">{question}</p>
                      </div>
                      <button className="text-xs font-bold text-primary">Add details...</button>
                    </div>
                  ))}
                  <button className="w-full rounded-xl bg-primary-action px-4 py-3 text-sm font-bold text-white">Submit Answers</button>
                </div>
              </PreviewPanel>

              <PreviewPanel title="AI Insight Preview">
                <div className="space-y-5">
                  <InsightGroup title="Detected" items={["User roles", "Core features", "Business goals", "Integrations"]} type="success" />
                  <InsightGroup title="Potential Gaps" items={["MVP scope clarity", "Timeline & milestones", "Tech stack preference"]} type="warning" />
                  <a href="#features" className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                    View full gap analysis
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
              </PreviewPanel>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * A reusable TrustBadge component used to display a small icon alongside a title and descriptive copy.
 * This is primarily utilized in the hero section to highlight key benefits such as enterprise-grade security,
 * team collaboration, and data privacy.
 * 
 * It renders a flex container with the provided SVG icon on the left, and the text information structured
 * clearly on the right. No local state or side effects are used within this component.
 * 
 * @param {Object} props - The properties passed to the component.
 * @param {React.ElementType} props.icon - The Lucide React icon component to be rendered.
 * @param {string} props.title - The primary bolded text highlighting the trust feature.
 * @param {string} props.copy - The secondary muted text providing additional context or description.
 * @returns {JSX.Element} A `<div>` element containing the flex-aligned icon, title, and copy.
 */
const TrustBadge = ({ icon: Icon, title, copy }) => (
  <div className="flex items-start gap-3">
    <Icon aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" />
    <div>
      <p className="font-bold text-[#20304d]">{title}</p>
      <p className="mt-1 text-[#64748b]">{copy}</p>
    </div>
  </div>
);

/**
 * The PreviewPanel component is a wrapper layout component used to display categorized sections
 * within the mock dashboard UI of the hero section. It provides a consistent styling with a rounded border,
 * a soft background color, and an optional badge.
 * 
 * It acts purely as a presentational container. It handles rendering its `children` alongside a styled
 * header that includes the provided `title` and conditionally rendered `badge`. No internal state or 
 * lifecycle methods are utilized.
 * 
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.title - The headline title for the panel section.
 * @param {string} [props.badge] - An optional text string to display as a highlighted badge next to the title.
 * @param {React.ReactNode} props.children - The nested React elements to render inside the panel's body.
 * @returns {JSX.Element} A `<section>` element serving as a styled container with a header and nested content.
 */
const PreviewPanel = ({ title, badge, children }) => (
  <section className="rounded-2xl border border-outline-soft bg-[#fbfbfc] p-4">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-bold text-[#1d2a42]">{title}</h3>
      {badge ? <span className="rounded-full bg-ai-accent/10 px-2.5 py-1 text-xs font-bold text-ai-accent">{badge}</span> : null}
    </div>
    {children}
  </section>
);

/**
 * The InsightGroup component displays a categorized list of AI-detected insights or potential gaps
 * within the mock dashboard UI. It renders a styled list of string items, each accompanied by an icon
 * denoting success (detected) or a warning (needs attention).
 * 
 * The component evaluates the `type` prop to determine which icon to render next to each item in the list.
 * It is completely stateless and relies solely on the provided props to dictate its visual output.
 * 
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.title - The small uppercase heading text for this group of insights.
 * @param {Array<string>} props.items - An array of strings representing individual insights or data points.
 * @param {string} props.type - The status type of the group, usually "success" or "warning", which dictates the icon used.
 * @returns {JSX.Element} A `<div>` containing the header and mapped list of items with their respective status icons.
 */
const InsightGroup = ({ title, items, type }) => (
  <div>
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#64748b]">{title}</p>
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-center justify-between text-sm text-[#33445f]">
          <span>{item}</span>
          {type === "success" ? (
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-500" />
          ) : (
            <ChevronDown aria-hidden="true" className="h-4 w-4 -rotate-90 text-ai-accent" />
          )}
        </div>
      ))}
    </div>
  </div>
);

export default HeroLanding;

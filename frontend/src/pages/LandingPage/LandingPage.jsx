import React from "react";
import NavbarLanding from "../../components/layout/NavbarLanding/NavbarLanding";
import HeroLanding from "../../components/layout/HeroLanding/HeroLanding";
import {
  Box,
  Brain,
  CheckCircle2,
  CloudUpload,
  FileAudio,
  FileText,
  Gauge,
  HelpCircle,
  Network,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";

const workflowSteps = [
  {
    id: 1,
    icon: CloudUpload,
    title: "Add Project Sources",
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded border border-dashed border-outline-soft bg-background p-3">
          <FileAudio aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] text-text-variant">
            meeting_audio.mp3
          </span>
        </div>
        <div className="rounded border border-dashed border-outline-soft bg-background p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9px] uppercase text-text-variant/45">
              Stakeholder Notes
            </span>
            <span className="text-[9px] text-primary">Editing...</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-outline-soft">
            <div className="h-full w-3/4 bg-primary-action" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    icon: Brain,
    title: "Let AI Analyze",
    content: (
      <div className="space-y-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft">
          <div className="h-full w-full animate-pulse bg-ai-accent" />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-text-variant">Extracting Requirements...</span>
          <span className="text-ai-accent">85%</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded bg-surface-soft px-2 py-1 text-[9px] text-text-variant">
            Admin Roles
          </span>
          <span className="rounded bg-surface-soft px-2 py-1 text-[9px] text-text-variant">
            Business Rules
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    icon: HelpCircle,
    title: "Resolve Missing Info",
    content: (
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
        <p className="mb-2 flex items-center gap-1 text-[10px] font-bold text-primary">
          <HelpCircle aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
          Clarification Required
        </p>
        <p className="mb-3 text-[10px] leading-4 text-text-variant">
          How should the system handle offline sync for large files?
        </p>
        <div className="rounded border border-outline-soft bg-surface px-2 py-2 text-[10px] italic text-text-variant/70">
          Type response here...
        </div>
      </div>
    ),
  },
  {
    id: 4,
    icon: FileText,
    title: "Generate the PRD",
    content: (
      <div>
        <div className="mb-4 space-y-2 rounded-lg border border-outline-soft bg-background p-3">
          <div className="h-2 w-3/4 rounded-full bg-text-variant/15" />
          <div className="h-2 w-full rounded-full bg-text-variant/10" />
          <div className="h-2 w-1/2 rounded-full bg-text-variant/10" />
          <div className="h-2 w-5/6 rounded-full bg-text-variant/10" />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 rounded bg-primary-action py-2 text-[9px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Export PDF
          </button>
          <button className="flex-1 rounded border border-outline-soft bg-surface py-2 text-[9px] font-bold text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Copy Markdown
          </button>
        </div>
      </div>
    ),
  },
];

const benefits = [
  {
    icon: Gauge,
    iconClass: "bg-primary-action",
    title: "Reduce Documentation Time",
    description:
      "Automate transcription, requirement extraction, and document structuring instead of processing meeting information manually.",
  },
  {
    icon: Search,
    iconClass: "bg-ai-accent",
    title: "Detect Requirement Gaps Early",
    description:
      "Identify missing details, conflicting statements, ambiguities, and SOP mismatches before development begins.",
  },
  {
    icon: Network,
    iconClass: "bg-[#4858ab]",
    title: "Standardize Developer Handoffs",
    description:
      "Generate consistent PRDs containing functional requirements, non-functional requirements, business rules, user stories, and acceptance criteria.",
  },
  {
    icon: Box,
    iconClass: "bg-text-main",
    title: "Keep Every Project Organized",
    description:
      "Manage uploaded sources, analysis results, clarification answers, PRD versions, and project progress in one workspace.",
  },
];

const featureSummary = [
  "Secure workspace",
  "Project management",
  "MP3/M4A upload",
  "Notes input",
  "SOP upload",
  "Speech-to-text",
  "Requirement extraction",
  "Gap analysis",
  "Interactive clarification",
  "Markdown PRD",
  "Export options",
  "Version history",
];

const LandingPage = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-text-main">
      <NavbarLanding />
      <main>
        <HeroLanding />

        <section
          id="how-it-works"
          className="border-y border-outline-soft bg-background px-7 py-20 sm:px-10 lg:px-11 lg:py-24"
        >
          <div className="mx-auto max-w-[1440px]">
            <div className="mx-auto mb-14 max-w-3xl text-center lg:mb-16">
              <span className="mb-5 block text-[12px] font-semibold uppercase tracking-[0.45em] text-primary">
                How Nexus Works
              </span>
              <h2 className="text-balance text-[32px] font-normal leading-tight text-text-main sm:text-[42px]">
                From raw discussions to a structured PRD.
              </h2>
              <p className="mx-auto mt-5 max-w-[620px] text-sm leading-6 text-[#4d6383]">
                Nexus guides your team through every stage of requirement
                documentation without losing important context.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {workflowSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <article
                    key={step.id}
                    className="rounded-xl border border-outline-strong bg-surface p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                        {step.id}
                      </span>
                      <Icon
                        aria-hidden="true"
                        className="h-4 w-4 text-primary/45"
                      />
                    </div>
                    <h3 className="mb-5 text-[17px] font-medium text-text-main">
                      {step.title}
                    </h3>
                    {step.content}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-[1440px] px-7 py-20 sm:px-10 lg:px-11 lg:py-24"
        >
          <div className="mx-auto mb-14 max-w-4xl text-center">
            <span className="mb-5 block text-[12px] font-semibold uppercase tracking-[0.45em] text-primary">
              Built for Clearer Product Decisions
            </span>
            <h2 className="text-balance text-[32px] font-normal leading-tight text-text-main sm:text-[42px]">
              Requirements your whole team can understand.
            </h2>
            <p className="mx-auto mt-6 max-w-[720px] text-sm leading-6 text-[#4d6383]">
              Nexus creates one consistent source of truth for Product Managers,
              Business Analysts, Product Owners, and development teams.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.title}
                  className="rounded-xl border border-outline-strong bg-surface px-6 py-8 transition hover:border-primary/30 hover:shadow-md sm:px-8 lg:p-10"
                >
                  <div
                    className={`mb-6 flex h-10 w-10 items-center justify-center rounded-lg text-white ${benefit.iconClass}`}
                  >
                    <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mb-4 text-xl font-normal text-text-main">
                    {benefit.title}
                  </h3>
                  <p className="max-w-xl text-sm leading-6 text-[#263958]">
                    {benefit.description}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-16 grid gap-x-8 gap-y-7 rounded-[28px] bg-surface-muted p-7 sm:grid-cols-2 sm:p-10 md:grid-cols-3 lg:grid-cols-4">
            {featureSummary.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 text-sm font-medium text-text-main"
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 fill-primary text-primary"
                />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="relative mt-20 overflow-hidden rounded-[28px] bg-primary-action px-7 py-16 text-center text-white sm:px-12 lg:px-24 lg:py-20">
            <Sparkles
              aria-hidden="true"
              className="absolute -right-8 -top-8 h-40 w-40 rotate-12 text-white/10 sm:h-56 sm:w-56"
            />
            <div className="relative mx-auto max-w-4xl">
              <h2 className="text-balance text-[34px] font-normal leading-tight sm:text-[44px]">
                Ready to turn complexity into clarity?
              </h2>
              <p className="mx-auto mt-7 max-w-3xl text-base leading-7 text-white/85">
                Create your Nexus workspace and transform your next product
                discussion into an actionable PRD.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-[12px] font-medium text-primary shadow-xl transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action"
                >
                  Create Free Workspace
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 px-8 py-3.5 text-[12px] font-medium text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action"
                >
                  Sign In
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-soft bg-surface px-7 py-12 sm:px-10 lg:px-11">
        <div className="mx-auto grid max-w-[1440px] gap-10 md:grid-cols-[1fr_auto]">
          <div className="max-w-sm">
            <p className="text-lg font-extrabold text-text-main">NEXUS</p>
            <p className="mt-5 text-sm leading-6 text-[#263958]">
              The intelligence layer for high-performance product teams.
              Document better, build faster.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-14">
            <FooterLinks
              title="Product"
              links={["Features", "How it works", "Pricing"]}
            />
            <FooterLinks
              title="Resources"
              links={["Privacy Policy", "Terms of Service", "Security"]}
            />
            <FooterLinks title="Company" links={["About", "Contact", "Blog"]} />
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-[1440px] flex-col gap-4 border-t border-outline-soft pt-7 text-[11px] text-text-variant/60 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2024 NEXUS Technical Systems. All rights reserved.</p>
          <div className="flex gap-5">
            <a
              href="#top"
              className="transition hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Language
            </a>
            <a
              href="#top"
              className="inline-flex items-center gap-1 transition hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Share2 aria-hidden="true" className="h-3.5 w-3.5" />
              Share
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FooterLinks = ({ title, links }) => (
  <nav aria-label={title} className="flex flex-col gap-3">
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-text-variant/45">
      {title}
    </p>
    {links.map((link) => (
      <a
        key={link}
        href={
          link === "How it works"
            ? "#how-it-works"
            : link === "Features"
              ? "#features"
              : "#top"
        }
        className="text-sm text-text-main transition hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {link}
      </a>
    ))}
  </nav>
);

export default LandingPage;

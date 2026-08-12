import React from "react";
import NavbarLanding from "../../components/layout/NavbarLanding/NavbarLanding";
import HeroLanding from "../../components/layout/HeroLanding/HeroLanding";
import {
  ArrowRight,
  Clock3,
  Code2,
  FileArchive,
  FileCheck2,
  FileText,
  FolderKanban,
  HelpCircle,
  SearchCheck,
  Share2,
  Sparkles,
  UploadCloud,
} from "lucide-react";

const workflowSteps = [
  {
    id: 1,
    icon: FolderKanban,
    title: "Select Project",
    description: "Choose an existing workspace or create a new one for your PRD.",
    accent: "text-primary",
  },
  {
    id: 2,
    icon: UploadCloud,
    title: "Upload Documents",
    description: "Add docs, notes, SOPs, spreadsheets, or recordings.",
    accent: "text-primary",
  },
  {
    id: 3,
    icon: Sparkles,
    title: "Clarify Question",
    description: "Nexus extracts context and asks smart follow-up questions.",
    accent: "text-[#ec4899]",
  },
  {
    id: 4,
    icon: FileText,
    title: "Review PRD",
    description: "Review, refine, and export a PRD ready for your team.",
    accent: "text-primary",
  },
  {
    id: 5,
    icon: HelpCircle,
    title: "Ask Nexus AI",
    description:
      "Ask follow-up questions to explore project context in more detail.",
    accent: "text-[#ec4899]",
  },
];

const benefits = [
  {
    icon: Clock3,
    iconClass: "bg-[#fce7f3] text-[#ec4899]",
    title: "Reduce Documentation Time",
    description: "Cut hours of manual work and ship faster with AI-generated PRDs.",
  },
  {
    icon: SearchCheck,
    iconClass: "bg-[#dfe3ff] text-primary",
    title: "Detect Requirement Gaps Early",
    description:
      "Surface missing details before they become expensive development rework.",
  },
  {
    icon: Code2,
    iconClass: "bg-[#dfe3ff] text-primary",
    title: "Standardize Developer Handoffs",
    description:
      "Create structured PRDs that product and engineering teams can trust.",
  },
  {
    icon: FileArchive,
    iconClass: "bg-[#fce7f3] text-[#ec4899]",
    title: "Keep Every Project Organized",
    description:
      "Keep docs, clarifications, PRDs, comments, and versions in one workspace.",
  },
];

const featureSummary = [
  {
    icon: SearchCheck,
    iconClass: "bg-[#dfe3ff] text-primary",
    title: "AI Requirement Extraction",
    description: "Extract key requirements from documents, notes, SOPs, and audio.",
  },
  {
    icon: HelpCircle,
    iconClass: "bg-[#fce7f3] text-[#ec4899]",
    title: "Interactive Clarification",
    description: "Answer AI questions to resolve ambiguity and fill requirement gaps.",
  },
  {
    icon: FileText,
    iconClass: "bg-[#dfe3ff] text-primary",
    title: "PRD Generation",
    description: "Generate clean, structured PRDs in Markdown ready for your team.",
  },
  {
    icon: FileCheck2,
    iconClass: "bg-[#fce7f3] text-[#ec4899]",
    title: "Export & Share",
    description: "Export to PDF or Markdown and share with your team instantly.",
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-text-main">
      <NavbarLanding />
      <main>
        <HeroLanding />

        <section
          id="how-it-works"
          className="bg-background px-7 py-20 sm:px-10 lg:px-11 lg:py-24"
        >
          <div className="mx-auto max-w-[1440px]">
            <div className="mx-auto mb-16 max-w-4xl text-center">
              <h2 className="text-balance text-[34px] font-extrabold leading-tight text-text-main sm:text-[44px]">
                How Nexus Works
              </h2>
              <p className="mx-auto mt-5 max-w-[820px] text-base leading-7 text-[#4d6383]">
                From messy documents to clear PRDs, then deeper project answers
                when your team needs them.
              </p>
            </div>

            <div className="grid gap-y-12 md:grid-cols-5 md:gap-x-6">
              {workflowSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <article
                    key={step.id}
                    className="relative flex flex-col items-center text-center"
                  >
                    {step.id < workflowSteps.length && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 top-[46px] hidden h-px w-full border-t border-dashed border-outline-strong md:block"
                      />
                    )}
                    <div className="relative z-10 mb-8 flex h-[92px] w-[92px] items-center justify-center rounded-full border border-outline-soft bg-surface shadow-md">
                      <span className="absolute -left-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                        {step.id}
                      </span>
                      <Icon
                        aria-hidden="true"
                        className={`h-8 w-8 stroke-[2.4] ${step.accent}`}
                      />
                    </div>
                    <h3 className="mb-4 text-lg font-extrabold text-text-main">
                      {step.title}
                    </h3>
                    <p className="max-w-[230px] text-sm leading-6 text-[#4d6383]">
                      {step.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="mx-auto max-w-[1440px] px-7 pb-20 pt-6 sm:px-10 lg:px-11 lg:pb-24"
        >
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <h2 className="text-balance text-[32px] font-extrabold leading-tight text-text-main sm:text-[42px]">
              Why Teams Choose Nexus
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.title}
                  className="flex min-h-[150px] items-center gap-7 rounded-xl border border-outline-strong bg-surface px-8 py-7 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  <div
                    className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full ${benefit.iconClass}`}
                  >
                    <Icon aria-hidden="true" className="h-8 w-8 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="mb-3 text-lg font-extrabold text-text-main">
                      {benefit.title}
                    </h3>
                    <p className="max-w-xl text-base leading-7 text-[#4d6383]">
                      {benefit.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mx-auto mb-12 mt-20 max-w-4xl text-center">
            <h2 className="text-balance text-[32px] font-extrabold leading-tight text-text-main sm:text-[42px]">
              Everything You Need to Build Better
            </h2>
            <p className="mx-auto mt-5 max-w-[720px] text-base leading-7 text-[#4d6383]">
              Powerful AI features and practical tools designed for product and
              engineering teams.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featureSummary.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="flex min-h-[235px] flex-col items-center rounded-xl border border-outline-strong bg-surface px-7 py-8 text-center shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  <div
                    className={`mb-6 flex h-[54px] w-[54px] items-center justify-center rounded-2xl ${feature.iconClass}`}
                  >
                    <Icon aria-hidden="true" className="h-6 w-6 stroke-[2.2]" />
                  </div>
                  <h3 className="mb-4 text-base font-extrabold text-text-main">
                    {feature.title}
                  </h3>
                  <p className="max-w-[250px] text-sm leading-6 text-[#4d6383]">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-20 rounded-[28px] bg-primary-action px-7 py-14 text-white shadow-2xl shadow-primary/10 sm:px-12 lg:px-16">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-[580px]">
                <h2 className="text-balance text-[38px] font-extrabold leading-tight sm:text-[48px]">
                  Ready to turn
                  <br />
                  complexity into clarity?
                </h2>
                <p className="mt-7 max-w-[560px] text-lg leading-8 text-white/90">
                  Join product and engineering teams using Nexus to turn
                  documents into clarity and ship with confidence.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row lg:shrink-0">
                <a
                  href="/signup"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-white px-8 text-base font-extrabold text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action"
                >
                  Create Free Workspace
                  <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/30 px-8 text-base font-extrabold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-soft bg-surface px-7 py-8 sm:px-10 lg:px-11">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-sm">
            <p className="text-lg font-extrabold text-text-main">NEXUS</p>
            <p className="mt-3 text-sm leading-6 text-[#263958]">
              The intelligence layer for high-performance product teams.
              Document better, build faster.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-[1440px] flex-col gap-4 border-t border-outline-soft pt-5 text-[11px] text-text-variant/60 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 NEXUS Technical Systems. All rights reserved.</p>
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

export default LandingPage;

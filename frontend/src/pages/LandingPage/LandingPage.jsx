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
    title: "Clarify Requirements",
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

/**
 * LandingPage Component
 * 
 * The `LandingPage` acts as the primary marketing and entry point for the Nexus application.
 * Its main purpose is to introduce potential users to the platform's capabilities, emphasizing
 * the transition from raw project documentation to structured PRDs (Product Requirement Documents).
 * 
 * This component does not manage any internal state or trigger any side effects on its own.
 * It primarily serves as a presentational layer, orchestrating the layout of several distinct
 * structural sections that compose the landing experience.
 * 
 * The rendering pipeline is divided into clear semantic sections:
 * - A global navigation bar (`NavbarLanding`).
 * - A hero section (`HeroLanding`) featuring the primary value proposition and calls to action.
 * - A "How Nexus Works" workflow section that maps over static `workflowSteps` to display a step-by-step process.
 * - A features and benefits section that maps over `benefits` and `featureSummary` to highlight key selling points.
 * - A final call-to-action banner and the site footer containing branding and links.
 * 
 * @param {Object} props - The component props (currently none are utilized).
 * @returns {JSX.Element} The fully constructed landing page layout containing navigation, hero, feature sections, and footer.
 */
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
              <h2 className="text-balance text-3xl font-bold leading-tight text-text-main sm:text-4xl">
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
                    <h3 className="mb-4 text-lg font-bold text-text-main">
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

        <section className="mx-auto max-w-[1440px] px-7 pb-20 pt-6 sm:px-10 lg:px-11 lg:pb-24">
          <div className="mx-auto mb-12 max-w-4xl text-center">
            <h2 className="text-balance text-3xl font-bold leading-tight text-text-main sm:text-4xl">
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
                    <h3 className="mb-3 text-lg font-bold text-text-main">
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

          <div id="features" className="mx-auto mb-12 mt-20 max-w-4xl scroll-mt-24 text-center">
            <h2 className="text-balance text-3xl font-bold leading-tight text-text-main sm:text-4xl">
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
                  <h3 className="mb-4 text-base font-bold text-text-main">
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
                <h2 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
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
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-white px-8 text-base font-bold text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action"
                >
                  Create Free Workspace
                  <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/30 px-8 text-base font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action"
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
            <p className="text-lg font-bold text-text-main">NEXUS</p>
            <p className="mt-3 text-sm leading-6 text-[#263958]">
              The intelligence layer for high-performance product teams.
              Document better, build faster.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-[1440px] flex-col gap-4 border-t border-outline-soft pt-5 text-xs text-text-variant/60 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 NEXUS Technical Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

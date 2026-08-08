import React from "react";
import {
  ArrowRight,
  ChartNoAxesColumn,
  FileText,
  Lock,
  MessageCircle,
  UploadCloud,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

const HeroLanding = () => {
  const trustIndicators = [
    {
      id: 1,
      icon: FileText,
      title: "Multi-format input",
    },
    {
      id: 2,
      icon: ChartNoAxesColumn,
      title: "AI-powered gap analysis",
    },
    {
      id: 3,
      icon: TerminalSquare,
      title: "Developer-ready PRD",
    },
    {
      id: 4,
      icon: Lock,
      title: "Secure workspace",
    },
    {
      id: 5,
      icon: MessageCircle,
      title: "Ask NEXUS",
    },
  ];

  return (
    <section id="top" className="mx-auto max-w-[1440px] px-7 pb-20 pt-[116px] sm:px-10 lg:px-11 lg:pb-24">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-outline-strong/40 bg-secondary-soft px-4 py-1.5 text-[11px] font-medium text-primary">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 fill-primary" />
          AI Co-Pilot for Requirement Engineering
        </div>
        <h1 className="max-w-3xl text-balance text-[42px] font-normal leading-[1.08] tracking-normal text-text-main sm:text-[58px] lg:text-[64px]">
          Turn complex conversations into{" "}
          <span className="text-primary">clear product requirements.</span>
        </h1>
        <p className="mt-6 max-w-[610px] text-pretty text-sm leading-6 text-[#4d6383] sm:text-[15px]">
          Nexus transforms meeting audio, written notes, and company SOPs into structured, developer-ready Product Requirement Documents.
        </p>
        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <a
            href="/signup"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-action px-7 py-3 text-[12px] font-semibold text-white shadow-[0_8px_18px_rgba(41,77,227,0.24)] transition hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
          >
          Get Started
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
          <a
            href="#how-it-works"
            className="inline-flex w-full items-center justify-center rounded-lg border border-outline-strong bg-surface px-7 py-3 text-[12px] font-medium text-text-variant transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
          >
            See How It Works
          </a>
        </div>
        <p className="mt-7 text-[12px] text-text-variant/55">
          Spend less time documenting and more time building the right product.
        </p>
      </div>

      <div className="mx-auto mt-11 max-w-[1168px] overflow-hidden rounded-xl border border-outline-soft bg-surface shadow-[0_30px_55px_rgba(26,28,29,0.14)] sm:rounded-2xl">
        <div className="bg-[#f9f9fa] px-4 py-8 text-center sm:px-7">
          <h2 className="text-[24px] font-extrabold leading-tight text-text-main sm:text-[32px]">
            Create New Product Requirement Document (PRD)
          </h2>
          <p className="mt-3 text-[12px] text-[#4d6383]">Upload source materials for AI synthesis and contextual analysis.</p>

          <div className="mx-auto mt-8 max-w-[560px] text-left">
            <label className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-variant">Select Project</label>
            <div className="mt-2 flex h-12 items-center justify-between rounded-xl border border-outline-strong bg-white px-4 text-[12px] text-text-variant">
              Select an existing project
              <ArrowRight className="h-4 w-4 rotate-90 text-primary" />
            </div>
            <p className="mt-2 text-[10px] text-[#4d6383]">Choose the project where this PRD will be generated.</p>
          </div>

          <div className="mt-8 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-0 text-center">
            {[1, 2, 3].map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-[13px] font-bold ${step === 1 ? "border-primary bg-primary text-white" : "border-outline-strong bg-white text-text-variant"}`}>
                    {step}
                  </span>
                  <span className={`text-[10px] font-bold ${step === 1 ? "text-primary" : "text-text-variant"}`}>
                    {step === 1 ? "Upload Documents" : step === 2 ? "Clarify Content" : "Review PRD"}
                  </span>
                </div>
                {index < 2 && <div className="h-px bg-outline-soft" />}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-dashed border-outline-strong bg-white/70 px-5 py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="mt-6 text-[18px] font-semibold text-text-variant/70">Drag &amp; drop your files here or click to browse</p>
            <p className="mt-2 text-[12px] text-text-variant/45">Maximum file size 50MB per file.</p>
            <div className="mx-auto mt-7 inline-flex items-center rounded-lg bg-surface-soft px-4 py-2 text-[11px] font-semibold text-text-variant/50">
              Select a project before uploading documents.
            </div>
            <div className="mt-4 flex justify-center gap-5 text-[10px] font-bold uppercase text-text-variant/35">
              <span>Audio</span>
              <span>PDF</span>
              <span>Word</span>
              <span>Excel</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {trustIndicators.map((feature) => {
          const Icon = feature.icon;

          return (
            <div key={feature.id} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-primary">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </div>
              <p className="max-w-32 text-[13px] leading-5 text-text-variant">{feature.title}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HeroLanding;

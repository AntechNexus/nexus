import React, { useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Crown, Sparkles, XCircle } from "lucide-react";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";

const plans = [
  {
    name: "Starter",
    note: "No credit card required",
    price: "Free",
    period: "",
    action: "Select Starter",
    features: [
      ["3 active projects", true],
      ["Basic workspace", true],
      ["PDF SOP upload", true],
      ["Advanced AI analysis", false],
    ],
  },
  {
    name: "Professional",
    note: "For power users and freelancers",
    price: "Rp149.000",
    yearlyPrice: "Rp1.430.000",
    period: "/ month",
    yearlyPeriod: "/ year",
    action: "Choose Professional",
    featured: true,
    features: [
      ["Unlimited projects", true],
      ["MP3 uploads & transcription", true],
      ["Advanced AI gap analysis", true],
      ["Interactive AI Q&A", true],
      ["Export to Markdown & PDF", true],
    ],
  },
  {
    name: "Team",
    note: "Up to 10 members",
    price: "Rp399.000",
    yearlyPrice: "Rp3.830.000",
    period: "/ month",
    yearlyPeriod: "/ year",
    action: "Choose Team",
    features: [
      ["Shared workspace", true],
      ["Member management", true],
      ["Role-based access", true],
      ["Priority support", true],
      ["PRD templates", true],
    ],
  },
];

const comparisonRows = [
  ["Active projects", "3 Projects", "Unlimited", "Unlimited"],
  ["Audio transcription", "-", "check", "check"],
  ["PDF SOP upload", "Basic", "Unlimited", "Unlimited"],
  ["Gap analysis", "-", "AI Powered", "AI Powered"],
  ["Interactive Q&A", "-", "check", "check"],
  ["Markdown export", "-", "check", "check"],
  ["PDF export", "Limited", "Customizable", "White-label"],
  ["PRD templates", "-", "Standard", "Enterprise Hub"],
  ["Version history", "7 days", "30 days", "Unlimited"],
  ["Team members", "1 Owner", "1 Owner", "Up to 10"],
  ["Role-based access", "-", "-", "check"],
  ["Support", "Community", "Email Support", "24/7 Priority"],
];

const FeatureValue = ({ highlight = false, value }) => {
  if (value === "check") {
    return <CheckCircle2 className="mx-auto text-nexus-primary" size={18} />;
  }

  if (value === "-") {
    return <span className="text-nexus-muted">-</span>;
  }

  return (
    <span className={highlight ? "font-semibold text-nexus-primary" : "text-nexus-text"}>
      {value}
    </span>
  );
};

const SubscriptionsPage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Starter");

  const billingLabel = useMemo(() => (yearly ? "Yearly billing" : "Monthly billing"), [yearly]);

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
        <main className="nexus-page-shell gap-6">
          <section className="max-w-2xl">
            <div className="max-w-2xl">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-nexus-primary">
                Flexible plans for individuals and teams
              </span>
              <h1 className="nexus-page-title">Subscription Plans</h1>
              <p className="mt-3 text-base leading-7 text-nexus-muted">
                Choose the plan that best fits your requirement engineering workflow and scale as you grow.
              </p>
            </div>
          </section>

          <section className="flex justify-center">
            <div className="inline-flex items-center gap-4 rounded-full border border-nexus-border bg-white px-4 py-3 shadow-sm">
              <span className={`text-sm font-semibold ${yearly ? "text-nexus-muted" : "text-nexus-text"}`}>Monthly</span>
              <button
                aria-label={billingLabel}
                aria-pressed={yearly}
                className="relative h-7 w-14 rounded-full bg-nexus-primary p-1 transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
                onClick={() => setYearly((current) => !current)}
                type="button"
              >
                <span className={`block h-5 w-5 rounded-full bg-white transition ${yearly ? "translate-x-7" : ""}`} />
              </button>
              <span className={`flex items-center gap-2 text-sm font-semibold ${yearly ? "text-nexus-text" : "text-nexus-muted"}`}>
                Yearly
                <span className="rounded-full bg-nexus-ai px-2 py-0.5 text-[10px] font-semibold text-white">Save 20%</span>
              </span>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const price = yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
              const period = yearly && plan.yearlyPeriod ? plan.yearlyPeriod : plan.period;
              const selected = selectedPlan === plan.name;

              return (
                <article
                  aria-label={`Select ${plan.name} plan`}
                  aria-pressed={selected}
                  className={`relative flex cursor-pointer flex-col rounded-xl bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2 ${
                    selected
                      ? "border-2 border-nexus-primary ring-4 ring-blue-100"
                      : plan.featured
                        ? "border-2 border-nexus-primary/70 lg:-translate-y-4 lg:shadow-xl"
                        : "border border-nexus-border"
                  }`}
                  key={plan.name}
                  onClick={() => setSelectedPlan(plan.name)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedPlan(plan.name);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {plan.featured && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-nexus-primary px-4 py-1 text-xs font-semibold text-white">
                      MOST POPULAR
                    </span>
                  )}
                  {selected && (
                    <span className="absolute right-5 top-5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-nexus-primary">
                      Selected
                    </span>
                  )}

                  <div className="mb-8">
                    <div className="mb-3 flex items-center gap-2">
                      {plan.featured ? <Sparkles className="text-nexus-primary" size={19} /> : <CreditCard className="text-nexus-muted" size={19} />}
                      <h2 className="nexus-section-title">{plan.name}</h2>
                    </div>
                    <p className="mb-6 text-sm text-nexus-muted">{plan.note}</p>
                    <div className="flex flex-wrap items-baseline gap-1">
                      <span className={`text-4xl font-semibold ${plan.featured ? "text-nexus-primary" : "text-nexus-text"}`}>{price}</span>
                      {period && <span className="text-sm text-nexus-muted">{period}</span>}
                    </div>
                  </div>

                  <ul className="mb-8 flex-1 space-y-4">
                    {plan.features.map(([feature, included]) => (
                      <li className={`flex items-center gap-3 text-sm ${included && plan.featured ? "font-semibold text-nexus-text" : "text-nexus-text"}`} key={feature}>
                        {included ? (
                          <CheckCircle2 className="shrink-0 text-nexus-primary" size={18} />
                        ) : (
                          <XCircle className="shrink-0 text-slate-300" size={18} />
                        )}
                        <span className={included ? "" : "text-nexus-muted/60"}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2 ${
                      selected
                        ? "bg-blue-50 text-nexus-primary"
                        : plan.featured
                          ? "bg-nexus-primary text-white shadow-md hover:bg-nexus-action"
                          : "bg-[#4858ab] text-white hover:bg-nexus-primary"
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedPlan(plan.name);
                    }}
                    type="button"
                  >
                    {selected ? "Selected Plan" : plan.action}
                  </button>
                </article>
              );
            })}
          </section>

          <section>
            <div className="mb-8 flex items-center justify-center gap-2">
              <Crown className="text-nexus-primary" size={20} />
              <h2 className="nexus-section-title">Feature Comparison</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-nexus-border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-nexus-muted">
                    <tr>
                      <th className="border-b border-nexus-border p-6 font-semibold">Feature</th>
                      <th className="border-b border-nexus-border p-6 text-center font-semibold">Starter</th>
                      <th className="border-b border-nexus-border p-6 text-center font-semibold text-nexus-primary">Professional</th>
                      <th className="border-b border-nexus-border p-6 text-center font-semibold">Team</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-nexus-border">
                    {comparisonRows.map(([feature, starter, professional, team]) => (
                      <tr className="transition hover:bg-slate-50" key={feature}>
                        <td className="p-6 font-medium text-nexus-text">{feature}</td>
                        <td className="p-6 text-center"><FeatureValue value={starter} /></td>
                        <td className="p-6 text-center"><FeatureValue highlight value={professional} /></td>
                        <td className="p-6 text-center"><FeatureValue highlight={team === "Unlimited" || team === "Up to 10" || team === "24/7 Priority"} value={team} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SubscriptionsPage;

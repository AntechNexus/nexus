import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Check, Code2, Compass, MoreHorizontal, Rocket, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import nexusLogo from "../../assets/icons/Logo-nexus.png";
import authService from "../../services/auth.service";

const roleOptions = [
  {
    id: "founder",
    title: "Founder",
    description: "Leading vision and scaling the product ecosystem.",
    icon: Rocket,
  },
  {
    id: "product-manager",
    title: "Product Manager",
    description: "Defining roadmaps and coordinating user needs.",
    icon: BriefcaseBusiness,
  },
  {
    id: "developer",
    title: "Developer",
    description: "Building robust systems and writing clean code.",
    icon: Code2,
  },
  {
    id: "architect",
    title: "Architect",
    description: "Designing scalable infrastructure and patterns.",
    icon: Compass,
  },
  {
    id: "other",
    title: "Other",
    description: "I work in a different field or have a unique specialization.",
    icon: MoreHorizontal,
  },
];

const teamSizes = ["1-5", "6-20", "21-50", "51-200", "201-500", "500+"];

const industryOptions = [
  "Technology, SaaS & Software Development",
  "Fast-Moving Consumer Goods (FMCG) & Manufacturing",
  "FinTech, Banking & Financial Services",
  "E-Commerce, Marketplace & Retail",
  "Healthcare, MedTech & Pharmaceuticals",
  "Logistics, Supply Chain & Transportation",
  "IT Consulting, Agency & Software House",
  "EdTech & Education",
  "Telecommunications, Media & Entertainment",
  "Real Estate, PropTech & Construction",
  "Energy, Utilities & Resources",
  "Government, Public Sector & Non-Profit",
  "Other",
];

const initialDetails = {
  fullName: "",
  teamSize: "",
  industry: "",
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [details, setDetails] = useState(() => ({
    ...initialDetails,
    fullName: location.state?.fullName || location.state?.account?.name || "",
  }));
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch user profile from database to get the full name if it's not already in state
    const fetchProfile = async () => {
      try {
        const profileRes = await authService.getProfile();
        if (profileRes?.user?.profile?.fullName) {
          setDetails((prev) => ({ ...prev, fullName: profileRes.user.profile.fullName }));
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };
    
    if (!details.fullName) {
      fetchProfile();
    }
  }, [details.fullName]);

  const selectedRoleLabel = useMemo(
    () => roleOptions.find((role) => role.id === selectedRole)?.title || "",
    [selectedRole],
  );

  const saveAndContinue = async (event) => {
    event.preventDefault();
    if (!details.fullName.trim() || !details.teamSize || !details.industry) {
      setError("Please complete all fields before finishing onboarding.");
      return;
    }

    try {
      await authService.updateProfile({
        fullName: details.fullName.trim(),
        role: selectedRoleLabel || "Not specified",
        teamSize: details.teamSize,
        industry: details.industry,
      });
      navigate("/login", { replace: true, state: { onboardingCompleted: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    }
  };

  const skipOnboarding = async () => {
    try {
      await authService.updateProfile({
        fullName: details.fullName.trim(),
        role: selectedRoleLabel || "Not specified",
        teamSize: "",
        industry: "",
      });
      navigate("/login", { replace: true, state: { onboardingCompleted: true } });
    } catch {
      setError("Failed to skip onboarding. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-6 font-sans text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl flex-col items-center">
        <Link
          aria-label="Back to Nexus landing page"
          className="inline-flex items-center gap-2 rounded-lg text-sm font-extrabold uppercase text-[#0032c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4] focus-visible:ring-offset-4"
          to="/"
        >
          <img alt="Nexus logo" className="h-7 w-7 rounded-md object-contain" src={nexusLogo} />
          Nexus
        </Link>

        <section className="mt-8 w-full max-w-[560px] rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <div className="h-1.5 rounded-t-lg bg-[#0032c4]" />

          {step === 1 ? (
            <div className="p-6 sm:p-9">
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.08em] text-[#294de3]">Step 1 of 2</p>
              <h1 className="mt-3 text-center text-2xl font-extrabold text-slate-950">Tell us about yourself</h1>
              <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-slate-500">
                Help us tailor your experience. Choose the role that best describes what you do.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {roleOptions.map((role) => {
                  const Icon = role.icon;
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`flex min-h-24 rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4] focus-visible:ring-offset-2 ${
                        isSelected
                          ? "border-[#0032c4] bg-blue-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-[#9aa8ff] hover:bg-slate-50"
                      } ${role.id === "other" ? "sm:col-span-2" : ""}`}
                      key={role.id}
                      onClick={() => {
                        setSelectedRole(role.id);
                        setError("");
                      }}
                      type="button"
                    >
                      <span className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#0032c4]">
                        <Icon size={18} />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-slate-950">{role.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{role.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4]"
                  onClick={() => navigate(-1)}
                  type="button"
                >
                  <ArrowLeft size={16} /> Go back
                </button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4]"
                    onClick={skipOnboarding}
                    type="button"
                  >
                    Skip for now
                  </button>
                  <button
                    className="rounded-lg bg-[#294de3] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0032c4] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4] focus-visible:ring-offset-2"
                    disabled={!selectedRole}
                    onClick={() => setStep(2)}
                    type="button"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form className="p-6 sm:p-9" onSubmit={saveAndContinue}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-[11px] font-bold text-[#294de3]">Step 2 of 2</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">Personal Info</span>
              </div>
              <h1 className="mt-8 text-center text-2xl font-extrabold text-slate-950">Personalize your experience</h1>
              <p className="mx-auto mt-2 max-w-md text-center text-sm leading-6 text-slate-500">
                Help us understand how you&apos;ll use NEXUS to provide the best tools for your projects.
              </p>

              <div className="mt-8 space-y-5 text-left">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">Full Name</span>
                  <span className="flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 focus-within:border-[#0032c4] focus-within:ring-4 focus-within:ring-blue-100">
                    <UserRound className="text-slate-400" size={16} />
                    <input
                      className="w-full cursor-not-allowed bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
                      readOnly
                      placeholder="Alex Johnson"
                      type="text"
                      value={details.fullName}
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">Team Size</span>
                  <select
                    className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[#0032c4] focus:ring-4 focus:ring-blue-100"
                    onChange={(event) => {
                      setDetails((current) => ({ ...current, teamSize: event.target.value }));
                      setError("");
                    }}
                    value={details.teamSize}
                  >
                    <option value="">Select team size</option>
                    {teamSizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">Which industry best describes your primary projects?</span>
                  <select
                    className="min-h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0032c4] focus:ring-4 focus:ring-blue-100"
                    onChange={(event) => {
                      setDetails((current) => ({ ...current, industry: event.target.value }));
                      setError("");
                    }}
                    value={details.industry}
                  >
                    <option value="">Select an industry</option>
                    {industryOptions.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </label>
              </div>

              {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4]"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  <ArrowLeft size={16} /> Previous
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0032c4] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#294de3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4] focus-visible:ring-offset-2"
                  type="submit"
                >
                  Finish <Check size={16} />
                </button>
              </div>
            </form>
          )}
        </section>

        <footer className="mt-8 flex flex-wrap justify-center gap-8 text-xs font-semibold text-slate-500">
          <a className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4]" href="#privacy">Privacy Policy</a>
          <a className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4]" href="#terms">Terms of Service</a>
          <a className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0032c4]" href="#support">Contact Support</a>
        </footer>
      </div>
    </main>
  );
};

export default OnboardingPage;

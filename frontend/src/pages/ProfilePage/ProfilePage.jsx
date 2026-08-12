import React, { useEffect, useState } from "react";
import { Camera, CheckCircle2, ChevronRight, Eye, EyeOff, Lock, Pencil, Shield, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DashboardSidebar from "../../components/dashboard/DashboardSidebar";
import DashboardToast from "../../components/dashboard/DashboardToast";
import StorageCard from "../../components/dashboard/StorageCard";
import authService from "../../services/auth.service";

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

const teamSizeOptions = ["1-10", "11-20", "21-50", "51-100", "101-250", "250+"];

const initialsFromName = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "AR";

const ProfilePage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Data profile dari server
  const [profileData, setProfileData] = useState({
    fullName: "Loading...",
    email: "Loading...",
    role: "Loading...",
    industry: "Loading...",
    teamSize: "Loading...",
    avatarUrl: "",
  });
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(profileData);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [toast, setToast] = useState("");
  const [imgError, setImgError] = useState(false);

  const { email, fullName, industry, role, teamSize, avatarUrl } = profileData;
  const initials = initialsFromName(fullName !== "Loading..." ? fullName : "");
  const fileInputRef = React.useRef(null);

  const passwordChecks = [
    { label: "At least 8 characters", valid: passwordForm.next.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(passwordForm.next) },
    { label: "One lowercase letter", valid: /[a-z]/.test(passwordForm.next) },
    { label: "One number", valid: /\d/.test(passwordForm.next) },
    { label: "One special character", valid: /[^A-Za-z0-9]/.test(passwordForm.next) },
  ];

  // Fetch dari database saat komponen dimuat
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileRes = await authService.getProfile();
        const user = profileRes.user;
        setProfileData({
          fullName: user.profile?.fullName || "Not specified",
          email: user.email || "Not specified",
          role: user.onboarding?.role || "Not specified",
          industry: user.onboarding?.industry || "Not specified",
          teamSize: user.onboarding?.teamSize || "Not specified",
          avatarUrl: user.profile?.avatarUrl || "",
        });
      } catch (err) {
        setToast("Failed to load profile data.");
        console.error("Profile fetch error:", err);
      }
    };
    fetchProfile();
  }, []);

  const openEditModal = () => {
    setEditForm(profileData);
    setEditModalOpen(true);
  };

  const [editError, setEditError] = useState("");

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditError("");
    try {
      const updatedProfile = {
        fullName: editForm.fullName.trim(),
        role: editForm.role.trim(),
        industry: editForm.industry.trim(),
        teamSize: editForm.teamSize.trim(),
      };

      await authService.updateProfile(updatedProfile);
      
      setProfileData({
        ...editForm,
        fullName: updatedProfile.fullName,
        role: updatedProfile.role,
        industry: updatedProfile.industry,
        teamSize: updatedProfile.teamSize,
      });
      
      setEditModalOpen(false);
      setToast("Profile details updated successfully.");
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to update profile.");
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!passwordForm.current) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (passwordChecks.some((item) => !item.valid)) {
      setPasswordError("Your new password does not meet the security requirements.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    try {
      await authService.changePassword(passwordForm.current, passwordForm.next);
      setPasswordModalOpen(false);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setPasswordError("");
      setToast("Password changed successfully.");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to change password.");
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
        <main className="nexus-page-shell gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Link className="transition hover:text-nexus-primary" to="/settings">Settings</Link>
              <ChevronRight size={15} />
              <span className="text-nexus-text">User Profile</span>
            </div>
            <h1 className="nexus-page-title">Manage Profile</h1>
          </div>

          <div className="grid grid-cols-12 items-start gap-x-6 gap-y-5">
            <section className="col-span-12 lg:col-span-4">
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-nexus-border">
                <div className="h-32 bg-gradient-to-br from-nexus-primary to-nexus-action" />
                <div className="-mt-16 flex flex-col items-center px-6 pb-8 text-center">
                  <div className="relative group">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-blue-50 text-4xl font-semibold text-nexus-primary shadow-md">
                      {avatarUrl && avatarUrl !== "null" && !imgError ? (
                        <img 
                          src={avatarUrl.startsWith("http") ? avatarUrl : `http://localhost:5000${avatarUrl}`} 
                          alt="Profile" 
                          className="h-full w-full object-cover" 
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg, image/png"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type !== "image/jpeg" && file.type !== "image/png") {
                            setToast("Format file harus .jpg atau .png");
                            return;
                          }
                          if (file.size > 2 * 1024 * 1024) {
                            setToast("Ukuran file maksimal 2MB.");
                            return;
                          }
                          try {
                            const formData = new FormData();
                            formData.append("avatar", file);
                            const res = await authService.updateProfile(formData);
                            setProfileData((prev) => ({ ...prev, avatarUrl: res.profile.avatarUrl }));
                            setImgError(false);
                            setToast("Profile photo updated successfully.");
                          } catch (err) {
                            setToast("Failed to upload profile photo.");
                          }
                        }
                      }}
                    />
                    <button
                      aria-label="Change profile photo"
                      className="absolute bottom-1 right-1 rounded-full bg-nexus-primary p-2 text-white shadow-lg transition hover:bg-nexus-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <Camera size={18} />
                    </button>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-nexus-text">{fullName}</h2>
                  <p className="text-sm text-slate-500">{role}</p>
                  <Link
                    className="mt-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-nexus-primary transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary focus-visible:ring-offset-2"
                    to="/subscriptions"
                  >
                    Starter Plan
                  </Link>
                </div>
              </div>

            </section>

            <section className="col-span-12 lg:col-span-8">
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-nexus-border lg:p-8">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-nexus-text">
                    <UserRound className="text-nexus-primary" size={22} /> Personal Information
                  </h2>
                  <button
                    className="flex items-center gap-1 text-sm font-semibold text-nexus-primary transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                    onClick={openEditModal}
                    type="button"
                  >
                    <Pencil size={16} /> Edit Details
                  </button>
                </div>
                <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                  {[
                    ["Full Name", fullName],
                    ["Email Address", email],
                    ["Role / Title", role],
                    ["Industry", industry],
                    ["Team Size", teamSize],
                  ].map(([label, value]) => (
                    <div className="space-y-1" key={label}>
                      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
                      <p className="border-b border-nexus-border py-2 text-base text-nexus-text">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

            </section>

            <section className="col-span-12 lg:col-span-4">
              <StorageCard />
            </section>

            <section className="col-span-12 lg:col-span-8">
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-nexus-border lg:p-8">
                <h2 className="mb-8 flex items-center gap-2 text-xl font-semibold text-nexus-text">
                  <Shield className="text-nexus-primary" size={22} /> Security
                </h2>
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-nexus-border bg-slate-50 p-4 md:flex-row md:items-center">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-blue-50 p-3 text-nexus-primary">
                      <Lock size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-nexus-text">Password</p>
                      <p className="tracking-[0.35em] text-slate-500">............</p>
                    </div>
                  </div>
                  <button
                    className="rounded-lg border border-nexus-border bg-white px-4 py-2 text-sm font-semibold text-nexus-text transition hover:bg-nexus-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-primary"
                    onClick={() => setPasswordModalOpen(true)}
                    type="button"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {editModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditModalOpen(false)} type="button" />
          <form className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl" onSubmit={handleEditSubmit}>
            <div className="flex items-center justify-between border-b border-nexus-border p-6">
              <h2 className="text-xl font-bold text-nexus-text">Edit Details</h2>
              <button aria-label="Close edit details modal" className="rounded-lg p-1 text-slate-500 hover:text-red-600" onClick={() => setEditModalOpen(false)} type="button">
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {[
                ["fullName", "Full Name", "Alex Rivera"],
                ["email", "Email Address", "alex.rivera@nexus-platform.ai"],
                ["role", "Role / Title", "Senior Product Manager"],
              ].map(([name, label, placeholder]) => (
                <label className="block" key={name}>
                  <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{label}</span>
                  <input
                    className="h-11 w-full rounded-lg border border-nexus-border bg-slate-50 px-3 text-sm outline-none transition focus:border-nexus-primary focus:ring-2 focus:ring-blue-100"
                    onChange={(event) => setEditForm((current) => ({ ...current, [name]: event.target.value }))}
                    placeholder={placeholder}
                    type={name === "email" ? "email" : "text"}
                    value={editForm[name]}
                    disabled={name === "email"}
                  />
                </label>
              ))}
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Industry</span>
                <select
                  className="h-11 w-full rounded-lg border border-nexus-border bg-slate-50 px-3 text-sm outline-none transition focus:border-nexus-primary focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setEditForm((current) => ({ ...current, industry: event.target.value }))}
                  value={editForm.industry}
                >
                  <option value="Not specified">Select an industry</option>
                  {industryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Team Size</span>
                <select
                  className="h-11 w-full rounded-lg border border-nexus-border bg-slate-50 px-3 text-sm outline-none transition focus:border-nexus-primary focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setEditForm((current) => ({ ...current, teamSize: event.target.value }))}
                  value={editForm.teamSize}
                >
                  <option value="Not specified">Select team size</option>
                  {teamSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {editError && <div className="px-6 pb-2"><p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{editError}</p></div>}
            <div className="flex gap-3 border-t border-nexus-border p-6">
              <button className="flex-1 rounded-lg border border-nexus-border px-4 py-2.5 text-sm font-semibold" onClick={() => setEditModalOpen(false)} type="button">
                Cancel
              </button>
              <button className="flex-1 rounded-lg bg-nexus-primary px-4 py-2.5 text-sm font-semibold text-white" type="submit">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {passwordModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPasswordModalOpen(false)} type="button" />
          <form className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl" onSubmit={handlePasswordSubmit}>
            <div className="flex items-center justify-between border-b border-nexus-border p-6">
              <h2 className="text-xl font-bold text-nexus-text">Change Password</h2>
              <button aria-label="Close password modal" className="rounded-lg p-1 text-slate-500 hover:text-red-600" onClick={() => setPasswordModalOpen(false)} type="button">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              {[
                ["current", "CURRENT PASSWORD", "Enter current password"],
                ["next", "NEW PASSWORD", "Min. 8 characters"],
                ["confirm", "CONFIRM NEW PASSWORD", "Repeat new password"],
              ].map(([name, label, placeholder]) => (
                <label className="block" key={name}>
                  <span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>
                  <span className="flex items-center rounded-lg border border-nexus-border bg-slate-50 px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-100">
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      onChange={(event) => {
                        setPasswordForm((current) => ({ ...current, [name]: event.target.value }));
                        setPasswordError("");
                      }}
                      placeholder={placeholder}
                      type={showPasswords ? "text" : "password"}
                      value={passwordForm[name]}
                    />
                    <button aria-label="Toggle password visibility" className="text-slate-400" onClick={() => setShowPasswords((current) => !current)} type="button">
                      {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>
              ))}
              <div className="grid gap-1 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                {passwordChecks.map((item) => (
                  <p className={`flex items-center gap-2 text-xs ${item.valid ? "text-nexus-primary" : "text-slate-400"}`} key={item.label}>
                    <CheckCircle2 size={14} /> {item.label}
                  </p>
                ))}
              </div>
              {passwordError && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{passwordError}</p>}
              <div className="flex gap-3 pt-2">
                <button className="flex-1 rounded-lg border border-nexus-border px-4 py-2.5 text-sm font-semibold" onClick={() => setPasswordModalOpen(false)} type="button">
                  Cancel
                </button>
                <button className="flex-1 rounded-lg bg-nexus-primary px-4 py-2.5 text-sm font-semibold text-white" type="submit">
                  Update Password
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <DashboardToast message={toast} onDismiss={() => setToast("")} />
    </div>
  );
};

export default ProfilePage;

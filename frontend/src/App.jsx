import React, { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import OAuthSuccess from "./pages/OAuthSuccess/OAuthSuccess";

const CreateProjectPage = React.lazy(() => import("./pages/CreateProjectPage/CreateProjectPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage/DashboardPage"));
const FailurePage = React.lazy(() => import("./pages/FailurePage/FailurePage"));
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage/ForgotPasswordPage"));
const GoogleAccountPage = React.lazy(() => import("./pages/GoogleAccountPage/GoogleAccountPage"));
const LandingPage = React.lazy(() => import("./pages/LandingPage/LandingPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage/LoginPage"));
const OnboardingPage = React.lazy(() => import("./pages/OnboardingPage/OnboardingPage"));
const PasswordSetupPage = React.lazy(() => import("./pages/PasswordSetupPage/PasswordSetupPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage/ProfilePage"));
const ProjectsPage = React.lazy(() => import("./pages/ProjectsPage/ProjectsPage"));
const RegisterPage = React.lazy(() => import("./pages/RegisterPage/RegisterPage"));
const VerifyOtpPage = React.lazy(() => import("./pages/VerifyOtpPage/VerifyOtpPage"));
const ProjectDetailPage = React.lazy(() => import("./pages/ProjectDetailPage/ProjectDetailPage"));
const TeamsPage = React.lazy(() => import("./pages/TeamsPage/TeamsPage"));
const AudioTranscriptPage = React.lazy(() => import("./pages/AudioTranscriptPage/AudioTranscriptPage"));
const DocumentPreviewPage = React.lazy(() => import("./pages/DocumentPreviewPage/DocumentPreviewPage"));
const AiPrdReviewPage = React.lazy(() => import("./pages/AiPrdReviewPage/AiPrdReviewPage"));
const AiPrdWorkspacePage = React.lazy(() => import("./pages/AiPrdWorkspacePage/AiPrdWorkspacePage"));
const AiPrdClarifyPage = React.lazy(() => import("./pages/AiPrdClarifyPage/AiPrdClarifyPage"));

const TrashPage = React.lazy(() => import("./pages/TrashPage/TrashPage"));

const ReservedRoute = ({ title }) => (
  <main className="reserved-route-placeholder">
    <h1>{title}</h1>
  </main>
);

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<main className="reserved-route-placeholder"><h1>Loading...</h1></main>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          <Route path="/signup/verify" element={<VerifyOtpPage />} />
          <Route path="/auth/google" element={<GoogleAccountPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<PasswordSetupPage />} />
          <Route path="/oauth-success" element={<OAuthSuccess />} />
          
          {/* Failure Pages */}
          <Route path="/403" element={<FailurePage type="forbidden" />} />
          <Route path="/404" element={<FailurePage type="notFound" />} />
          <Route path="/500" element={<FailurePage type="serverError" />} />
          <Route path="/maintenance" element={<FailurePage type="maintenance" />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/auth/setup-password" element={<PasswordSetupPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<CreateProjectPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="/projects/:projectId/teams" element={<TeamsPage />} />
            <Route path="/projects/:projectId/transcripts/:documentId" element={<AudioTranscriptPage />} />
            <Route path="/projects/:projectId/documents/:documentId" element={<DocumentPreviewPage />} />
            <Route path="/ai-prd-workspace" element={<AiPrdWorkspacePage />} />
            <Route path="/ai-prd-workspace/clarify" element={<AiPrdClarifyPage />} />
            <Route path="/ai-prd-workspace/review" element={<AiPrdReviewPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/ask-nexus" element={<ReservedRoute title="Ask Nexus placeholder" />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/settings" element={<ReservedRoute title="Settings page placeholder" />} />
          </Route>

          <Route path="*" element={<FailurePage type="notFound" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;

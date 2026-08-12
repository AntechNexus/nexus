import React, { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import OAuthSuccess from "./pages/OAuthSuccess/OAuthSuccess";
import GlobalToast from "./components/dashboard/GlobalToast";

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
const SubscriptionsPage = React.lazy(() => import("./pages/SubscriptionsPage/SubscriptionsPage"));
const VerifyOtpPage = React.lazy(() => import("./pages/VerifyOtpPage/VerifyOtpPage"));
const ProjectDetailPage = React.lazy(() => import("./pages/ProjectDetailPage/ProjectDetailPage"));
const TeamsPage = React.lazy(() => import("./pages/TeamsPage/TeamsPage"));
const AudioTranscriptPage = React.lazy(() => import("./pages/AudioTranscriptPage/AudioTranscriptPage"));
const DocumentPreviewPage = React.lazy(() => import("./pages/DocumentPreviewPage/DocumentPreviewPage"));
const AiPrdReviewPage = React.lazy(() => import("./pages/AiPrdReviewPage/AiPrdReviewPage"));
const AiPrdWorkspacePage = React.lazy(() => import("./pages/AiPrdWorkspacePage/AiPrdWorkspacePage"));
const AiPrdClarifyPage = React.lazy(() => import("./pages/AiPrdClarifyPage/AiPrdClarifyPage"));

const TrashPage = React.lazy(() => import("./pages/TrashPage/TrashPage"));

const AskNexusPage = React.lazy(() => import("./pages/AskNexusPage/AskNexusPage"));
const AskNexusChatPage = React.lazy(() => import("./pages/AskNexusChatPage/AskNexusChatPage"));

/**
 * The ReservedRoute component serves as a temporary placeholder for routes that are defined
 * but not yet fully implemented with a dedicated page component.
 * 
 * It is a simple, stateless functional component that receives a title and renders it within a main container.
 * This ensures that users do not encounter completely blank pages or errors when navigating to
 * features that are still under development, providing a graceful fallback UI.
 * 
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.title - The text string to display as the primary heading for the placeholder page.
 * @returns {JSX.Element} A `<main>` HTML element rendering the provided title inside an `<h1>` tag.
 */
const ReservedRoute = ({ title }) => (
  <main className="reserved-route-placeholder">
    <h1>{title}</h1>
  </main>
);

/**
 * The App component acts as the root routing configuration and main structural entry point for the React application.
 * It establishes the client-side routing context using `react-router-dom`'s `<BrowserRouter>` and handles the
 * rendering of global utilities such as the `<GlobalToast />` notification provider.
 * 
 * Furthermore, it employs React's code-splitting capabilities via `React.lazy()` and `<Suspense>` to asynchronously
 * load route components only when they are needed. This significantly reduces the initial bundle size and improves
 * application load performance. 
 * 
 * The routing logic is categorized into Public Routes (accessible by anyone), Failure Pages (error boundaries and 404s), 
 * and Protected Routes. Protected Routes are wrapped inside the `<ProtectedRoute />` wrapper, ensuring that only users 
 * with a valid authentication context can access dashboard, project, profile, and team management views.
 * The component maintains no local state of its own, relying instead on the router context to determine what to render.
 * 
 * @returns {JSX.Element} The highest-level application component tree containing the router, suspense boundaries, and defined application routes.
 */
const App = () => {
  return (
    <BrowserRouter>
      <GlobalToast />
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
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
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
            <Route path="/ask-nexus" element={<AskNexusPage />} />
            <Route path="/ask-nexus/chat/:conversationId" element={<AskNexusChatPage />} />
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

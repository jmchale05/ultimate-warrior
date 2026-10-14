import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FullPageLoader } from "./components/LoadingSpinner";
import LoginPage from "./pages/LoginPage";

// Each screen's code downloads only when it's opened, so a student's phone
// never loads the teacher and admin screens.
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Oracle = lazy(() => import("./pages/Oracle"));
const StudentCampaign = lazy(() => import("./pages/StudentCampaign"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const DownloadPage = lazy(() => import("./pages/DownloadPage"));
const TermsConditionsPage = lazy(() => import("./pages/TermsConditionsPage"));

function RootRedirect() {
  return <Navigate to="/login" replace />;
}

function FallbackRoute() {
  return <Navigate to="/login" replace />;
}

function PrivateRoute() {
  const { currentUser, appUser, loading } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!appUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AdminRoute() {
  const { appUser, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!appUser || appUser.role !== "admin") return <Navigate to="/campaigns" replace />;
  return <Outlet />;
}

function CampaignsRoute() {
  const { appUser, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!appUser) return <Navigate to="/login" replace />;
  if (appUser.role === "admin") return <Navigate to="/admin" replace />;
  return <Outlet />;
}

/** Students go straight to their own campaign page; teachers get the class view. */
function CampaignsHome() {
  const { appUser } = useAuth();
  if (appUser?.role === "student") return <Navigate to={`/campaigns/${appUser.uid}`} replace />;
  return <Campaigns />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsConditionsPage />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/mobile-login" element={<Navigate to="/login" replace />} />
            <Route path="/home" element={<Navigate to="/campaigns" replace />} />
            <Route path="/mobile-campaigns" element={<Navigate to="/campaigns" replace />} />
            <Route element={<PrivateRoute />}>
              <Route element={<CampaignsRoute />}>
                <Route path="/campaigns" element={<CampaignsHome />} />
                <Route path="/campaigns/:uid" element={<StudentCampaign />} />
              </Route>
              <Route path="/oracle" element={<Oracle />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
            </Route>
            <Route path="*" element={<FallbackRoute />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

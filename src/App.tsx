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
import Campaigns from "./pages/Campaigns";
import MobileCampaigns from "./pages/MobileCampaigns";
import Oracle from "./pages/Oracle";
import StudentCampaign from "./pages/StudentCampaign";
import AdminDashboard from "./pages/AdminDashboard";
import PrivacyPage from "./pages/PrivacyPage";
import DownloadPage from "./pages/DownloadPage";
import TermsConditionsPage from "./pages/TermsConditionsPage";



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



export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsConditionsPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/mobile-login" element={<Navigate to="/login" replace />} />
          <Route path="/mobile-campaigns" element={<MobileCampaigns />} />
          <Route element={<PrivateRoute />}>
            <Route element={<CampaignsRoute />}>
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:uid" element={<StudentCampaign />} />
            </Route>
            <Route path="/oracle" element={<Oracle />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>
          <Route path="*" element={<FallbackRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

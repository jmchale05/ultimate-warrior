import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useState, useEffect } from "react";
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



function DesktopOnlyGuard() {
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  if (isMobileViewport) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/BACKGROUND-login.png')" }} />
        <div className="absolute inset-0 bg-stone-950/80" />

        <div className="relative roman-card w-full max-w-md rounded-2xl p-8 text-center z-10">
          <div className="mx-auto mb-5 w-16 h-16 rounded-full border border-roman-gold/50 bg-stone-900/80 flex items-center justify-center text-roman-gold text-2xl">
            🖥
          </div>
          <h1 className="font-serif text-2xl text-roman-gold uppercase tracking-widest mb-3">Desktop Only</h1>
          <p className="text-stone-300 text-sm leading-relaxed">
            Ultimate Warrior Challenges is currently available on desktop only. Please use a laptop or desktop browser to access the app.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

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
          <Route element={<DesktopOnlyGuard />}>
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

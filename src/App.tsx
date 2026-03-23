import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FullPageLoader } from "./components/LoadingSpinner";
import DownloadPage from "./pages/DownloadPage";
import LoginPage from "./pages/LoginPage";
import MobileLoginPage from "./pages/MobileLoginPage";
import Campaigns from "./pages/Campaigns";
import MobileCampaigns from "./pages/MobileCampaigns";
import Oracle from "./pages/Oracle";
import StudentCampaign from "./pages/StudentCampaign";
import AdminDashboard from "./pages/AdminDashboard";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function RootRedirect() {
  if (isTauri) return <Navigate to="/login" replace />;
  return <DownloadPage />;
}

function DownloadRoute() {
  if (isTauri) return <Navigate to="/login" replace />;
  return <DownloadPage />;
}

function FallbackRoute() {
  if (isTauri) return <Navigate to="/login" replace />;
  return <Navigate to="/" replace />;
}

function PrivateRoute() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AdminRoute() {
  const { appUser, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!appUser || appUser.role !== "admin") return <Navigate to="/campaigns" replace />;
  return <Outlet />;
}

function MobileBlock() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const isPublicLanding = location.pathname === "/" || location.pathname === "/download";

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile || isPublicLanding) return null;

  return (
    <div className="fixed inset-0 z-9999 bg-stone-950 flex flex-col items-center justify-center text-center px-8 gap-6">
      <img
        src="/ultimate-warrior.png"
        alt="Ultimate Warrior"
        className="w-28 h-28 object-contain drop-shadow-lg"
      />
      <h1 className="text-3xl font-bold text-roman-gold" style={{ fontFamily: "serif" }}>
        Desktop Only
      </h1>
      <p className="text-stone-300 text-lg leading-relaxed max-w-xs">
        Ultimate Warrior Challenges is designed for desktop use only. Please open this site on a computer or laptop.
      </p>
      <div className="text-4xl">🖥️⚔️</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MobileBlock />
      <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/download" element={<DownloadRoute />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/mobile-login" element={<MobileLoginPage />} />
            <Route path="/mobile-campaigns" element={<MobileCampaigns />} />
            <Route element={<PrivateRoute />}>
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:uid" element={<StudentCampaign />} />
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

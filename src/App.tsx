import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import MobileLoginPage from "./pages/MobileLoginPage";
import Campaigns from "./pages/Campaigns";
import MobileCampaigns from "./pages/MobileCampaigns";
import Oracle from "./pages/Oracle";
import TheBeginning from "./pages/TheBeginning";

function PrivateRoute() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-roman-gold text-xl animate-pulse">
          ⚔️ Loading the Legion...
        </div>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function MobileBlock() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950 flex flex-col items-center justify-center text-center px-8 gap-6">
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
    <>
      <MobileBlock />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/mobile-login" element={<MobileLoginPage />} />
            <Route path="/mobile-campaigns" element={<MobileCampaigns />} />
            <Route element={<PrivateRoute />}>
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/oracle" element={<Oracle />} />
              <Route path="/the-beginning" element={<TheBeginning />} />
            </Route>
            <Route path="*" element={<Navigate to="/campaigns" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}

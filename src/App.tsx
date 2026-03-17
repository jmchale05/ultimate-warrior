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

export default function App() {
  return (
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
  );
}

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import LocationPage from "./pages/Location";
import Scan from "./pages/Scan";
import ProfilePage from "./pages/Profile";
import Vouchers from "./pages/Vouchers";
import AdminAuth from "./pages/AdminAuth";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import { DarkModeProvider } from "./components/DarkMode";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DarkModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/home" element={<Home />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/admin" element={<AdminAuth />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </DarkModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

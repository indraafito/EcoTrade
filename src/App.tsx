import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Splash from "./pages/Splash";
import OnboardingRedirect from "./components/Redirect/OnboardingRedirect";
import Onboarding from "./pages/Onboarding";
import AuthRedirect from "./components/Redirect/AuthRedirect";
import Auth from "./pages/Auth";
import ForgotPasswordRedirect from "./components/Redirect/ForgotPasswordRedirect";
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
import ResetPasswordPage from "./pages/ResetPasswordPage";

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
          <Route path="/onboarding" element={<OnboardingRedirect />} />
          <Route path="/auth" element={<AuthRedirect />} />
          <Route path="/forgot-password" element={<ForgotPasswordRedirect />} />
          <Route path="/home" element={<Home />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/admin" element={<AdminAuth />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
       </Routes>
      </BrowserRouter>
      </DarkModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

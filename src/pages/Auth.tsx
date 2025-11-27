import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, User, Eye, EyeOff, X } from "lucide-react";
import { ThemeToggle } from "@/components";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");

  // SHOW/HIDE PASSWORD
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // ================= LOGIN =================
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast.success("Sign in berhasil!");
      navigate("/home");
    } catch (error) {
      toast.error(error.message || "Sign in gagal");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= SIGNUP =================
  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // VALIDASI PASSWORD SAMA
    if (signupPassword !== signupConfirmPassword) {
      toast.error("Password dan konfirmasi password tidak cocok!");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            username: signupUsername,
            full_name: signupFullName,
          },
          emailRedirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) throw error;

      // Simpan email dan tampilkan modal
      setRegisteredEmail(signupEmail);
      setShowEmailModal(true);
      
      // Reset form
      setSignupEmail("");
      setSignupUsername("");
      setSignupPassword("");
      setSignupConfirmPassword("");
      setSignupFullName("");
    } catch (error) {
      toast.error(error.message || "Registrasi gagal");
    } finally {
      setIsLoading(false);
    }
  };

  // ================= GOOGLE LOGIN =================
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) throw error;
    } catch (error) {
      toast.error(error.message || "Google Sign in gagal");
    }
  };

  const handleCloseModal = () => {
    setShowEmailModal(false);
    setActiveTab("login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#112C22] flex items-center justify-center p-4 relative">

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Main card */}
        <div className="bg-card backdrop-blur-2xl p-8 relative">

          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/icon.png" alt="EcoTrade" className="w-10 h-10" />
              <h1 className="text-3xl font-bold bg-gradient-to-br from-primary to-[#1DBF73] bg-clip-text text-transparent">
                coTrade
              </h1>
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-2">
              {activeTab === "signup" ? "Create Account" : "Welcome Back"}
            </h2>

            <p className="text-sm text-muted-foreground">
              {activeTab === "signup"
                ? "Join now and start earning from recycling!"
                : "Sign in to continue recycling and earning points"}
            </p>
          </div>

          {/* Tab */}
          <div className="flex gap-2 mb-6 bg-muted backdrop-blur-sm p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "login"
                  ? "bg-gradient-to-br from-primary to-[#1DBF73] text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "signup"
                  ? "bg-gradient-to-br from-primary to-[#1DBF73] text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* ===================== SIGNUP FORM ===================== */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/90 group-focus-within:text-primary z-10" />
                <input
                  type="text"
                  placeholder="Fullname"
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  className="relative w-full pl-12 pr-4 py-3.5 bg-muted backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/30 placeholder:text-muted-foreground"
                  required
                />
              </div>

              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 group-focus-within:text-primary z-10" />
                <input
                  type="text"
                  placeholder="Username"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  className="relative w-full pl-12 pr-4 py-3.5 bg-muted backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/30 placeholder:text-muted-foreground"
                  required
                />
              </div>

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 group-focus-within:text-primary z-10" />
                <input
                  type="email"
                  placeholder="Email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="relative w-full pl-12 pr-4 py-3.5 bg-muted backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/30 placeholder:text-muted-foreground"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 group-focus-within:text-primary z-10" />
                <input
                  type={showSignupPassword ? "text" : "password"}
                  placeholder="Password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="relative w-full pl-12 pr-12 py-3.5 bg-muted backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/30 placeholder:text-muted-foreground"
                  required
                />
                {showSignupPassword ? (
                  <EyeOff
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 hover:text-primary cursor-pointer z-10"
                  />
                ) : (
                  <Eye
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 hover:text-primary cursor-pointer z-10"
                  />
                )}
              </div>

              {/* Confirm Password */}
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 group-focus-within:text-primary z-10" />
                <input
                  type={showSignupConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  className="relative w-full pl-12 pr-12 py-3.5 bg-muted backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/30 placeholder:text-muted-foreground"
                  required
                />
                {showSignupConfirmPassword ? (
                  <EyeOff
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 hover:text-primary cursor-pointer z-10"
                  />
                ) : (
                  <Eye
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 hover:text-primary cursor-pointer z-10"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-br from-primary to-[#1DBF73] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl"
              >
                {isLoading ? "Processing..." : "Sign Up"}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/70" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground font-medium">
                    Or sign up with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3.5 bg-muted backdrop-blur-sm text-foreground border border-border/50 rounded-xl flex items-center justify-center gap-2 hover:bg-muted/70 font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </form>
          )}

          {/* ===================== LOGIN FORM ===================== */}
          {activeTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 group-focus-within:text-primary z-10" />
                <input
                  type="email"
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="relative w-full pl-12 pr-4 py-3.5 bg-muted backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/30 placeholder:text-muted-foreground"
                  required
                />
              </div>

              {/* Login password with toggle */}
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 group-focus-within:text-primary z-10" />
                <input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="relative w-full pl-12 pr-12 py-3.5 bg-muted backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/30 placeholder:text-muted-foreground"
                  required
                />
                {showLoginPassword ? (
                  <EyeOff
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 hover:text-primary cursor-pointer z-10"
                  />
                ) : (
                  <Eye
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/70 hover:text-primary cursor-pointer z-10"
                  />
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-br from-primary to-[#1DBF73] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl"
              >
                {isLoading ? "Processing..." : "Login"}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground font-medium">
                    Or sign in with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3.5 bg-muted backdrop-blur-sm text-foreground border border-border/50 rounded-xl flex items-center justify-center gap-2 hover:bg-muted/70 font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ===================== EMAIL VERIFICATION MODAL ===================== */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full">
            {/* Modal card */}
            <div className="bg-card/95 backdrop-blur-2xl rounded-[28px] p-8 shadow-2xl border-2 border-white/20 dark:border-white/10 relative">
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 rounded-full flex items-center justify-center border-2 border-primary/30">
                  <Mail className="w-10 h-10 text-primary" />
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Verifikasi Email Anda
                </h3>

                <p className="text-muted-foreground mb-6">
                  Kami telah mengirimkan link verifikasi ke email:
                </p>

                <div className="bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 backdrop-blur-sm rounded-xl p-4 mb-6 border border-primary/20">
                  <p className="text-primary font-semibold break-all">
                    {registeredEmail}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                  Silakan cek inbox atau folder spam Anda dan klik link verifikasi untuk mengaktifkan akun Anda.
                </p>

                <button
                  onClick={handleCloseModal}
                  className="w-full py-3.5 bg-gradient-to-br from-primary to-[#1DBF73] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl"
                >
                  Mengerti
                </button>

                <p className="text-xs text-muted-foreground mt-4">
                  Tidak menerima email? Cek folder spam atau hubungi support
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
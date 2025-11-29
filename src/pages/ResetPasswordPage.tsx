import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ============================================
// PASSWORD REQUIREMENT COMPONENT
// ============================================
const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
  <div className="flex items-center gap-2 text-xs">
    {met ? (
      <CheckCircle2 className="h-3 w-3 text-green-500" />
    ) : (
      <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" />
    )}
    <span className={met ? "text-green-600" : "text-muted-foreground"}>
      {text}
    </span>
  </div>
);

// ============================================
// RESET PASSWORD PAGE
// ============================================
const ResetPasswordPage = () => {
  const navigate = useNavigate();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
  });

  useEffect(() => {
    // Check for error in URL first
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (error) {
      setIsVerifying(false);
      setIsValid(false);
      setErrorMessage(errorDescription || "Link tidak valid atau sudah kedaluwarsa");
      return;
    }
    
    verifyResetToken();
  }, []);

  useEffect(() => {
    checkPasswordStrength(newPassword);
  }, [newPassword]);

  // ============================================
  // VERIFY RESET TOKEN FROM URL
  // ============================================
  const verifyResetToken = async () => {
    setIsVerifying(true);
    
    try {
      // Parse URL hash (Supabase uses hash fragments for tokens)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      // Check if this is a recovery type
      if (type !== 'recovery') {
        // Try to get existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error("Tidak ada session yang valid");
        }
        
        // Session exists, can proceed
        setIsValid(true);
        setIsVerifying(false);
        return;
      }

      if (!accessToken) {
        throw new Error("Token tidak ditemukan dalam URL");
      }

      // Set session with the tokens from URL
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (error) {
        console.error("Session error:", error);
        throw error;
      }

      if (!data.session) {
        throw new Error("Session tidak dapat dibuat");
      }

      setIsValid(true);
      
    } catch (error: any) {
      console.error("Token verification error:", error);
      setIsValid(false);
      setErrorMessage(error.message || "Token tidak valid atau sudah kedaluwarsa");
      toast.error("Link tidak valid atau sudah kedaluwarsa");
    } finally {
      setIsVerifying(false);
    }
  };

  // ============================================
  // CHECK PASSWORD STRENGTH
  // ============================================
  const checkPasswordStrength = (password: string) => {
    setPasswordStrength({
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
    });
  };

  // ============================================
  // HANDLE RESET PASSWORD
  // ============================================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter!");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Password tidak cocok!");
      return;
    }

    setIsLoading(true);

    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Session tidak valid. Silakan minta link reset baru.");
      }

      // Update password
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      // Log password change (optional, may fail if RPC doesn't exist yet)
      try {
        await supabase.rpc('log_password_change', {
          _user_id: session.user.id,
          _email: session.user.email,
          _change_type: 'password_reset',
          _success: true
        });
      } catch (logError) {
        console.warn("Failed to log password change:", logError);
        // Don't throw error, logging is not critical
      }

      toast.success("Password berhasil diubah! Silakan login dengan password baru.");
      
      // Sign out to force re-login
      await supabase.auth.signOut();
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
      
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(error.message || "Gagal mengubah password");
      
      // Log failed attempt (optional)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.rpc('log_password_change', {
            _user_id: session.user.id,
            _email: session.user.email || '',
            _change_type: 'password_reset_failed',
            _success: false,
            _error_message: error.message
          });
        }
      } catch (logError) {
        console.warn("Failed to log error:", logError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Memverifikasi link reset password...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // INVALID TOKEN STATE
  // ============================================
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-center">Link Tidak Valid</CardTitle>
            <CardDescription className="text-center">
              {errorMessage || "Link reset password tidak valid atau sudah kedaluwarsa"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                Link reset password hanya berlaku untuk sekali pakai dan memiliki masa berlaku terbatas.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => navigate("/forgot-password")}
              className="w-full"
            >
              Minta Link Baru
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              Kembali ke Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // RESET PASSWORD FORM
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Atur Password Baru</CardTitle>
          <CardDescription className="text-center">
            Masukkan password baru untuk akun Anda
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">
                  Keamanan Password:
                </p>
                <div className="space-y-1">
                  <PasswordRequirement
                    met={passwordStrength.hasMinLength}
                    text="Minimal 8 karakter"
                  />
                  <PasswordRequirement
                    met={passwordStrength.hasUpperCase}
                    text="Huruf besar (A-Z)"
                  />
                  <PasswordRequirement
                    met={passwordStrength.hasLowerCase}
                    text="Huruf kecil (a-z)"
                  />
                  <PasswordRequirement
                    met={passwordStrength.hasNumber}
                    text="Angka (0-9)"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleResetPassword}
              className="w-full h-11"
              disabled={isLoading || newPassword.length < 6}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengubah Password...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Ubah Password
                </>
              )}
            </Button>

            {/* Info Alert */}
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300 text-xs">
                Setelah password diubah, Anda akan diarahkan ke halaman login.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;

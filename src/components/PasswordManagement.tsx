import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// ============================================
// PASSWORD MANAGEMENT COMPONENT
// ============================================
const PasswordManagement = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Show/hide password states
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // ============================================
  // FETCH USER INFO
  // ============================================
  const fetchUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user password status
      const { data, error } = await supabase
        .rpc('get_user_password_status', { _user_id: user.id });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setUserInfo(data[0]);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  // ============================================
  // HANDLE PASSWORD CHANGE
  // ============================================
  const handlePasswordChange = async () => {
    if (!userInfo) return;

    // Validation
    if (userInfo.has_password) {
      if (!oldPassword) {
        toast.error("Password lama harus diisi!");
        return;
      }
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter!");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Password baru tidak cocok!");
      return;
    }

    setIsLoading(true);

    try {
      if (userInfo.has_password) {
        // ============================================
        // FLOW A: USER NORMAL (HAS PASSWORD)
        // ============================================
        
        // 1. Verify old password by trying to sign in
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: userInfo.email,
          password: oldPassword,
        });

        if (verifyError) {
          toast.error("Password lama salah!");
          setIsLoading(false);
          return;
        }

        // 2. Update password
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) throw updateError;

        // 3. Log the change
        await supabase.rpc('log_password_change', {
          _user_id: userInfo.user_id,
          _email: userInfo.email,
          _change_type: 'password_changed',
          _success: true
        });

        toast.success("Password berhasil diubah!");
        
      } else {
        // ============================================
        // FLOW B: GOOGLE USER (NO PASSWORD)
        // ============================================
        
        // 1. Send reset password email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          userInfo.email,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

        if (resetError) throw resetError;

        // 2. Create reset log
        const tokenHash = `${userInfo.user_id}_${Date.now()}`;
        await supabase.rpc('create_password_reset_log', {
          _user_id: userInfo.user_id,
          _email: userInfo.email,
          _token_hash: tokenHash
        });

        toast.success(
          "Link reset password telah dikirim ke email Anda!",
          { duration: 5000 }
        );
      }

      // Reset form
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowDialog(false);
      
    } catch (error) {
      console.error("Password change error:", error);
      toast.error(error.message || "Gagal mengubah password");
      
      // Log failed attempt
      if (userInfo) {
        await supabase.rpc('log_password_change', {
          _user_id: userInfo.user_id,
          _email: userInfo.email,
          _change_type: 'password_change_failed',
          _success: false,
          _error_message: error.message
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* ============================================ */}
      {/* USER INFO CARD */}
      {/* ============================================ */}
      <div className="bg-card rounded-2xl p-6 border shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Keamanan Akun</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold">{userInfo.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Metode Login</p>
              <p className="font-semibold capitalize">{userInfo.auth_provider}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Status Password</p>
              <div className="flex items-center gap-2 mt-1">
                {userInfo.has_password ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-green-600">Password Aktif</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-amber-600">Belum Ada Password</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* INFO ALERT */}
          {/* ============================================ */}
          {userInfo.is_google_user && !userInfo.has_password && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Anda login menggunakan Google. Untuk keamanan ekstra, Anda dapat mengatur password 
                dengan klik tombol di bawah. Kami akan mengirim link reset password ke email Anda.
              </AlertDescription>
            </Alert>
          )}

          {/* ============================================ */}
          {/* CHANGE PASSWORD BUTTON */}
          {/* ============================================ */}
          <Button
            onClick={() => setShowDialog(true)}
            className="w-full h-12 font-semibold"
            size="lg"
          >
            <Lock className="mr-2 h-4 w-4" />
            {userInfo.has_password ? "Ubah Password" : "Atur Password"}
          </Button>
        </div>
      </div>

      {/* ============================================ */}
      {/* CHANGE PASSWORD DIALOG */}
      {/* ============================================ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {userInfo.has_password ? "Ubah Password" : "Atur Password"}
            </DialogTitle>
            <DialogDescription>
              {userInfo.has_password
                ? "Masukkan password lama dan password baru Anda"
                : "Kami akan mengirim link reset password ke email Anda"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {userInfo.has_password ? (
              <>
                {/* ============================================ */}
                {/* FLOW A: NORMAL USER FORM */}
                {/* ============================================ */}
                
                {/* Old Password */}
                <div className="space-y-2">
                  <Label htmlFor="old-password">Password Lama</Label>
                  <div className="relative">
                    <Input
                      id="old-password"
                      type={showOldPassword ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Masukkan password lama"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showOldPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

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
                  <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru"
                      className="pr-10"
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
              </>
            ) : (
              <>
                {/* ============================================ */}
                {/* FLOW B: GOOGLE USER INFO */}
                {/* ============================================ */}
                <Alert className="bg-blue-50 border-blue-200">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <div className="space-y-2">
                      <p className="font-semibold">Link akan dikirim ke:</p>
                      <p className="text-sm">{userInfo.email}</p>
                      <p className="text-xs mt-2">
                        Klik link dalam email untuk mengatur password baru Anda.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Memproses...
                </span>
              ) : userInfo.has_password ? (
                "Ubah Password"
              ) : (
                "Kirim Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PasswordManagement;

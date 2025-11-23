import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDarkMode } from "@/components/DarkMode";

import {
  User,
  Lock,
  History,
  Gift,
  LogOut,
  Moon,
  Sun,
  Globe,
  Award,
  Trophy,
  MapPin,
  Recycle,
  Eye,
  EyeOff,
  Mail,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Profile {
  full_name: string;
  username: string;
  avatar_url: string | null;
  points: number;
}

interface VoucherRedemption {
  id: string;
  redeemed_at: string;
  vouchers: {
    title: string;
    type: string;
  };
}

interface Activity {
  id: string;
  bottles_count: number;
  points_earned: number;
  created_at: string;
  locations: {
    name: string;
  } | null;
}

interface UserPasswordStatus {
  user_id: string;
  email: string;
  has_password: boolean;
  auth_provider: string;
  is_google_user: boolean;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [redemptions, setRedemptions] = useState<VoucherRedemption[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const { isDark, toggleDarkMode } = useDarkMode();

  // Password states
  const [userPasswordStatus, setUserPasswordStatus] = useState<UserPasswordStatus | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchRedemptions();
    fetchActivities();
    fetchUserPasswordStatus();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url, points")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error("Gagal memuat profil");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRedemptions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("voucher_redemptions")
        .select(`
          id,
          redeemed_at,
          vouchers (title, type)
        `)
        .eq("user_id", user.id)
        .order("redeemed_at", { ascending: false });

      if (error) throw error;
      setRedemptions(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat riwayat voucher");
    }
  };

  const fetchActivities = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("activities")
        .select(`
          id,
          bottles_count,
          points_earned,
          created_at,
          locations (name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat riwayat");
    }
  };

  // ============================================
  // FETCH USER PASSWORD STATUS
  // ============================================
  const fetchUserPasswordStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .rpc('get_user_password_status', { _user_id: user.id });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setUserPasswordStatus(data[0]);
      }
    } catch (error: any) {
      console.error("Error fetching password status:", error);
      // Fallback: assume email auth if RPC fails
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserPasswordStatus({
          user_id: user.id,
          email: user.email || "",
          has_password: true,
          auth_provider: "email",
          is_google_user: false,
        });
      }
    }
  };

  // ============================================
  // HANDLE PASSWORD CHANGE
  // ============================================
  const handleChangePassword = async () => {
    if (!userPasswordStatus) return;

    // Validation
    if (userPasswordStatus.has_password) {
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

    setIsPasswordLoading(true);

    try {
      if (userPasswordStatus.has_password) {
        // ============================================
        // FLOW A: USER NORMAL (HAS PASSWORD)
        // ============================================
        
        // 1. Verify old password
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: userPasswordStatus.email,
          password: oldPassword,
        });

        if (verifyError) {
          toast.error("Password lama salah!");
          setIsPasswordLoading(false);
          return;
        }

        // 2. Update password
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) throw updateError;

        // 3. Log the change
        await supabase.rpc('log_password_change', {
          _user_id: userPasswordStatus.user_id,
          _email: userPasswordStatus.email,
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
          userPasswordStatus.email,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

        if (resetError) throw resetError;

        // 2. Create reset log
        const tokenHash = `${userPasswordStatus.user_id}_${Date.now()}`;
        await supabase.rpc('create_password_reset_log', {
          _user_id: userPasswordStatus.user_id,
          _email: userPasswordStatus.email,
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
      setShowPasswordDialog(false);
      
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error(error.message || "Gagal mengubah password");
      
      // Log failed attempt
      if (userPasswordStatus) {
        await supabase.rpc('log_password_change', {
          _user_id: userPasswordStatus.user_id,
          _email: userPasswordStatus.email,
          _change_type: 'password_change_failed',
          _success: false,
          _error_message: error.message
        });
      }
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Logout berhasil");
      navigate("/auth");
    } catch (error: any) {
      toast.error("Gagal logout");
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 pb-28">
      {/* ================= HEADER WITH GRADIENT ================= */}
      <div className="relative bg-gradient-to-br from-primary via-[#17a865] to-[#1DBF73] px-6 pt-12 pb-28 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-4 border-white/30 shadow-xl">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-white text-primary text-2xl font-bold">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">{profile?.full_name}</h1>
              <p className="text-white/90 text-sm mb-2">@{profile?.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FLOATING POINT CARD ================= */}
      <div className="-mt-20 px-6">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20 dark:border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Poin
                  </p>
                </div>
                <p className="text-5xl font-black text-primary tracking-tight">{profile?.points || 0}</p>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[#1DBF73] flex items-center justify-center shadow-lg">
                <Award className="w-9 h-9 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="px-6 mt-6">
        <Tabs defaultValue="vouchers" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-card/80 backdrop-blur-sm rounded-2xl p-1">
            <TabsTrigger
              value="vouchers"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Voucher
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Riwayat
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Pengaturan
            </TabsTrigger>
          </TabsList>

          {/* VOUCHERS TAB */}
          <TabsContent value="vouchers" className="space-y-3 mt-4">
            {redemptions.length === 0 ? (
              <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl text-center border border-border/50 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Gift className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium mb-1">Belum ada voucher</p>
                <p className="text-xs text-muted-foreground/60">Tukar poin Anda dengan voucher menarik</p>
              </div>
            ) : (
              redemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 flex items-center justify-center">
                      <Gift className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{redemption.vouchers.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">{redemption.vouchers.type}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(redemption.redeemed_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="space-y-3 mt-4">
            {activities.length === 0 ? (
              <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl text-center border border-border/50 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <History className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium mb-1">Belum ada aktivitas</p>
                <p className="text-xs text-muted-foreground/60">Mulai daur ulang sekarang!</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 flex items-center justify-center">
                      <Recycle className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{activity.bottles_count} Botol</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{activity.locations?.name || "Lokasi tidak diketahui"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-primary/10 px-3 py-1 rounded-lg mb-1">
                        <p className="font-black text-primary">+{activity.points_earned}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-3 mt-4">
            {/* ============================================ */}
            {/* CHANGE PASSWORD - UPDATED */}
            {/* ============================================ */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <div className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-foreground">
                        {userPasswordStatus?.has_password ? "Ganti Password" : "Atur Password"}
                      </span>
                      {userPasswordStatus?.is_google_user && !userPasswordStatus?.has_password && (
                        <p className="text-xs text-muted-foreground mt-0.5">Login via Google</p>
                      )}
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="rounded-3xl sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {userPasswordStatus?.has_password ? "Ganti Password" : "Atur Password"}
                  </DialogTitle>
                  <DialogDescription>
                    {userPasswordStatus?.has_password
                      ? "Masukkan password lama dan password baru Anda"
                      : "Kami akan mengirim link reset password ke email Anda"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {userPasswordStatus?.has_password ? (
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
                            className="pr-10 rounded-xl"
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
                            className="pr-10 rounded-xl"
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
                            className="pr-10 rounded-xl"
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
                      <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-800 dark:text-blue-300">
                          <div className="space-y-2">
                            <p className="font-semibold">Link akan dikirim ke:</p>
                            <p className="text-sm break-all">{userPasswordStatus?.email}</p>
                            <p className="text-xs mt-2">
                              Klik link dalam email untuk mengatur password baru Anda.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordDialog(false);
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={isPasswordLoading}
                    className="rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={isPasswordLoading}
                    className="rounded-xl font-semibold"
                  >
                    {isPasswordLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Memproses...
                      </span>
                    ) : userPasswordStatus?.has_password ? (
                      "Ubah Password"
                    ) : (
                      "Kirim Link"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dark Mode Toggle */}
            <div
              className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={toggleDarkMode}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {isDark ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
                  </div>
                  <span className="font-semibold text-foreground">
                    Mode {isDark ? "Terang" : "Gelap"}
                  </span>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${
                    isDark ? "bg-primary" : "bg-border"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                      isDark ? "translate-x-5" : "translate-x-0.5"
                    } mt-0.5`}
                  />
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">Bahasa</span>
                </div>
                <span className="text-muted-foreground font-medium">Indonesia</span>
              </div>
            </div>

            {/* Logout */}
            <div
              className="bg-destructive/10 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-destructive/20 cursor-pointer hover:border-destructive/50 transition-colors"
              onClick={handleLogout}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-destructive" />
                </div>
                <span className="font-semibold text-destructive">Logout</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { User, Lock, History, Gift, LogOut, Moon, Sun, Globe, Award, Trophy, MapPin, Package, Recycle } from "lucide-react";
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

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [redemptions, setRedemptions] = useState<VoucherRedemption[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchRedemptions();
    fetchActivities();
    
    const darkMode = localStorage.getItem("darkMode") === "true";
    setIsDark(darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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

  const handleChangePassword = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password berhasil diubah");
      setShowPasswordDialog(false);
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengubah password");
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Logout berhasil");
    } catch (error: any) {
      toast.error("Gagal logout");
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    localStorage.setItem("darkMode", String(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
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
                <p className="text-5xl font-black text-primary tracking-tight">
                  {profile?.points || 0}
                </p>
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
            <TabsTrigger value="vouchers" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
              Voucher
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
              Riwayat
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
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
                        month: "short"
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
                          month: "short"
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
            {/* Change Password */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <div className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">Ganti Password</span>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Ganti Password</DialogTitle>
                  <DialogDescription>
                    Masukkan password baru Anda
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Password Baru</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleChangePassword} className="w-full h-12 rounded-xl font-semibold">
                    Simpan Password
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
                    {isDark ? (
                      <Sun className="w-5 h-5 text-primary" />
                    ) : (
                      <Moon className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <span className="font-semibold text-foreground">Mode {isDark ? "Terang" : "Gelap"}</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-border"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform transform ${isDark ? "translate-x-5" : "translate-x-0.5"} mt-0.5`} />
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
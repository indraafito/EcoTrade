import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, History, Gift, Settings, LogOut, Moon, Sun, Globe } from "lucide-react";
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
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [redemptions, setRedemptions] = useState<VoucherRedemption[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchProfile();
    fetchRedemptions();
    fetchActivities();
    
    // Check dark mode preference
    const darkMode = localStorage.getItem("darkMode") === "true";
    setIsDark(darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

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
      navigate("/auth");
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary p-6 rounded-b-3xl shadow-eco mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20 border-4 border-white">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-white text-primary text-2xl">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{profile?.full_name}</h1>
            <p className="text-white/90">@{profile?.username}</p>
            <div className="mt-2 bg-white/20 rounded-full px-3 py-1 inline-block">
              <span className="text-white font-semibold">{profile?.points} Poin</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6">
        <Tabs defaultValue="vouchers" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="vouchers">Voucher</TabsTrigger>
            <TabsTrigger value="history">Riwayat</TabsTrigger>
            <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          </TabsList>

          <TabsContent value="vouchers" className="space-y-3">
            <Button 
              onClick={() => navigate("/vouchers")}
              className="w-full"
            >
              <Gift className="w-4 h-4 mr-2" />
              Tukar Voucher
            </Button>

            {redemptions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Belum ada voucher yang ditukar</p>
                </CardContent>
              </Card>
            ) : (
              redemptions.map((redemption) => (
                <Card key={redemption.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {redemption.vouchers.title}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {redemption.vouchers.type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(redemption.redeemed_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {activities.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Belum ada riwayat pembuangan</p>
                </CardContent>
              </Card>
            ) : (
              activities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {activity.bottles_count} botol dibuang
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.locations?.name || "Lokasi tidak diketahui"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-success">+{activity.points_earned}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-3">
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">Ganti Password</span>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
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
                    />
                  </div>
                  <Button onClick={handleChangePassword} className="w-full">
                    Simpan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={toggleDarkMode}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isDark ? (
                      <Sun className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Moon className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">Mode {isDark ? "Terang" : "Gelap"}</span>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-border"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform transform ${isDark ? "translate-x-5" : "translate-x-0.5"} mt-0.5`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">Bahasa</span>
                  <span className="ml-auto text-muted-foreground">Indonesia</span>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-destructive/20"
              onClick={handleLogout}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-destructive" />
                  <span className="font-medium text-destructive">Logout</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;

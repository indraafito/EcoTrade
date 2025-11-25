import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, MapPin, Users, Recycle, LogOut, UserCog, Settings, Activity } from "lucide-react";
import { toast } from "sonner";
import LocationManagement from "@/components/Admin/LocationManagement";
import VoucherManagement from "@/components/Admin/VoucherManagement";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalBottles: number;
  totalUsers: number;
  totalActiveUsers: number;
  totalRedemptions: number;
  totalLocations: number;
  totalVouchers: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalBottles: 0,
    totalUsers: 0,
    totalActiveUsers: 0,
    totalRedemptions: 0,
    totalLocations: 0,
    totalVouchers: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roles) {
        toast.error("Akses ditolak. Hanya admin yang dapat mengakses halaman ini.");
        navigate("/home");
      }
    } catch (error) {
      navigate("/auth");
    }
  };

  const fetchStats = async () => {
    try {
      const [
        bottlesRes, 
        usersRes, 
        activeUsersRes,
        redemptionsRes, 
        locationsRes,
        vouchersRes
      ] = await Promise.all([
        supabase.from("activities").select("bottles_count"),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("voucher_redemptions").select("id", { count: "exact" }),
        supabase.from("locations").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("vouchers").select("id", { count: "exact" }).eq("is_active", true)
      ]);

      const totalBottles = bottlesRes.data?.reduce((sum, item) => sum + (item.bottles_count || 0), 0) || 0;

      setStats({
        totalBottles,
        totalUsers: usersRes.count || 0,
        totalActiveUsers: activeUsersRes.count || 0,
        totalRedemptions: redemptionsRes.count || 0,
        totalLocations: locationsRes.count || 0,
        totalVouchers: vouchersRes.count || 0
      });
    } catch (error: any) {
      toast.error("Gagal memuat statistik");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    fetchStats();
  };

  const handleVoucherChange = refreshData;
  const handleLocationChange = refreshData;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary p-6 rounded-b-3xl shadow-eco mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-white/90">EcoTrade Management</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Botol</CardTitle>
                <Recycle className="w-4 h-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalBottles.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">+12% dari bulan lalu</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengguna</CardTitle>
                <Users className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.totalActiveUsers} aktif
                  </p>
                </div>
                <div className="flex space-x-1">
                  <Badge variant="outline" className="h-5">
                    {stats.totalUsers} Pengguna
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-muted-foreground">Voucher</CardTitle>
                <Gift className="w-4 h-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalVouchers}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalRedemptions} penukaran
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lokasi Aktif</CardTitle>
                <MapPin className="w-4 h-4 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalLocations}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Semua lokasi tersedia
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="locations" className="w-full">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Lokasi</span>
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span>Voucher</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2" disabled>
              <Activity className="h-4 w-4" />
              <span>Analitik</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2" disabled>
              <Settings className="h-4 w-4" />
              <span>Pengaturan</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="mt-6">
            <LocationManagement onLocationChange={refreshData} />
          </TabsContent>

          <TabsContent value="vouchers" className="mt-6">
            <VoucherManagement onVoucherChange={refreshData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

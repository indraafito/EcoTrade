import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, MapPin, Users, Recycle, LogOut } from "lucide-react";
import { toast } from "sonner";
import VoucherManagement from "@/components/Admin/VoucherManagement";
import LocationManagement from "@/components/Admin/LocationManagement";

interface Stats {
  totalBottles: number;
  totalUsers: number;
  totalRedemptions: number;
  totalLocations: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalBottles: 0,
    totalUsers: 0,
    totalRedemptions: 0,
    totalLocations: 0,
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
      const [bottlesRes, usersRes, redemptionsRes, locationsRes] = await Promise.all([
        supabase.from("activities").select("bottles_count", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("voucher_redemptions").select("id", { count: "exact" }),
        supabase.from("locations").select("id", { count: "exact" }).eq("is_active", true),
      ]);

      const totalBottles = bottlesRes.data?.reduce((sum, item) => sum + item.bottles_count, 0) || 0;

      setStats({
        totalBottles,
        totalUsers: usersRes.count || 0,
        totalRedemptions: redemptionsRes.count || 0,
        totalLocations: locationsRes.count || 0,
      });
    } catch (error: any) {
      toast.error("Gagal memuat statistik");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoucherChange = () => {
    fetchStats();
  };

  const handleLocationChange = () => {
    fetchStats();
  };

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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Botol</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Recycle className="w-5 h-5 text-success" />
                <p className="text-2xl font-bold">{stats.totalBottles}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengguna</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Voucher Ditukar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-accent" />
                <p className="text-2xl font-bold">{stats.totalRedemptions}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lokasi Aktif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" />
                <p className="text-2xl font-bold">{stats.totalLocations}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="vouchers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vouchers">Kelola Voucher</TabsTrigger>
            <TabsTrigger value="locations">Kelola Lokasi</TabsTrigger>
          </TabsList>

          <TabsContent value="vouchers" className="space-y-4">
            <VoucherManagement onVoucherChange={handleVoucherChange} />
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <LocationManagement onLocationChange={handleLocationChange} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Gift, MapPin, Users, Recycle, LogOut } from "lucide-react";
import { toast } from "sonner";

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
  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Voucher form state
  const [voucherType, setVoucherType] = useState("discount");
  const [voucherTitle, setVoucherTitle] = useState("");
  const [voucherDescription, setVoucherDescription] = useState("");
  const [voucherPoints, setVoucherPoints] = useState("");

  // Location form state
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
    fetchVouchers();
    fetchLocations();
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

  const handleAddVoucher = async () => {
    try {
      const { error } = await supabase.from("vouchers").insert({
        type: voucherType as "discount" | "food" | "credit",
        title: voucherTitle,
        description: voucherDescription,
        points_required: parseInt(voucherPoints),
      });

      if (error) throw error;

      toast.success("Voucher berhasil ditambahkan!");
      setShowAddVoucher(false);
      setVoucherTitle("");
      setVoucherDescription("");
      setVoucherPoints("");
      fetchStats();
      fetchVouchers();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan voucher");
    }
  };

  const handleAddLocation = async () => {
    try {
      const { error } = await supabase.from("locations").insert({
        name: locationName,
        address: locationAddress,
        latitude: parseFloat(locationLat),
        longitude: parseFloat(locationLng),
      });

      if (error) throw error;

      toast.success("Lokasi berhasil ditambahkan!");
      setShowAddLocation(false);
      setLocationName("");
      setLocationAddress("");
      setLocationLat("");
      setLocationLng("");
      fetchStats();
      fetchLocations();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan lokasi");
    }
  };

  const fetchVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVouchers(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat voucher");
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat lokasi");
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vouchers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Voucher berhasil dihapus!");
      fetchVouchers();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus voucher");
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("locations")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Lokasi berhasil dinonaktifkan!");
      fetchLocations();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || "Gagal menonaktifkan lokasi");
    }
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
            <Dialog open={showAddVoucher} onOpenChange={setShowAddVoucher}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Gift className="mr-2 h-4 w-4" />
                  Tambah Voucher
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Voucher Baru</DialogTitle>
                  <DialogDescription>
                    Masukkan detail voucher yang akan ditambahkan
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipe Voucher</Label>
                    <Select value={voucherType} onValueChange={setVoucherType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount">Diskon</SelectItem>
                        <SelectItem value="food">Makanan</SelectItem>
                        <SelectItem value="credit">Pulsa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Judul</Label>
                    <Input
                      id="title"
                      value={voucherTitle}
                      onChange={(e) => setVoucherTitle(e.target.value)}
                      placeholder="Diskon 20% Belanja"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Deskripsi</Label>
                    <Textarea
                      id="description"
                      value={voucherDescription}
                      onChange={(e) => setVoucherDescription(e.target.value)}
                      placeholder="Dapatkan diskon 20% untuk belanja..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="points">Poin Diperlukan</Label>
                    <Input
                      id="points"
                      type="number"
                      value={voucherPoints}
                      onChange={(e) => setVoucherPoints(e.target.value)}
                      placeholder="500"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddVoucher(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleAddVoucher}>Tambah</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="space-y-3">
              {vouchers.map((voucher) => (
                <Card key={voucher.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{voucher.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            voucher.type === 'discount' ? 'bg-primary/10 text-primary' :
                            voucher.type === 'food' ? 'bg-success/10 text-success' :
                            'bg-accent/10 text-accent'
                          }`}>
                            {voucher.type === 'discount' ? 'Diskon' :
                             voucher.type === 'food' ? 'Makanan' : 'Pulsa'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{voucher.description}</p>
                        <p className="text-sm font-medium text-primary">{voucher.points_required} poin</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteVoucher(voucher.id)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <MapPin className="mr-2 h-4 w-4" />
                  Tambah Lokasi
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Lokasi Baru</DialogTitle>
                  <DialogDescription>
                    Masukkan detail lokasi tempat sampah EcoTrade
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lokasi</Label>
                    <Input
                      id="name"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="EcoTrade Hub Central"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Alamat</Label>
                    <Textarea
                      id="address"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      placeholder="Jl. Sudirman No. 123, Jakarta"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        value={locationLat}
                        onChange={(e) => setLocationLat(e.target.value)}
                        placeholder="-6.208763"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        value={locationLng}
                        onChange={(e) => setLocationLng(e.target.value)}
                        placeholder="106.845599"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddLocation(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleAddLocation}>Tambah</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="space-y-3">
              {locations.filter(loc => loc.is_active).map((location) => (
                <Card key={location.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{location.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{location.address}</p>
                        <p className="text-xs text-muted-foreground">
                          {location.latitude}, {location.longitude}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteLocation(location.id)}
                      >
                        Nonaktifkan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, MapPin, Users, Recycle, LogOut, UserCog, Settings, Activity, Calendar } from "lucide-react";
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
  const [dateFilter, setDateFilter] = useState({
    type: 'custom', // 'day', 'week', 'month', 'year', 'custom'
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const handleDateFilterChange = (type: string) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    switch(type) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        setShowDatePicker(true);
        return;
    }
    
    setDateFilter({ type, startDate, endDate });
  };

  const handleCustomDateRange = (start: Date, end: Date) => {
    setDateFilter({
      type: 'custom',
      startDate: start,
      endDate: end
    });
    setShowDatePicker(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getChartData = () => {
    // Generate sample data based on date filter
    const dataPoints = dateFilter.type === 'day' ? 24 : // hours
                      dateFilter.type === 'week' ? 7 : // days
                      dateFilter.type === 'month' ? 30 : // days
                      12; // months
    
    return Array.from({ length: dataPoints }, (_, i) => {
      const baseValue = stats.totalBottles / dataPoints;
      const randomVariation = Math.random() * baseValue * 0.5;
      return Math.floor(baseValue + randomVariation);
    });
  };

  const getChartLabels = () => {
    if (dateFilter.type === 'day') {
      return Array.from({ length: 24 }, (_, i) => `${i}:00`);
    } else if (dateFilter.type === 'week') {
      return ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    } else if (dateFilter.type === 'month') {
      return Array.from({ length: 30 }, (_, i) => i + 1);
    } else {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Analitik</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
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

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Analitik</h2>
                
                {/* Date Filter */}
                <div className="flex gap-2">
                  <Button
                    variant={dateFilter.type === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDateFilterChange('day')}
                  >
                    Hari ini
                  </Button>
                  <Button
                    variant={dateFilter.type === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDateFilterChange('week')}
                  >
                    7 Hari
                  </Button>
                  <Button
                    variant={dateFilter.type === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDateFilterChange('month')}
                  >
                    30 Hari
                  </Button>
                  <Button
                    variant={dateFilter.type === 'year' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDateFilterChange('year')}
                  >
                    Tahun
                  </Button>
                  <Button
                    variant={dateFilter.type === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDateFilterChange('custom')}
                  >
                    <Calendar className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Custom Date Range Display */}
              {dateFilter.type === 'custom' && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium">
                    Rentang: {formatDate(dateFilter.startDate)} - {formatDate(dateFilter.endDate)}
                  </p>
                </div>
              )}
              
              {/* Custom Date Picker Dialog */}
              {showDatePicker && (
                <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Pilih Rentang Tanggal</DialogTitle>
                      <DialogDescription>
                        Pilih tanggal mulai dan selesai untuk filter statistik kustom.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Tanggal Mulai</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={dateFilter.startDate.toISOString().split('T')[0]}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            if (!isNaN(newDate.getTime())) {
                              setDateFilter(prev => ({ ...prev, startDate: newDate }));
                            }
                          }}
                          className="date-picker-icon"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="end_date">Tanggal Selesai</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={dateFilter.endDate.toISOString().split('T')[0]}
                          onChange={(e) => {
                            const newDate = new Date(e.target.value);
                            if (!isNaN(newDate.getTime())) {
                              setDateFilter(prev => ({ ...prev, endDate: newDate }));
                            }
                          }}
                          className="date-picker-icon"
                        />
                      </div>
                    </div>
                    
                    <style>{`
                      .date-picker-icon::-webkit-calendar-picker-indicator {
                        position: absolute;
                        right: 8px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 16px;
                        height: 16px;
                        cursor: pointer;
                        filter: invert(0.5);
                      }
                      
                      .dark .date-picker-icon::-webkit-calendar-picker-indicator {
                        filter: invert(1);
                      }
                      
                      .date-picker-icon::-webkit-inner-spin-button,
                      .date-picker-icon::-webkit-clear-button {
                        display: none;
                      }
                      
                      .date-picker-icon {
                        position: relative;
                      }
                    `}</style>
                    
                    <DialogFooter className="mt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowDatePicker(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={() => handleCustomDateRange(dateFilter.startDate, dateFilter.endDate)}
                      >
                        Terapkan
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tren Botol Terkumpul</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {dateFilter.type === 'day' ? 'Per jam' :
                       dateFilter.type === 'week' ? '7 hari terakhir' :
                       dateFilter.type === 'month' ? '30 hari terakhir' : 
                       dateFilter.type === 'year' ? 'Tahun ini' :
                       `Custom: ${formatDate(dateFilter.startDate)} - ${formatDate(dateFilter.endDate)}`}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-muted rounded-lg relative overflow-hidden">
                      {/* Dynamic Bar Chart */}
                      <div className="absolute inset-0 p-4">
                        <div className="flex items-end justify-around h-full gap-1">
                          {getChartData().map((height, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center">
                              <div 
                                className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md transition-all duration-500 hover:from-primary/80"
                                style={{ height: `${Math.min((height / Math.max(...getChartData())) * 100, 100)}%` }}
                              />
                              {dateFilter.type !== 'day' && (
                                <span className="text-xs mt-1 text-muted-foreground truncate">
                                  {getChartLabels()[index]}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Pendaftaran Pengguna</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {dateFilter.type === 'day' ? 'Hari ini' :
                       dateFilter.type === 'week' ? '7 hari terakhir' :
                       dateFilter.type === 'month' ? '30 hari terakhir' : 
                       dateFilter.type === 'year' ? 'Tahun ini' :
                       `Custom: ${formatDate(dateFilter.startDate)} - ${formatDate(dateFilter.endDate)}`}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-muted rounded-lg relative overflow-hidden">
                      {/* Dynamic Registration Chart */}
                      <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="16"
                            className="text-muted"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="16"
                            strokeDasharray={`${Math.min((stats.totalUsers / Math.max(stats.totalUsers + 50, 1)) * 352, 352)} 352`}
                            className="text-green-600 transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{stats.totalUsers}</p>
                            <p className="text-xs text-muted-foreground">Total Daftar</p>
                          </div>
                        </div>
                      </div>
                      <div className="absolute bottom-4 left-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                          <span className="text-sm">Terdaftar ({stats.totalUsers})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-muted rounded-full"></div>
                          <span className="text-sm">Target (50)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Pengaturan</h2>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={refreshData}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Refresh Data
                  </Button>
                  <Button 
                    onClick={() => window.open('/home', '_blank')}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Buka Aplikasi User
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

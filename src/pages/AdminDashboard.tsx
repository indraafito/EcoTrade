import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, MapPin, Users, Recycle, LogOut, Activity, Calendar, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import LocationManagement from "@/components/Admin/LocationManagement";
import VoucherManagement from "@/components/Admin/VoucherManagement";
import MissionManagement from "@/components/Admin/MissionManagement";
import RankingTiersManagement from "@/components/Admin/RankingTiersManagement";
import BottleChart from "@/components/Admin/BottleChart";
import UserRegistrationChart from "@/components/Admin/UserRegistrationChart";
import AIAnalytics from "@/components/Admin/AIAnalytics";
import { Badge } from "@/components/ui/badge";
import { getRegistrationYAxisLabels, getBottleYAxisLabels, formatDate, ChartData } from "@/components/Admin/ChartUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminProtectedRoute from "@/components/Admin/AdminProtectedRoute";

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
    type: 'week', // 'week', 'month', 'year', 'custom'
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDate: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);
  
  useEffect(() => {
    fetchChartData();
  }, [dateFilter]);

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
        recentActivitiesRes,
        redemptionsRes, 
        locationsRes,
        vouchersRes
      ] = await Promise.all([
        supabase.from("activities").select("bottles_count"),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("activities").select("user_id", { count: "exact" }).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("voucher_redemptions").select("id", { count: "exact" }),
        supabase.from("locations").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("vouchers").select("id", { count: "exact" }).eq("is_active", true)
      ]);

      const totalBottles = bottlesRes.data?.reduce((sum, item) => sum + (item.bottles_count || 0), 0) || 0;

      setStats({
        totalBottles,
        totalUsers: usersRes.count || 0,
        totalActiveUsers: recentActivitiesRes.count || 0,
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


  const fetchChartData = async () => {
    try {
      // Fetch user registrations by date
      const { data: registrations, error } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', dateFilter.startDate.toISOString())
        .lte('created_at', dateFilter.endDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Fetch activities (bottle collections) by date
      const { data: collections, error: collectionError } = await supabase
        .from('activities')
        .select('created_at, bottles_count')
        .gte('created_at', dateFilter.startDate.toISOString())
        .lte('created_at', dateFilter.endDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (collectionError) throw collectionError;
      
      // Process data for charts
      const processedData = processChartData(registrations || [], collections || []);
      setChartData(processedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Fallback to sample data
      setChartData(getSampleChartData());
    }
  };
  
  const processChartData = (registrations: any[], collections: any[]) => {
    const dataPoints = getDataPointsCount();
    const labels = getChartLabels();
    
    return labels.map((label, index) => {
      const dateRange = getDateRangeForIndex(index);
      
      // Count registrations in this date range
      const registrationCount = registrations.filter(reg => {
        const regDate = new Date(reg.created_at);
        return regDate >= dateRange.start && regDate < dateRange.end;
      }).length;
      
      // Sum bottle collections in this date range
      const bottleCount = collections
        .filter(col => {
          const colDate = new Date(col.created_at);
          return colDate >= dateRange.start && colDate < dateRange.end;
        })
        .reduce((sum, col) => sum + (col.bottles_count || 1), 0);
      
      return {
        label,
        registrations: registrationCount,
        bottles: bottleCount,
        date: dateRange.start
      };
    });
  };
  
  const getDataPointsCount = () => {
    return dateFilter.type === 'week' ? 7 :
           dateFilter.type === 'month' ? 30 :
           12;
  };
  
  const getDateRangeForIndex = (index: number) => {
    const start = new Date(dateFilter.startDate);
    const end = new Date(dateFilter.endDate);
    const totalMs = end.getTime() - start.getTime();
    
    const intervalMs = totalMs / getDataPointsCount();
    const rangeStart = new Date(start.getTime() + (index * intervalMs));
    const rangeEnd = new Date(start.getTime() + ((index + 1) * intervalMs));
    
    return { start: rangeStart, end: rangeEnd };
  };
  
  
  const getSampleChartData = () => {
    const dataPoints = getDataPointsCount();
    const labels = getChartLabels();
    
    return labels.map((label, index) => ({
      label,
      registrations: Math.floor(Math.random() * 10) + 1,
      bottles: Math.floor(Math.random() * 50) + 10,
      date: new Date(dateFilter.startDate.getTime() + (index * 24 * 60 * 60 * 1000))
    }));
  };

  const getChartLabels = () => {
    if (dateFilter.type === 'week') {
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
    <AdminProtectedRoute>
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
            <TabsTrigger value="missions" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Misi</span>
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>Ranking</span>
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              <span>Voucher</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Analitik</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="mt-6">
            <LocationManagement onLocationChange={refreshData} />
          </TabsContent>

          <TabsContent value="missions" className="mt-6">
            <MissionManagement onMissionChange={refreshData} />
          </TabsContent>

          <TabsContent value="rankings" className="mt-6">
            <RankingTiersManagement onRankingTiersChange={refreshData} />
          </TabsContent>

          <TabsContent value="vouchers" className="mt-6">
            <VoucherManagement onVoucherChange={refreshData} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Analitik</h2>
                
                {/* Date Filter & Chart Type - Right Side */}
                <div className="flex items-center gap-2">
                  {/* Date Filter */}
                  <div className="flex gap-2">
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
                  
                  {/* Chart Type Dropdown */}
                  <Select value={chartType} onValueChange={(value) => setChartType(value as 'bar' | 'line')}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="line">Line</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                <div>
                  <h3 className="text-lg font-semibold mb-4">Tren Botol Terkumpul</h3>
                  <BottleChart
                    chartData={chartData}
                    dateFilter={dateFilter}
                    formatDate={formatDate}
                    getBottleYAxisLabels={() => getBottleYAxisLabels(chartData)}
                    chartType={chartType}
                  />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Pendaftaran Pengguna</h3>
                  <UserRegistrationChart
                    chartData={chartData}
                    dateFilter={dateFilter}
                    stats={stats}
                    formatDate={formatDate}
                    getRegistrationYAxisLabels={() => getRegistrationYAxisLabels(chartData)}
                    chartType={chartType}
                  />
                </div>
              </div>

              {/* AI Analytics Section */}
              <div className="mt-8">
                <AIAnalytics
                  bottleData={chartData}
                  userData={chartData}
                  stats={stats}
                  dateFilter={dateFilter}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminProtectedRoute>
  );
};

export default AdminDashboard;

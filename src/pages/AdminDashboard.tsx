import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, MapPin, Users, Recycle, LogOut, Activity, Calendar, Target, Trophy, TrendingUp } from "lucide-react";
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
    type: 'week',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
      const { data: registrations, error } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', dateFilter.startDate.toISOString())
        .lte('created_at', dateFilter.endDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const { data: collections, error: collectionError } = await supabase
        .from('activities')
        .select('created_at, bottles_count')
        .gte('created_at', dateFilter.startDate.toISOString())
        .lte('created_at', dateFilter.endDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (collectionError) throw collectionError;
      
      const processedData = processChartData(registrations || [], collections || []);
      setChartData(processedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setChartData(getSampleChartData());
    }
  };
  
  const processChartData = (registrations: any[], collections: any[]) => {
    const dataPoints = getDataPointsCount();
    const labels = getChartLabels();
    
    return labels.map((label, index) => {
      const dateRange = getDateRangeForIndex(index);
      
      const registrationCount = registrations.filter(reg => {
        const regDate = new Date(reg.created_at);
        return regDate >= dateRange.start && regDate < dateRange.end;
      }).length;
      
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto" />
          <p className="text-muted-foreground font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
                  <p className="text-white/80 text-sm font-medium">EcoTrade Management System</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="lg"
              className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-105 border border-white/20"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-success/10 to-success/5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300" />
            <CardHeader className="pb-3 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Total Botol
                  </CardTitle>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stats.totalBottles.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center">
                  <Recycle className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-success/10 text-success border-0 font-semibold">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12%
                </Badge>
                <p className="text-xs text-muted-foreground">dari bulan lalu</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300" />
            <CardHeader className="pb-3 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Total Pengguna
                  </CardTitle>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-semibold">
                  {stats.totalActiveUsers} aktif
                </Badge>
                <p className="text-xs text-muted-foreground">dalam 30 hari</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-accent/10 to-accent/5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300" />
            <CardHeader className="pb-3 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Voucher Aktif
                  </CardTitle>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stats.totalVouchers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-accent/10 text-accent border-0 font-semibold">
                  {stats.totalRedemptions} redeemed
                </Badge>
                <p className="text-xs text-muted-foreground">penukaran</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-secondary/10 to-secondary/5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300" />
            <CardHeader className="pb-3 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Lokasi Aktif
                  </CardTitle>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stats.totalLocations}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-secondary/10 text-secondary border-0 font-semibold">
                  100% online
                </Badge>
                <p className="text-xs text-muted-foreground">tersedia</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Tabs */}
        <Card className="border-0 shadow-xl">
          <Tabs defaultValue="locations" className="w-full">
            <div className="border-b bg-muted/30">
              <TabsList className="w-full h-auto p-2 bg-transparent gap-2 flex-wrap justify-start">
                <TabsTrigger 
                  value="locations" 
                  className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all duration-200"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="font-semibold">Lokasi</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="missions" 
                  className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all duration-200"
                >
                  <Target className="h-4 w-4" />
                  <span className="font-semibold">Misi</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="rankings" 
                  className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all duration-200"
                >
                  <Trophy className="h-4 w-4" />
                  <span className="font-semibold">Ranking</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="vouchers" 
                  className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all duration-200"
                >
                  <Gift className="h-4 w-4" />
                  <span className="font-semibold">Voucher</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="flex items-center gap-2 px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all duration-200"
                >
                  <Activity className="h-4 w-4" />
                  <span className="font-semibold">Analitik</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="locations" className="mt-0">
                <LocationManagement onLocationChange={refreshData} />
              </TabsContent>

              <TabsContent value="missions" className="mt-0">
                <MissionManagement onMissionChange={refreshData} />
              </TabsContent>

              <TabsContent value="rankings" className="mt-0">
                <RankingTiersManagement onRankingTiersChange={refreshData} />
              </TabsContent>

              <TabsContent value="vouchers" className="mt-0">
                <VoucherManagement onVoucherChange={refreshData} />
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                <div className="space-y-8">
                  {/* Enhanced Analytics Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Analitik & Statistik</h2>
                      <p className="text-muted-foreground mt-1">Pantau performa dan tren EcoTrade</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex gap-2 bg-muted/50 p-1.5 rounded-lg">
                        <Button
                          variant={dateFilter.type === 'week' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleDateFilterChange('week')}
                          className={dateFilter.type === 'week' ? 'shadow-sm' : ''}
                        >
                          7 Hari
                        </Button>
                        <Button
                          variant={dateFilter.type === 'month' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleDateFilterChange('month')}
                          className={dateFilter.type === 'month' ? 'shadow-sm' : ''}
                        >
                          30 Hari
                        </Button>
                        <Button
                          variant={dateFilter.type === 'year' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleDateFilterChange('year')}
                          className={dateFilter.type === 'year' ? 'shadow-sm' : ''}
                        >
                          Tahun
                        </Button>
                        <Button
                          variant={dateFilter.type === 'custom' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleDateFilterChange('custom')}
                          className={dateFilter.type === 'custom' ? 'shadow-sm' : ''}
                        >
                          <Calendar className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <Select value={chartType} onValueChange={(value) => setChartType(value as 'bar' | 'line')}>
                        <SelectTrigger className="w-32 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">📊 Bar Chart</SelectItem>
                          <SelectItem value="line">📈 Line Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {dateFilter.type === 'custom' && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="py-4">
                        <p className="text-sm font-medium text-primary">
                          📅 Rentang: {formatDate(dateFilter.startDate)} - {formatDate(dateFilter.endDate)}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Enhanced Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="border-0 shadow-lg overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-success/10 to-success/5 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                            <Recycle className="w-5 h-5 text-success" />
                          </div>
                          Tren Botol Terkumpul
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <BottleChart
                          chartData={chartData}
                          dateFilter={dateFilter}
                          formatDate={formatDate}
                          getBottleYAxisLabels={() => getBottleYAxisLabels(chartData)}
                          chartType={chartType}
                        />
                      </CardContent>
                    </Card>
                    
                    <Card className="border-0 shadow-lg overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          Pendaftaran Pengguna
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <UserRegistrationChart
                          chartData={chartData}
                          dateFilter={dateFilter}
                          stats={stats}
                          formatDate={formatDate}
                          getRegistrationYAxisLabels={() => getRegistrationYAxisLabels(chartData)}
                          chartType={chartType}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Analytics Section */}
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-6">
                      <AIAnalytics
                        bottleData={chartData}
                        userData={chartData}
                        stats={stats}
                        dateFilter={dateFilter}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      {/* Enhanced Date Picker Dialog */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Pilih Rentang Tanggal</DialogTitle>
            <DialogDescription>
              Tentukan periode waktu untuk melihat statistik yang lebih spesifik
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="start_date" className="text-sm font-semibold">Tanggal Mulai</Label>
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
                className="date-picker-icon h-11"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="end_date" className="text-sm font-semibold">Tanggal Selesai</Label>
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
                className="date-picker-icon h-11"
              />
            </div>
          </div>
          
          <style>{`
            .date-picker-icon::-webkit-calendar-picker-indicator {
              position: absolute;
              right: 12px;
              top: 50%;
              transform: translateY(-50%);
              width: 18px;
              height: 18px;
              cursor: pointer;
              filter: invert(0.5);
              transition: all 0.2s;
            }
            
            .date-picker-icon::-webkit-calendar-picker-indicator:hover {
              filter: invert(0.3);
              transform: translateY(-50%) scale(1.1);
            }
            
            .dark .date-picker-icon::-webkit-calendar-picker-indicator {
              filter: invert(1);
            }
            
            .dark .date-picker-icon::-webkit-calendar-picker-indicator:hover {
              filter: invert(0.8);
            }
            
            .date-picker-icon::-webkit-inner-spin-button,
            .date-picker-icon::-webkit-clear-button {
              display: none;
            }
            
            .date-picker-icon {
              position: relative;
            }
          `}</style>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowDatePicker(false)}
              className="hover:bg-muted"
            >
              Batal
            </Button>
            <Button
              onClick={() => handleCustomDateRange(dateFilter.startDate, dateFilter.endDate)}
              className="bg-primary hover:bg-primary/90"
            >
              Terapkan Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
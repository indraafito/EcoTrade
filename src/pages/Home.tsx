import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import Loading from "@/components/Loading";
import {
  Recycle,
  Trophy,
  Weight,
  Clock,
  TrendingUp,
  Leaf,
  Award,
  Package,
  Bell,
  Droplets,
  DollarSign,
  Target,
} from "lucide-react";
import { toast } from "sonner";

interface Profile {
  username: string;
  full_name: string;
  points: number;
  rank: number;
  total_bottles: number;
  total_weight_kg: number;
  total_carbon_emission?: number;
  total_earnings?: number;
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

interface Mission {
  id: string;
  mission_id: string;
  mission_title: string;
  target_type: string;
  target_value: number;
  progress_value: number;
  progress_percentage: number;
  points_bonus: number;
  completed_at: string | null;
  verified: boolean;
  status: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyPoints, setWeeklyPoints] = useState(0);

  useEffect(() => {
    checkAuth();
    fetchProfile();
    fetchActivities();
    fetchMissions();
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No user found");
        navigate("/auth");
        return;
      }

      console.log("Fetching profile for user:", user.id);

      // Query hanya kolom yang ada di database
      const { data, error } = await supabase
        .from("profiles")
        .select("username, full_name, points, rank, total_bottles, total_weight_kg")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);
        
        // Jika profile tidak ada, buat profile baru
        if (error.code === 'PGRST116') {
          console.log("Profile not found, creating default profile...");
          
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert([
              {
                user_id: user.id,
                username: user.email?.split('@')[0] || 'user',
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                points: 0,
                rank: 0,
                total_bottles: 0,
                total_weight_kg: 0,
              }
            ])
            .select()
            .single();
          
          if (insertError) {
            console.error("Error creating profile:", insertError);
            toast.error("Gagal membuat profil: " + insertError.message);
            return;
          }
          
          // Tambahkan nilai default untuk kolom tambahan
          const profileWithDefaults = {
            ...newProfile,
            total_carbon_emission: 0,
            total_earnings: 0,
          };
          
          setProfile(profileWithDefaults);
          toast.success("Profil berhasil dibuat!");
          return;
        }
        
        throw error;
      }

      console.log("Profile loaded:", data);
      
      // Hitung estimasi carbon emission dan earnings dari data yang ada
      const estimatedCarbonEmission = (data.total_weight_kg || 0) * 0.5; // Estimasi: 0.5 kg CO2 per kg plastik
      const estimatedEarnings = (data.points || 0) * 10; // Estimasi: 10 rupiah per poin
      
      const profileWithEstimates = {
        ...data,
        total_carbon_emission: estimatedCarbonEmission,
        total_earnings: estimatedEarnings,
      };
      
      setProfile(profileWithEstimates);
      
    } catch (error: any) {
      console.error("Fetch profile error:", error);
      toast.error("Gagal memuat profil: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
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
        .limit(5);

      if (error) throw error;
      const activitiesData = data || [];
      setActivities(activitiesData);

      // Calculate weekly points
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      const pointsThisWeek = activitiesData
        .filter((act) => new Date(act.created_at) >= sevenDaysAgo)
        .reduce((sum, act) => sum + act.points_earned, 0);

      setWeeklyPoints(pointsThisWeek);
    } catch (error: any) {
      console.error("Error fetching activities:", error);
      toast.error("Gagal memuat aktivitas");
    }
  };

  const fetchMissions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      console.log("Fetching missions for user:", user.id);

      // Ambil semua misi aktif
      // @ts-ignore
      const { data: allMissions, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .limit(10);

      if (missionsError) {
        console.error("Error fetching missions:", missionsError);
        setMissions([]);
        return;
      }

      if (!allMissions || allMissions.length === 0) {
        console.log("No missions found in database");
        setMissions([]);
        return;
      }

      console.log("Available missions:", allMissions);

      // Ambil progress user untuk semua misi
      // @ts-ignore
      const { data: userProgress, error: progressError } = await supabase
        .from('mission_progress')
        .select('*')
        .eq('user_id', user.id);

      console.log("User progress:", userProgress);

      // Jika user belum punya progress sama sekali, auto-create untuk 2 misi pertama
      if (!userProgress || userProgress.length === 0) {
        console.log("No progress found, creating initial mission progress...");
        
        const initialMissions = allMissions.slice(0, 2);
        const progressToCreate = initialMissions.map(mission => ({
          user_id: user.id,
          mission_id: mission.id,
          progress_value: 0,
          status: 'in_progress'
        }));

        // @ts-ignore
        const { data: newProgress, error: createError } = await supabase
          .from('mission_progress')
          .insert(progressToCreate)
          .select();

        if (createError) {
          console.error("Error creating mission progress:", createError);
        } else {
          console.log("Mission progress created:", newProgress);
        }

        // Transform misi untuk ditampilkan
        const transformedMissions = initialMissions.map(m => ({
          id: m.id,
          mission_id: m.id,
          mission_title: m.title,
          target_type: m.target_type,
          target_value: m.target_value,
          progress_value: 0,
          progress_percentage: 0,
          points_bonus: m.points_bonus,
          completed_at: null,
          verified: false,
          status: 'in_progress',
        }));

        setMissions(transformedMissions);
        return;
      }

      // Jika user sudah punya progress, gabungkan dengan data misi
      const missionsWithProgress = allMissions
        .map(mission => {
          const progress = userProgress.find(p => p.mission_id === mission.id);
          if (!progress || progress.status !== 'in_progress') return null;

          return {
            id: progress.id,
            mission_id: mission.id,
            mission_title: mission.title,
            target_type: mission.target_type,
            target_value: mission.target_value,
            progress_value: progress.progress_value || 0,
            progress_percentage: ((progress.progress_value || 0) / mission.target_value) * 100,
            points_bonus: mission.points_bonus,
            completed_at: progress.completed_at,
            verified: progress.verified || false,
            status: progress.status,
          };
        })
        .filter(Boolean)
        .slice(0, 2);

      console.log("Missions with progress:", missionsWithProgress);
      setMissions(missionsWithProgress as Mission[]);
    } catch (error: any) {
      console.error("Error fetching missions:", error);
      setMissions([]);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 pb-28">
      {/* ================= HEADER WITH GRADIENT ================= */}
      <div className="relative bg-gradient-to-br from-primary via-[#17a865] to-[#1DBF73] px-6 pt-12 pb-32 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Selamat Datang</p>
              <p className="text-white text-xl font-bold">
                {profile?.username || "Pengguna"}
              </p>
              <p className="text-white/70 text-xs">Keep saving the planet!</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/notifications")}
            className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg hover:bg-white/30 transition-colors"
          >
          <Bell className="w-6 h-6 text-white" />             </button>
        </div>
      </div>

      {/* ================= FLOATING POINT CARD WITH GLASSMORPHISM ================= */}
      <div className="-mt-20 px-6 relative z-20">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20 dark:border-white/10 relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />

          <div className="relative z-10">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Poin
                  </p>
                </div>
                <p className="text-5xl font-black text-primary mb-2 tracking-tight">
                  {profile?.points || 0}
                </p>
                <div className="flex items-center gap-2 bg-green-500/10 dark:bg-green-400/10 px-3 py-1.5 rounded-full w-fit">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                    +{weeklyPoints} minggu ini
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[#1DBF73] flex items-center justify-center shadow-lg">
                  <Award className="w-9 h-9 text-white" />
                </div>
                <p className="text-xs font-bold text-foreground text-center">
                  Rank #{profile?.rank || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= QUICK MENU ================= */}
      <div className="grid grid-cols-2 gap-4 px-6 mt-6">
        <button
          onClick={() => navigate("/vouchers")}
          className="bg-card rounded-2xl p-4 shadow-lg border border-border hover:shadow-xl transition-all text-left hover:scale-[1.02]"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground text-sm">Tukar Poin</p>
          <p className="text-xs text-muted-foreground">Voucher & Hadiah</p>
        </button>

        <button
          onClick={() => navigate("/leaderboard")}
          className="bg-card rounded-2xl p-4 shadow-lg border border-border hover:shadow-xl transition-all text-left hover:scale-[1.02]"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground text-sm">Leaderboard</p>
          <p className="text-xs text-muted-foreground">Top Recyclers</p>
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="bg-card rounded-2xl p-4 shadow-lg border border-border hover:shadow-xl transition-all text-left hover:scale-[1.02]"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground text-sm">Riwayat</p>
          <p className="text-xs text-muted-foreground">Aktivitas Anda</p>
        </button>

        <button
          onClick={() => navigate("/missions")}
          className="bg-card rounded-2xl p-4 shadow-lg border border-border hover:shadow-xl transition-all text-left hover:scale-[1.02]"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <p className="font-semibold text-foreground text-sm">Misi</p>
          <p className="text-xs text-muted-foreground">Bonus Poin</p>
        </button>
      </div>

      {/* ================= MISI HARIAN ================= */}
      {missions.length > 0 && (
        <div className="px-6 mt-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Misi Harian</h2>
            <button
              onClick={() => navigate("/missions")}
              className="text-primary text-sm font-semibold hover:text-primary/80"
            >
              Lihat Semua →
            </button>
          </div>

          <div className="space-y-3">
            {missions.map((mission) => (
              <div
                key={mission.id}
                className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm">
                      {mission.mission_title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Progress: {mission.progress_value}/{mission.target_value}{" "}
                      {mission.target_type}
                    </p>
                  </div>
                  <div className="bg-primary/10 px-2.5 py-1 rounded-lg">
                    <p className="font-bold text-primary text-xs">
                      +{mission.points_bonus}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-[#1DBF73] h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(mission.progress_percentage, 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {mission.progress_percentage.toFixed(0)}% Selesai
                  </p>
                  <p className="text-xs font-semibold text-primary capitalize">
                    {mission.status === "in_progress"
                      ? "Berlangsung"
                      : mission.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= DAMPAK KAMU ================= */}
      <div className="px-6 mb-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Dampak Kamu</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
            <div className="w-10 h-10 rounded-xl bg-[#1DBF73]/10 flex items-center justify-center mb-3">
              <Recycle className="w-5 h-5 text-[#1DBF73]" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {profile?.total_bottles || 0}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Botol Plastik
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Weight className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {profile?.total_weight_kg || 0}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Kg Didaur Ulang
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
              <Droplets className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {profile?.total_carbon_emission?.toFixed(1) || 0}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              CO₂ Dikurangi (kg)
            </p>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-lg border border-border">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {profile?.total_earnings || 0}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Total Penghasilan
            </p>
          </div>
        </div>

        <div className="bg-primary/5 rounded-2xl p-4 mt-4 border border-primary/20">
          <p className="text-sm font-bold text-foreground mb-1">
            🌍 Tahukah Kamu?
          </p>
          <p className="text-xs text-muted-foreground">
            Setiap botol plastik yang kamu daur ulang mengurangi emisi karbon
            hingga 0.5 kg dan menghemat energi yang cukup untuk menyalakan lampu
            selama 3 jam!
          </p>
        </div>
      </div>

      {/* ================= AKTIVITAS TERBARU ================= */}
      <div className="px-6 mt-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Aktivitas Terbaru</h2>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl text-center border border-border/50 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Recycle className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">
                Belum ada aktivitas
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Mulai daur ulang sekarang!
              </p>
              <button
                onClick={() => navigate("/scan")}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Mulai Setor
              </button>
            </div>
          ) : (
            <>
              {activities.slice(0, 5).map((activity, index) => (
                <div
                  key={activity.id}
                  className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 flex items-center justify-center">
                        <Recycle className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground text-base">
                          {activity.bottles_count} Botol
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.locations?.name || "Lokasi tidak diketahui"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="bg-primary/10 px-3 py-1 rounded-lg mb-1.5">
                        <p className="font-black text-primary text-base">
                          +{activity.points_earned}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium">
                          {new Date(activity.created_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {activities.length > 5 && (
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-colors"
                >
                  Lihat Semua Aktivitas
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
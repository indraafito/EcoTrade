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
  Bell,
  Droplets,
  Gift,
  CheckCircle2,
  Sparkles,
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
  total_vouchers?: number;
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
  description?: string;
  target_type: string;
  target_value: number;
  progress_value: number;
  progress_percentage: number;
  points_bonus: number;
  completed_at: string | null;
  verified: boolean;
  status: string;
  difficulty?: string;
  expires_at?: string | null;
  started_at?: string;
  duration_hours?: number;
}

interface MissionProgress {
  user_id: string;
  mission_id: string;
  progress_value: number;
  status: string;
  started_at: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyPoints, setWeeklyPoints] = useState(0);
  const [claimingMission, setClaimingMission] = useState<string | null>(null);

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

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("username, full_name, points, rank, total_bottles, total_weight_kg")
        .eq("user_id", user.id)
        .single();

      console.log('🔍 Raw profile data from database:', profileData);
      console.log('🔍 Profile fetch error:', error);

      if (error) {
        if (error.code === "PGRST116") {
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert([
              {
                user_id: user.id,
                username: user.email?.split("@")[0] || "user",
                full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
                points: 0,
                rank: 0,
                total_bottles: 0,
                total_weight_kg: 0,
              },
            ])
            .select()
            .single();

          if (insertError) {
            console.error("Error creating profile:", insertError);
            toast.error("Gagal membuat profil: " + insertError.message);
            return;
          }

          const profileWithDefaults = {
            ...newProfile,
            total_carbon_emission: 0,
            total_earnings: 0,
            total_vouchers: 0,
          };

          console.log('📊 Profile with defaults:', profileWithDefaults);

          setProfile(profileWithDefaults);
          toast.success("Profil berhasil dibuat!");
          return;
        }
        throw error;
      }

      const { count: voucherCount } = await supabase
        .from("voucher_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const estimatedCarbonEmission = (profileData.total_weight_kg || 0) * 0.5;
      const estimatedEarnings = (profileData.points || 0) * 10;

      // Auto-sync profile with activities if there's a discrepancy
      const { data: activities, error: activitiesError } = await supabase
        .from("activities")
        .select("bottles_count, points_earned, weight_kg")
        .eq("user_id", user.id);

      if (!activitiesError && activities) {
        const totalBottlesFromActivities = activities.reduce((sum, act) => sum + act.bottles_count, 0);
        const totalPointsFromActivities = activities.reduce((sum, act) => sum + act.points_earned, 0);
        const totalWeightFromActivities = activities.reduce((sum, act) => sum + act.weight_kg, 0);

        console.log('🔍 Auto-sync check:');
        console.log('  - Profile bottles:', profileData.total_bottles);
        console.log('  - Activities bottles:', totalBottlesFromActivities);
        console.log('  - Difference:', profileData.total_bottles - totalBottlesFromActivities);

        // If there's a discrepancy, update profile
        if (profileData.total_bottles !== totalBottlesFromActivities) {
          console.log('🔧 Auto-syncing profile with activities...');
          const { error: syncError } = await supabase
            .from("profiles")
            .update({
              total_bottles: totalBottlesFromActivities,
              points: totalPointsFromActivities,
              total_weight_kg: totalWeightFromActivities,
            })
            .eq("user_id", user.id);

          if (!syncError) {
            console.log('✅ Profile synced successfully');
            toast.success('🔧 Profile data telah disinkronkan dengan aktivitas');
            profileData.total_bottles = totalBottlesFromActivities;
            profileData.points = totalPointsFromActivities;
            profileData.total_weight_kg = totalWeightFromActivities;
          } else {
            console.error('❌ Sync error:', syncError);
          }
        }
      }

      const profileWithEstimates = {
        ...profileData,
        total_carbon_emission: estimatedCarbonEmission,
        total_earnings: estimatedEarnings,
        total_vouchers: voucherCount || 0,
      };

      console.log('📊 Profile with estimates:', profileWithEstimates);
      console.log('🔍 Final check - Database vs Display:');
      console.log('  - Database total_bottles:', profileData.total_bottles);
      console.log('  - Display total_bottles:', profileWithEstimates.total_bottles);
      console.log('  - Are they equal?', profileData.total_bottles === profileWithEstimates.total_bottles);

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
        .select("id, bottles_count, points_earned, created_at, locations (name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const activitiesData = data || [];
      setActivities(activitiesData);

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

      // Fetch active missions only
      const { data: allMissions, error: missionsError } = await supabase
        .from("missions" as any)
        .select("*")
        .eq("is_active", true)
        .order("difficulty", { ascending: true });

      if (missionsError) {
        console.error("Error fetching missions:", missionsError);
        setMissions([]);
        return;
      }

      if (!allMissions || allMissions.length === 0) {
        console.log("No active missions found");
        setMissions([]);
        return;
      }

      // Fetch user's mission progress
      const { data: userProgress, error: progressError } = await supabase
        .from("mission_progress" as any)
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["in_progress", "completed"]);

      if (progressError) {
        console.error("Error fetching progress:", progressError);
      }

      // If no progress exists, create initial progress for first 3 missions
      if (!userProgress || userProgress.length === 0) {
        const initialMissions = allMissions.slice(0, 3);
        const now = new Date();
        
        const progressToCreate = initialMissions.map((mission: any) => ({
          user_id: user.id,
          mission_id: mission.id,
          progress_value: 0,
          status: "in_progress",
          started_at: now.toISOString(),
        } as MissionProgress));

        const { data: newProgress, error: createError } = await supabase
          .from("mission_progress" as any)
          .insert(progressToCreate)
          .select();

        if (createError) {
          console.error("Error creating mission progress:", createError);
        }

        const transformedMissions = initialMissions.map((m: any) => ({
          id: m.id,
          mission_id: m.id,
          mission_title: m.title,
          description: m.description,
          target_type: m.target_type,
          target_value: m.target_value,
          progress_value: 0,
          progress_percentage: 0,
          points_bonus: m.points_bonus,
          completed_at: null,
          verified: false,
          status: "in_progress",
          difficulty: m.difficulty,
          duration_hours: m.duration_hours,
          started_at: now.toISOString(),
          expires_at: m.duration_hours 
            ? new Date(now.getTime() + m.duration_hours * 60 * 60 * 1000).toISOString()
            : null,
        }));

        setMissions(transformedMissions);
        return;
      }

      // Map missions with progress
      const missionsWithProgress = allMissions
        .map((mission: any) => {
          if (!userProgress || Array.isArray(userProgress) === false) return null;
          const progress = (userProgress as any[]).find((p: any) => p.mission_id === mission.id);
          if (!progress) return null;
          if (progress.status === "claimed" || progress.status === "expired") return null;

          return {
            id: progress.id,
            mission_id: mission.id,
            mission_title: mission.title,
            description: mission.description,
            target_type: mission.target_type,
            target_value: mission.target_value,
            progress_value: progress.progress_value || 0,
            progress_percentage: Math.min(
              ((progress.progress_value || 0) / mission.target_value) * 100,
              100
            ),
            points_bonus: mission.points_bonus,
            completed_at: progress.completed_at,
            verified: progress.verified || false,
            status: progress.status,
            difficulty: mission.difficulty,
            duration_hours: mission.duration_hours,
            started_at: progress.started_at,
            expires_at: progress.expires_at,
          };
        })
        .filter(Boolean)
        .slice(0, 3);

      setMissions(missionsWithProgress as Mission[]);
    } catch (error: any) {
      console.error("Error fetching missions:", error);
      setMissions([]);
    }
  };

  const claimMissionReward = async (missionProgressId: string, pointsBonus: number) => {
    try {
      setClaimingMission(missionProgressId);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update mission progress to claimed
      const { error: updateError } = await supabase
        .from("mission_progress" as any)
        .update({
          status: "claimed",
          claimed_at: new Date().toISOString(),
          verified: true,
        })
        .eq("id", missionProgressId);

      if (updateError) throw updateError;

      // Update user points
      const { error: pointsError } = await supabase
        .from("profiles")
        .update({
          points: (profile?.points || 0) + pointsBonus,
        })
        .eq("user_id", user.id);

      if (pointsError) throw pointsError;

      toast.success(`🎉 Selamat! Kamu mendapat ${pointsBonus} poin!`);

      // Refresh data
      await fetchProfile();
      await fetchMissions();
    } catch (error: any) {
      console.error("Error claiming reward:", error);
      toast.error("Gagal claim reward: " + error.message);
    } finally {
      setClaimingMission(null);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "hard":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const getTimeRemaining = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} hari lagi`;
    } else if (hours > 0) {
      return `${hours} jam lagi`;
    } else {
      return `${minutes} menit lagi`;
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 pb-28">
      {/* ================= HEADER WITH GRADIENT ================= */}
      <div className="relative bg-gradient-to-br from-primary via-[#17a865] to-[#1DBF73] px-6 pt-12 pb-32 overflow-hidden">
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
        </div>
      </div>

      {/* ================= FLOATING POINT CARD ================= */}
      <div className="-mt-20 px-6 relative z-20">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20 dark:border-white/10 relative overflow-hidden">
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
              <button
                onClick={() => navigate("/leaderboard")}
                className="flex flex-col items-center gap-2 hover:scale-110 transition-transform"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[#1DBF73] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                  <Award className="w-9 h-9 text-white" />
                </div>
                <p className="text-xs font-bold text-foreground text-center cursor-pointer hover:text-primary transition-colors">
                  Rank #{profile?.rank || "-"}
                </p>
              </button>
            </div>
          </div>
        </div>
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
                className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-foreground text-sm">
                        {mission.mission_title}
                      </p>
                      {mission.difficulty && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getDifficultyColor(
                            mission.difficulty
                          )}`}
                        >
                          {mission.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Progress: {mission.progress_value}/{mission.target_value}{" "}
                      {mission.target_type}
                    </p>
                    {mission.expires_at && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-orange-500" />
                        <p className="text-[10px] font-semibold text-orange-500">
                          {getTimeRemaining(mission.expires_at)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="bg-primary/10 px-2.5 py-1 rounded-lg">
                    <p className="font-bold text-primary text-xs">
                      +{mission.points_bonus}
                    </p>
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div
                    className="bg-gradient-to-r from-primary to-[#1DBF73] h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(mission.progress_percentage, 100)}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {mission.progress_percentage.toFixed(0)}% Selesai
                  </p>
                  {mission.status === "completed" ? (
                    <button
                      onClick={() =>
                        claimMissionReward(mission.id, mission.points_bonus)
                      }
                      disabled={claimingMission === mission.id}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-[#1DBF73] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {claimingMission === mission.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Claiming...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Claim Reward</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <p className="text-xs font-semibold text-primary capitalize">
                      Berlangsung
                    </p>
                  )}
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
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
              <Gift className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-black text-foreground">
              {profile?.total_vouchers || 0}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Voucher Ditukar
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
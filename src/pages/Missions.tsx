import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, Loading } from "@/components";
import {
  ArrowLeft,
  Trophy,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  Gift,
  Zap,
  Star,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

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
  mission_type?: string;
  expires_at?: string | null;
  started_at?: string;
  duration_hours?: number;
}

const Missions = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingMission, setClaimingMission] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed">("all");

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch all active missions
      const { data: allMissions, error: missionsError } = await supabase
        .from("missions")
        .select("*")
        .eq("is_active", true)
        .order("difficulty", { ascending: true })
        .order("points_bonus", { ascending: false });

      if (missionsError) throw missionsError;

      if (!allMissions || allMissions.length === 0) {
        setMissions([]);
        return;
      }

      // Fetch user's mission progress
      const { data: userProgress, error: progressError } = await supabase
        .from("mission_progress")
        .select("*")
        .eq("user_id", user.id);

      if (progressError) throw progressError;

      // Create mission progress for missions user hasn't started yet
      const existingMissionIds = (userProgress || []).map((p) => p.mission_id);
      const newMissions = allMissions.filter(
        (m) => !existingMissionIds.includes(m.id)
      );

      if (newMissions.length > 0) {
        const now = new Date();
        const progressToCreate = newMissions.map((mission) => ({
          user_id: user.id,
          mission_id: mission.id,
          progress_value: 0,
          status: "in_progress",
          started_at: now.toISOString(),
        }));

        const { error: createError } = await supabase
          .from("mission_progress")
          .insert(progressToCreate);

        if (createError) console.error("Error creating progress:", createError);
      }

      // Re-fetch progress after creation
      const { data: updatedProgress } = await supabase
        .from("mission_progress")
        .select("*")
        .eq("user_id", user.id);

      // Map missions with progress
      const missionsWithProgress = allMissions
        .map((mission) => {
          const progress = (updatedProgress || []).find(
            (p) => p.mission_id === mission.id
          );
          if (!progress) return null;
          if (progress.status === "claimed" || progress.status === "expired")
            return null;

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
            mission_type: mission.mission_type,
            expires_at: progress.expires_at,
            started_at: progress.started_at,
            duration_hours: mission.duration_hours,
          };
        })
        .filter(Boolean) as Mission[];

      setMissions(missionsWithProgress);
    } catch (error: any) {
      console.error("Error fetching missions:", error);
      toast.error("Gagal memuat misi");
    } finally {
      setIsLoading(false);
    }
  };

  const claimMissionReward = async (
    missionProgressId: string,
    pointsBonus: number
  ) => {
    try {
      setClaimingMission(missionProgressId);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update mission progress to claimed
      const { error: updateError } = await supabase
        .from("mission_progress")
        .update({
          status: "claimed",
          claimed_at: new Date().toISOString(),
          verified: true,
        })
        .eq("id", missionProgressId);

      if (updateError) throw updateError;

      // Get current points
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("points")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;

      // Update user points
      const { error: pointsError } = await supabase
        .from("profiles")
        .update({
          points: (profile?.points || 0) + pointsBonus,
        })
        .eq("user_id", user.id);

      if (pointsError) throw pointsError;

      toast.success(`🎉 Selamat! Kamu mendapat ${pointsBonus} poin!`);

      // Refresh missions
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
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "hard":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getDifficultyIcon = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return <Star className="w-4 h-4" />;
      case "medium":
        return <Zap className="w-4 h-4" />;
      case "hard":
        return <Trophy className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case "bottles":
        return "Botol";
      case "weight_kg":
        return "Kg";
      case "points":
        return "Poin";
      case "activities":
        return "Aktivitas";
      default:
        return type;
    }
  };

  const getTimeRemaining = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return { text: "Expired", color: "text-red-500" };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return { 
        text: `${days} hari ${hours % 24} jam lagi`,
        color: "text-green-600 dark:text-green-400"
      };
    } else if (hours > 3) {
      return { 
        text: `${hours} jam ${minutes} menit lagi`,
        color: "text-yellow-600 dark:text-yellow-400"
      };
    } else if (hours > 0) {
      return { 
        text: `${hours} jam ${minutes} menit lagi`,
        color: "text-orange-500"
      };
    } else {
      return { 
        text: `${minutes} menit lagi`,
        color: "text-red-500"
      };
    }
  };

  const filteredMissions = missions.filter((mission) => {
    if (filter === "all") return true;
    return mission.status === filter;
  });

  const completedCount = missions.filter((m) => m.status === "completed").length;
  const inProgressCount = missions.filter((m) => m.status === "in_progress").length;

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 pb-28">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary via-[#17a865] to-[#1DBF73] px-6 pt-12 pb-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-2">Misi Kamu</h1>
          <p className="text-white/80 text-sm">
            Selesaikan misi untuk dapatkan poin bonus!
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="-mt-12 px-6 relative z-20 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Sedang Berjalan
              </p>
            </div>
            <p className="text-3xl font-black text-foreground">{inProgressCount}</p>
          </div>

          <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Selesai
              </p>
            </div>
            <p className="text-3xl font-black text-green-600">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 mb-6">
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              filter === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({missions.length})
          </button>
          <button
            onClick={() => setFilter("in_progress")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              filter === "in_progress"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Aktif ({inProgressCount})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              filter === "completed"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Selesai ({completedCount})
          </button>
        </div>
      </div>

      {/* Missions List */}
      <div className="px-6 space-y-4">
        {filteredMissions.length === 0 ? (
          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl text-center border border-border/50 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Target className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">
              Tidak ada misi {filter === "all" ? "" : filter === "in_progress" ? "aktif" : "selesai"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {filter === "in_progress"
                ? "Mulai daur ulang untuk menyelesaikan misi!"
                : "Selesaikan misi untuk dapatkan reward!"}
            </p>
          </div>
        ) : (
          filteredMissions.map((mission, index) => (
            <div
              key={mission.id}
              className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-lg border border-border/50 overflow-hidden hover:shadow-xl transition-all"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Mission Header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`p-2 rounded-xl border ${getDifficultyColor(
                          mission.difficulty
                        )}`}
                      >
                        {getDifficultyIcon(mission.difficulty)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground">
                          {mission.mission_title}
                        </h3>
                        {mission.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {mission.description}
                          </p>
                        )}
                        {mission.expires_at && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            <p className={`text-xs font-semibold ${getTimeRemaining(mission.expires_at)?.color}`}>
                              {getTimeRemaining(mission.expires_at)?.text}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="bg-gradient-to-r from-primary to-[#1DBF73] text-white px-3 py-1.5 rounded-lg">
                      <p className="font-black text-sm">+{mission.points_bonus}</p>
                    </div>
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
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Progress: {mission.progress_value}/{mission.target_value}{" "}
                      {getTargetTypeLabel(mission.target_type)}
                    </p>
                    <p className="text-xs font-bold text-primary">
                      {mission.progress_percentage.toFixed(0)}%
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-[#1DBF73] h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                      style={{
                        width: `${Math.min(mission.progress_percentage, 100)}%`,
                      }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                {mission.status === "completed" ? (
                  <button
                    onClick={() =>
                      claimMissionReward(mission.id, mission.points_bonus)
                    }
                    disabled={claimingMission === mission.id}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-[#1DBF73] text-white px-4 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {claimingMission === mission.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Claiming...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Claim {mission.points_bonus} Poin</span>
                        <Gift className="w-5 h-5" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Sedang Berjalan</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {mission.target_value - mission.progress_value} lagi
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tips Card */}
      <div className="px-6 mt-6">
        <div className="bg-gradient-to-br from-primary/10 to-[#1DBF73]/10 rounded-2xl p-5 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-1">💡 Tips</h4>
              <p className="text-xs text-muted-foreground">
                Selesaikan misi untuk mendapatkan poin bonus! Misi akan otomatis
                update setiap kali kamu melakukan aktivitas daur ulang.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Missions;
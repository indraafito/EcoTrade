import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, Loading } from "@/components";
import {
  Trophy,
  Award,
  Crown,
  Medal,
  Recycle,
  Weight,
  ArrowLeft,
  Search,
  Star,
  Sparkles,
  Calendar,
  Gift,
  Zap,
  Gem,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  points: number;
  total_bottles: number;
  total_weight_kg: number;
  city: string | null;
  rank_name: string | null;
  position: number;
}

interface AchievedBadge {
  id: string;
  name: string;
  threshold_points: number;
  achieved_date: Date;
}

interface RankingTier {
  id: string;
  name: string;
  threshold_points: number;
  bonus_points: number;
  sort_order: number;
}

interface MonthlyWinner {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  position: number;
  xp: number;
  reward_points: number;
  month: number;
  year: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [filteredLeaderboard, setFilteredLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
  const [rankingTiers, setRankingTiers] = useState<RankingTier[]>([]);
  const [pastWinners, setPastWinners] = useState<MonthlyWinner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [cities, setCities] = useState<string[]>([]);
  const [showPastWinners, setShowPastWinners] = useState(false);
  const [showRankingTiers, setShowRankingTiers] = useState(false);
  const [achievedBadges, setAchievedBadges] = useState<AchievedBadge[]>([]);
  const [daysUntilReset, setDaysUntilReset] = useState<number>(0);

  // Ref untuk scroll ke posisi user
  const currentUserRef = useRef<HTMLDivElement>(null);

  // Calculate days until reset
  const calculateDaysUntilReset = () => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchRankingTiers();
    fetchPastWinners();
    fetchAchievedBadges();
    setDaysUntilReset(calculateDaysUntilReset());
  }, []);

  useEffect(() => {
    filterLeaderboard();
  }, [searchQuery, filterCity, leaderboard]);

  // Auto scroll ke posisi user setelah data dimuat
  useEffect(() => {
    if (!isLoading && currentUser && currentUser.position > 3 && !searchQuery) {
      setTimeout(() => {
        currentUserRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 500);
    }
  }, [isLoading, currentUser, searchQuery]);

  const fetchLeaderboard = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("leaderboard_view")
        .select("*")
        .order("position", { ascending: true })
        .limit(100);

      if (error) throw error;

      const leaderboardData = (data as LeaderboardEntry[]) || [];
      setLeaderboard(leaderboardData);

      const uniqueCities = [
        ...new Set(
          leaderboardData
            .map((entry) => entry.city)
            .filter((city) => city !== null)
        ),
      ] as string[];
      setCities(uniqueCities);

      if (user) {
        const userEntry = leaderboardData.find(
          (entry) => entry.user_id === user.id
        );
        setCurrentUser(userEntry || null);
      }
    } catch (error: unknown) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Gagal memuat leaderboard");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRankingTiers = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("ranking_tiers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setRankingTiers((data as RankingTier[]) || []);
    } catch (error: unknown) {
      console.error("Error fetching ranking tiers:", error);
    }
  };

  const fetchPastWinners = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("monthly_leaderboard_winners")
        .select(
          `
          *,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `
        )
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(12);

      if (error) throw error;

      const winners = (data || []).map((w: unknown) => {
        const winner = w as {
          user_id: string;
          position: number;
          xp: number;
          reward_points: number;
          month: number;
          year: number;
          profiles?: {
            username?: string;
            full_name?: string;
            avatar_url?: string;
          };
        };
        return {
          user_id: winner.user_id,
          username: winner.profiles?.username || "Unknown",
          full_name: winner.profiles?.full_name || "Unknown",
          avatar_url: winner.profiles?.avatar_url || null,
          position: winner.position,
          xp: winner.xp,
          reward_points: winner.reward_points,
          month: winner.month,
          year: winner.year,
        };
      });

      setPastWinners(winners);
    } catch (error: unknown) {
      console.error("Error fetching past winners:", error);
    }
  };

  const fetchAchievedBadges = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("achieved_badges")
        .select("*")
        .eq("user_id", user.id)
        .order("achieved_date", { ascending: false });

      if (error) throw error;
      setAchievedBadges(data || []);
    } catch (error: unknown) {
      console.error("Error fetching achieved badges:", error);
    }
  };

  const filterLeaderboard = () => {
    let filtered = [...leaderboard];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.username.toLowerCase().includes(query) ||
          entry.full_name.toLowerCase().includes(query)
      );
    }

    if (filterCity !== "all") {
      filtered = filtered.filter((entry) => entry.city === filterCity);
    }

    setFilteredLeaderboard(filtered);
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Medal className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-600" />;
      default:
        return null;
    }
  };

  const getRankBadgeColor = (position: number) => {
    if (position === 1)
      return "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white";
    if (position === 2)
      return "bg-gradient-to-br from-gray-300 to-gray-500 text-white";
    if (position === 3)
      return "bg-gradient-to-br from-orange-400 to-orange-600 text-white";
    return "bg-muted text-foreground";
  };

  const getTierBadgeColor = (tierName: string | null) => {
    switch (tierName?.toLowerCase()) {
      case "bronze":
        return "bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-700/30";
      case "silver":
        return "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30";
      case "gold":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-600/30";
      case "platinum":
        return "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30";
      case "diamond":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  // Function to calculate tier based on points
  const calculateTierFromPoints = (points: number): string => {
    // Sort ranking tiers by threshold (highest first)
    const sortedTiers = [...rankingTiers].sort((a, b) => b.threshold_points - a.threshold_points);
    
    for (const tier of sortedTiers) {
      if (points >= tier.threshold_points) {
        return tier.name;
      }
    }
    
    return "Bronze"; // Default tier
  };

  // Enhanced getTierBadgeColor that calculates tier if rank_name is empty
  const getTierBadgeColorWithPoints = (rankName: string | null, points: number) => {
    const tierName = rankName || calculateTierFromPoints(points);
    return getTierBadgeColor(tierName);
  };

  // Enhanced tier name display that calculates tier if rank_name is empty
  const getTierNameWithPoints = (rankName: string | null, points: number) => {
    return rankName || calculateTierFromPoints(points);
  };

  // Function to get next tier and points needed
  const getNextTierProgress = (points: number) => {
    // Sort ranking tiers by threshold (ascending)
    const sortedTiers = [...rankingTiers].sort((a, b) => a.threshold_points - b.threshold_points);
    
    // Find current tier
    const currentTier = calculateTierFromPoints(points);
    
    // Find next tier
    const currentTierIndex = sortedTiers.findIndex(tier => tier.name === currentTier);
    const nextTier = sortedTiers[currentTierIndex + 1];
    
    if (nextTier) {
      const pointsNeeded = nextTier.threshold_points - points;
      return {
        nextTier: nextTier.name,
        pointsNeeded: pointsNeeded > 0 ? pointsNeeded : 0,
        hasProgress: pointsNeeded > 0
      };
    }
    
    return {
      nextTier: null,
      pointsNeeded: 0,
      hasProgress: false
    };
  };

  const getTierDescription = (tier: RankingTier) => {
    const { name } = tier;
    let description = "";

    switch (name.toLowerCase()) {
      case "bronze":
        description = "Tier untuk pemula yang baru memulai.";
        break;
      case "silver":
        description = "Tier untuk pengguna menengah.";
        break;
      case "gold":
        description = "Tier untuk pengguna lanjutan.";
        break;
      case "platinum":
        description = "Tier premium dengan fitur eksklusif.";
        break;
      case "diamond":
        description = "Tier tertinggi dengan status elite.";
        break;
      default:
        description = `Tier ${name}.`;
    }

    return description;
  };

  const getTierIcon = (tierName: string) => {
    switch (tierName?.toLowerCase()) {
      case "bronze":
        return <Medal className="w-8 h-8 text-orange-600" />;
      case "silver":
        return <Medal className="w-8 h-8 text-gray-500" />;
      case "gold":
        return <Crown className="w-8 h-8 text-yellow-500" />;
      case "platinum":
        return <Star className="w-8 h-8 text-cyan-500" />;
      case "diamond":
        return <Gem className="w-8 h-8 text-blue-500" />;
      default:
        return <Award className="w-8 h-8 text-primary" />;
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return months[month - 1];
  };

  const getCurrentMonth = () => {
    return getMonthName(new Date().getMonth() + 1);
  };

  if (isLoading) {
    return <Loading />;
  }

  // Gunakan leaderboard asli untuk top 3 podium, bukan filtered
  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 pb-28">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary via-[#17a865] to-[#1DBF73] px-6 pt-12 pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-white" />
              <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            </div>
            <div className="w-10" />
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-white text-lg font-bold">
                Kompetisi {getCurrentMonth()}
              </p>
            </div>
            <p className="text-white/80 text-sm mb-2">
              Berdasarkan XP bulan ini • Reset awal bulan
            </p>
            <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              <Clock className="w-4 h-4 text-white/80" />
              <p className="text-white text-sm font-semibold">
                {daysUntilReset} hari lagi
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Info Card */}
      <div className="-mt-16 px-6 mb-6 relative z-20">
        <div className="bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border border-white/20 dark:border-white/10">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-foreground font-bold text-lg mb-2">
                🏆 Hadiah Bulanan
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gradient-to-br from-yellow-500/30 to-amber-600/30 dark:from-yellow-500/20 dark:to-amber-600/20 rounded-lg p-2 text-center border border-yellow-500/30">
                  <Medal className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mx-auto mb-1" />
                  <p className="text-foreground font-black text-sm">1000</p>
                  <p className="text-muted-foreground text-[10px]">Poin</p>
                </div>
                <div className="bg-gradient-to-br from-gray-400/30 to-gray-500/30 dark:from-gray-400/20 dark:to-gray-500/20 rounded-lg p-2 text-center border border-gray-400/30">
                  <Medal className="w-5 h-5 text-gray-400 dark:text-gray-300 mx-auto mb-1" />
                  <p className="text-foreground font-black text-sm">500</p>
                  <p className="text-muted-foreground text-[10px]">Poin</p>
                </div>
                <div className="bg-gradient-to-br from-orange-600/30 to-amber-700/30 dark:from-orange-600/20 dark:to-amber-700/20 rounded-lg p-2 text-center border border-orange-600/30">
                  <Medal className="w-5 h-5 text-orange-600 dark:text-orange-500 mx-auto mb-1" />
                  <p className="text-foreground font-black text-sm">250</p>
                  <p className="text-muted-foreground text-[10px]">Poin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current User Card */}
      {currentUser && (
        <div className="px-6 mb-6">
          <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 backdrop-blur-xl rounded-2xl shadow-xl p-5 border border-purple-500/30 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                  🏆 Posisi Kamu Bulan Ini
                </p>
                <div className="flex items-center gap-2">
                  <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    #{currentUser.position}
                  </div>
                  {currentUser.position <= 10 && (
                    <div className="bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded-full text-xs font-bold">
                      TOP 10
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center ring-4 ring-purple-500/30">
                      {currentUser.avatar_url ? (
                        <img
                          src={currentUser.avatar_url}
                          alt={currentUser.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-xl">
                          {currentUser.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg">
                      {currentUser.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentUser.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierBadgeColorWithPoints(
                          currentUser.rank_name,
                          currentUser.points
                        )}`}
                      >
                        {getTierNameWithPoints(currentUser.rank_name, currentUser.points)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {currentUser.city || "Lokasi tidak diketahui"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-purple-100 dark:bg-purple-900/30 px-3 py-2 rounded-lg mb-2">
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {currentUser.points.toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">XP</p>
                  </div>
                </div>
              </div>
              
              {/* Progress to next rank */}
              {currentUser.position > 1 && (
                <div className="mt-4 pt-4 border-t border-purple-500/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Target posisi #{currentUser.position - 1}</span>
                    <span className="text-purple-600 font-semibold">
                      {leaderboard[currentUser.position - 2]?.points 
                        ? `${(leaderboard[currentUser.position - 2].points - currentUser.points).toLocaleString("id-ID")} XP lagi`
                        : "Target tidak tersedia"
                      }
                    </span>
                  </div>
                </div>
              )}
              
              {/* Progress to next tier */}
              {(() => {
                const tierProgress = getNextTierProgress(currentUser.points);
                if (tierProgress.hasProgress && tierProgress.nextTier) {
                  return (
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-purple-600" />
                          <span className="text-muted-foreground">Naik ke {tierProgress.nextTier}</span>
                        </div>
                        <span className="text-purple-600 font-semibold">
                          {tierProgress.pointsNeeded.toLocaleString("id-ID")} XP lagi
                        </span>
                      </div>
                    </div>
                  );
                } else if (!tierProgress.nextTier) {
                  return (
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                      <div className="flex items-center justify-center text-xs">
                        <div className="flex items-center gap-1">
                          <Crown className="w-3 h-3 text-yellow-500" />
                          <span className="text-yellow-600 font-semibold">Tier Tertinggi!</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Past Winners Toggle */}
      {pastWinners.length > 0 && (
        <div className="px-6 mb-4">
          <button
            onClick={() => setShowPastWinners(!showPastWinners)}
            className="w-full bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground">
                  Pemenang Bulan Lalu
                </span>
              </div>
              <span className="text-primary text-sm">
                {showPastWinners ? "Sembunyikan ▲" : "Lihat ▼"}
              </span>
            </div>
          </button>

          {showPastWinners && (
            <div className="mt-3 space-y-2">
              {pastWinners.slice(0, 3).map((winner) => (
                <div
                  key={`${winner.user_id}-${winner.month}-${winner.year}`}
                  className="bg-card/80 backdrop-blur-sm p-4 rounded-xl border border-border/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${getRankBadgeColor(
                          winner.position
                        )}`}
                      >
                        {getRankIcon(winner.position) || `#${winner.position}`}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                        {winner.avatar_url ? (
                          <img
                            src={winner.avatar_url}
                            alt={winner.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-primary font-bold">
                            {winner.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          {winner.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getMonthName(winner.month)} {winner.year}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-purple-600">
                        {winner.xp} XP
                      </p>
                      <p className="text-xs text-green-600 font-semibold">
                        +{winner.reward_points} poin
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ranking Tiers Toggle */}
      {rankingTiers.length > 0 && (
        <div className="px-6 mb-4">
          <button
            onClick={() => setShowRankingTiers(!showRankingTiers)}
            className="w-full bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground">
                  Sistem Ranking
                </span>
              </div>
              <span className="text-primary text-sm">
                {showRankingTiers ? "Sembunyikan ▲" : "Lihat ▼"}
              </span>
            </div>
          </button>

          {showRankingTiers && (
            <div className="mt-3 space-y-3">
              {rankingTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="bg-card/80 backdrop-blur-sm p-4 rounded-xl border border-border/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getTierIcon(tier.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-sm font-bold px-2 py-1 rounded border ${getTierBadgeColor(
                            tier.name
                          )}`}
                        >
                          {tier.name.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Min. {tier.threshold_points} XP
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getTierDescription(tier)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Achieved Badges Section */}
      {achievedBadges.length > 0 && (
        <div className="px-6 mb-4">
          <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">
                Badge yang Diraih
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {achievedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-lg p-3 border border-primary/20 text-center"
                >
                  <div className="flex items-center justify-center mb-2">
                    <Award className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-bold text-foreground text-sm mb-1">
                    {badge.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {badge.threshold_points} XP
                  </p>
                  <p className="text-xs text-primary font-semibold mt-1">
                    {new Date(badge.achieved_date).toLocaleDateString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="px-6 mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Top 3 Podium - SELALU TAMPILKAN TOP 3 ASLI */}
      {top3.length > 0 && (
        <div className="px-6 mb-6">
          <div className="flex items-end justify-center gap-2 mb-6">
            {/* Rank 2 */}
            {top3[1] && (
              <div className="flex-1 text-center">
                <div className="relative mb-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center mx-auto border-4 border-white dark:border-gray-800 shadow-lg">
                    {top3[1].avatar_url ? (
                      <img
                        src={top3[1].avatar_url}
                        alt={top3[1].username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-xl">
                        {top3[1].username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                </div>
                <p className="font-bold text-foreground text-sm truncate">
                  {top3[1].username}
                </p>
                <p className="text-lg font-black text-purple-600">
                  {top3[1].points}
                </p>
                <p className="text-xs text-muted-foreground">XP</p>
                <div className="bg-gradient-to-br from-gray-300 to-gray-500 h-24 rounded-t-xl mt-2" />
              </div>
            )}

            {/* Rank 1 */}
            {top3[0] && (
              <div className="flex-1 text-center">
                <div className="relative mb-2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto border-4 border-white dark:border-gray-800 shadow-xl">
                    {top3[0].avatar_url ? (
                      <img
                        src={top3[0].avatar_url}
                        alt={top3[0].username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-2xl">
                        {top3[0].username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <Crown className="w-8 h-8 text-yellow-500 drop-shadow-lg" />
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                </div>
                <p className="font-bold text-foreground text-base truncate">
                  {top3[0].username}
                </p>
                <p className="text-xl font-black text-purple-600">
                  {top3[0].points}
                </p>
                <p className="text-xs text-muted-foreground">XP</p>
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 h-32 rounded-t-xl mt-2" />
              </div>
            )}

            {/* Rank 3 */}
            {top3[2] && (
              <div className="flex-1 text-center">
                <div className="relative mb-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto border-4 border-white dark:border-gray-800 shadow-lg">
                    {top3[2].avatar_url ? (
                      <img
                        src={top3[2].avatar_url}
                        alt={top3[2].username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-xl">
                        {top3[2].username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                </div>
                <p className="font-bold text-foreground text-sm truncate">
                  {top3[2].username}
                </p>
                <p className="text-lg font-black text-purple-600">
                  {top3[2].points}
                </p>
                <p className="text-xs text-muted-foreground">XP</p>
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 h-20 rounded-t-xl mt-2" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="px-6">
        <h2 className="text-lg font-bold text-foreground mb-3">
          Semua Peserta
        </h2>
        <div className="space-y-2">
          {filteredLeaderboard.slice(3).map((entry) => (
            <div
              key={entry.user_id}
              ref={
                entry.user_id === currentUser?.user_id ? currentUserRef : null
              }
              className={`bg-card/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border hover:shadow-md transition-all ${
                entry.user_id === currentUser?.user_id
                  ? "ring-2 ring-purple-500 bg-gradient-to-r from-purple-500/5 to-purple-600/5 border-purple-500/30"
                  : "border-border/50"
              }`}
            >
              {entry.user_id === currentUser?.user_id && (
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold z-10">
                  🎯 ANDA
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                  entry.user_id === currentUser?.user_id
                    ? "bg-purple-500 text-white"
                    : "bg-muted text-foreground"
                }`}>
                  #{entry.position}
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  entry.user_id === currentUser?.user_id
                    ? "ring-2 ring-purple-500 bg-gradient-to-br from-purple-500 to-purple-700"
                    : "bg-gradient-to-br from-purple-500/20 to-purple-700/20"
                }`}>
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt={entry.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className={`font-bold ${
                      entry.user_id === currentUser?.user_id
                        ? "text-white"
                        : "text-purple-600"
                    }`}>
                      {entry.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm">
                      {entry.username}
                    </p>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTierBadgeColorWithPoints(
                        entry.rank_name,
                        entry.points
                      )}`}
                    >
                      {getTierNameWithPoints(entry.rank_name, entry.points)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-purple-600">
                    {entry.points}
                  </p>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLeaderboard.length === 0 && (
          <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl text-center border border-border/50">
            <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              Tidak ada hasil ditemukan
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Coba ubah filter pencarian
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;

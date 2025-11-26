import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import Loading from "@/components/Loading";
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
} from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  points: number; // Ini sebenarnya XP dari view
  total_bottles: number;
  total_weight_kg: number;
  city: string | null;
  rank_name: string | null;
  position: number;
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

  useEffect(() => {
    fetchLeaderboard();
    fetchRankingTiers();
    fetchPastWinners();
  }, []);

  useEffect(() => {
    filterLeaderboard();
  }, [searchQuery, filterCity, leaderboard]);

  const fetchLeaderboard = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("leaderboard_view")
        .select("*")
        .order("position", { ascending: true })
        .limit(100);

      if (error) throw error;

      const leaderboardData = data || [];
      setLeaderboard(leaderboardData);

      // Extract unique cities
      const uniqueCities = [
        ...new Set(
          leaderboardData
            .map((entry) => entry.city)
            .filter((city) => city !== null)
        ),
      ] as string[];
      setCities(uniqueCities);

      // Find current user in leaderboard
      if (user) {
        const userEntry = leaderboardData.find(
          (entry) => entry.user_id === user.id
        );
        setCurrentUser(userEntry || null);
      }
    } catch (error: any) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Gagal memuat leaderboard");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRankingTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("ranking_tiers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setRankingTiers(data || []);
    } catch (error: any) {
      console.error("Error fetching ranking tiers:", error);
    }
  };

  const fetchPastWinners = async () => {
    try {
      const { data, error } = await supabase
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

      const winners = (data || []).map((w: any) => ({
        user_id: w.user_id,
        username: w.profiles?.username || "Unknown",
        full_name: w.profiles?.full_name || "Unknown",
        avatar_url: w.profiles?.avatar_url || null,
        position: w.position,
        xp: w.xp,
        reward_points: w.reward_points,
        month: w.month,
        year: w.year,
      }));

      setPastWinners(winners);
    } catch (error: any) {
      console.error("Error fetching past winners:", error);
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
            <p className="text-white/80 text-sm">
              Berdasarkan XP bulan ini • Reset awal bulan
            </p>
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
                {/* Gold Medal */}
                <div className="bg-gradient-to-br from-yellow-500/30 to-amber-600/30 dark:from-yellow-500/20 dark:to-amber-600/20 rounded-lg p-2 text-center border border-yellow-500/30">
                  <Medal className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mx-auto mb-1" />
                  <p className="text-foreground font-black text-sm">1000</p>
                  <p className="text-muted-foreground text-[10px]">Poin</p>
                </div>
                {/* Silver Medal */}
                <div className="bg-gradient-to-br from-gray-400/30 to-gray-500/30 dark:from-gray-400/20 dark:to-gray-500/20 rounded-lg p-2 text-center border border-gray-400/30">
                  <Medal className="w-5 h-5 text-gray-400 dark:text-gray-300 mx-auto mb-1" />
                  <p className="text-foreground font-black text-sm">500</p>
                  <p className="text-muted-foreground text-[10px]">Poin</p>
                </div>
                {/* Bronze Medal */}
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
          <div className="bg-card/90 backdrop-blur-xl rounded-2xl shadow-xl p-5 border border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Posisi Kamu Bulan Ini
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
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
                  {currentUser.rank_name && (
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border ${getTierBadgeColor(
                        currentUser.rank_name
                      )}`}
                    >
                      {currentUser.rank_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 font-black text-lg ${getRankBadgeColor(
                    currentUser.position
                  )}`}
                >
                  {getRankIcon(currentUser.position) ||
                    `#${currentUser.position}`}
                </div>
                <p className="text-xl font-black text-purple-600">
                  {currentUser.points}
                </p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
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
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Semua Kota</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 3 Podium */}
      {filteredLeaderboard.length > 0 && (
        <div className="px-6 mb-6">
          <div className="flex items-end justify-center gap-2 mb-6">
            {/* Rank 2 */}
            {filteredLeaderboard[1] && (
              <div className="flex-1 text-center">
                <div className="relative mb-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center mx-auto border-4 border-white dark:border-gray-800 shadow-lg">
                    {filteredLeaderboard[1].avatar_url ? (
                      <img
                        src={filteredLeaderboard[1].avatar_url}
                        alt={filteredLeaderboard[1].username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-xl">
                        {filteredLeaderboard[1].username
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                </div>
                <p className="font-bold text-foreground text-sm truncate">
                  {filteredLeaderboard[1].username}
                </p>
                <p className="text-lg font-black text-purple-600">
                  {filteredLeaderboard[1].points}
                </p>
                <p className="text-xs text-muted-foreground">XP</p>
                <div className="bg-gradient-to-br from-gray-300 to-gray-500 h-24 rounded-t-xl mt-2" />
              </div>
            )}

            {/* Rank 1 */}
            {filteredLeaderboard[0] && (
              <div className="flex-1 text-center">
                <div className="relative mb-2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto border-4 border-white dark:border-gray-800 shadow-xl">
                    {filteredLeaderboard[0].avatar_url ? (
                      <img
                        src={filteredLeaderboard[0].avatar_url}
                        alt={filteredLeaderboard[0].username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-2xl">
                        {filteredLeaderboard[0].username
                          .charAt(0)
                          .toUpperCase()}
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
                  {filteredLeaderboard[0].username}
                </p>
                <p className="text-xl font-black text-purple-600">
                  {filteredLeaderboard[0].points}
                </p>
                <p className="text-xs text-muted-foreground">XP</p>
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 h-32 rounded-t-xl mt-2" />
              </div>
            )}

            {/* Rank 3 */}
            {filteredLeaderboard[2] && (
              <div className="flex-1 text-center">
                <div className="relative mb-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto border-4 border-white dark:border-gray-800 shadow-lg">
                    {filteredLeaderboard[2].avatar_url ? (
                      <img
                        src={filteredLeaderboard[2].avatar_url}
                        alt={filteredLeaderboard[2].username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-xl">
                        {filteredLeaderboard[2].username
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                </div>
                <p className="font-bold text-foreground text-sm truncate">
                  {filteredLeaderboard[2].username}
                </p>
                <p className="text-lg font-black text-purple-600">
                  {filteredLeaderboard[2].points}
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
              className={`bg-card/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-all ${
                entry.user_id === currentUser?.user_id
                  ? "ring-2 ring-purple-500"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-foreground">
                  #{entry.position}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-700/20 flex items-center justify-center">
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt={entry.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-purple-600 font-bold">
                      {entry.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm">
                      {entry.username}
                    </p>
                    {entry.rank_name && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTierBadgeColor(
                          entry.rank_name
                        )}`}
                      >
                        {entry.rank_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Recycle className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {entry.total_bottles}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Weight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {entry.total_weight_kg}kg
                      </span>
                    </div>
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

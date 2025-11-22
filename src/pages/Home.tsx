import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import Loading from "@/components/Loading";
import { Recycle, Trophy, Weight, Clock, TrendingUp, Leaf, Award } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  username: string;
  full_name: string;
  points: number;
  rank: number;
  total_bottles: number;
  total_weight_kg: number;
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

const Home = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyPoints, setWeeklyPoints] = useState(0);

  useEffect(() => {
    checkAuth();
    fetchProfile();
    fetchActivities();
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
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("username, full_name, points, rank, total_bottles, total_weight_kg")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast.error("Gagal memuat profil");
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
        .limit(20);

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
      toast.error("Gagal memuat aktivitas");
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 pb-28">
      {/* ================= HEADER WITH GRADIENT ================= */}
      <div className="relative bg-gradient-to-br from-primary via-[#17a865] to-[#1DBF73] px-6 pt-12 pb-28 overflow-hidden">
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
            </div>
          </div>
          
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* ================= FLOATING POINT CARD WITH GLASSMORPHISM ================= */}
      <div className="-mt-20 px-6">
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
                  Yearly Legend
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= STATISTIK CARDS WITH GRADIENT ================= */}
      <div className="grid grid-cols-2 gap-4 px-6 mt-6">
        <div className="bg-card rounded-2xl p-5 shadow-lg border border-border relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[#1DBF73]/10 flex items-center justify-center mb-3">
              <Recycle className="w-6 h-6 text-[#1DBF73]" />
            </div>
            <p className="text-3xl font-black text-foreground mb-1">
              {profile?.total_bottles || 0}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">Botol Terkumpul</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 shadow-lg border border-border relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Weight className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-black text-foreground mb-1">
              {profile?.total_weight_kg || 0}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">Kg Didaur Ulang</p>
          </div>
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
              <p className="text-muted-foreground font-medium">Belum ada aktivitas</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Mulai daur ulang sekarang!</p>
            </div>
          ) : (
            activities.map((activity, index) => (
              <div
                key={activity.id}
                className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50"
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
                        {new Date(activity.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short"
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
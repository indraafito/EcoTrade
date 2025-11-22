import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Recycle, Trophy, Weight, Clock } from "lucide-react";
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
  const [weeklyPoints, setWeeklyPoints] = useState(0); // poin minggu ini

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

      // Ambil aktivitas terbaru
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
        .limit(20); // ambil 20 terakhir

      if (error) throw error;
      const activitiesData = data || [];
      setActivities(activitiesData);

      // Hitung poin minggu ini
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      const pointsThisWeek = activitiesData
        .filter(
          (act) => new Date(act.created_at) >= sevenDaysAgo
        )
        .reduce((sum, act) => sum + act.points_earned, 0);

      setWeeklyPoints(pointsThisWeek);
    } catch (error: any) {
      toast.error("Gagal memuat aktivitas");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-28">
      {/* ================= HEADER ================= */}
      <div className="bg-primary px-6 pt-10 pb-24 rounded-b-[32px] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/40 backdrop-blur-sm" />
          <div>
            <p className="text-white text-lg font-semibold">
              Hi, {profile?.username || "Pengguna"}!
            </p>
            <p className="text-white/80 text-sm">Keep saving the planet!</p>
          </div>
        </div>
      </div>

      {/* ================= FLOATING POINT CARD ================= */}
      <div className="-mt-16 px-6">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">Total Poin Anda</p>
              <p className="text-4xl font-bold text-primary">
                {profile?.points || 0}
              </p>
              <p className="text-xs text-green-500 mt-1">
                +{weeklyPoints} poin minggu ini
              </p>
            </div>

            <div className="w-16 h-16 rounded-full bg-gray-100" />
          </div>

          <p className="text-center mt-4 text-sm font-medium text-gray-600">
            Yearly Legend
          </p>
        </div>
      </div>

      {/* ================= STATISTIK BOTOL & KG ================= */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
          <Recycle className="w-7 h-7 text-[#1DBF73] mb-2" />
          <p className="text-2xl font-bold text-gray-800">
            {profile?.total_bottles || 0}
          </p>
          <p className="text-xs text-gray-500 text-center">Botol Dibuang</p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
          <Weight className="w-7 h-7 text-[#1DBF73] mb-2" />
          <p className="text-2xl font-bold text-gray-800">
            {profile?.total_weight_kg || 0}
          </p>
          <p className="text-xs text-gray-500 text-center">Kg Total</p>
        </div>
      </div>

      {/* ================= AKTIVITAS TERBARU ================= */}
      <div className="px-6 mt-8">
        <p className="text-lg font-semibold text-gray-800 mb-3">
          Aktivitas Terbaru
        </p>

        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="bg-white p-4 rounded-xl text-center text-gray-500 shadow-sm">
              Belum ada aktivitas
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Recycle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {activity.bottles_count} botol
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.locations?.name || "Lokasi tidak diketahui"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-primary">
                      +{activity.points_earned}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(activity.created_at).toLocaleDateString(
                        "id-ID"
                      )}
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

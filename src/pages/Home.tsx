import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Recycle, Weight, Clock } from "lucide-react";
import { toast } from "sonner";

interface Profile {
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

  useEffect(() => {
    checkAuth();
    fetchProfile();
    fetchActivities();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, points, rank, total_bottles, total_weight_kg")
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
      const { data: { user } } = await supabase.auth.getUser();
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
      setActivities(data || []);
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
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary p-6 rounded-b-3xl shadow-eco mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          Hi, {profile?.full_name || "Pengguna"}!
        </h1>
        <p className="text-white/90">Ayo buang sampah botol hari ini!</p>
      </div>

      <div className="px-6 space-y-4">
        <Card className="bg-card shadow-eco">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-primary">{profile?.points || 0}</p>
                <p className="text-sm text-muted-foreground">Poin</p>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-foreground">#{profile?.rank || 0}</p>
                  <p className="text-sm text-muted-foreground">Peringkat</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex flex-col items-center">
              <Recycle className="w-8 h-8 text-success mb-2" />
              <p className="text-2xl font-bold text-foreground">{profile?.total_bottles || 0}</p>
              <p className="text-xs text-muted-foreground text-center">Botol Dibuang</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex flex-col items-center">
              <Weight className="w-8 h-8 text-secondary mb-2" />
              <p className="text-2xl font-bold text-foreground">{profile?.total_weight_kg || 0}</p>
              <p className="text-xs text-muted-foreground text-center">Kg Total</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Aktivitas Terbaru</h2>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  Belum ada aktivitas
                </CardContent>
              </Card>
            ) : (
              activities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Recycle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {activity.bottles_count} botol
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.locations?.name || "Lokasi tidak diketahui"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-success">+{activity.points_earned}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {new Date(activity.created_at).toLocaleDateString("id-ID")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, Loading } from "@/components";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Gift, Tag, UtensilsCrossed, Smartphone, ShoppingBag, Wallet, Trophy, Award } from "lucide-react";
import { toast } from "sonner";

interface Voucher {
  id: string;
  type: string;
  title: string;
  description: string;
  points_required: number;
  is_active: boolean;
}

const Vouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetchUserPoints();
    fetchVouchers();
  }, []);

  const fetchUserPoints = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("points")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setUserPoints(data.points);
    } catch (error: any) {
      toast.error("Gagal memuat poin");
    }
  };

  const fetchVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("is_active", true)
        .order("points_required");

      if (error) throw error;
      setVouchers(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat voucher");
    } finally {
      setIsLoading(false);
    }
  };

  const redeemVoucher = async () => {
    if (!selectedVoucher) return;

    setIsRedeeming(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User tidak ditemukan");

      if (userPoints < selectedVoucher.points_required) {
        throw new Error("Poin tidak cukup");
      }

      const { error: redemptionError } = await supabase
        .from("voucher_redemptions")
        .insert({
          user_id: user.id,
          voucher_id: selectedVoucher.id,
        });

      if (redemptionError) throw redemptionError;

      const newPoints = userPoints - selectedVoucher.points_required;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ points: newPoints })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setUserPoints(newPoints);
      toast.success("Voucher berhasil ditukar!");
      setSelectedVoucher(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal menukar voucher");
    } finally {
      setIsRedeeming(false);
    }
  };

  const getVoucherIcon = (type: string) => {
    switch (type) {
      case "food":
        return UtensilsCrossed;
      case "credit":
        return Smartphone;
      case "shopping":
        return ShoppingBag;
      case "discount":
        return Tag;
      default:
        return Gift;
    }
  };

  const categories = [
    { id: "all", label: "Semua", icon: Gift },
    { id: "food", label: "Makanan", icon: UtensilsCrossed },
    { id: "credit", label: "Saldo", icon: Wallet },
    { id: "shopping", label: "Belanja", icon: ShoppingBag },
  ];

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === "all") return vouchers.length;
    return vouchers.filter(v => v.type === categoryId).length;
  };

  const getRedeemableCount = () => {
    return vouchers.filter(v => userPoints >= v.points_required).length;
  };

  const filteredVouchers = activeCategory === "all" 
    ? vouchers 
    : vouchers.filter(v => v.type === activeCategory);

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
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Tukar Poin</p>
              <p className="text-white text-xl font-bold">Voucher & Hadiah</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FLOATING POINT CARD ================= */}
      <div className="-mt-20 px-6">
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
                <p className="text-5xl font-black text-primary tracking-tight mb-3">
                  {userPoints}
                  <span className="text-xl font-medium ml-1">poin</span>
                </p>
                <p className={`text-sm font-semibold ${
                  getRedeemableCount() > 0 ? "text-muted-foreground" : "text-destructive"
                }`}>
                  Bisa tukar {getRedeemableCount()} voucher
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ================= KATEGORI ================= */}
      <div className="px-6 mt-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Kategori</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories
            .filter((category) => getCategoryCount(category.id) > 0)
            .map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              const count = getCategoryCount(category.id);
            
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? "bg-primary text-white shadow-lg scale-105"
                      : "bg-card text-muted-foreground border border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/20" : "bg-primary/10 text-primary"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* ================= VOUCHER LIST ================= */}
      <div className="px-6 mt-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {activeCategory === "all" ? "Semua Voucher" : categories.find(c => c.id === activeCategory)?.label}
          </h2>
          <Badge variant="secondary" className="font-semibold">
            {filteredVouchers.length} voucher
          </Badge>
        </div>

        <div className="space-y-3">
          {filteredVouchers.length === 0 ? (
            <div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl text-center border border-border/50 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Gift className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">Belum ada voucher</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Coba kategori lain</p>
            </div>
          ) : (
            filteredVouchers.map((voucher, index) => {
              const Icon = getVoucherIcon(voucher.type);
              const canRedeem = userPoints >= voucher.points_required;

              return (
                <div
                  key={voucher.id}
                  className={`bg-card/80 backdrop-blur-sm rounded-2xl shadow-sm border border-border/50 overflow-hidden cursor-pointer hover:shadow-lg transition-all ${
                    !canRedeem ? "opacity-60" : ""
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => canRedeem && setSelectedVoucher(voucher)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 flex items-center justify-center shrink-0">
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-base mb-1 line-clamp-1">
                          {voucher.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {voucher.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="bg-primary/10 px-3 py-1.5 rounded-lg">
                            <p className="font-black text-primary text-sm">
                              {voucher.points_required} pts
                            </p>
                          </div>
                          
                          {!canRedeem && (
                            <p className="text-xs text-destructive font-semibold">
                              Kurang {voucher.points_required - userPoints} poin
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= REDEEM DIALOG ================= */}
      <Dialog
        open={!!selectedVoucher}
        onOpenChange={() => setSelectedVoucher(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVoucher?.title}</DialogTitle>
            <DialogDescription>
              {selectedVoucher?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Poin Diperlukan:
                    </span>
                    <span className="font-semibold">
                      {selectedVoucher?.points_required}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Poin Anda:</span>
                    <span className="font-semibold">{userPoints}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Sisa Poin:</span>
                    <span className="font-bold text-primary">
                      {userPoints - (selectedVoucher?.points_required || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedVoucher(null)}
              disabled={isRedeeming}
            >
              Batal
            </Button>
            <Button onClick={redeemVoucher} disabled={isRedeeming}>
              {isRedeeming ? "Memproses..." : "Tukar Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= BOTTOM NAV ================= */}
      <BottomNav />
    </div>
  );
};

export default Vouchers;
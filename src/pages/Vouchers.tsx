import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Gift,
  Tag,
  UtensilsCrossed,
  Smartphone
} from "lucide-react";
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

  useEffect(() => {
    fetchUserPoints();
    fetchVouchers();
  }, []);

  const fetchUserPoints = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();
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
      case "discount":
        return Tag;
      case "food":
        return UtensilsCrossed;
      case "credit":
        return Smartphone;
      default:
        return Gift;
    }
  };

  const getVoucherColor = (type: string) => {
    switch (type) {
      case "discount":
        return "bg-accent/10 text-accent";
      case "food":
        return "bg-success/10 text-success";
      case "credit":
        return "bg-secondary/10 text-secondary";
      default:
        return "bg-primary/10 text-primary";
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
      {/* HEADER */}
      <div className="bg-primary p-6 rounded-b-3xl shadow-eco mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Tukar Voucher</h1>
        <p className="text-white/90">Poin Anda: {userPoints}</p>
      </div>

      {/* VOUCHER LIST */}
      <div className="px-6 space-y-4">
        {vouchers.map((voucher) => {
          const Icon = getVoucherIcon(voucher.type);
          const canRedeem = userPoints >= voucher.points_required;

          return (
            <Card
              key={voucher.id}
              className={`cursor-pointer hover:shadow-md transition-all ${!canRedeem ? "opacity-60" : ""}`}
              onClick={() => canRedeem && setSelectedVoucher(voucher)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className={`w-16 h-16 rounded-xl ${getVoucherColor(voucher.type)} flex items-center justify-center shrink-0`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{voucher.title}</h3>
                      <Badge variant={canRedeem ? "default" : "secondary"} className="ml-2">
                        {voucher.points_required} pts
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{voucher.description}</p>
                    {!canRedeem && (
                      <p className="text-xs text-destructive mt-2">
                        Butuh {voucher.points_required - userPoints} poin lagi
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* REDEEM DIALOG */}
      <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVoucher?.title}</DialogTitle>
            <DialogDescription>{selectedVoucher?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Poin Diperlukan:</span>
                    <span className="font-semibold">{selectedVoucher?.points_required}</span>
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
            <Button variant="outline" onClick={() => setSelectedVoucher(null)} disabled={isRedeeming}>
              Batal
            </Button>
            <Button onClick={redeemVoucher} disabled={isRedeeming}>
              {isRedeeming ? "Memproses..." : "Tukar Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BOTTOM NAV */}
      <BottomNav />
    </div>
  );
};

export default Vouchers;

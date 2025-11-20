import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
}

const Scan = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [scanResult, setScanResult] = useState<{ bottles: number; location: Location } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const simulateScan = async () => {
    setIsScanning(true);

    try {
      const { data: locations } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .limit(1)
        .single();

      setTimeout(() => {
        const bottles = Math.floor(Math.random() * 5) + 1;
        setScanResult({
          bottles,
          location: locations || { id: "", name: "Lokasi Demo" },
        });
        setIsScanning(false);
        setShowConfirmDialog(true);
      }, 2000);
    } catch (error) {
      toast.error("Gagal memindai QR code");
      setIsScanning(false);
    }
  };

  const confirmDisposal = async () => {
    if (!scanResult) return;

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User tidak ditemukan");

      const weightKg = scanResult.bottles * 0.025;
      const pointsEarned = scanResult.bottles * 10;

      const { error: activityError } = await supabase.from("activities").insert({
        user_id: user.id,
        location_id: scanResult.location.id,
        bottles_count: scanResult.bottles,
        weight_kg: weightKg,
        points_earned: pointsEarned,
      });

      if (activityError) throw activityError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("points, total_bottles, total_weight_kg")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            points: profile.points + pointsEarned,
            total_bottles: profile.total_bottles + scanResult.bottles,
            total_weight_kg: Number(profile.total_weight_kg) + weightKg,
          })
          .eq("user_id", user.id);
      }

      toast.success(`+${pointsEarned} poin! Terima kasih telah berkontribusi!`);
      setShowConfirmDialog(false);
      setScanResult(null);
      navigate("/home");
    } catch (error: any) {
      toast.error("Gagal menyimpan data pembuangan");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary p-6 rounded-b-3xl shadow-eco mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Scan QR Code</h1>
        <p className="text-white/90">Scan untuk membuang botol</p>
      </div>

      <div className="px-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              {isScanning ? (
                <>
                  <div className="w-32 h-32 border-4 border-primary rounded-xl animate-pulse mb-6" />
                  <p className="text-lg font-medium text-foreground mb-2">Memindai...</p>
                  <p className="text-sm text-muted-foreground text-center">
                    Arahkan kamera ke QR code pada tempat sampah
                  </p>
                </>
              ) : (
                <>
                  <div className="w-32 h-32 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                    <QrCode className="w-16 h-16 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-2">Siap untuk scan</p>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    Tekan tombol di bawah untuk memindai QR code
                  </p>
                  <Button onClick={simulateScan} size="lg" className="w-full max-w-xs">
                    Mulai Scan
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 bg-muted/50 rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-2">Cara Menggunakan:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Masukkan botol ke tempat sampah pintar EcoTrade</li>
            <li>Tekan tombol "Mulai Scan"</li>
            <li>Arahkan kamera ke QR code pada tempat sampah</li>
            <li>Sistem akan otomatis menghitung jumlah botol</li>
            <li>Konfirmasi dan dapatkan poin!</li>
          </ol>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-success" />
              Scan Berhasil!
            </DialogTitle>
            <DialogDescription>
              Konfirmasi pembuangan botol Anda
            </DialogDescription>
          </DialogHeader>
          
          {scanResult && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lokasi:</span>
                      <span className="font-medium">{scanResult.location.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jumlah Botol:</span>
                      <span className="font-medium">{scanResult.bottles} botol</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Berat:</span>
                      <span className="font-medium">{(scanResult.bottles * 0.025).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Poin Didapat:</span>
                      <span className="font-bold text-primary text-lg">+{scanResult.bottles * 10}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isProcessing}>
              Batal
            </Button>
            <Button onClick={confirmDisposal} disabled={isProcessing}>
              {isProcessing ? "Memproses..." : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Scan;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, CheckCircle2, Scan, MapPin, Package, Weight, Award, Leaf } from "lucide-react";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
}

const ScanPage = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 pb-28">
      {/* ================= HEADER WITH GRADIENT ================= */}
      <div className="relative bg-gradient-to-br from-primary via-[#17a865] to-[#1DBF73] px-6 pt-12 pb-28 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
              <Scan className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Scan & Buang</p>
              <p className="text-white text-xl font-bold">QR Code Scanner</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MAIN SCAN CARD ================= */}
      <div className="-mt-20 px-6">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[320px]">
            {isScanning ? (
              <>
                <div className="relative">
                  <div className="w-40 h-40 border-4 border-primary/30 rounded-3xl animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <QrCode className="w-20 h-20 text-primary animate-pulse" />
                  </div>
                  {/* Scanning line animation */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary animate-scan" />
                </div>
                <p className="text-xl font-bold text-foreground mb-2 mt-8">Memindai...</p>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Arahkan kamera ke QR code pada tempat sampah pintar
                </p>
              </>
            ) : (
              <>
                <div className="w-40 h-40 bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                  <QrCode className="w-20 h-20 text-primary" />
                </div>
                <p className="text-xl font-bold text-foreground mb-2">Siap untuk Scan</p>
                <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
                  Tekan tombol di bawah untuk memulai pemindaian QR code
                </p>
                <Button 
                  onClick={simulateScan} 
                  size="lg" 
                  className="w-full max-w-xs h-14 text-base font-semibold rounded-2xl shadow-lg"
                >
                  <Scan className="w-5 h-5 mr-2" />
                  Mulai Scan
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================= INSTRUCTION CARDS ================= */}
      <div className="px-6 mt-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Cara Menggunakan</h2>
        <div className="space-y-3">
          {[
            { step: 1, icon: Package, text: "Masukkan botol ke tempat sampah pintar EcoTrade" },
            { step: 2, icon: Scan, text: "Tekan tombol 'Mulai Scan' di atas" },
            { step: 3, icon: QrCode, text: "Arahkan kamera ke QR code pada tempat sampah" },
            { step: 4, icon: CheckCircle2, text: "Sistem akan otomatis menghitung jumlah botol" },
            { step: 5, icon: Award, text: "Konfirmasi dan dapatkan poin!" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-border/50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Langkah {item.step}
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-medium">{item.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= CONFIRM DIALOG ================= */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              Scan Berhasil!
            </DialogTitle>
            <DialogDescription>
              Konfirmasi pembuangan botol Anda untuk mendapatkan poin
            </DialogDescription>
          </DialogHeader>
          
          {scanResult && (
            <div className="space-y-3 my-4">
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-border/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Lokasi:</span>
                    </div>
                    <span className="font-semibold text-foreground">{scanResult.location.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Jumlah Botol:</span>
                    </div>
                    <span className="font-semibold text-foreground">{scanResult.bottles} botol</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Weight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Berat:</span>
                    </div>
                    <span className="font-semibold text-foreground">{(scanResult.bottles * 0.025).toFixed(2)} kg</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Poin Didapat:</span>
                    </div>
                    <div className="bg-primary/10 px-3 py-1.5 rounded-lg">
                      <span className="font-black text-primary text-lg">+{scanResult.bottles * 10}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Leaf className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                      Kontribusi Lingkungan
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-200">
                      Anda telah membantu mengurangi {(scanResult.bottles * 0.025).toFixed(2)} kg sampah plastik dari lingkungan. Terima kasih!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              onClick={confirmDisposal} 
              disabled={isProcessing}
              className="flex-1 h-12 rounded-xl font-semibold"
            >
              {isProcessing ? "Memproses..." : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default ScanPage;
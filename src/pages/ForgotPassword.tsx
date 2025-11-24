import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0); // Waktu tunggu dalam detik
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const storedCooldownEnd = localStorage.getItem("resetPasswordCooldownEnd");
    if (storedCooldownEnd) {
      const remainingTime = Math.max(0, Math.ceil((parseInt(storedCooldownEnd) - Date.now()) / 1000));
      setCooldownTime(remainingTime);
      if (remainingTime > 0) {
        startCooldown(remainingTime);
      }
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  const startCooldown = (duration: number) => {
    setCooldownTime(duration);
    localStorage.setItem("resetPasswordCooldownEnd", (Date.now() + duration * 1000).toString());

    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }

    cooldownIntervalRef.current = setInterval(() => {
      setCooldownTime((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(cooldownIntervalRef.current!); // Clear the interval
          localStorage.removeItem("resetPasswordCooldownEnd");
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Langsung lanjutkan dengan reset password
      // Supabase secara default mencegah enumerasi pengguna, jadi pesan sukses akan ditampilkan
      // bahkan jika email tidak terdaftar, tetapi email tidak akan dikirim.
      // Untuk memberikan feedback spesifik "email belum terdaftar", kita perlu memeriksa error message dari resetPasswordForEmail.
      // Namun, perlu diingat bahwa ini dapat memiliki implikasi keamanan (user enumeration).
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes("User not found") || error.message.includes("Email not confirmed")) {
          toast.error("Email belum terdaftar atau belum dikonfirmasi. Silakan periksa kembali email Anda.");
        } else {
          throw error;
        }
      }

      toast.success("Link reset password telah dikirim ke email Anda! Cek inbox atau folder spam Anda.");
      startCooldown(60); // Cooldown 60 detik
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim email reset");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-white dark:bg-[#112C22]">
      {/* Back button - top left */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-6 left-6 z-20 text-gray-800 hover:text-gray-900 dark:text-white/80 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        onClick={() => navigate("/auth")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-0 backdrop-blur-sm bg-card/95 relative z-10">
        <CardHeader className="space-y-6 pb-6">
          
          {/* Icon container */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Lupa Password?
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Tenang! Masukkan email Anda dan kami akan mengirimkan link untuk reset password
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8">
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Alamat Email
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 transition-colors"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all" 
              disabled={isLoading || cooldownTime > 0}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengirim...
                </span>
              ) : cooldownTime > 0 ? (
                `Kirim Ulang dalam ${cooldownTime}s`
              ) : (
                "Kirim Link Reset"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Link reset akan dikirim ke email Anda dan berlaku selama 1 jam
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
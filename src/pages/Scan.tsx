import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, CheckCircle2, Scan, MapPin, Package, Weight, Award, Leaf, AlertCircle, Camera, CameraOff, X } from "lucide-react";
import { toast } from "sonner";
import jsQR from 'jsqr';
import ErrorBoundary from "@/components/Common/ErrorBoundary";
import ScanErrorBoundary from "@/components/Common/ScanErrorBoundary";
import { quickRetry } from "@/lib/api-retry";

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
}

interface QRData {
  locationId: string;
  locationName: string;
  timestamp: string;
}

// QR Code scanner configuration
const QR_CONFIG = {
  // QR code pattern matching
  QR_PATTERN: /^ecotrade:location:([a-f0-9-]{36}):(.+):(\d+)$/,
  
  // Parse QR data
  parseQRData: (qrText: string): QRData | null => {
        
    // Try to parse as JSON first
    try {
      const jsonData = JSON.parse(qrText);
            
      // Check if it has required fields
      if (jsonData.locationId && jsonData.locationName && jsonData.timestamp) {
        const qrData = {
          locationId: jsonData.locationId,
          locationName: jsonData.locationName,
          timestamp: jsonData.timestamp
        };
        
                return qrData;
      } else {
                return null;
      }
    } catch (jsonError) {
          }
    
    // Try string format
    const match = qrText.match(QR_CONFIG.QR_PATTERN);
    if (match) {
      const qrData = {
        locationId: match[1],
        locationName: match[2],
        timestamp: new Date(parseInt(match[3]) * 1000).toISOString()
      };
      
            return qrData;
    }
    
                    return null;
  }
};

const ScanPage = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [scanResult, setScanResult] = useState<{ bottles: number; location: Location } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scannerStartedRef = useRef(false); // Add flag to prevent multiple instances
  const confirmDisposalRef = useRef(false); // Add flag to prevent double execution

  useEffect(() => {
    checkAuth();
  }, []);

  const stopCamera = () => {
    setIsScanning(false);
    
    scannerStartedRef.current = false;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    setHasPermission(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start QR scanning when states are ready
  useEffect(() => {
    if (isScanning && cameraActive && videoRef.current && canvasRef.current && !scannerStartedRef.current) {
      scannerStartedRef.current = true;
      startRealQRScanning();
    }
    
    if (!isScanning || !cameraActive) {
      scannerStartedRef.current = false;
    }
  }, [isScanning, cameraActive]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const checkCameraPermission = async (): Promise<boolean> => {
  try {
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      setErrorMessage("Akses kamera memerlukan koneksi HTTPS yang aman. Pastikan Anda mengakses aplikasi melalui URL HTTPS yang resmi.");
      setShowErrorDialog(true);
      return false;
    }
                    
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        
    if (result.state === 'denied') {
      setErrorMessage("Izin kamera ditolak. Silakan berikan izin kamera di pengaturan browser Anda.");
      setShowErrorDialog(true);
      setHasPermission(false);
      return false;
    }
    
    setHasPermission(result.state === 'granted');
    return true; 
  } catch (error) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (fallbackError) {
      setErrorMessage("Aplikasi membutuhkan izin kamera untuk memandai QR Code. Silakan berikan izin kamera di pengaturan browser dan pastikan menggunakan koneksi HTTPS.");
      setShowErrorDialog(true);
      return false;
    }
  }
};

const startCamera = async () => {
  try {
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      return; 
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    setCameraActive(true);
    
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            
            setCameraActive(true);
            setIsScanning(true);
            
          }).catch((error) => {
            setErrorMessage("Gagal memutar video kamera. Silakan coba lagi.");
            setShowErrorDialog(true);
            stopCamera();
          });
        };

        videoRef.current.onerror = (error) => {
          setErrorMessage("Terjadi kesalahan pada video kamera. Silakan coba lagi.");
          setShowErrorDialog(true);
          stopCamera();
        };
      } else {
        setErrorMessage("Gagal menginisialisasi video kamera. Silakan refresh halaman dan coba lagi.");
        setShowErrorDialog(true);
      }
    }, 1000); // Add timeout to ensure DOM update
  } catch (error: any) {
    toast.error('Gagal mengakses kamera. Silakan coba lagi.');
    setShowErrorDialog(true);
  }
};

const validateQRCode = async (qrData: QRData): Promise<Location | null> => {
  try {
    // Query location and its QR codes with retry
    const result = await quickRetry.fetchOne(
      async () => {
        const { data, error } = await supabase
          .from("locations")
          .select(`
            *,
            location_qr_codes (
              qr_code_url,
              qr_data
            )
          `)
          .eq("id", qrData.locationId)
          .eq("is_active", true)
          .single();
        return { data, error };
      },
      "location validation"
    );

    if (result.error) {
      toast.error('Database query failed');
      return null;
    }

    if (!result.data) {
      toast.error('Location not found or inactive');
      return null;
    }

    const data = result.data as any; // Type assertion for now

    // Check if QR codes exist and match
    let qrCodeRecord = null;
    
    if (Array.isArray(data.location_qr_codes)) {
      // Array format (multiple QR codes)
      if (data.location_qr_codes.length > 0) {
        qrCodeRecord = data.location_qr_codes[0];
      }
    } else if (data.location_qr_codes && typeof data.location_qr_codes === 'object') {
      // Object format (single QR code)
      qrCodeRecord = data.location_qr_codes;
    }
    
    if (qrCodeRecord) {
      // Check different possible structures
      let storedQRData = null;
      
      if (qrCodeRecord.qr_data) {
        storedQRData = qrCodeRecord.qr_data;
      } else if (typeof qrCodeRecord === 'object' && qrCodeRecord !== null) {
        // Maybe the QR data is directly in the record
        if (qrCodeRecord.locationId && qrCodeRecord.locationName) {
          storedQRData = qrCodeRecord;
        }
      }
      
      if (storedQRData) {
        // Compare locationId (most important)
        if (storedQRData.locationId === qrData.locationId) {
          return {
            id: data.id,
            name: data.name,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            is_active: data.is_active
          };
        }
      }
    }

    toast.error('Invalid QR code for this location');
    return null;
  } catch (error) {
    toast.error('QR validation failed');
    return null;
  }
};

const getValidLocationForDemo = async (): Promise<QRData | null> => {
  try {
    // Get first active location with QR code from database
    const { data, error } = await (supabase as any)
      .from("locations")
      .select(`
        id,
        name,
        location_qr_codes (
          qr_data
        )
      `)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    // Return QR data for demo
    return {
      locationId: data.id,
      locationName: data.name,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return null;
  }
};

const startRealQRScanning = async () => {
  if (!videoRef.current || !canvasRef.current) {
    return;
  }

  try {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return;
    }

    // Set canvas size to match video
    const scanFrame = () => {
      // Check if should continue scanning (useEffect already validated initial state)
      if (!isScanning || !cameraActive || !videoRef.current || !canvasRef.current) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        // Video not ready, try next frame
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data from canvas
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Use jsQR to detect QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
                                
        // Check if it's an EcoTrade QR code (JSON or string format)
        const isEcoTradeQR = code.data.startsWith('ecotrade:location:') || 
                            code.data.includes('"locationId"') || 
                            code.data.includes('locationId');
        
                
        if (isEcoTradeQR) {
          handleQRDetection(code.data);
        } else {
                                                  
          // Show error dialog for non-EcoTrade QR codes
          setErrorMessage("QR Code yang Anda pindai bukan QR Code resmi EcoTrade. Pastikan Anda memindai QR Code dari lokasi penimbunan resmi EcoTrade.");
          setShowErrorDialog(true);
          
          // Stop scanning after non-EcoTrade QR detection
          setIsScanning(false);
          stopCamera();
        }
        return; // Stop processing this frame
      }

      // Continue scanning
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    // Start scanning frames immediately (useEffect already validated states)
    scanFrame();
    
  } catch (error) {
    setErrorMessage("Gagal memulai QR scanner. Silakan coba lagi.");
    setShowErrorDialog(true);
    stopCamera();
  }
};

const startFallbackQRScanning = async () => {
  // Show fallback indicator
  toast.info("Mode Development: Simulasi QR scanning", {
    description: "QR scanner akan menggunakan simulasi untuk development"
  });
  
  // Fallback: Simulate QR detection for development
  const simulateQRDetection = async () => {
    if (!isScanning || !cameraActive) return;
    
    // Simulate finding QR after 2-4 seconds
    const delay = Math.random() * 2000 + 2000;
    
    setTimeout(async () => {
      if (!isScanning || !cameraActive) return;
      
      // Use a valid EcoTrade QR format
      const mockQRText = 'ecotrade:location:123e4567-e89b-12d3-a456-426614174000:Bank Sampah Cempaka:1701234567';
      
      await handleQRDetection(mockQRText);
    }, delay);
  };
  
  // Start simulation
  simulateQRDetection();
};

const handleQRDetection = async (qrText: string) => {
  // Parse QR data
  const qrData = QR_CONFIG.parseQRData(qrText);
  
  if (!qrData) {
    setErrorMessage("Format QR Code tidak valid. Pastikan Anda memandai QR Code resmi EcoTrade.");
    setShowErrorDialog(true);
    stopCamera();
    return;
  }
  
  // Validate QR code against database
  const validLocation = await validateQRCode(qrData);

  if (!validLocation) {
    setErrorMessage("QR Code tidak valid atau tidak terdaftar di sistem. Pastikan Anda memandai QR Code dari lokasi resmi EcoTrade.");
    setShowErrorDialog(true);
    stopCamera();
    return;
  }

  // Generate random bottle count
  const bottles = Math.floor(Math.random() * 5) + 1;
  
  setScanResult({
    bottles,
    location: validLocation,
  });
  
  // Stop scanning before showing result
  setIsScanning(false);
  stopCamera();
  setShowConfirmDialog(true);
};

const startQRScanning = async () => {
  await startRealQRScanning();
};

const simulateQRScan = async () => {
  // This function is now replaced by startQRScanning
  // Keeping for backward compatibility
  await startQRScanning();
};

  const confirmDisposal = async () => {
    if (!scanResult || isProcessing || confirmDisposalRef.current) {
      return;
    }

    confirmDisposalRef.current = true;
    setIsProcessing(true);

    try {
      // Add delay to prevent double-clicks
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User tidak ditemukan");
      }

      const weightKg = scanResult.bottles * 0.025;
      const pointsEarned = scanResult.bottles * 10;

      // Insert activity with retry
      const activityResult = await quickRetry.insert(
        async () => {
          const { data, error } = await supabase.from("activities").insert({
            user_id: user.id,
            location_id: scanResult.location.id,
            bottles_count: scanResult.bottles,
            weight_kg: weightKg,
            points_earned: pointsEarned,
          }).select().single();
          return { data, error };
        },
        "scan activity"
      );

      if (activityResult.error) {
        throw activityResult.error;
      }

      // Small delay to ensure activity is committed to database
      await new Promise(resolve => setTimeout(resolve, 100));

      // Fetch all user activities with retry
      const activitiesResult = await quickRetry.fetchOne(
        async () => {
          const { data, error } = await supabase
            .from("activities")
            .select("bottles_count, points_earned, weight_kg")
            .eq("user_id", user.id);
          return { data, error };
        },
        "user activities"
      );
      
      if (activitiesResult.error) {
        throw activitiesResult.error;
      }

      const activities = activitiesResult.data as any[];

      const totalBottles = activities.reduce((sum, activity) => sum + activity.bottles_count, 0);
      const totalPoints = activities.reduce((sum, activity) => sum + activity.points_earned, 0);
      const totalWeight = activities.reduce((sum, activity) => sum + activity.weight_kg, 0);
      
      // Update profile with calculated totals
      const updateResult = await quickRetry.update(
        async () => {
          const { data, error } = await supabase
            .from("profiles")
            .update({
              points: totalPoints,
              total_bottles: totalBottles,
              total_weight_kg: totalWeight,
            })
            .eq("user_id", user.id)
            .select()
            .single();
          return { data, error };
        },
        "profile totals"
      );
      
      if (updateResult.error) {
        toast.error('Activity saved but profile update failed');
        throw updateResult.error;
      }
      
      toast.success(`+${pointsEarned} poin! Terima kasih telah berkontribusi!`);
      setShowConfirmDialog(false);
      setScanResult(null);
      navigate("/home");
      
  } catch (error: any) {
    toast.error('Gagal menyimpan data: ' + (error.message || 'Unknown error'));
  } finally {
      setIsProcessing(false);
      confirmDisposalRef.current = false;
    }
  };

  return (
    <ScanErrorBoundary>
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
            {cameraActive ? (
              <>
                <div className="relative w-full max-w-sm">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover rounded-2xl bg-black shadow-lg"
                  />
                  {/* Hidden canvas for QR processing */}
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                    width="640"
                    height="480"
                  />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-primary/50 rounded-xl">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl animate-pulse"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl animate-pulse"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl animate-pulse"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl animate-pulse"></div>
                    </div>
                    {/* Scanning line animation */}
                    <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan"></div>
                  </div>
                  {/* Camera indicator */}
                  <div className="absolute top-2 right-2 bg-red-500 w-3 h-3 rounded-full animate-pulse"></div>
                </div>
                
                <div className="text-center mt-6">
                  <p className="text-xl font-bold text-foreground mb-2">Memindai QR Code...</p>
                  <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
                    Arahkan kamera ke QR Code pada lokasi pengumpulan EcoTrade
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span>Mencari QR Code...</span>
                  </div>
                </div>
                
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <CameraOff className="w-4 h-4 mr-2" />
                  Batalkan
                </Button>
              </>
            ) : (
              <>
                <div className="w-40 h-40 bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
                  <Camera className="w-20 h-20 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground mb-2">Siap untuk Scan</p>
                  <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
                    Tekan tombol di bawah untuk memulai pemindaian QR Code dengan kamera
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
                    <Camera className="w-3 h-3" />
                    <span>Kamera diperlukan untuk memindai QR Code</span>
                  </div>
                </div>
                <Button 
                  onClick={startCamera} 
                  size="lg" 
                  className="w-full max-w-xs h-14 text-base font-semibold rounded-2xl shadow-lg"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Buka Kamera
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
              onClick={() => {
                confirmDisposal().then(() => {
                  toast.success("Proses berhasil!");
                }).catch((error) => {
                  toast.error("Proses gagal: " + error.message);
                });
              }} 
              disabled={isProcessing}
              className="flex-1 h-12 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-white"
            >
              {isProcessing ? "Memproses..." : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= ERROR DIALOG ================= */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              QR Code Tidak Valid
            </DialogTitle>
            <DialogDescription>
              QR Code yang dipindai tidak terdaftar dalam sistem EcoTrade
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    QR Code Tidak Dikenali
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-200">
                    {errorMessage || "Pastikan Anda memindai QR Code dari lokasi pengumpulan resmi EcoTrade yang terdaftar di sistem."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Cara Mengatasi
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-200 space-y-1">
                    <li>• Pastikan QR Code dari lokasi EcoTrade resmi</li>
                    <li>• Cek kondisi QR Code (tidak rusak atau tertutup)</li>
                    <li>• Hubungi admin jika QR Code tidak berfungsi</li>
                    <li>• Pastikan lokasi dalam status aktif</li>
                    <li>• Berikan izin kamera untuk menggunakan fitur scan</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={() => {
                setShowErrorDialog(false);
                setErrorMessage("");
              }}
              className="flex-1 h-12 rounded-xl font-semibold"
            >
              Coba Lagi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
      
      <style>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(240px);
          }
          100% {
            transform: translateY(0);
          }
        }
        
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }

        /* QR Scanner styles */
        .qr-scanner--container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .qr-scanner--scan-region {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 250px;
          height: 250px;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
        }

        .qr-scanner--outline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 2px solid #10b981;
          border-radius: 12px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
    </ScanErrorBoundary>
  );
};

export default ScanPage;

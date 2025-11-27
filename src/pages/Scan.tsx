import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, CheckCircle2, Scan, MapPin, Package, Weight, Award, Leaf, AlertCircle, Camera, CameraOff, X } from "lucide-react";
import { toast } from "sonner";
import jsQR from 'jsqr';

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
    console.log('Stopping camera and scanning...');
    
    // Stop scanning first
    setIsScanning(false);
    
    // Reset scanner flag
    scannerStartedRef.current = false;
    
    // Stop animation frame
    if (animationFrameRef.current) {
      console.log('🛑 Stopping animation frame...');
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Reset camera state
    setCameraActive(false);
    
    console.log('Camera and scanning stopped');
  };

  useEffect(() => {
    // Cleanup camera when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  // Start QR scanning when states are ready
  useEffect(() => {
    if (isScanning && cameraActive && videoRef.current && canvasRef.current && !scannerStartedRef.current) {
      console.log('🚀 useEffect triggered - Starting QR scanning...');
      console.log('📊 useEffect states:', {
        isScanning,
        cameraActive,
        hasVideo: !!videoRef.current,
        hasCanvas: !!canvasRef.current,
        scannerAlreadyStarted: scannerStartedRef.current
      });
      
      // Set flag to prevent multiple instances
      scannerStartedRef.current = true;
      startRealQRScanning();
    }
    
    // Reset flag when scanning stops
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
    // Check if running in secure context (HTTPS in production)
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      console.warn('Camera access requires HTTPS in production');
      setErrorMessage("Akses kamera memerlukan koneksi HTTPS yang aman. Pastikan Anda mengakses aplikasi melalui URL HTTPS yang resmi.");
      setShowErrorDialog(true);
      return false;
    }
    
    console.log('🔒 Secure context check passed');
                    
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    console.log('📸 Camera permission state:', result.state);
        
    // Allow 'prompt' state - user can still grant permission
    if (result.state === 'denied') {
      setErrorMessage("Izin kamera ditolak. Silakan berikan izin kamera di pengaturan browser Anda.");
      setShowErrorDialog(true);
      setHasPermission(false);
      return false;
    }
    
    // For 'granted' or 'prompt' state, try to access camera
    setHasPermission(result.state === 'granted');
    return true; // Allow camera access attempt
  } catch (error) {
    // Fallback: try to access camera directly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ Camera access granted via fallback');
      setHasPermission(true);
      return true;
    } catch (fallbackError) {
      console.error('Camera access denied:', fallbackError);
      setErrorMessage("Aplikasi membutuhkan izin kamera untuk memandai QR Code. Silakan berikan izin kamera di pengaturan browser dan pastikan menggunakan koneksi HTTPS.");
      setShowErrorDialog(true);
      return false;
    }
  }
};

const startCamera = async () => {
  try {
    console.log('🚀 Starting camera...');
    console.log('🌍 Environment:', {
      isProduction: import.meta.env.PROD,
      isDev: import.meta.env.DEV,
      protocol: location.protocol,
      hostname: location.hostname,
      isSecure: window.isSecureContext
    });
    
    // Check camera permission first
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      return; // Error dialog already shown in checkCameraPermission
    }

    // Start camera stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    console.log('Camera stream obtained:', stream);
    
    // Set camera active state first to ensure video ref is available
    setCameraActive(true);
    
    // Wait a bit for React to update the DOM
    setTimeout(() => {
      if (videoRef.current) {
        console.log('Video ref is now available');
        
        // Set stream to video element
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          videoRef.current?.play().then(() => {
            console.log('Video playing successfully');
            
            // Set states first - useEffect will handle starting QR scanner
            setCameraActive(true);
            setIsScanning(true);
            
          }).catch((error) => {
            console.error('Error playing video:', error);
            setErrorMessage("Gagal memutar video kamera. Silakan coba lagi.");
            setShowErrorDialog(true);
            stopCamera();
          });
        };

        videoRef.current.onerror = (error) => {
          console.error('Video error:', error);
          setErrorMessage("Terjadi kesalahan pada video kamera. Silakan coba lagi.");
          setShowErrorDialog(true);
          stopCamera();
        };
      } else {
        console.error('Video ref is still null after timeout');
        setErrorMessage("Gagal menginisialisasi video kamera. Silakan refresh halaman dan coba lagi.");
        setShowErrorDialog(true);
      }
    }, 1000); // Add timeout to ensure DOM update
  } catch (error: any) {
    console.error('Error starting camera:', error);
    setErrorMessage("Gagal mengakses kamera. Silakan coba lagi.");
    setShowErrorDialog(true);
  }
};

const validateQRCode = async (qrData: QRData): Promise<Location | null> => {
  console.log('�️ Starting database validation...');
  console.log('🔍 Query parameters:');
  console.log('  - Location ID:', qrData.locationId);
  console.log('  - Location Name:', qrData.locationName);
  
  try {
    // Query location and its QR codes
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

    console.log('📊 Database query result:');
    console.log('  - Error:', error);
    console.log('  - Data:', data);

    if (error) {
      console.error('❌ Database query error:', error);
      return null;
    }

    if (!data) {
      console.log('❌ No location found with ID:', qrData.locationId);
      console.log('🔍 Check if:');
      console.log('  - Location exists in database');
      console.log('  - Location is active (is_active = true)');
      return null;
    }

    console.log('✅ Location found:', data.name);
    console.log('� Location details:');
    console.log('  - ID:', data.id);
    console.log('  - Name:', data.name);
    console.log('  - Address:', data.address);
    console.log('  - Is Active:', data.is_active);
    console.log('  - QR Codes:', data.location_qr_codes);

    // Check if QR codes exist and match
    console.log('🔍 Checking QR codes for location...');
    console.log('📋 Raw location_qr_codes data:', data.location_qr_codes);
    
    // Handle both object and array formats
    let qrCodeRecord = null;
    
    if (Array.isArray(data.location_qr_codes)) {
      // Array format (multiple QR codes)
      if (data.location_qr_codes.length > 0) {
        qrCodeRecord = data.location_qr_codes[0];
        console.log('✅ QR codes found as array, using first record');
      }
    } else if (data.location_qr_codes && typeof data.location_qr_codes === 'object') {
      // Object format (single QR code)
      qrCodeRecord = data.location_qr_codes;
      console.log('✅ QR codes found as single object');
    }
    
    if (qrCodeRecord) {
      console.log('📝 QR code record:', qrCodeRecord);
      
      // Check different possible structures
      let storedQRData = null;
      
      if (qrCodeRecord.qr_data) {
        storedQRData = qrCodeRecord.qr_data;
        console.log('📝 Found qr_data field:', storedQRData);
      } else if (typeof qrCodeRecord === 'object' && qrCodeRecord !== null) {
        // Maybe the QR data is directly in the record
        if (qrCodeRecord.locationId && qrCodeRecord.locationName) {
          storedQRData = qrCodeRecord;
          console.log('📝 QR data is directly in record:', storedQRData);
        }
      }
      
      if (storedQRData) {
        console.log('📝 Stored QR data:', storedQRData);
        console.log('📝 Scanned QR data:', qrData);
        
        // Compare locationId (most important)
        if (storedQRData.locationId === qrData.locationId) {
          console.log('✅ QR data matches database record');
          return {
            id: data.id,
            name: data.name,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            is_active: data.is_active
          };
        } else {
          console.log('❌ QR data mismatch');
          console.log('  - Expected locationId:', storedQRData.locationId);
          console.log('  - Scanned locationId:', qrData.locationId);
        }
      } else {
        console.log('❌ Could not extract QR data from record');
      }
    } else {
      console.log('❌ No QR codes found for this location');
      console.log('🔍 location_qr_codes value:', data.location_qr_codes);
      console.log('🔍 Type of location_qr_codes:', typeof data.location_qr_codes);
      console.log('🔍 Is array?:', Array.isArray(data.location_qr_codes));
      console.log('🔍 Length:', data.location_qr_codes?.length);
    }

    return null;
  } catch (error) {
    console.error('💥 Error in validateQRCode:', error);
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
      console.log('No valid location found for demo');
      return null;
    }

    // Return QR data for demo
    return {
      locationId: data.id,
      locationName: data.name,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting valid location:', error);
    return null;
  }
};

const startRealQRScanning = async () => {
  if (!videoRef.current || !canvasRef.current) {
    console.log('❌ Video or canvas ref not available');
    return;
  }

  try {
    console.log('🚀 Starting real QR scanning with JavaScript...');
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      console.log('❌ Could not get canvas context');
      return;
    }

    // Set canvas size to match video
    const scanFrame = () => {
      console.log('🔄 Scanning frame - States:', {
        isScanning,
        cameraActive,
        videoReady: videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA,
        hasVideo: !!videoRef.current,
        hasCanvas: !!canvasRef.current
      });
      
      // Check if should continue scanning (useEffect already validated initial state)
      if (!isScanning || !cameraActive || !videoRef.current || !canvasRef.current) {
        console.log('🛑 Stopping scan frame - Conditions not met');
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
        console.log('📹 Video not ready, continuing to next frame...');
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
    console.log('✅ JavaScript QR scanner started successfully');
    scanFrame();
    
  } catch (error) {
    console.error('💥 Error starting JavaScript QR scanner:', error);
    setErrorMessage("Gagal memulai QR scanner. Silakan coba lagi.");
    setShowErrorDialog(true);
    stopCamera();
  }
};

const startFallbackQRScanning = async () => {
  console.log('🔄 Using fallback QR detection (development mode)');
  
  // Show fallback indicator
  toast.info("Mode Development: Simulasi QR scanning", {
    description: "QR scanner akan menggunakan simulasi untuk development"
  });
  
  // Fallback: Simulate QR detection for development
  const simulateQRDetection = async () => {
    if (!isScanning || !cameraActive) return;
    
    // Simulate finding QR after 2-4 seconds
    const delay = Math.random() * 2000 + 2000;
    console.log(`⏱️ Simulating QR detection in ${delay.toFixed(0)}ms...`);
    
    setTimeout(async () => {
      if (!isScanning || !cameraActive) return;
      
      // Use a valid EcoTrade QR format
      const mockQRText = 'ecotrade:location:123e4567-e89b-12d3-a456-426614174000:Bank Sampah Cempaka:1701234567';
      console.log('✅ QR Code detected (fallback):', mockQRText);
      
      await handleQRDetection(mockQRText);
    }, delay);
  };
  
  // Start simulation
  simulateQRDetection();
};

const handleQRDetection = async (qrText: string) => {
  console.log('🎯 QR code detected:', qrText);
  
  // Parse QR data
  const qrData = QR_CONFIG.parseQRData(qrText);
  
  if (!qrData) {
    console.log('❌ QR data parsing failed');
    setErrorMessage("Format QR Code tidak valid. Pastikan Anda memindai QR Code resmi EcoTrade.");
    setShowErrorDialog(true);
    stopCamera();
    return;
  }
  
  console.log('🔍 Validating QR data against database...');
  console.log('📍 QR Location ID:', qrData.locationId);
  console.log('📍 QR Location Name:', qrData.locationName);
  console.log('📍 QR Timestamp:', qrData.timestamp);
  
  // Validate QR code against database
  const validLocation = await validateQRCode(qrData);

  if (!validLocation) {
    console.log('❌ QR validation failed - location not found or inactive');
    console.log('🔍 Possible reasons:');
    console.log('  - Location ID not found in database');
    console.log('  - Location is inactive (is_active = false)');
    console.log('  - QR data mismatch with stored data');
    console.log('  - Database connection error');
    setErrorMessage("QR Code tidak valid atau tidak terdaftar di sistem. Pastikan Anda memindai QR Code dari lokasi resmi EcoTrade.");
    setShowErrorDialog(true);
    stopCamera();
    return;
  }

  console.log('✅ QR validation successful!');
  console.log('📍 Valid location:', validLocation);

  // Generate random bottle count
  const bottles = Math.floor(Math.random() * 5) + 1;
  console.log('🍼 Generated bottle count:', bottles);
  
  setScanResult({
    bottles,
    location: validLocation,
  });
  
  // Stop scanning before showing result
  console.log('🛑 Stopping scanning before showing result...');
  setIsScanning(false);
  stopCamera();
  setShowConfirmDialog(true);
};

const startQRScanning = async () => {
  console.log('� startQRScanning called - using real QR detection');
  await startRealQRScanning();
};

const simulateQRScan = async () => {
  // This function is now replaced by startQRScanning
  // Keeping for backward compatibility
  await startQRScanning();
};

  const confirmDisposal = async () => {
    console.log('🚀 confirmDisposal function STARTED!');
    console.log('  - isProcessing:', isProcessing);
    console.log('  - confirmDisposalRef.current:', confirmDisposalRef.current);
    console.log('  - scanResult exists:', !!scanResult);
    console.log('  - scanResult data:', scanResult);
    console.log('  - Timestamp:', new Date().toISOString());
    console.log('  - Execution ID:', Math.random().toString(36).substr(2, 9));
    
    if (!scanResult || isProcessing || confirmDisposalRef.current) {
      console.log('🚫 confirmDisposal BLOCKED - Early return');
      console.log('  - Block reasons:');
      console.log('    - scanResult missing:', !scanResult);
      console.log('    - isProcessing:', isProcessing);
      console.log('    - confirmDisposalRef.current:', confirmDisposalRef.current);
      return;
    }

    console.log('✅ confirmDisposal PASSED initial checks');
    console.log('🚀 Starting confirmDisposal - isProcessing:', isProcessing);
    confirmDisposalRef.current = true;
    setIsProcessing(true);

    try {
      console.log('⏱️ Adding 300ms delay to prevent double-clicks...');
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('⏱️ Delay completed, continuing...');
      
      console.log('🔐 Getting user authentication...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ User not found - throwing error');
        throw new Error("User tidak ditemukan");
      }
      console.log('✅ User authenticated:', user.id);

      const weightKg = scanResult.bottles * 0.025;
      const pointsEarned = scanResult.bottles * 10;
      
      console.log('📊 Calculated values:');
      console.log('  - Weight (kg):', weightKg);
      console.log('  - Points Earned:', pointsEarned);
      console.log('  - Bottle count:', scanResult.bottles);

      console.log('🚀 === SCAN TO DATABASE FLOW START ===');
      console.log('📊 SCAN DATA TO INSERT:');
      console.log('  - User ID:', user.id);
      console.log('  - Location ID:', scanResult.location.id);
      console.log('  - Location Name:', scanResult.location.name);
      console.log('  - Bottles Count:', scanResult.bottles);
      console.log('  - Weight Kg:', weightKg);
      console.log('  - Points Earned:', pointsEarned);
      console.log('  - Timestamp:', new Date().toISOString());
      console.log('  - Execution ID:', Math.random().toString(36).substr(2, 9));

      console.log('📤 INSERTING INTO ACTIVITIES TABLE...');
      const { data: activityData, error: activityError } = await supabase.from("activities").insert({
        user_id: user.id,
        location_id: scanResult.location.id,
        bottles_count: scanResult.bottles,
        weight_kg: weightKg,
        points_earned: pointsEarned,
      }).select().single();

      if (activityError) {
        console.error('❌ ACTIVITY INSERT FAILED:', activityError);
        throw activityError;
      }

      console.log('✅ ACTIVITY INSERT SUCCESSFUL!');
      console.log('📋 INSERTED ACTIVITY DATA:', activityData);
      console.log('  - Activity ID:', activityData.id);
      console.log('  - Created At:', activityData.created_at);
      console.log('  - All Fields:', JSON.stringify(activityData, null, 2));

      // Small delay to ensure activity is committed to database
      await new Promise(resolve => setTimeout(resolve, 100));

      // Calculate profile based on activities to avoid race conditions
      console.log('📈 Calculating profile based on activities...');
      
      // Check current profile BEFORE fetching activities
      const { data: profileBefore, error: profileBeforeError } = await supabase
        .from("profiles")
        .select("points, total_bottles, total_weight_kg")
        .eq("user_id", user.id)
        .single();
      
      if (profileBeforeError) {
        console.error('❌ Error fetching profile before:', profileBeforeError);
      } else {
        console.log('🔍 === DOUBLE INCREMENT DETECTION START ===');
        console.log('📊 SCENARIO: 1 botol = 10 poin (expected)');
        console.log('📋 PROFILE SEBELUM SCAN:');
        console.log('  - Points Sebelum:', profileBefore.points);
        console.log('  - Bottles Sebelum:', profileBefore.total_bottles);
        console.log('  - Weight Sebelum:', profileBefore.total_weight_kg);
        console.log('');
        
        console.log('📈 YANG DIHARAPKAN DARI SCAN INI:');
        console.log('  - Bottles: +', scanResult.bottles);
        console.log('  - Points: +', pointsEarned, '(harusnya 10 poin per botol)');
        console.log('  - Weight: +', weightKg, 'kg');
        console.log('');
        
        console.log('🎯 EXPECTED TOTAL SETELAH SCAN:');
        console.log('  - Expected Points:', (profileBefore.points || 0) + pointsEarned);
        console.log('  - Expected Bottles:', (profileBefore.total_bottles || 0) + scanResult.bottles);
        console.log('  - Expected Weight:', (profileBefore.total_weight_kg || 0) + weightKg);
        console.log('');
        
        // Calculate what the profile should be BEFORE any triggers
        const expectedBeforeTrigger = {
          points: (profileBefore.points || 0),
          bottles: (profileBefore.total_bottles || 0),
          weight: (profileBefore.total_weight_kg || 0)
        };
        
        // Calculate what the profile should be AFTER this scan (without triggers)
        const expectedAfterScan = {
          points: expectedBeforeTrigger.points + pointsEarned,
          bottles: expectedBeforeTrigger.bottles + scanResult.bottles,
          weight: expectedBeforeTrigger.weight + weightKg
        };
        
        console.log('🔍 TRIGGER ANALYSIS:');
        console.log('  - Profile saat ini (mungkin sudah di-trigger):', profileBefore);
        console.log('  - Expected sebelum trigger:', expectedBeforeTrigger);
        console.log('  - Expected setelah scan (no trigger):', expectedAfterScan);
        console.log('');
        
        // DETECT IF TRIGGER ALREADY RAN
        const triggerAlreadyRan = profileBefore.points > expectedBeforeTrigger.points;
        const triggerPointsAdded = profileBefore.points - expectedBeforeTrigger.points;
        
        if (triggerAlreadyRan) {
          console.log('🚨 TRIGGER SUDAH BERJALAN!');
          console.log('  - Trigger menambahkan:', triggerPointsAdded, 'poin');
          console.log('  - Expected trigger addition:', pointsEarned, 'poin');
          console.log('  - Double increment?', triggerPointsAdded > pointsEarned ? 'YA ❌' : 'TIDAK ✅');
          
          if (triggerPointsAdded > pointsEarned) {
            console.log('💀 DOUBLE INCREMENT DETECTED!');
            console.log('  - Seharusnya ditambahkan:', pointsEarned, 'poin');
            console.log('  - Trigger menambahkan:', triggerPointsAdded, 'poin');
            console.log('  - Kelebihan:', triggerPointsAdded - pointsEarned, 'poin');
            console.log('  - Penyebab: Database trigger atau concurrent update');
          }
        } else {
          console.log('✅ Trigger belum berjalan (normal)');
        }
        console.log('');
        
        // Check if profile was already updated by trigger
        const expectedFromTrigger = {
          points: (profileBefore.points || 0) - pointsEarned,
          bottles: (profileBefore.total_bottles || 0) - scanResult.bottles,
          weight: (profileBefore.total_weight_kg || 0) - weightKg
        };
        
        console.log('🔍 MANUAL UPDATE VS TRIGGER CHECK:');
        console.log('  - Current profile:', profileBefore);
        console.log('  - If trigger ran, should be:', expectedFromTrigger);
        console.log('  - Difference from expected:', {
          points: profileBefore.points - expectedFromTrigger.points,
          bottles: profileBefore.total_bottles - expectedFromTrigger.bottles,
          weight: profileBefore.total_weight_kg - expectedFromTrigger.weight
        });
        console.log('');
        
        // If profile already updated by trigger, skip manual update
        if (profileBefore.points >= pointsEarned && 
            profileBefore.total_bottles >= scanResult.bottles) {
          console.log('⚠️ Profile sudah di-update oleh trigger - skip manual update');
          console.log('🎯 FINAL RESULT (Trigger Only):');
          console.log('  - Final Points:', profileBefore.points);
          console.log('  - Final Bottles:', profileBefore.total_bottles);
          console.log('  - Final Weight:', profileBefore.total_weight_kg);
          console.log('  - Points Added by Trigger:', triggerPointsAdded);
          console.log('  - Double Increment?', triggerPointsAdded > pointsEarned ? 'YA ❌' : 'TIDAK ✅');
          console.log('');
          console.log('🔍 === DOUBLE INCREMENT ANALYSIS COMPLETE ===');
          
          toast.success(`+${pointsEarned} poin! Terima kasih telah berkontribusi!`);
          setShowConfirmDialog(false);
          setScanResult(null);
          navigate("/home");
          return;
        }
      }
      
      // Fetch all user activities to calculate correct totals
      const { data: userActivities, error: activitiesError } = await supabase
        .from("activities")
        .select("bottles_count, points_earned, weight_kg")
        .eq("user_id", user.id);
      
      if (activitiesError) {
        console.error('❌ Error fetching activities:', activitiesError);
        throw activitiesError;
      }
      
      // Add current activity to the calculation (in case it's not yet included)
      const allActivities = [...userActivities, {
        bottles_count: scanResult.bottles,
        points_earned: pointsEarned,
        weight_kg: weightKg
      }];
      
      const totalBottles = allActivities.reduce((sum, act) => sum + act.bottles_count, 0);
      const totalPoints = allActivities.reduce((sum, act) => sum + act.points_earned, 0);
      const totalWeight = allActivities.reduce((sum, act) => sum + act.weight_kg, 0);
      
      console.log('📊 Activity-based calculation:');
      console.log('  - Fetched activities:', userActivities.length);
      console.log('  - Including current activity:', allActivities.length);
      console.log('  - Total bottles from activities:', totalBottles);
      console.log('  - Total points from activities:', totalPoints);
      console.log('  - Total weight from activities:', totalWeight);
      console.log('  - Current activity: +', scanResult.bottles, 'bottles, +', pointsEarned, 'points, +', weightKg, 'kg');

      console.log('📈 === PROFILE UPDATE FLOW START ===');
      console.log('📤 UPDATING PROFILE TABLE...');
      console.log('📊 PROFILE UPDATE DATA:');
      console.log('  - User ID:', user.id);
      console.log('  - Total Points:', totalPoints);
      console.log('  - Total Bottles:', totalBottles);
      console.log('  - Total Weight:', totalWeight);
      console.log('  - Calculation based on:', allActivities.length, 'activities');

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          points: totalPoints,
          total_bottles: totalBottles,
          total_weight_kg: totalWeight,
        })
        .eq("user_id", user.id)
        .select()
        .single();

        if (updateError) {
          console.error('❌ PROFILE UPDATE FAILED:', updateError);
          console.error('❌ Error details:', JSON.stringify(updateError, null, 2));
          // Continue even if profile update fails - activity was saved
          console.log('⚠️ Activity saved but profile update failed - User can continue');
        } else {
          console.log('✅ PROFILE UPDATE SUCCESSFUL!');
          console.log('📋 UPDATED PROFILE DATA:', updatedProfile);
          console.log('  - Profile ID:', updatedProfile.id);
          console.log('  - New Points:', updatedProfile.points);
          console.log('  - New Total Bottles:', updatedProfile.total_bottles);
          console.log('  - New Total Weight:', updatedProfile.total_weight_kg);
          console.log('  - Updated At:', updatedProfile.updated_at);
          
          console.log('🎯 FINAL RESULT (Manual Update):');
          console.log('  - Final Points:', updatedProfile.points);
          console.log('  - Final Bottles:', updatedProfile.total_bottles);
          console.log('  - Final Weight:', updatedProfile.total_weight_kg);
          console.log('  - Points Added:', pointsEarned);
          console.log('  - Bottles Added:', scanResult.bottles);
          console.log('  - Weight Added:', weightKg, 'kg');
          
          // Check if there's a discrepancy (possible trigger)
          const expectedBottles = totalBottles;
          const actualBottles = updatedProfile.total_bottles;
          
          if (actualBottles !== expectedBottles) {
            console.log('🚨 DISCREPANCY DETECTED!');
            console.log('  - Expected bottles:', expectedBottles);
            console.log('  - Actual bottles:', actualBottles);
            console.log('  - Difference:', actualBottles - expectedBottles);
            console.log('  - Possible cause: Database trigger or concurrent update');
          } else {
            console.log('✅ NO DISCREPANCY - Profile matches expected values');
          }
          
          console.log('🎯 === SCAN TO DATABASE FLOW COMPLETE ===');
          console.log('📊 FINAL SUMMARY:');
          console.log('  - Activity ID:', activityData.id);
          console.log('  - Activity saved: ✅');
          console.log('  - Profile updated: ✅');
          console.log('  - Final bottles:', updatedProfile.total_bottles);
          console.log('  - Final points:', updatedProfile.points);
          console.log('  - Final weight:', updatedProfile.total_weight_kg);
          console.log('🎉 PENAMBAHAN POIN BERHASIL!');
        }

      toast.success(`+${pointsEarned} poin! Terima kasih telah berkontribusi!`);
      setShowConfirmDialog(false);
      setScanResult(null);
      navigate("/home");
    } catch (error: any) {
      console.error('❌ Error saving disposal data:', error);
      
      // Log specific error details
      if (error.code === 'PGRST116') {
        console.error('❌ Table or RLS policy issue - Check if tables exist and RLS policies allow access');
        toast.error('Database configuration error. Please contact support.');
      } else if (error.code === '42P01') {
        console.error('❌ Missing table error - Table does not exist:', error.message);
        if (error.message.includes('ranking_tiers')) {
          console.error('❌ ranking_tiers table is missing - This might be referenced in RLS policies or triggers');
          toast.error('Database setup incomplete. Activity saved, but ranking update failed. Admin will fix this soon.');
        } else {
          toast.error('Database table missing: ' + error.message);
        }
      } else if (error.status === 404) {
        console.error('❌ 404 Error - Table not found or permission denied');
        toast.error('Database table not found. Check RLS policies.');
      } else if (error.status === 403) {
        console.error('❌ 403 Error - Permission denied');
        toast.error('Permission denied. Check RLS policies.');
      } else {
        console.error('❌ Unknown error:', error.message);
        toast.error('Gagal menyimpan data: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsProcessing(false);
      confirmDisposalRef.current = false;
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
                console.log('🔘🔘🔘 BUTTON CLICKED!!!');                
                console.log('🔘 === KONFIRMASI BUTTON CLICKED ===');
                console.log('  - Current isProcessing:', isProcessing);
                console.log('  - confirmDisposalRef.current:', confirmDisposalRef.current);
                console.log('  - ScanResult exists:', !!scanResult);
                console.log('  - ScanResult data:', scanResult);
                console.log('  - Button disabled:', isProcessing);
                console.log('  - Timestamp:', new Date().toISOString());
                console.log('  - Execution ID:', Math.random().toString(36).substr(2, 9));
                console.log('  - About to call confirmDisposal()...');
                console.log('🔘 === STARTING confirmDisposal FUNCTION ===');
                
                // Add immediate call to confirmDisposal
                confirmDisposal().then(() => {
                  console.log('🔘 confirmDisposal() completed successfully');
                }).catch((error) => {
                  console.error('🔘 confirmDisposal() failed:', error);
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
  );
};

export default ScanPage;

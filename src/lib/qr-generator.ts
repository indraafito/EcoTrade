import { supabase } from '@/integrations/supabase/client';

export interface LocationQRData {
  locationId: string;
  locationName: string;
  timestamp: string;
}

// Generate QR code data URL for location using free API
export const generateLocationQRCodeAPI = async (location: {
  id: string;
  name: string;
}): Promise<string> => {
  try {
    // Create QR data with location info
    const qrData: LocationQRData = {
      locationId: location.id,
      locationName: location.name,
      timestamp: new Date().toISOString()
    };

    // Convert to JSON string for QR code
    const qrString = JSON.stringify(qrData);
    
    // Use free QR code API with optimized settings
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&format=png&margin=1&data=${encodeURIComponent(qrString)}`;
    
    return qrCodeUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Save QR code to database
export const saveLocationQRCode = async (
  locationId: string,
  qrCodeUrl: string
): Promise<boolean> => {
  try {
    const qrData: LocationQRData = {
      locationId: locationId,
      locationName: '', // Will be updated when needed
      timestamp: new Date().toISOString()
    };

    const { error } = await (supabase as any)
      .from('location_qr_codes')
      .upsert({
        location_id: locationId,
        qr_code_url: qrCodeUrl,
        qr_data: qrData,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving QR code:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveLocationQRCode:', error);
    return false;
  }
};

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
): Promise<{ success: boolean; isNew: boolean }> => {
  try {
    const qrData: LocationQRData = {
      locationId: locationId,
      locationName: '', // Will be updated when needed
      timestamp: new Date().toISOString()
    };

    // First check if QR code already exists
    const { data: existingQR } = await (supabase as any)
      .from('location_qr_codes')
      .select('qr_code_url')
      .eq('location_id', locationId)
      .single();

    if (existingQR) {
      // QR already exists, no need to insert
      console.log('QR Code already exists for location:', locationId);
      return { success: true, isNew: false };
    }

    // Use upsert to handle duplicates gracefully
    const { error } = await (supabase as any)
      .from('location_qr_codes')
      .upsert({
        location_id: locationId,
        qr_code_url: qrCodeUrl,
        qr_data: qrData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'location_id' // Handle conflict on location_id
      });

    if (error) {
      // Check if it's a duplicate error
      if (error.code === '23505' && error.message.includes('duplicate key')) {
        console.log('QR Code already exists for location:', locationId);
        return { success: true, isNew: false }; // Not an error, QR already exists
      }
      console.error('Error saving QR code:', error);
      return { success: false, isNew: false };
    }

    return { success: true, isNew: true }; // New QR created
  } catch (error: any) {
    console.error('Error in saveLocationQRCode:', error);
    
    // Check if it's a duplicate error
    if (error.code === '23505' && error.message.includes('duplicate key')) {
      console.log('QR Code already exists for location:', locationId);
      return { success: true, isNew: false }; // Not an error, QR already exists
    }
    
    return { success: false, isNew: false };
  }
};

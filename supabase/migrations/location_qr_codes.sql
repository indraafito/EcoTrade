-- Create table for location QR codes
CREATE TABLE IF NOT EXISTS location_qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    qr_code_url TEXT NOT NULL,
    qr_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one QR code per location
    UNIQUE(location_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_location_qr_codes_location_id ON location_qr_codes(location_id);

-- Enable RLS (Row Level Security)
ALTER TABLE location_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can manage location QR codes" ON location_qr_codes
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_location_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_location_qr_codes_updated_at 
    BEFORE UPDATE ON location_qr_codes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_location_qr_codes_updated_at();

-- Create table for AI Analytics storage
CREATE TABLE IF NOT EXISTS ai_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    insights JSONB NOT NULL,
    last_analyzed TIMESTAMP WITH TIME ZONE NOT NULL,
    date_filter_type VARCHAR(50) NOT NULL,
    date_filter_start TIMESTAMP WITH TIME ZONE NOT NULL,
    date_filter_end TIMESTAMP WITH TIME ZONE NOT NULL,
    stats JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ai_analytics_created_at ON ai_analytics(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (adjust as needed)
CREATE POLICY "Users can manage their own AI analytics" ON ai_analytics
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Optional: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_analytics_updated_at 
    BEFORE UPDATE ON ai_analytics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Test insert to verify table works
INSERT INTO ai_analytics (insights, last_analyzed, date_filter_type, date_filter_start, date_filter_end, stats)
VALUES (
    '[{"type": "test", "title": "Test", "description": "Test", "confidence": 0.5, "impact": "low"}]',
    NOW(),
    'test',
    NOW(),
    NOW(),
    '{"totalBottles": 0, "totalUsers": 0, "totalActiveUsers": 0, "totalRedemptions": 0, "totalLocations": 0, "totalVouchers": 0}'
)
ON CONFLICT (id) DO NOTHING;

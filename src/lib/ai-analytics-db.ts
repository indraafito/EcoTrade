import { supabase } from '@/integrations/supabase/client';

// Define custom interface since table doesn't exist in auto-generated types yet
export interface AIAnalyticsRecord {
  id?: string;
  insights: any[];
  last_analyzed: string;
  date_filter_type: string;
  date_filter_start: string;
  date_filter_end: string;
  stats: {
    totalBottles: number;
    totalUsers: number;
    totalActiveUsers: number;
    totalRedemptions: number;
    totalLocations: number;
    totalVouchers: number;
  };
  created_at?: string;
  updated_at?: string;
}

// Save or replace AI analytics in database
export const saveAIAnalytics = async (
  insights: any[],
  dateFilter: any,
  stats: any
): Promise<AIAnalyticsRecord | null> => {
  try {
    console.log('Saving AI analytics to database...');
    
    // First, delete existing record (we only want one record)
    const { error: deleteError } = await (supabase as any)
      .from('ai_analytics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except dummy ID

    if (deleteError) {
      console.error('Error deleting existing AI analytics:', deleteError);
      // Continue anyway, maybe table is empty
    }

    // Insert new record - use direct client cast
    const insertData = {
      insights: insights,
      last_analyzed: new Date().toISOString(),
      date_filter_type: dateFilter.type,
      date_filter_start: dateFilter.startDate.toISOString(),
      date_filter_end: dateFilter.endDate.toISOString(),
      stats: stats
    };

    console.log('Insert data:', insertData);

    const { data, error } = await (supabase as any)
      .from('ai_analytics')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error saving AI analytics:', error);
      console.error('Error details:', error.details);
      console.error('Error code:', error.code);
      return null;
    }

    console.log('Successfully saved AI analytics:', data);
    return data as AIAnalyticsRecord;
  } catch (error) {
    console.error('Error in saveAIAnalytics:', error);
    return null;
  }
};

// Load AI analytics from database
export const loadAIAnalytics = async (): Promise<AIAnalyticsRecord | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('ai_analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error loading AI analytics:', error);
      return null;
    }

    return data as AIAnalyticsRecord;
  } catch (error) {
    console.error('Error in loadAIAnalytics:', error);
    return null;
  }
};

// Clear all AI analytics from database
export const clearAIAnalytics = async (): Promise<boolean> => {
  try {
    const { error } = await (supabase as any)
      .from('ai_analytics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error clearing AI analytics:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in clearAIAnalytics:', error);
    return false;
  }
};

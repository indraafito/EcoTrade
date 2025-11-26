// AI Analytics API service
// API Key should be stored in environment variables for security

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Debug: Check if API key is loaded
console.log('Gemini API Key loaded:', GEMINI_API_KEY ? 'YES' : 'NO');
console.log('Environment check:', import.meta.env.MODE);

interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export const callGeminiAPI = async (prompt: string): Promise<AIResponse> => {
  try {
    // Check if API key is available
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not found in environment variables');
      console.log('Available env vars:', Object.keys(import.meta.env).filter(key => key.includes('GEMINI')));
      return {
        success: false,
        error: 'API key not configured'
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API Error:', errorData);
      return {
        success: false,
        error: `API Error: ${response.status} - ${errorData}`
      };
    }

    const result = await response.json();
    const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      return {
        success: false,
        error: 'No response from AI model'
      };
    }

    return {
      success: true,
      response: aiResponse
    };
    
  } catch (error) {
    console.error('AI Analytics API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Fallback insights in case API fails
export const getFallbackInsights = (stats: any): any[] => {
  const insights = [];
  
  if (stats.totalBottles > 0) {
    insights.push({
      type: 'trend',
      title: 'Pertumbuhan Botol',
      description: `${stats.totalBottles} botol dikumpulkan dari ${stats.totalUsers} pengguna`,
      confidence: 0.8,
      impact: 'high'
    });
  }
  
  if (stats.totalUsers > 0) {
    const activeRate = stats.totalActiveUsers / stats.totalUsers;
    insights.push({
      type: 'trend',
      title: 'Engagement Pengguna',
      description: `${Math.round(activeRate * 100)}% pengguna aktif dari total ${stats.totalUsers}`,
      confidence: 0.9,
      impact: 'medium'
    });
  }
  
  if (stats.totalVouchers > 0 && stats.totalRedemptions > 0) {
    const redemptionRate = stats.totalRedemptions / stats.totalVouchers;
    insights.push({
      type: 'recommendation',
      title: 'Optimasi Voucher',
      description: `${Math.round(redemptionRate * 100)}% voucher digunakan, tingkatkan promosi`,
      confidence: 0.7,
      impact: 'medium'
    });
  }
  
  if (stats.totalLocations > 0) {
    insights.push({
      type: 'opportunity',
      title: 'Ekspansi Lokasi',
      description: `${stats.totalLocations} lokasi aktif, pertimbangkan tambah lokasi baru`,
      confidence: 0.6,
      impact: 'low'
    });
  }
  
  if (insights.length === 0) {
    insights.push({
      type: 'recommendation',
      title: 'Data Terbatas',
      description: 'Mulai kumpulkan data untuk mendapatkan insight yang lebih baik',
      confidence: 0.5,
      impact: 'low'
    });
  }
  
  return insights;
};

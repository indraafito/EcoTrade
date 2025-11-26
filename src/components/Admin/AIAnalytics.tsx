import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, TrendingUp, AlertCircle, Lightbulb, Target } from 'lucide-react';
import { toast } from 'sonner';
import { callGeminiAPI, getFallbackInsights } from '@/lib/ai-analytics';
import { saveAIAnalytics, loadAIAnalytics, clearAIAnalytics } from '@/lib/ai-analytics-db';

interface AIInsight {
  type: 'trend' | 'recommendation' | 'warning' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
}

interface AIAnalyticsProps {
  bottleData: any[];
  userData: any[];
  stats: {
    totalBottles: number;
    totalUsers: number;
    totalActiveUsers: number;
    totalRedemptions: number;
    totalLocations: number;
    totalVouchers: number;
  };
  dateFilter: {
    type: string;
    startDate: Date;
    endDate: Date;
  };
}

const AIAnalytics: React.FC<AIAnalyticsProps> = ({
  bottleData,
  userData,
  stats,
  dateFilter
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  // Load cached insights from database on mount
  useEffect(() => {
    const loadInsights = async () => {
      try {
        const cachedData = await loadAIAnalytics();
        
        if (cachedData && cachedData.insights) {
          setInsights(cachedData.insights);
          setLastAnalyzed(new Date(cachedData.last_analyzed));
          console.log('Loaded insights from database:', cachedData);
        }
      } catch (error) {
        console.error('Failed to load insights from database:', error);
      }
    };

    loadInsights();
  }, []);

  // Save insights to database whenever they change
  useEffect(() => {
    const saveInsights = async () => {
      if (insights.length > 0 && dateFilter && stats) {
        try {
          const saved = await saveAIAnalytics(insights, dateFilter, stats);
          if (saved) {
            console.log('Saved insights to database:', saved);
          }
        } catch (error) {
          console.error('Failed to save insights to database:', error);
        }
      }
    };

    saveInsights();
  }, [insights, dateFilter, stats]);

  const generateInsights = async () => {
    setIsAnalyzing(true);
    
    try {
      // Validate data before sending
      if (!stats || !dateFilter) {
        throw new Error('Data tidak lengkap');
      }

      console.log('Starting AI Analysis with data:', { stats, dateFilter });

      // Prepare data for AI analysis
      const analysisData = {
        period: dateFilter.type,
        dateRange: {
          start: dateFilter.startDate.toISOString(),
          end: dateFilter.endDate.toISOString()
        },
        metrics: {
          bottles: {
            total: stats.totalBottles,
            dataPoints: bottleData.map(d => ({
              date: d.label,
              value: d.bottles || d.registrations || 0
            }))
          },
          users: {
            total: stats.totalUsers,
            active: stats.totalActiveUsers,
            dataPoints: userData.map(d => ({
              date: d.label,
              value: d.registrations || d.bottles || 0
            }))
          },
          redemptions: stats.totalRedemptions,
          locations: stats.totalLocations,
          vouchers: stats.totalVouchers
        }
      };

      console.log('Analysis Data:', analysisData);

      // Call Google AI API
      const prompt = `Analisis data berikut dan berikan insight bisnis dalam bahasa Indonesia:

Data Period: ${dateFilter.type}
Date Range: ${dateFilter.startDate.toLocaleDateString('id-ID')} - ${dateFilter.endDate.toLocaleDateString('id-ID')}

Metrics:
- Total Botol: ${stats.totalBottles}
- Total User: ${stats.totalUsers} (Active: ${stats.totalActiveUsers})
- Total Redemptions: ${stats.totalRedemptions}
- Total Lokasi: ${stats.totalLocations}
- Total Voucher: ${stats.totalVouchers}

Botol Data: ${bottleData.slice(0, 7).map(d => `${d.label}: ${d.bottles || d.registrations || 0}`).join(', ')}

User Data: ${userData.slice(0, 7).map(d => `${d.label}: ${d.registrations || d.bottles || 0}`).join(', ')}

Berikan analisis dalam format JSON yang valid:
{
  "insights": [
    {
      "type": "trend",
      "title": "Pertumbuhan Positif",
      "description": "Data menunjukkan tren pertumbuhan yang baik",
      "confidence": 0.8,
      "impact": "high"
    }
  ]
}

Jenis type yang bisa digunakan: trend, recommendation, warning, opportunity
Jenis impact yang bisa digunakan: high, medium, low

Hanya return JSON yang valid tanpa teks tambahan di awal atau akhir.`;

      // Use specific model as requested
      const model = 'gemini-2.5-flash';
      console.log(`Using model: ${model}`);
      
      // Call secure API utility
      const result = await callGeminiAPI(prompt);
      
      if (result.success && result.response) {
        console.log('AI Response Text:', result.response);
        
        // Parse JSON response
        const jsonMatch = result.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsedInsights = JSON.parse(jsonMatch[0]);
            console.log('Parsed Insights:', parsedInsights);
            setInsights(parsedInsights.insights || []);
            setLastAnalyzed(new Date());
            toast.success('Analisis AI berhasil dilakukan');
            return;
          } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
          }
        } else {
          console.log('No JSON found in response');
        }
      } else {
        throw new Error(result.error || 'API call failed');
      }
    } catch (error) {
      console.error('AI Analysis Error:', error);
      setInsights(getFallbackInsights(stats));
      toast.error('Gagal menganalisis dengan AI, menggunakan insight default');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'trend': return <TrendingUp className="w-4 h-4" />;
      case 'recommendation': return <Lightbulb className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'opportunity': return <Target className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'trend': return 'text-primary dark:text-primary bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30';
      case 'recommendation': return 'text-[#1DBF73] dark:text-[#1DBF73] bg-[#1DBF73]/5 dark:bg-[#1DBF73]/10 border-[#1DBF73]/20 dark:border-[#1DBF73]/30';
      case 'warning': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800';
      case 'opportunity': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800';
      default: return 'text-muted-foreground dark:text-muted-foreground bg-muted/50 dark:bg-muted/30 border-border';
    }
  };

  const getImpactColor = (impact: AIInsight['impact']) => {
    switch (impact) {
      case 'high': return 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-[#1DBF73]/10 dark:bg-[#1DBF73]/20 text-[#1DBF73] dark:text-[#1DBF73] border-[#1DBF73]/20 dark:border-[#1DBF73]/30';
      default: return 'bg-muted/50 dark:bg-muted/30 text-muted-foreground dark:text-muted-foreground border-border';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">AI Analytics</CardTitle>
          {insights.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[#1DBF73] rounded-full animate-pulse" />
              <span className="text-xs text-[#1DBF73]">Tersimpan</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastAnalyzed && (
            <span className="text-xs text-muted-foreground">
              Dianalisis: {lastAnalyzed.toLocaleTimeString('id-ID')}
            </span>
          )}
          <Button
            onClick={generateInsights}
            disabled={isAnalyzing}
            size="sm"
            variant="outline"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menganalisis...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Analisis Ulang
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada insight yang tersedia</p>
            <Button
              onClick={generateInsights}
              disabled={isAnalyzing}
              className="mt-4"
            >
              Mulai Analisis AI
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(insight.confidence * 100)}% confidence
                    </Badge>
                    <Badge className={`text-xs ${getImpactColor(insight.impact)}`}>
                      {insight.impact}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm opacity-80">{insight.description}</p>
              </div>
            ))}
            
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-[#1DBF73]/5 dark:from-primary/10 dark:to-[#1DBF73]/10 rounded-xl border border-primary/20 dark:border-primary/30 relative overflow-hidden">
              {/* Decorative gradient line */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-primary/30 via-[#1DBF73]/30 to-primary/30" />
              
              <div className="flex items-center gap-2 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md" />
                  <Brain className="w-4 h-4 text-primary relative z-10" />
                </div>
                <h4 className="font-semibold text-sm text-primary dark:text-primary">Ringkasan AI</h4>
              </div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">
                Berdasarkan analisis data periode <span className="text-primary font-medium">{dateFilter.type}</span>, 
                terdapat <span className="text-[#1DBF73] font-medium">{insights.length}</span> insight yang dapat membantu pengambilan keputusan.
                Fokus pada peningkatan engagement dan optimalisasi operasional.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAnalytics;

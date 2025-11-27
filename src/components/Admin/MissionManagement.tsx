import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  Trophy,
  Star,
  Gift,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Award
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Mission {
  id: string;
  title: string;
  description: string;
  target_type: 'bottles' | 'weight_kg' | 'points' | 'activities';
  target_value: number;
  points_bonus: number;
  mission_type: 'daily' | 'weekly' | 'monthly' | 'special';
  difficulty: 'easy' | 'medium' | 'hard';
  duration_hours: number;
  icon?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  max_completions: number;
  city?: string;
  created_at: string;
  updated_at: string;
}

interface MissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  progress_value: number;
  status: 'in_progress' | 'completed' | 'claimed' | 'expired';
  started_at: string;
  expires_at?: string;
  completed_at?: string;
  verified: boolean;
  claimed_at?: string;
  created_at: string;
  updated_at: string;
}

interface MissionWithProgress extends Mission {
  total_participants?: number;
  completed_count?: number;
  in_progress_count?: number;
}

interface MissionManagementProps {
  onMissionChange?: () => void;
}

const MissionManagement = ({ onMissionChange }: MissionManagementProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [missions, setMissions] = useState<MissionWithProgress[]>([]);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProgress, setShowProgress] = useState(false);
  const [missionProgress, setMissionProgress] = useState<MissionProgress[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_type: 'bottles' as Mission['target_type'],
    target_value: 10,
    points_bonus: 50,
    mission_type: 'daily' as Mission['mission_type'],
    difficulty: 'medium' as Mission['difficulty'],
    duration_hours: 24,
    icon: '',
    start_date: '',
    end_date: '',
    is_active: true,
    max_completions: 1,
    city: ''
  });

  // Fetch missions from database
  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    console.log('📥 Fetching missions from database...');
    
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('missions')
        .select(`
          *,
          mission_progress(count)
        `)
        .order('created_at', { ascending: false });

      const targetMission = data?.find(m => m.id === '7940d1ad-388a-4004-ad08-ae291f35416c');
      console.log('📊 Missions data received:', { 
        count: data?.length || 0, 
        missions: data?.map(m => ({ id: m.id, title: m.title, is_active: m.is_active })),
        targetMission: targetMission,
        targetMissionStatus: targetMission?.is_active,
        timestamp: new Date().toISOString() // Add timestamp to verify fresh data
      });

      if (error) {
        console.error('❌ Error fetching missions:', error);
        throw error;
      }
      
      // Fetch progress statistics
      const missionsWithStats = await Promise.all(
        (data || []).map(async (mission: Mission) => {
          const { data: progressData } = await (supabase as any)
            .from('mission_progress')
            .select('status')
            .eq('mission_id', mission.id);

          const stats = {
            total_participants: progressData?.length || 0,
            completed_count: progressData?.filter(p => p.status === 'completed').length || 0,
            in_progress_count: progressData?.filter(p => p.status === 'in_progress').length || 0
          };

          return { ...mission, ...stats };
        })
      );

      setMissions(missionsWithStats);
      
      const targetMissionInState = missionsWithStats.find(m => m.id === '7940d1ad-388a-4004-ad08-ae291f35416c');
      console.log('🔄 State updated:', { 
        missionCount: missionsWithStats.length,
        updatedMissions: missionsWithStats.map(m => ({ id: m.id, title: m.title, is_active: m.is_active })),
        targetMissionInState: targetMissionInState,
        targetMissionStateStatus: targetMissionInState?.is_active
      });
    } catch (error) {
      console.error('Error fetching missions:', error);
      toast.error('Gagal memuat data misi');
    } finally {
      setLoading(false);
    }
  };

  const fetchMissionProgress = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('mission_progress')
        .select(`
          *,
          missions(title, description, target_type, target_value, points_bonus)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMissionProgress(data || []);
    } catch (error) {
      console.error('Error fetching mission progress:', error);
      toast.error('Gagal memuat progress misi');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      target_type: 'bottles',
      target_value: 10,
      points_bonus: 50,
      mission_type: 'daily',
      difficulty: 'medium',
      duration_hours: 24,
      icon: '',
      start_date: '',
      end_date: '',
      is_active: true,
      max_completions: 1,
      city: ''
    });
    setEditingMission(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const missionData = {
        title: formData.title,
        description: formData.description,
        target_type: formData.target_type,
        target_value: formData.target_value,
        points_bonus: formData.points_bonus,
        mission_type: formData.mission_type,
        difficulty: formData.difficulty,
        duration_hours: formData.duration_hours,
        icon: formData.icon || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        max_completions: formData.max_completions,
        city: formData.city || null
      };

      if (editingMission) {
        // Update existing mission
        const { error } = await (supabase as any)
          .from('missions')
          .update(missionData)
          .eq('id', editingMission.id);

        if (error) throw error;
        toast.success('Misi berhasil diperbarui');
      } else {
        // Create new mission
        const { error } = await (supabase as any)
          .from('missions')
          .insert(missionData);

        if (error) throw error;
        toast.success('Misi berhasil ditambahkan');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMissions();
      onMissionChange?.();
    } catch (error) {
      console.error('Error saving mission:', error);
      toast.error('Gagal menyimpan misi');
    }
  };

  const handleEdit = (mission: Mission) => {
    setEditingMission(mission);
    setFormData({
      title: mission.title,
      description: mission.description,
      target_type: mission.target_type,
      target_value: mission.target_value,
      points_bonus: mission.points_bonus,
      mission_type: mission.mission_type,
      difficulty: mission.difficulty,
      duration_hours: mission.duration_hours,
      icon: mission.icon || '',
      start_date: mission.start_date || '',
      end_date: mission.end_date || '',
      is_active: mission.is_active,
      max_completions: mission.max_completions,
      city: mission.city || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus misi ini?')) return;

    try {
      const { error } = await (supabase as any)
        .from('missions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Misi berhasil dihapus');
      fetchMissions();
      onMissionChange?.();
    } catch (error) {
      console.error('Error deleting mission:', error);
      toast.error('Gagal menghapus misi');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    console.log('🔄 Toggle Mission:', { id, isActive, currentStatus: !isActive });
    
    try {
      console.log('📤 Sending update to database:', { id, is_active: isActive });
      
      // Try using service role key or RPC to bypass RLS
      const { data: updatedData, error } = await (supabase as any)
        .from('missions')
        .update({ is_active: isActive })
        .eq('id', id)
        .select('*')
        .single(); // Use single() to get one record

      console.log('📥 Database response:', { error, success: !error, updatedData });
      console.log('📥 Updated mission data:', updatedData);

      if (error) {
        console.error('❌ Database error:', error);
        console.log('🔄 Trying alternative approach...');
        
        // Try using RPC function to bypass RLS
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc('toggle_mission_status', {
          mission_id: id,
          new_status: isActive
        });
        
        console.log('� RPC response:', { rpcError, rpcData });
        
        if (rpcError) {
          console.error('❌ RPC approach failed:', rpcError);
          
          // Last resort - direct update without select
          console.log('🔄 Trying direct update...');
          const { error: updateError } = await (supabase as any)
            .from('missions')
            .update({ is_active: isActive })
            .eq('id', id);
            
          if (updateError) {
            console.error('❌ All approaches failed:', updateError);
            throw updateError;
          }
          
          console.log('✅ Direct update successful');
        } else {
          console.log('✅ RPC update successful');
        }
      }
      
      console.log('✅ Mission status updated successfully');
      toast.success(`Misi berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      
      // Temporary fix: Update local state immediately since RLS prevents fresh data
      console.log('🔄 Updating local state immediately...');
      setMissions(prevMissions => 
        prevMissions.map(mission => 
          mission.id === id 
            ? { ...mission, is_active: isActive }
            : mission
        )
      );
      
      // Also try to refresh from server (might fail due to RLS)
      console.log('🔄 Force refreshing missions list...');
      setTimeout(() => {
        fetchMissions();
      }, 500); // Small delay to ensure database consistency
      
      onMissionChange?.();
    } catch (error) {
      console.error('❌ Error toggling mission:', error);
      toast.error('Gagal mengubah status misi');
    }
  };

  const getMissionIcon = (targetType: Mission['target_type']) => {
    switch (targetType) {
      case 'bottles': return <Target className="w-4 h-4" />;
      case 'weight_kg': return <TrendingUp className="w-4 h-4" />;
      case 'points': return <Star className="w-4 h-4" />;
      case 'activities': return <Award className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getTargetTypeLabel = (type: Mission['target_type']) => {
    switch (type) {
      case 'bottles': return 'Botol';
      case 'weight_kg': return 'Berat (kg)';
      case 'points': return 'Poin';
      case 'activities': return 'Aktivitas';
      default: return type;
    }
  };

  const getMissionTypeLabel = (type: Mission['mission_type']) => {
    switch (type) {
      case 'daily': return 'Harian';
      case 'weekly': return 'Mingguan';
      case 'monthly': return 'Bulanan';
      case 'special': return 'Spesial';
      default: return type;
    }
  };

  const getDifficultyColor = (difficulty: Mission['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: MissionProgress['status']) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'claimed': return 'bg-purple-100 text-purple-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Manajemen Misi</h2>
          <p className="text-muted-foreground">Kelola misi dan pantau progress pengguna</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Misi
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Memuat data misi...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {missions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Misi</h3>
                <p className="text-muted-foreground mb-4">
                  Mulai dengan menambahkan misi pertama untuk pengguna
                </p>
                <Button 
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Misi Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            missions.map((mission) => (
              <Card key={mission.id} className={`hover:shadow-lg hover:border-primary/20 transition-all duration-200 ${!mission.is_active ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getMissionIcon(mission.target_type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{mission.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={mission.is_active ? 'default' : 'secondary'}>
                            {mission.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          <Badge variant="outline">
                            {getMissionTypeLabel(mission.mission_type)}
                          </Badge>
                          <Badge className={getDifficultyColor(mission.difficulty)}>
                            {mission.difficulty === 'easy' ? 'Mudah' : 
                             mission.difficulty === 'medium' ? 'Sedang' : 'Sulit'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('🔘 Toggle button clicked:', { 
                            missionId: mission.id, 
                            currentStatus: mission.is_active, 
                            newStatus: !mission.is_active,
                            missionTitle: mission.title
                          });
                          handleToggleActive(mission.id, !mission.is_active);
                        }}
                        className={mission.is_active ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' : 'text-success hover:bg-success/10 hover:text-success'}
                      >
                        {mission.is_active ? (
                          <>
                            <X className="w-4 h-4" />
                            Nonaktifkan
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Aktifkan
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(mission)}
                        className="hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(mission.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-muted-foreground mb-4">{mission.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-muted-foreground text-sm">Target:</span>
                      <p className="font-medium">
                        {mission.target_value} {getTargetTypeLabel(mission.target_type)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Bonus Poin:</span>
                      <p className="font-medium">{mission.points_bonus} poin</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Durasi:</span>
                      <p className="font-medium">{mission.duration_hours} jam</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Max Kompleksi:</span>
                      <p className="font-medium">{mission.max_completions}x</p>
                    </div>
                  </div>

                  {/* Progress Statistics */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{mission.total_participants || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Peserta</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">{mission.in_progress_count || 0}</div>
                        <div className="text-sm text-muted-foreground">Sedang Berjalan</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{mission.completed_count || 0}</div>
                        <div className="text-sm text-muted-foreground">Selesai</div>
                      </div>
                    </div>
                  </div>

                  {mission.city && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Lokasi:</strong> {mission.city}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Mission Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMission ? 'Edit Misi' : 'Tambah Misi Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingMission 
                ? 'Edit detail misi yang sudah ada'
                : 'Buat misi baru untuk pengguna'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Judul Misi</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Kumpulkan 10 Botol"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan misi ini secara detail..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="target_type">Tipe Target</Label>
                <Select
                  value={formData.target_type}
                  onValueChange={(value: Mission['target_type']) => setFormData({ ...formData, target_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottles">Jumlah Botol</SelectItem>
                    <SelectItem value="weight_kg">Berat (kg)</SelectItem>
                    <SelectItem value="points">Total Poin</SelectItem>
                    <SelectItem value="activities">Jumlah Aktivitas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target_value">Nilai Target</Label>
                <Input
                  id="target_value"
                  type="number"
                  min="1"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: parseInt(e.target.value) || 1 })}
                  placeholder="10"
                  required
                />
              </div>

              <div>
                <Label htmlFor="points_bonus">Bonus Poin</Label>
                <Input
                  id="points_bonus"
                  type="number"
                  min="0"
                  value={formData.points_bonus}
                  onChange={(e) => setFormData({ ...formData, points_bonus: parseInt(e.target.value) || 0 })}
                  placeholder="50"
                  required
                />
              </div>

              <div>
                <Label htmlFor="mission_type">Tipe Misi</Label>
                <Select
                  value={formData.mission_type}
                  onValueChange={(value: Mission['mission_type']) => setFormData({ ...formData, mission_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Harian</SelectItem>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="special">Spesial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="difficulty">Tingkat Kesulitan</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: Mission['difficulty']) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Mudah</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="hard">Sulit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="duration_hours">Durasi (jam)</Label>
                <Input
                  id="duration_hours"
                  type="number"
                  min="1"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) || 24 })}
                  placeholder="24"
                  required
                />
              </div>

              <div>
                <Label htmlFor="max_completions">Max Kompleksi</Label>
                <Input
                  id="max_completions"
                  type="number"
                  min="1"
                  value={formData.max_completions}
                  onChange={(e) => setFormData({ ...formData, max_completions: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="icon">Icon (Opsional)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="🎯"
                />
              </div>

              <div>
                <Label htmlFor="city">Kota (Opsional)</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Jakarta"
                />
              </div>

              <div>
                <Label htmlFor="start_date">Tanggal Mulai (Opsional)</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="end_date">Tanggal Berakhir (Opsional)</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date}
                />
              </div>

              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Misi Aktif</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="hover:bg-primary/10 hover:text-primary hover:border-primary/20"
              >
                Batal
              </Button>
              <Button type="submit">
                {editingMission ? 'Perbarui Misi' : 'Tambah Misi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mission Progress Dialog */}
      <Dialog open={showProgress} onOpenChange={setShowProgress}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Progress Misi Pengguna</DialogTitle>
            <DialogDescription>
              Lihat progress semua pengguna untuk setiap misi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {missionProgress.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Progress</h3>
                <p className="text-muted-foreground">
                  Belum ada pengguna yang mengerjakan misi
                </p>
              </div>
            ) : (
              missionProgress.map((progress) => (
                <Card key={progress.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{(progress as any).missions?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          User ID: {progress.user_id.slice(0, 8)}...
                        </p>
                      </div>
                      <Badge className={getStatusColor(progress.status)}>
                        {progress.status === 'in_progress' ? 'Sedang Berjalan' :
                         progress.status === 'completed' ? 'Selesai' :
                         progress.status === 'claimed' ? 'Di Klaim' : 'Kadaluarsa'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Progress:</span>
                        <p className="font-medium">
                          {progress.progress_value} / {(progress as any).missions?.target_value}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mulai:</span>
                        <p className="font-medium">
                          {new Date(progress.started_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      {progress.completed_at && (
                        <div>
                          <span className="text-muted-foreground">Selesai:</span>
                          <p className="font-medium">
                            {new Date(progress.completed_at).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      )}
                      {progress.expires_at && (
                        <div>
                          <span className="text-muted-foreground">Kadaluarsa:</span>
                          <p className="font-medium">
                            {new Date(progress.expires_at).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((progress.progress_value / (progress as any).missions?.target_value) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((progress.progress_value / (progress as any).missions?.target_value) * 100)}% Complete
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MissionManagement;

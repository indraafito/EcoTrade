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
  Trophy, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  Star,
  Crown,
  Medal,
  Award,
  Gem,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface RankingTier {
  id: string;
  name: string;
  threshold_points: number;
  bonus_points: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RankingTiersManagementProps {
  onRankingTiersChange?: () => void;
}

const RankingTiersManagement = ({ onRankingTiersChange }: RankingTiersManagementProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rankingTiers, setRankingTiers] = useState<RankingTier[]>([]);
  const [editingTier, setEditingTier] = useState<RankingTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    threshold_points: 0,
    bonus_points: 0,
    sort_order: 1,
    is_active: true
  });

  // Fetch ranking tiers from database
  useEffect(() => {
    fetchRankingTiers();
  }, []);

  const fetchRankingTiers = async () => {
    console.log('📥 Fetching ranking tiers from database...');
    
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('ranking_tiers')
        .select('*')
        .order('sort_order', { ascending: true });

      console.log('📊 Ranking tiers response:', { 
        data: data, 
        error: error,
        count: data?.length || 0,
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      setRankingTiers(data || []);
      console.log('✅ Ranking tiers loaded successfully:', data?.length || 0, 'items');
    } catch (error) {
      console.error('❌ Error fetching ranking tiers:', error);
      toast.error('Gagal memuat data ranking tiers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      threshold_points: 0,
      bonus_points: 0,
      sort_order: rankingTiers.length + 1,
      is_active: true
    });
    setEditingTier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Submitting ranking tier:', {
      isEditing: !!editingTier,
      formData: formData,
      editingTierId: editingTier?.id
    });
    
    try {
      const tierData = {
        name: formData.name,
        threshold_points: formData.threshold_points,
        bonus_points: formData.bonus_points,
        sort_order: formData.sort_order,
        is_active: formData.is_active
      };

      console.log('🔍 Tier data to save:', tierData);

      // Validate threshold points uniqueness
      const existingThreshold = rankingTiers.find(
        tier => tier.threshold_points === formData.threshold_points && tier.id !== editingTier?.id
      );

      if (existingThreshold) {
        console.log('⚠️ Duplicate threshold found:', existingThreshold);
        toast.error('Threshold poin sudah digunakan oleh ranking tier lain');
        return;
      }

      if (editingTier) {
        // Update existing tier
        console.log('🔄 Updating existing tier:', editingTier.id);
        const { data, error } = await (supabase as any)
          .from('ranking_tiers')
          .update(tierData)
          .eq('id', editingTier.id)
          .select();

        console.log('📊 Update response:', { data, error });

        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        
        console.log('✅ Ranking tier updated successfully');
        toast.success('Ranking tier berhasil diperbarui');
      } else {
        // Create new tier
        console.log('➕ Creating new tier');
        const { data, error } = await (supabase as any)
          .from('ranking_tiers')
          .insert(tierData)
          .select();

        console.log('📊 Insert response:', { data, error });

        if (error) {
          console.error('❌ Insert error:', error);
          throw error;
        }
        
        console.log('✅ Ranking tier created successfully:', data);
        toast.success('Ranking tier berhasil ditambahkan');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchRankingTiers();
      onRankingTiersChange?.();
    } catch (error) {
      console.error('❌ Error saving ranking tier:', error);
      toast.error('Gagal menyimpan ranking tier');
    }
  };

  const handleEdit = (tier: RankingTier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      threshold_points: tier.threshold_points,
      bonus_points: tier.bonus_points,
      sort_order: tier.sort_order,
      is_active: tier.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    console.log('🗑️ Attempting to delete ranking tier:', id);
    
    if (!confirm('Apakah Anda yakin ingin menghapus ranking tier ini?')) {
      console.log('❌ Delete cancelled by user');
      return;
    }

    try {
      console.log('🔄 Deleting ranking tier from database...');
      const { data, error } = await (supabase as any)
        .from('ranking_tiers')
        .delete()
        .eq('id', id)
        .select();

      console.log('📊 Delete response:', { data, error });

      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }
      
      console.log('✅ Ranking tier deleted successfully:', data);
      toast.success('Ranking tier berhasil dihapus');
      fetchRankingTiers();
      onRankingTiersChange?.();
    } catch (error) {
      console.error('❌ Error deleting ranking tier:', error);
      toast.error('Gagal menghapus ranking tier');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    console.log('🔄 Toggling ranking tier status:', { id, isActive });
    
    try {
      const { data, error } = await (supabase as any)
        .from('ranking_tiers')
        .update({ is_active: isActive })
        .eq('id', id)
        .select();

      console.log('📊 Toggle response:', { data, error });

      if (error) {
        console.error('❌ Toggle error:', error);
        throw error;
      }
      
      console.log('✅ Ranking tier status updated successfully');
      toast.success(`Ranking tier berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchRankingTiers();
      onRankingTiersChange?.();
    } catch (error) {
      console.error('❌ Error toggling ranking tier:', error);
      toast.error('Gagal mengubah status ranking tier');
    }
  };

  const moveTier = async (id: string, direction: 'up' | 'down') => {
    const tierIndex = rankingTiers.findIndex(tier => tier.id === id);
    if (tierIndex === -1) return;

    const newIndex = direction === 'up' ? tierIndex - 1 : tierIndex + 1;
    if (newIndex < 0 || newIndex >= rankingTiers.length) return;

    const currentTier = rankingTiers[tierIndex];
    const targetTier = rankingTiers[newIndex];

    try {
      // Swap sort_order
      await (supabase as any)
        .from('ranking_tiers')
        .update({ sort_order: targetTier.sort_order })
        .eq('id', currentTier.id);

      await (supabase as any)
        .from('ranking_tiers')
        .update({ sort_order: currentTier.sort_order })
        .eq('id', targetTier.id);

      toast.success('Urutan ranking tier berhasil diperbarui');
      fetchRankingTiers();
      onRankingTiersChange?.();
    } catch (error) {
      console.error('Error moving ranking tier:', error);
      toast.error('Gagal mengubah urutan ranking tier');
    }
  };

  const getTierIcon = (sortOrder: number) => {
    switch (sortOrder) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      case 4: return <Star className="w-6 h-6 text-blue-500" />;
      case 5: return <Gem className="w-6 h-6 text-purple-500" />;
      default: return <Trophy className="w-6 h-6 text-primary" />;
    }
  };

  const getTierColor = (sortOrder: number) => {
    switch (sortOrder) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
      case 2: return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
      case 3: return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
      case 4: return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200';
      case 5: return 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200';
      default: return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
    }
  };

  const getTierLabel = (sortOrder: number) => {
    switch (sortOrder) {
      case 1: return 'Diamond';
      case 2: return 'Platinum';
      case 3: return 'Gold';
      case 4: return 'Silver';
      case 5: return 'Bronze';
      default: return `Tier ${sortOrder}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Manajemen Ranking Tiers</h2>
          <p className="text-muted-foreground">Kelola sistem ranking dan reward untuk pengguna</p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Tier
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Memuat data ranking tiers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rankingTiers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Belum Ada Ranking Tier</h3>
                <p className="text-muted-foreground mb-4">
                  Mulai dengan menambahkan ranking tier pertama untuk sistem penghargaan
                </p>
                <Button 
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Tier Pertama
                </Button>
              </CardContent>
            </Card>
          ) : (
            rankingTiers.map((tier, index) => (
              <Card 
                key={tier.id} 
                className={`${getTierColor(tier.sort_order)} border-2 ${!tier.is_active ? 'opacity-60' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-white/50 shadow-sm">
                        {getTierIcon(tier.sort_order)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-xl">{tier.name}</h3>
                          <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                            {tier.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          <Badge variant="outline">
                            {getTierLabel(tier.sort_order)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Urutan #{tier.sort_order} • {tier.threshold_points} poin minimum
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveTier(tier.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveTier(tier.id, 'down')}
                        disabled={index === rankingTiers.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={tier.is_active}
                        onCheckedChange={(checked) => handleToggleActive(tier.id, checked)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(tier)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(tier.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{tier.threshold_points}</div>
                      <div className="text-sm text-muted-foreground">Threshold Poin</div>
                    </div>
                    <div className="text-center p-4 bg-white/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">+{tier.bonus_points}</div>
                      <div className="text-sm text-muted-foreground">Bonus Poin</div>
                    </div>
                    <div className="text-center p-4 bg-white/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">#{tier.sort_order}</div>
                      <div className="text-sm text-muted-foreground">Urutan</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-white/20 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Dibuat:</span>
                      <span>{new Date(tier.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Diperbarui:</span>
                      <span>{new Date(tier.updated_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Ranking Tier Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTier ? 'Edit Ranking Tier' : 'Tambah Ranking Tier Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingTier 
                ? 'Edit detail ranking tier yang sudah ada'
                : 'Buat ranking tier baru untuk sistem penghargaan'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Ranking Tier</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Bronze, Silver, Gold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="threshold_points">Threshold Poin</Label>
                  <Input
                    id="threshold_points"
                    type="number"
                    min="0"
                    value={formData.threshold_points}
                    onChange={(e) => setFormData({ ...formData, threshold_points: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum poin untuk mencapai tier ini
                  </p>
                </div>

                <div>
                  <Label htmlFor="bonus_points">Bonus Poin</Label>
                  <Input
                    id="bonus_points"
                    type="number"
                    min="0"
                    value={formData.bonus_points}
                    onChange={(e) => setFormData({ ...formData, bonus_points: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Bonus poin tambahan
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="sort_order">Urutan</Label>
                <Input
                  id="sort_order"
                  type="number"
                  min="1"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  1 = Tertinggi, 2 = Kedua, dst.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Ranking Tier Aktif</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">
                {editingTier ? 'Perbarui Tier' : 'Tambah Tier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RankingTiersManagement;

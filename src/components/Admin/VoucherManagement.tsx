import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Gift, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  Gift as GiftIcon,
  Percent,
  Utensils,
  CreditCard,
  GiftOff
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import AdminPageWrapper from './AdminPageWrapper';

interface Voucher {
  id: string;
  type: "discount" | "food" | "credit";
  title: string;
  description: string;
  points_required: number;
  is_active: boolean;
  created_at: string;
  expiry_date?: string;
  code?: string;
  usage_limit?: number;
  used_count?: number;
}

interface VoucherManagementProps {
  onVoucherChange?: () => void;
}

const VoucherManagement = ({ onVoucherChange }: VoucherManagementProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<Partial<Voucher> | null>(null);
  const [formData, setFormData] = useState<Omit<Voucher, 'id' | 'created_at' | 'used_count'>>({ 
    type: "discount",
    title: "",
    description: "",
    points_required: 0,
    is_active: true,
    expiry_date: "",
    code: "",
    usage_limit: 1
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVouchers(data || []);
      if (onVoucherChange) onVoucherChange();
    } catch (error: any) {
      toast.error("Gagal memuat data voucher: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseInt(value) || 0) : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_active: checked
    }));
  };

  const resetForm = () => {
    setFormData({
      type: "discount",
      title: "",
      description: "",
      points_required: 0,
      is_active: true,
      expiry_date: "",
      code: "",
      usage_limit: 1
    });
    setCurrentVoucher(null);
  };

  const handleEdit = (voucher: Voucher) => {
    setCurrentVoucher(voucher);
    setFormData({
      type: voucher.type,
      title: voucher.title,
      description: voucher.description,
      points_required: voucher.points_required,
      is_active: voucher.is_active,
      expiry_date: voucher.expiry_date || "",
      code: voucher.code || "",
      usage_limit: voucher.usage_limit || 1
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus voucher ini?')) return;
    
    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Voucher berhasil dihapus');
      fetchVouchers();
    } catch (error: any) {
      toast.error('Gagal menghapus voucher: ' + error.message);
    }
  };

  const toggleStatus = async (voucher: Voucher) => {
    try {
      const { error } = await supabase
        .from('vouchers')
        .update({ is_active: !voucher.is_active })
        .eq('id', voucher.id);

      if (error) throw error;
      
      toast.success(`Voucher berhasil ${!voucher.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchVouchers();
    } catch (error: any) {
      toast.error('Gagal memperbarui status voucher: ' + error.message);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i === 3) result += '-';
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (currentVoucher?.id) {
        // Update existing voucher
        const { error } = await supabase
          .from('vouchers')
          .update(formData)
          .eq('id', currentVoucher.id);

        if (error) throw error;
        toast.success('Voucher berhasil diperbarui');
      } else {
        // Create new voucher
        const { error } = await supabase
          .from('vouchers')
          .insert([{
            ...formData,
            used_count: 0
          }]);

        if (error) throw error;
        toast.success('Voucher berhasil ditambahkan');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchVouchers();
    } catch (error: any) {
      toast.error('Gagal menyimpan voucher: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVoucherIcon = (type: string) => {
    switch (type) {
      case 'discount':
        return <Percent className="h-4 w-4" />;
      case 'food':
        return <Utensils className="h-4 w-4" />;
      case 'credit':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <GiftIcon className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Kelola Voucher</h2>
          <p className="text-sm text-muted-foreground">
            Kelola semua voucher yang tersedia untuk ditukar pengguna
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Voucher
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vouchers.length === 0 ? (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
            <Gift className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium">Belum ada voucher</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Mulai dengan menambahkan voucher baru
            </p>
            <Button 
              className="mt-4" 
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Voucher
            </Button>
          </div>
        ) : (
          vouchers.map((voucher) => (
            <Card 
              key={voucher.id} 
              className={`hover:shadow-lg hover:border-primary/20 transition-all duration-200 ${
                !voucher.is_active ? 'opacity-70' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          {getVoucherIcon(voucher.type)}
                        </div>
                        <h3 className="font-semibold">{voucher.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={voucher.is_active ? 'default' : 'secondary'} className="text-xs">
                          {voucher.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {voucher.description}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="gap-1">
                          {voucher.points_required} Poin
                        </Badge>
                        {voucher.code && (
                          <Badge variant="outline" className="font-mono">
                            {voucher.code}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(voucher)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(voucher)}
                      className={voucher.is_active ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' : 'text-success hover:bg-success/10 hover:text-success'}
                    >
                      {voucher.is_active ? (
                        <>
                          <X className="h-3.5 w-3.5 mr-1.5" />
                          Nonaktifkan
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Aktifkan
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(voucher.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {currentVoucher?.id ? 'Edit Voucher' : 'Tambah Voucher Baru'}
            </DialogTitle>
            <DialogDescription>
              {currentVoucher?.id 
                ? 'Perbarui detail voucher yang sudah ada.'
                : 'Tambahkan voucher baru ke dalam sistem.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipe Voucher *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange('type', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        <span>Diskon</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="food">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        <span>Makanan</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="credit">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Kredit</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="points_required">Poin yang Dibutuhkan *</Label>
                <Input
                  id="points_required"
                  name="points_required"
                  type="number"
                  min="0"
                  value={formData.points_required}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Judul Voucher *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Contoh: Diskon 50% Makan Siang"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Deskripsi lengkap voucher"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode Voucher</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    name="code"
                    value={formData.code || ''}
                    onChange={handleInputChange}
                    placeholder="Kosongkan untuk generate otomatis"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={generateRandomCode}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="usage_limit">Batas Penggunaan</Label>
                <Input
                  id="usage_limit"
                  name="usage_limit"
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">Tanggal Kedaluwarsa</Label>
              <Input
                id="expiry_date"
                name="expiry_date"
                type="date"
                value={formData.expiry_date || ''}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="is_active" className="flex flex-col space-y-1">
                <span>Status Voucher</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {formData.is_active ? 'Voucher aktif dan dapat ditukar' : 'Voucher tidak aktif'}
                </span>
              </Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={handleSwitchChange}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Menyimpan...
                  </>
                ) : currentVoucher?.id ? 'Simpan Perubahan' : 'Tambah Voucher'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const VoucherManagementWithAuth = ({ onVoucherChange }: VoucherManagementProps) => {
  return (
    <AdminPageWrapper>
      <VoucherManagement onVoucherChange={onVoucherChange} />
    </AdminPageWrapper>
  );
};

export default VoucherManagementWithAuth;


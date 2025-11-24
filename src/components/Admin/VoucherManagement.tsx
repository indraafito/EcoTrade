import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Gift } from "lucide-react";
import { toast } from "sonner";

interface Voucher {
  id: string;
  type: "discount" | "food" | "credit";
  title: string;
  description: string;
  points_required: number;
  is_active: boolean;
  created_at: string;
}

interface VoucherManagementProps {
  onVoucherChange?: () => void;
}

const VoucherManagement = ({ onVoucherChange }: VoucherManagementProps) => {
  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  // Voucher form state
  const [voucherType, setVoucherType] = useState("discount");
  const [voucherTitle, setVoucherTitle] = useState("");
  const [voucherDescription, setVoucherDescription] = useState("");
  const [voucherPoints, setVoucherPoints] = useState("");

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
    } catch (error: any) {
      toast.error("Gagal memuat voucher");
    }
  };

  const handleAddVoucher = async () => {
    try {
      const { error } = await supabase.from("vouchers").insert({
        type: voucherType as "discount" | "food" | "credit",
        title: voucherTitle,
        description: voucherDescription,
        points_required: parseInt(voucherPoints),
      });

      if (error) throw error;

      toast.success("Voucher berhasil ditambahkan!");
      setShowAddVoucher(false);
      setVoucherTitle("");
      setVoucherDescription("");
      setVoucherPoints("");
      fetchVouchers();
      onVoucherChange?.();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan voucher");
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vouchers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Voucher berhasil dihapus!");
      fetchVouchers();
      onVoucherChange?.();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus voucher");
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={showAddVoucher} onOpenChange={setShowAddVoucher}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Gift className="mr-2 h-4 w-4" />
            Tambah Voucher
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Voucher Baru</DialogTitle>
            <DialogDescription>
              Masukkan detail voucher yang akan ditambahkan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipe Voucher</Label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Diskon</SelectItem>
                  <SelectItem value="food">Makanan</SelectItem>
                  <SelectItem value="credit">Pulsa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                value={voucherTitle}
                onChange={(e) => setVoucherTitle(e.target.value)}
                placeholder="Diskon 20% Belanja"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={voucherDescription}
                onChange={(e) => setVoucherDescription(e.target.value)}
                placeholder="Dapatkan diskon 20% untuk belanja..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Poin Diperlukan</Label>
              <Input
                id="points"
                type="number"
                value={voucherPoints}
                onChange={(e) => setVoucherPoints(e.target.value)}
                placeholder="500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVoucher(false)}>
              Batal
            </Button>
            <Button onClick={handleAddVoucher}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {vouchers.map((voucher) => (
          <Card key={voucher.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{voucher.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      voucher.type === 'discount' ? 'bg-primary/10 text-primary' :
                      voucher.type === 'food' ? 'bg-success/10 text-success' :
                      'bg-accent/10 text-accent'
                    }`}>
                      {voucher.type === 'discount' ? 'Diskon' :
                       voucher.type === 'food' ? 'Makanan' : 'Pulsa'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{voucher.description}</p>
                  <p className="text-sm font-medium text-primary">{voucher.points_required} poin</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteVoucher(voucher.id)}
                >
                  Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default VoucherManagement;


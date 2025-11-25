import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  MapPinOff,
  MapPin as MapPinIcon
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  created_at: string;
}

interface LocationManagementProps {
  onLocationChange?: () => void;
}

const LocationManagement = ({ onLocationChange }: LocationManagementProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Partial<Location> | null>(null);
  const [formData, setFormData] = useState<Omit<Location, 'id' | 'created_at'>>({ 
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    is_active: true
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLocations(data || []);
      if (onLocationChange) onLocationChange();
    } catch (error: any) {
      toast.error("Gagal memuat data lokasi: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'latitude' || name === 'longitude' 
        ? parseFloat(value) || 0 
        : value
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
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      is_active: true
    });
    setCurrentLocation(null);
  };

  const handleEdit = (location: Location) => {
    setCurrentLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      is_active: location.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus lokasi ini?')) return;
    
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Lokasi berhasil dihapus');
      fetchLocations();
    } catch (error: any) {
      toast.error('Gagal menghapus lokasi: ' + error.message);
    }
  };

  const toggleStatus = async (location: Location) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ is_active: !location.is_active })
        .eq('id', location.id);

      if (error) throw error;
      
      toast.success(`Lokasi berhasil ${!location.is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchLocations();
    } catch (error: any) {
      toast.error('Gagal memperbarui status lokasi: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (currentLocation?.id) {
        // Update existing location
        const { error } = await supabase
          .from('locations')
          .update(formData)
          .eq('id', currentLocation.id);

        if (error) throw error;
        toast.success('Lokasi berhasil diperbarui');
      } else {
        // Create new location
        const { error } = await supabase
          .from('locations')
          .insert([formData]);

        if (error) throw error;
        toast.success('Lokasi berhasil ditambahkan');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchLocations();
    } catch (error: any) {
      toast.error('Gagal menyimpan lokasi: ' + error.message);
    } finally {
      setIsSubmitting(false);
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
          <h2 className="text-2xl font-bold">Kelola Lokasi</h2>
          <p className="text-sm text-muted-foreground">
            Kelola semua lokasi pengumpulan sampah
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Lokasi
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentLocation?.id ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
            </DialogTitle>
            <DialogDescription>
              {currentLocation?.id 
                ? 'Perbarui detail lokasi pengumpulan sampah.'
                : 'Tambahkan lokasi pengumpulan sampah baru ke dalam sistem.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lokasi *</Label>
                <Input 
                  id="name" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Contoh: Bank Sampah Cempaka" 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Alamat Lengkap *</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Contoh: Jl. Cempaka No. 123, Jakarta Selatan"
                  className="min-h-[100px]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="Contoh: -6.2088"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="Contoh: 106.8456"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="is_active" className="flex flex-col space-y-1">
                  <span>Status Lokasi</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {formData.is_active ? 'Lokasi aktif dan dapat dipilih' : 'Lokasi tidak aktif'}
                  </span>
                </Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={handleSwitchChange}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                <p>* Wajib diisi</p>
              </div>
            </div>
            <DialogFooter>
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
                ) : currentLocation?.id ? 'Simpan Perubahan' : 'Tambah Lokasi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.length === 0 ? (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
            <MapPinOff className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium">Belum ada lokasi</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Mulai dengan menambahkan lokasi baru
            </p>
            <Button 
              className="mt-4" 
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Lokasi
            </Button>
          </div>
        ) : (
          locations.map((location) => (
            <Card 
              key={location.id} 
              className={`hover:shadow-md transition-shadow ${
                !location.is_active ? 'opacity-70' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{location.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={location.is_active ? 'default' : 'secondary'} className="text-xs">
                          {location.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPinIcon className="h-3.5 w-3.5" />
                      <span>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(location)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(location)}
                      className={location.is_active ? 'text-destructive' : 'text-green-600'}
                    >
                      {location.is_active ? (
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
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => handleDelete(location.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LocationManagement;


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
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  MapPinOff,
  MapPin as MapPinIcon,
  QrCode,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { generateLocationQRCodeAPI, saveLocationQRCode } from "@/lib/qr-generator";

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  created_at: string;
  qr_code_url?: string;
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
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedQRLocation, setSelectedQRLocation] = useState<Location | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
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
      // FIX: Gunakan destructuring yang konsisten
      const { data: locationsData, error: locationsError } = await (supabase as any)
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });

      console.log('🔍 Locations response:', { data: locationsData, error: locationsError });

      if (locationsError) {
        console.error('❌ Database error:', locationsError);
        throw locationsError;
      }

      // Fetch QR codes separately
      const { data: qrCodesData, error: qrCodesError } = await (supabase as any)
        .from("location_qr_codes")
        .select("location_id, qr_code_url");

      console.log('🔍 QR codes response:', { data: qrCodesData, error: qrCodesError });

      if (qrCodesError) {
        console.error('❌ QR codes error:', qrCodesError);
      }

      // Merge QR codes into locations
      const locationsWithQR = (locationsData || []).map((location: any) => {
        const qrCode = (qrCodesData as any[])?.find((qr: any) => qr.location_id === location.id);
        return {
          ...location,
          qr_code_url: qrCode?.qr_code_url || null
        };
      });
      
      setLocations(locationsWithQR);
      console.log('🔍 Locations set:', locationsWithQR);
      console.log('🔍 Locations count:', locationsWithQR.length);
      if (onLocationChange) onLocationChange();
    } catch (error: any) {
      console.error('❌ Error fetching locations:', error);
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

  // FIX: Simplified QR code logic - no race conditions
  const showQRCode = async (location: Location) => {
    try {
      // Always show dialog first
      setSelectedQRLocation(location);
      setQrDialogOpen(true);

      // If QR code doesn't exist, generate it
      if (!location.qr_code_url) {
        setIsGeneratingQR(true);
        
        try {
          // Generate QR code
          const qrCodeUrl = await generateLocationQRCodeAPI({
            id: location.id,
            name: location.name
          });
          
          // Save to database
          const result = await saveLocationQRCode(location.id, qrCodeUrl);
          
          if (result.success) {
            // Update both dialog and list
            const updatedLocation = { ...location, qr_code_url: qrCodeUrl };
            setSelectedQRLocation(updatedLocation);
            fetchLocations();
            
            if (result.isNew) {
              toast.success('QR Code berhasil dibuat');
            }
          } else {
            toast.error('QR Code gagal disimpan');
          }
        } catch (error) {
          console.error('Error generating QR:', error);
          toast.error('Gagal membuat QR Code');
        } finally {
          setIsGeneratingQR(false);
        }
      }
    } catch (error: any) {
      toast.error('Gagal menampilkan QR Code: ' + error.message);
      setIsGeneratingQR(false);
    }
  };

  const downloadQRCode = (location: Location) => {
    try {
      if (!location.qr_code_url) {
        toast.error('QR Code belum tersedia');
        return;
      }

      const link = document.createElement('a');
      link.href = location.qr_code_url;
      link.download = `qr-code-${location.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('QR Code berhasil diunduh');
    } catch (error: any) {
      toast.error('Gagal mengunduh QR Code: ' + error.message);
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
        const { data, error } = await supabase
          .from("locations")
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        
        // Auto-generate QR code for new location
        if (data && data.id) {
          try {
            console.log('Generating QR code for new location:', data);
            
            const qrCodeUrl = await generateLocationQRCodeAPI({
              id: data.id,
              name: data.name
            });
            
            console.log('QR code generated:', qrCodeUrl);
            
            const result = await saveLocationQRCode(data.id, qrCodeUrl);
            
            if (result.success) {
              toast.success('Lokasi dan QR Code berhasil ditambahkan');
            } else {
              toast.success('Lokasi berhasil ditambahkan (QR Code gagal disimpan)');
            }
          } catch (qrError) {
            console.error('Error generating QR code:', qrError);
            toast.success('Lokasi berhasil ditambahkan (QR Code gagal dibuat)');
          }
        } else {
          toast.success('Lokasi berhasil ditambahkan');
        }
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
                className="hover:bg-primary/10 hover:text-primary hover:border-primary/20"
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
              className={`hover:shadow-lg hover:border-primary/20 transition-all duration-200 ${
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
                  {location.qr_code_url && (
                    <div className="ml-4">
                      <img 
                        src={location.qr_code_url} 
                        alt={`QR Code ${location.name}`}
                        className="w-16 h-16 border rounded"
                      />
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(location)}
                      className="hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showQRCode(location)}
                      className="hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1.5" />
                      QR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(location)}
                      className={location.is_active ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' : 'text-success hover:bg-success/10 hover:text-success'}
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
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code Lokasi
            </DialogTitle>
            <DialogDescription>
              QR Code untuk {selectedQRLocation?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedQRLocation && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {selectedQRLocation.qr_code_url ? (
                  <img 
                    src={selectedQRLocation.qr_code_url} 
                    alt={`QR Code ${selectedQRLocation.name}`}
                    className="w-64 h-64 border-2 border-gray-200 rounded-lg"
                    onLoad={() => console.log('QR Code loaded successfully')}
                    onError={() => console.error('QR Code failed to load')}
                  />
                ) : (
                  <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-gray-500">Membuat QR Code...</p>
                      <p className="text-xs text-gray-400">Mohon tunggu sebentar</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-center">
                <h3 className="font-semibold">{selectedQRLocation.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedQRLocation.address}</p>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <MapPinIcon className="h-3 w-3" />
                  <span>{selectedQRLocation.latitude.toFixed(6)}, {selectedQRLocation.longitude.toFixed(6)}</span>
                </div>
              </div>
              
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadQRCode(selectedQRLocation)}
                  className="flex-1 hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                  disabled={!selectedQRLocation.qr_code_url || isGeneratingQR}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Unduh QR Code
                </Button>
                <Button
                  onClick={() => setQrDialogOpen(false)}
                  className="flex-1"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationManagement;
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

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
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  // Location form state
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");

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
    } catch (error: any) {
      toast.error("Gagal memuat lokasi");
    }
  };

  const handleAddLocation = async () => {
    try {
      const { error } = await supabase.from("locations").insert({
        name: locationName,
        address: locationAddress,
        latitude: parseFloat(locationLat),
        longitude: parseFloat(locationLng),
      });

      if (error) throw error;

      toast.success("Lokasi berhasil ditambahkan!");
      setShowAddLocation(false);
      setLocationName("");
      setLocationAddress("");
      setLocationLat("");
      setLocationLng("");
      fetchLocations();
      onLocationChange?.();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan lokasi");
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("locations")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Lokasi berhasil dinonaktifkan!");
      fetchLocations();
      onLocationChange?.();
    } catch (error: any) {
      toast.error(error.message || "Gagal menonaktifkan lokasi");
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <MapPin className="mr-2 h-4 w-4" />
            Tambah Lokasi
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Lokasi Baru</DialogTitle>
            <DialogDescription>
              Masukkan detail lokasi tempat sampah EcoTrade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lokasi</Label>
              <Input
                id="name"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="EcoTrade Hub Central"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Jl. Sudirman No. 123, Jakarta"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={locationLat}
                  onChange={(e) => setLocationLat(e.target.value)}
                  placeholder="-6.208763"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={locationLng}
                  onChange={(e) => setLocationLng(e.target.value)}
                  placeholder="106.845599"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLocation(false)}>
              Batal
            </Button>
            <Button onClick={handleAddLocation}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {locations.filter(loc => loc.is_active).map((location) => (
          <Card key={location.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{location.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{location.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {location.latitude}, {location.longitude}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteLocation(location.id)}
                >
                  Nonaktifkan
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LocationManagement;


import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// MAP
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
}

// FIX leaflet icon bug
const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const LocationPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [nearLocations, setNearLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Ambil data dari Supabase
  useEffect(() => {
    fetchLocations();
    getUserPosition();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat lokasi");
    } finally {
      setIsLoading(false);
    }
  };

  // Ambil GPS user
  const getUserPosition = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        computeNearestLocations(pos.coords.latitude, pos.coords.longitude);
      },
      () => toast.error("Aktifkan GPS untuk melihat lokasi terdekat")
    );
  };

  // Hitung jarak (Haversine)
  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // Ambil 5 lokasi terdekat (km)
  const computeNearestLocations = (lat: number, lng: number) => {
    const sorted = [...locations]
      .map((loc) => ({
        ...loc,
        distance: calcDistance(lat, lng, loc.latitude, loc.longitude),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    setNearLocations(sorted);
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* HEADER */}
      <div className="bg-primary p-6 rounded-b-3xl shadow-eco mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Lokasi EcoTrade</h1>
        <p className="text-white/90">Temukan tempat sampah terdekat</p>
      </div>

      <div className="px-6 space-y-4">

        {/* ---------------- MAP REAL ---------------- */}
        {userPos ? (
          <MapContainer
            center={[userPos.lat, userPos.lng]}
            zoom={15}
            style={{ height: "350px", width: "100%" }}
            className="rounded-xl shadow-md"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* User Position */}
            <Marker position={[userPos.lat, userPos.lng]}>
              <Popup>Lokasi Anda</Popup>
            </Marker>

            {/* Radius */}
            <Circle
              center={[userPos.lat, userPos.lng]}
              radius={300}
              pathOptions={{ color: "#22c55e", fillOpacity: 0.2 }}
            />

            {/* All markers from DB */}
            {locations.map((loc) => (
              <Marker
                key={loc.id}
                position={[loc.latitude, loc.longitude]}
                eventHandlers={{
                  click: () => setSelectedLocation(loc),
                }}
              >
                <Popup>{loc.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="bg-muted/50 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px]">
            <MapPin className="w-16 h-16 text-primary mb-4" />
            <p className="text-center text-muted-foreground">
              Mengambil lokasi Anda...
            </p>
          </div>
        )}

        {/* ---------------- NEAREST 5 LOCATIONS ---------------- */}
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-3">5 Lokasi Terdekat</h2>

          {nearLocations.map((location) => (
            <Card
              key={location.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedLocation(location)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {location.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {location.address}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ---------------- DIALOG DETAIL ---------------- */}
      <Dialog
        open={!!selectedLocation}
        onOpenChange={() => setSelectedLocation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLocation?.name}</DialogTitle>
            <DialogDescription>
              {selectedLocation?.address}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Koordinat</p>
              <p className="font-mono text-sm">
                {selectedLocation?.latitude}, {selectedLocation?.longitude}
              </p>
            </div>

            <Button
              onClick={() =>
                selectedLocation &&
                openInMaps(
                  selectedLocation.latitude,
                  selectedLocation.longitude
                )
              }
              className="w-full"
            >
              <Navigation className="w-4 h-4 mr-2" /> Buka di Maps
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default LocationPage;

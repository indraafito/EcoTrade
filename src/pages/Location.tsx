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
import { MapPin, Navigation, Search, Locate, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

// MAP
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
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

// Custom Icons
const UserIcon = L.divIcon({
  html: `<div style="
    width: 32px;
    height: 32px;
    background: #3b82f6;
    border: 3px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: 'user-location-icon'
});

const ActiveLocationIcon = L.divIcon({
  html: `<div style="
    width: 36px;
    height: 36px;
    background: #22c55e;
    border: 3px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  className: 'active-location-icon'
});

const InactiveLocationIcon = L.divIcon({
  html: `<div style="
    width: 36px;
    height: 36px;
    background: #ef4444;
    border: 3px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    opacity: 0.7;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <line x1="15" y1="7" x2="9" y2="13"/>
      <line x1="9" y1="7" x2="15" y2="13"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  className: 'inactive-location-icon'
});

// Component to recenter map
const RecenterMap = ({ center }: { center: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
};

const LocationPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [nearLocations, setNearLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationPermission, setLocationPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchLocations();
    checkLocationPermission();
  }, []);

  useEffect(() => {
    if (locations.length > 0 && userPos) {
      computeNearestLocations(userPos.lat, userPos.lng);
    }
  }, [locations, userPos]);

  useEffect(() => {
    // Filter locations based on search
    if (searchQuery.trim() === "") {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(
        (loc) =>
          loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchQuery, locations]);

  const checkLocationPermission = async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(result.state);
        
        if (result.state === 'granted') {
          getUserPosition();
        } else if (result.state === 'prompt') {
          setShowLocationDialog(true);
        }
      } catch (error) {
        setShowLocationDialog(true);
      }
    } else {
      setShowLocationDialog(true);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");

      if (error) throw error;
      setLocations(data || []);
      setFilteredLocations(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat lokasi");
    } finally {
      setIsLoading(false);
    }
  };

  const getUserPosition = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserPos(position);
        setMapCenter(position);
        setLocationPermission("granted");
        setShowLocationDialog(false);
        toast.success("Lokasi Anda ditemukan");
      },
      (error) => {
        setLocationPermission("denied");
        toast.error("Gagal mengakses lokasi. Pastikan GPS aktif.");
      }
    );
  };

  const handleEnableLocation = () => {
    getUserPosition();
  };

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

  const computeNearestLocations = (lat: number, lng: number) => {
    const sorted = [...locations]
      .filter(loc => loc.is_active)
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

  const centerToUserLocation = () => {
    if (userPos) {
      setMapCenter({ ...userPos });
      toast.success("Peta dipusatkan ke lokasi Anda");
    } else {
      toast.error("Lokasi Anda belum tersedia");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const defaultCenter = userPos || { lat: -7.9797, lng: 112.6304 }; // Default: Malang

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* HEADER */}
      <div className="bg-primary p-6 rounded-b-3xl shadow-eco mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Lokasi EcoTrade</h1>
        <p className="text-white/90">Temukan tempat sampah terdekat</p>
      </div>

      <div className="px-6 space-y-4">
        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type="text"
            placeholder="Cari lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* LOCATION PERMISSION ALERT */}
        {!userPos && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aktifkan lokasi untuk melihat tempat terdekat dari Anda
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableLocation}
                className="ml-2"
              >
                Aktifkan Lokasi
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* MAP */}
        <div className="relative">
          <MapContainer
            center={defaultCenter}
            zoom={15}
            style={{ height: "350px", width: "100%" }}
            className="rounded-xl shadow-md"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {mapCenter && <RecenterMap center={mapCenter} />}

            {/* User Position */}
            {userPos && (
              <>
                <Marker position={userPos} icon={UserIcon}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold">Lokasi Anda</p>
                      <p className="text-xs text-muted-foreground">
                        {userPos.lat.toFixed(6)}, {userPos.lng.toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Radius */}
                <Circle
                  center={userPos}
                  radius={500}
                  pathOptions={{ color: "#3b82f6", fillOpacity: 0.1 }}
                />
              </>
            )}

            {/* Location Markers */}
            {filteredLocations.map((loc) => (
              <Marker
                key={loc.id}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                icon={loc.is_active ? ActiveLocationIcon : InactiveLocationIcon}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>{loc.name}</p>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{loc.address}</p>
                    <div style={{ marginTop: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: loc.is_active ? '#dcfce7' : '#fee2e2',
                          color: loc.is_active ? '#15803d' : '#991b1b'
                        }}
                      >
                        {loc.is_active ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInMaps(loc.latitude, loc.longitude);
                      }}
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#22c55e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                      </svg>
                      Buka Maps
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Center to User Button */}
          {userPos && (
            <Button
              size="icon"
              onClick={centerToUserLocation}
              className="absolute bottom-4 right-4 z-[1000] shadow-lg"
            >
              <Locate className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* NEAREST LOCATIONS */}
        {userPos && nearLocations.length > 0 && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-3">5 Lokasi Terdekat</h2>

            <div className="space-y-2">
              {nearLocations.map((location) => (
                <Card
                  key={location.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setMapCenter({
                      lat: location.latitude,
                      lng: location.longitude,
                    });
                    // Scroll ke map
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    toast.success(`Peta menuju ${location.name}`);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          location.is_active ? "bg-green-500/10" : "bg-red-500/10"
                        }`}
                      >
                        <MapPin
                          className={`w-5 h-5 ${
                            location.is_active ? "text-green-500" : "text-red-500"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{location.name}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              location.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {location.is_active ? "Aktif" : "Tutup"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {location.address}
                        </p>
                        {location.distance !== undefined && (
                          <p className="text-xs text-primary font-medium mt-1">
                            📍 {location.distance.toFixed(2)} km dari Anda
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ALL LOCATIONS LIST */}
        {searchQuery && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold mb-3">
              Hasil Pencarian ({filteredLocations.length})
            </h2>

            {filteredLocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada lokasi ditemukan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLocations.map((location) => (
                  <Card
                    key={location.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedLocation(location)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            location.is_active ? "bg-green-500/10" : "bg-red-500/10"
                          }`}
                        >
                          <MapPin
                            className={`w-5 h-5 ${
                              location.is_active ? "text-green-500" : "text-red-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {location.name}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                location.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {location.is_active ? "Aktif" : "Tutup"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {location.address}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LOCATION PERMISSION DIALOG */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Izinkan Akses Lokasi</DialogTitle>
            <DialogDescription>
              Aplikasi memerlukan akses lokasi untuk menampilkan tempat sampah terdekat dari Anda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <MapPin className="w-16 h-16 mx-auto text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                Kami akan menggunakan lokasi Anda untuk menampilkan tempat-tempat terdekat
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowLocationDialog(false)}
                className="flex-1"
              >
                Nanti Saja
              </Button>
              <Button onClick={handleEnableLocation} className="flex-1">
                <Locate className="w-4 h-4 mr-2" /> Izinkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LOCATION DETAIL DIALOG */}
      <Dialog open={!!selectedLocation} onOpenChange={() => setSelectedLocation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLocation?.name}
              <span
                className={`text-xs px-2 py-1 rounded ${
                  selectedLocation?.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {selectedLocation?.is_active ? "Aktif" : "Tidak Aktif"}
              </span>
            </DialogTitle>
            <DialogDescription>{selectedLocation?.address}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Koordinat</p>
              <p className="font-mono text-sm">
                {selectedLocation?.latitude}, {selectedLocation?.longitude}
              </p>
            </div>

            {userPos && selectedLocation && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Jarak dari Anda</p>
                <p className="font-semibold text-lg text-primary">
                  {calcDistance(
                    userPos.lat,
                    userPos.lng,
                    selectedLocation.latitude,
                    selectedLocation.longitude
                  ).toFixed(2)}{" "}
                  km
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedLocation) {
                    setMapCenter({
                      lat: selectedLocation.latitude,
                      lng: selectedLocation.longitude,
                    });
                    setSelectedLocation(null);
                    toast.success("Peta dipusatkan ke lokasi ini");
                  }
                }}
                className="flex-1"
              >
                <MapPin className="w-4 h-4 mr-2" /> Lihat di Peta
              </Button>
              <Button
                onClick={() =>
                  selectedLocation &&
                  openInMaps(selectedLocation.latitude, selectedLocation.longitude)
                }
                className="flex-1"
              >
                <Navigation className="w-4 h-4 mr-2" /> Buka di Maps
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default LocationPage;
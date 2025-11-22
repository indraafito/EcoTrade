import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import Loading from "@/components/Loading";
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
  const [showSuggestions, setShowSuggestions] = useState(false);

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
    return <Loading />;
  }

  const defaultCenter = userPos || { lat: -7.9797, lng: 112.6304 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 pb-28">
      {/* HEADER WITH GRADIENT */}
      <div className="relative bg-gradient-to-br from-primary via-[#17a865] to-[#1DBF73] px-6 pt-12 pb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Lokasi EcoTrade</h1>
            </div>
          </div>
          <p className="text-white/90 text-sm font-medium ml-15">Temukan tempat sampah terdekat</p>
        </div>
      </div>

      <div className="px-6 -mt-4 space-y-6">
        {/* SEARCH BAR WITH SUGGESTIONS */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
          <Input
            type="text"
            placeholder="Cari lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            className="pl-12 pr-12 h-12 rounded-2xl bg-card/80 backdrop-blur-xl border-white/20 shadow-lg"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSuggestions(false);
              }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          
          {/* SEARCH SUGGESTIONS DROPDOWN */}
          {showSuggestions && searchQuery && filteredLocations.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-50 max-h-64 overflow-y-auto">
              {filteredLocations.slice(0, 5).map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    setMapCenter({
                      lat: location.latitude,
                      lng: location.longitude,
                    });
                    setSearchQuery(location.name);
                    setShowSuggestions(false);
                    window.scrollTo({ top: 200, behavior: 'smooth' });
                    toast.success(`Menampilkan ${location.name}`);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-primary/5 transition-colors text-left border-b border-border/30 last:border-0"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    location.is_active 
                      ? "bg-gradient-to-br from-primary/20 to-[#1DBF73]/20" 
                      : "bg-gradient-to-br from-red-500/20 to-red-600/20"
                  }`}>
                    <MapPin className={`w-5 h-5 ${location.is_active ? "text-primary" : "text-red-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{location.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{location.address}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg font-semibold shrink-0 ${
                    location.is_active
                      ? "bg-green-500/10 text-green-600"
                      : "bg-red-500/10 text-red-600"
                  }`}>
                    {location.is_active ? "Aktif" : "Tutup"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LOCATION PERMISSION ALERT */}
        {!userPos && (
          <Alert className="bg-card/80 backdrop-blur-xl border-white/20 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span className="text-sm">Aktifkan lokasi untuk melihat tempat terdekat</span>
              <Button
                size="sm"
                onClick={handleEnableLocation}
                className="bg-primary hover:bg-primary/90 shrink-0"
              >
                <Locate className="w-4 h-4 mr-1" />
                Aktifkan
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* MAP CONTAINER WITH MODERN STYLE */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gradient-to-br from-primary/5 to-transparent">
          <MapContainer
            center={defaultCenter}
            zoom={15}
            style={{ height: "400px", width: "100%", zIndex: 0 }}
            zoomControl={false}
            className="map-modern"
          >
            {/* Dark Mode Tile Layer - More Modern Look */}
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {mapCenter && <RecenterMap center={mapCenter} />}

            {userPos && (
              <>
                <Marker position={userPos} icon={UserIcon}>
                  <Popup className="custom-popup">
                    <div className="text-center p-2">
                      <p className="font-bold text-sm mb-1">📍 Lokasi Anda</p>
                      <p className="text-xs text-muted-foreground">
                        {userPos.lat.toFixed(6)}, {userPos.lng.toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                <Circle
                  center={userPos}
                  radius={500}
                  pathOptions={{ 
                    color: "#1DBF73", 
                    fillColor: "#1DBF73",
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: "5, 5"
                  }}
                />
              </>
            )}

            {filteredLocations.map((loc) => (
              <Marker
                key={loc.id}
                position={{ lat: loc.latitude, lng: loc.longitude }}
                icon={loc.is_active ? ActiveLocationIcon : InactiveLocationIcon}
                eventHandlers={{
                  click: () => {
                    setMapCenter({ lat: loc.latitude, lng: loc.longitude });
                  }
                }}
              >
                <Popup className="custom-popup" maxWidth={240}>
                  <div style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <p style={{ fontWeight: '700', fontSize: '14px', flex: 1, margin: 0 }}>{loc.name}</p>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: loc.is_active ? '#dcfce7' : '#fee2e2',
                          color: loc.is_active ? '#15803d' : '#991b1b'
                        }}
                      >
                        {loc.is_active ? "✓ Aktif" : "✗ Tutup"}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px', lineHeight: '1.4' }}>
                      📍 {loc.address}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInMaps(loc.latitude, loc.longitude);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, #1DBF73 0%, #17a865 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(29, 191, 115, 0.3)',
                        transition: 'transform 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                      </svg>
                      Buka di Google Maps
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Custom Zoom Controls */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <Button
              size="icon"
              className="bg-card/95 backdrop-blur-xl hover:bg-card text-foreground shadow-lg w-10 h-10 rounded-xl border border-white/20"
              onClick={() => {
                const map = document.querySelector('.leaflet-container') as any;
                if (map && map._leaflet_map) {
                  map._leaflet_map.zoomIn();
                }
              }}
            >
              <span className="text-lg font-bold">+</span>
            </Button>
            <Button
              size="icon"
              className="bg-card/95 backdrop-blur-xl hover:bg-card text-foreground shadow-lg w-10 h-10 rounded-xl border border-white/20"
              onClick={() => {
                const map = document.querySelector('.leaflet-container') as any;
                if (map && map._leaflet_map) {
                  map._leaflet_map.zoomOut();
                }
              }}
            >
              <span className="text-lg font-bold">−</span>
            </Button>
          </div>

          {userPos && (
            <Button
              size="icon"
              onClick={centerToUserLocation}
              className="absolute bottom-4 right-4 z-[1000] shadow-2xl bg-primary hover:bg-primary/90 w-12 h-12 rounded-xl"
            >
              <Locate className="w-5 h-5" />
            </Button>
          )}
        </div>

        <style jsx>{`
          .map-modern .leaflet-popup-content-wrapper {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 0;
          }
          .map-modern .leaflet-popup-content {
            margin: 0;
            min-width: 200px;
          }
          .map-modern .leaflet-popup-tip {
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .map-modern .leaflet-container {
            font-family: inherit;
          }
        `}</style>

        {/* NEAREST LOCATIONS */}
        {userPos && nearLocations.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">5 Lokasi Terdekat</h2>

            <div className="space-y-3">
              {nearLocations.map((location) => (
                <Card
                  key={location.id}
                  className="cursor-pointer bg-card/80 backdrop-blur-xl border-white/20 shadow-lg"
                  onClick={() => {
                    setMapCenter({
                      lat: location.latitude,
                      lng: location.longitude,
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    toast.success(`Peta menuju ${location.name}`);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-foreground text-base truncate">{location.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-semibold shrink-0">
                            Aktif
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {location.address}
                        </p>
                        {location.distance !== undefined && (
                          <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-lg w-fit">
                            <Navigation className="w-3.5 h-3.5 text-primary" />
                            <p className="text-xs text-primary font-bold">
                              {location.distance.toFixed(2)} km
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH RESULTS */}
        {searchQuery && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Hasil Pencarian ({filteredLocations.length})
            </h2>

            {filteredLocations.length === 0 ? (
              <div className="text-center py-12 bg-card/50 backdrop-blur-xl rounded-3xl border border-white/20">
                <MapPin className="w-16 h-16 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">Tidak ada lokasi ditemukan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLocations.map((location) => (
                  <Card
                    key={location.id}
                    className="cursor-pointer bg-card/80 backdrop-blur-xl border-white/20 shadow-lg"
                    onClick={() => setSelectedLocation(location)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          location.is_active 
                            ? "bg-gradient-to-br from-green-500/20 to-green-600/20" 
                            : "bg-gradient-to-br from-red-500/20 to-red-600/20"
                        }`}>
                          <MapPin className={`w-6 h-6 ${location.is_active ? "text-green-600" : "text-red-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-foreground text-base truncate">
                              {location.name}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                              location.is_active
                                ? "bg-green-500/10 text-green-600"
                                : "bg-red-500/10 text-red-600"
                            }`}>
                              {location.is_active ? "Aktif" : "Tutup"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
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

      {/* DIALOGS */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-white/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Izinkan Akses Lokasi</DialogTitle>
            <DialogDescription>
              Aplikasi memerlukan akses lokasi untuk menampilkan tempat sampah terdekat dari Anda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-primary/5 rounded-2xl p-6 text-center border border-primary/10">
              <MapPin className="w-16 h-16 mx-auto text-primary mb-3" />
              <p className="text-sm text-muted-foreground">
                Kami akan menggunakan lokasi Anda untuk menampilkan tempat-tempat terdekat
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLocationDialog(false)}
                className="flex-1"
              >
                Nanti Saja
              </Button>
              <Button onClick={handleEnableLocation} className="flex-1 bg-primary hover:bg-primary/90">
                <Locate className="w-4 h-4 mr-2" /> Izinkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedLocation} onOpenChange={() => setSelectedLocation(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {selectedLocation?.name}
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                selectedLocation?.is_active
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
              }`}>
                {selectedLocation?.is_active ? "Aktif" : "Tidak Aktif"}
              </span>
            </DialogTitle>
            <DialogDescription>{selectedLocation?.address}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1 font-semibold">Koordinat</p>
              <p className="font-mono text-sm font-medium">
                {selectedLocation?.latitude}, {selectedLocation?.longitude}
              </p>
            </div>

            {userPos && selectedLocation && (
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <p className="text-xs text-muted-foreground mb-1 font-semibold">Jarak dari Anda</p>
                <p className="font-black text-2xl text-primary">
                  {calcDistance(
                    userPos.lat,
                    userPos.lng,
                    selectedLocation.latitude,
                    selectedLocation.longitude
                  ).toFixed(2)} km
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedLocation) {
                    setMapCenter({
                      lat: selectedLocation.latitude,
                      lng: selectedLocation.longitude,
                    });
                    setSelectedLocation(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Navigation className="w-4 h-4 mr-2" /> Buka Maps
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
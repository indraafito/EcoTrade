import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav, Loading } from "@/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Navigation,
  Search,
  Locate,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

// MAP
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  distance?: number;
}

// Custom Icons
const UserIcon = L.divIcon({
  html: `<div style="
    width: 28px;
    height: 28px;
    background: #3b82f6;
    border: 2px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: "user-location-icon",
});

const ActiveLocationIcon = L.divIcon({
  html: `<div style="
    width: 32px;
    height: 32px;
    background: #22c55e;
    border: 2px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  className: "active-location-icon",
});

const InactiveLocationIcon = L.divIcon({
  html: `<div style="
    width: 32px;
    height: 32px;
    background: #ef4444;
    border: 2px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    opacity: 0.7;
  ">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <line x1="15" y1="7" x2="9" y2="13"/>
      <line x1="9" y1="7" x2="15" y2="13"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  className: "inactive-location-icon",
});

// Component to recenter map and handle resize
const RecenterMap = ({ center }: { center: { lat: number; lng: number } }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener("resize", handleResize);
    // Initial resize
    setTimeout(() => map.invalidateSize(), 100);

    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  return null;
};

const LocationPage = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [nearLocations, setNearLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const mapRef = useRef<any>(null);

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
    if ("permissions" in navigator) {
      try {
        const result = await navigator.permissions.query({
          name: "geolocation",
        });
        setLocationPermission(result.state);

        if (result.state === "granted") {
          getUserPosition();
        } else if (result.state === "prompt") {
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

  const calcDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
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
      .filter((loc) => loc.is_active)
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
    <div className="min-h-screen bg-gradient-to-br from-[#1DBF73]/5 via-background to-primary/5 pb-24 md:pb-28 overflow-x-hidden">
      {/* HEADER WITH GRADIENT - Responsive */}
      <div className="relative bg-gradient-to-br from-primary via-[#17a865] to-[#1DBF73] px-4 sm:px-6 pt-8 sm:pt-10 md:pt-12 pb-6 sm:pb-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Lokasi EcoTrade
              </h1>
            </div>
          </div>
          <p className="text-white/90 text-xs sm:text-sm font-medium ml-12 sm:ml-15">
            Temukan tempat sampah terdekat
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-4 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        {/* SEARCH BAR WITH SUGGESTIONS - Responsive */}
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5 z-10" />
          <Input
            type="text"
            placeholder="Cari lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-card/80 backdrop-blur-xl border-white/20 shadow-lg text-sm sm:text-base"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSuggestions(false);
              }}
              className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 z-10"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {/* SEARCH SUGGESTIONS DROPDOWN - Responsive */}
          {showSuggestions && searchQuery && filteredLocations.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-2xl rounded-xl sm:rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-50 max-h-60 sm:max-h-64 overflow-y-auto">
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
                    window.scrollTo({ top: 200, behavior: "smooth" });
                    toast.success(`Menampilkan ${location.name}`);
                  }}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3 hover:bg-primary/5 transition-colors text-left border-b border-border/30 last:border-0"
                >
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                      location.is_active
                        ? "bg-gradient-to-br from-primary/20 to-[#1DBF73]/20"
                        : "bg-gradient-to-br from-red-500/20 to-red-600/20"
                    }`}
                  >
                    <MapPin
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        location.is_active ? "text-primary" : "text-red-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {location.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {location.address}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg font-semibold shrink-0 ${
                      location.is_active
                        ? "bg-green-500/10 text-green-600"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {location.is_active ? "Aktif" : "Tutup"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* LOCATION PERMISSION ALERT - Responsive */}
        {!userPos && (
          <Alert className="bg-card/80 backdrop-blur-xl border-white/20 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-xs sm:text-sm">
                Aktifkan lokasi untuk melihat tempat terdekat
              </span>
              <Button
                size="sm"
                onClick={handleEnableLocation}
                className="bg-primary hover:bg-primary/90 shrink-0 text-xs sm:text-sm h-8 sm:h-9"
              >
                <Locate className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Aktifkan
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* MAP CONTAINER - Responsive Heights */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/20 sm:border-2 bg-gradient-to-br from-primary/5 to-transparent">
          <MapContainer
            center={defaultCenter}
            zoom={15}
            style={{
              height: "250px",
              width: "100%",
              zIndex: 0,
            }}
            zoomControl={false}
            className="map-modern"
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {mapCenter && <RecenterMap center={mapCenter} />}

            {userPos && (
              <>
                <Marker position={userPos} icon={UserIcon}>
                  <Popup className="custom-popup" maxWidth={200}>
                    <div className="text-center p-2">
                      <p className="font-bold text-xs mb-1">📍 Lokasi Anda</p>
                      <p className="text-[10px] text-muted-foreground">
                        {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}
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
                    dashArray: "5, 5",
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
                  },
                }}
              >
                <Popup className="custom-popup" maxWidth={220}>
                  <div style={{ padding: "6px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: "700",
                          fontSize: "13px",
                          flex: "1 1 auto",
                          margin: 0,
                          minWidth: 0,
                        }}
                      >
                        {loc.name}
                      </p>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 6px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          fontWeight: "600",
                          backgroundColor: loc.is_active
                            ? "#dcfce7"
                            : "#fee2e2",
                          color: loc.is_active ? "#15803d" : "#991b1b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {loc.is_active ? "✓ Aktif" : "✗ Tutup"}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#666",
                        marginBottom: "10px",
                        lineHeight: "1.3",
                      }}
                    >
                      📍 {loc.address}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInMaps(loc.latitude, loc.longitude);
                      }}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        background:
                          "linear-gradient(135deg, #1DBF73 0%, #17a865 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                        boxShadow: "0 2px 6px rgba(29, 191, 115, 0.3)",
                        transition: "transform 0.2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.transform = "scale(1.02)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="3 11 22 2 13 21 11 13 3 11" />
                      </svg>
                      Buka Maps
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {userPos && (
            <Button
              size="icon"
              onClick={centerToUserLocation}
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-[1000] shadow-2xl bg-primary hover:bg-primary/90 w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl"
            >
              <Locate className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
        </div>

        <style jsx>{`
          @media (min-width: 640px) {
            .map-modern {
              height: 400px !important;
            }
          }
          @media (min-width: 768px) {
            .map-modern {
              height: 450px !important;
            }
          }
          @media (min-width: 1024px) {
            .map-modern {
              height: 500px !important;
            }
          }

          .map-modern .leaflet-popup-content-wrapper {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 0;
          }
          .map-modern .leaflet-popup-content {
            margin: 0;
            min-width: 180px;
          }
          .map-modern .leaflet-popup-tip {
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .map-modern .leaflet-container {
            font-family: inherit;
          }
        `}</style>

        {/* NEAREST LOCATIONS - Responsive Cards */}
        {userPos && nearLocations.length > 0 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
              5 Lokasi Terdekat
            </h2>

            <div className="space-y-2.5 sm:space-y-3">
              {nearLocations.map((location) => (
                <Card
                  key={location.id}
                  className="cursor-pointer bg-card/80 backdrop-blur-xl border-white/20 shadow-lg hover:shadow-xl transition-shadow"
                  onClick={() => {
                    setMapCenter({
                      lat: location.latitude,
                      lng: location.longitude,
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    toast.success(`Peta menuju ${location.name}`);
                  }}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-[#1DBF73]/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                          <p className="font-bold text-foreground text-sm sm:text-base truncate">
                            {location.name}
                          </p>
                          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-semibold shrink-0">
                            Aktif
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mb-1.5 sm:mb-2">
                          {location.address}
                        </p>
                        {location.distance !== undefined && (
                          <div className="flex items-center gap-1 sm:gap-1.5 bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg w-fit">
                            <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                            <p className="text-[10px] sm:text-xs text-primary font-bold">
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

        {/* SEARCH RESULTS - Responsive */}
        {searchQuery && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
              Hasil Pencarian ({filteredLocations.length})
            </h2>

            {filteredLocations.length === 0 ? (
              <div className="text-center py-10 sm:py-12 bg-card/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/20">
                <MapPin className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 text-muted-foreground/30" />
                <p className="text-sm sm:text-base text-muted-foreground font-medium">
                  Tidak ada lokasi ditemukan
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {filteredLocations.map((location) => (
                  <Card
                    key={location.id}
                    className="cursor-pointer bg-card/80 backdrop-blur-xl border-white/20 shadow-lg hover:shadow-xl transition-shadow"
                    onClick={() => setSelectedLocation(location)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                            location.is_active
                              ? "bg-gradient-to-br from-green-500/20 to-green-600/20"
                              : "bg-gradient-to-br from-red-500/20 to-red-600/20"
                          }`}
                        >
                          <MapPin
                            className={`w-5 h-5 sm:w-6 sm:h-6 ${
                              location.is_active
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <p className="font-bold text-foreground text-sm sm:text-base truncate">
                              {location.name}
                            </p>
                            <span
                              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                                location.is_active
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-red-500/10 text-red-600"
                              }`}
                            >
                              {location.is_active ? "Aktif" : "Tutup"}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
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

      {/* DIALOGS - Responsive */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-white/20 w-[calc(100%-2rem)] sm:w-full max-w-md mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">
              Izinkan Akses Lokasi
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Aplikasi memerlukan akses lokasi untuk menampilkan tempat sampah
              terdekat dari Anda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            <div className="bg-primary/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-primary/10">
              <MapPin className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-primary mb-2 sm:mb-3" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                Kami akan menggunakan lokasi Anda untuk menampilkan
                tempat-tempat terdekat
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={() => setShowLocationDialog(false)}
                className="flex-1 text-sm h-10 sm:h-11 bg-white/5 hover:bg-white/10 border-white/20 text-foreground"
              >
                Nanti Saja
              </Button>

              <Button
                onClick={handleEnableLocation}
                className="flex-1 bg-primary hover:bg-primary/90 text-sm h-10 sm:h-11"
              >
                <Locate className="w-4 h-4 mr-2" /> Izinkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedLocation}
        onOpenChange={() => setSelectedLocation(null)}
      >
        <DialogContent className="bg-card/95 backdrop-blur-2xl border-white/20 w-[calc(100%-2rem)] sm:w-full max-w-md mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold flex-wrap">
              <span className="flex-1 min-w-0 truncate">
                {selectedLocation?.name}
              </span>
              <span
                className={`text-[10px] sm:text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${
                  selectedLocation?.is_active
                    ? "bg-green-500/10 text-green-600"
                    : "bg-red-500/10 text-red-600"
                }`}
              >
                {selectedLocation?.is_active ? "Aktif" : "Tidak Aktif"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedLocation?.address}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 sm:space-y-3">
            <div className="bg-muted/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold">
                Koordinat
              </p>
              <p className="font-mono text-xs sm:text-sm font-medium break-all">
                {selectedLocation?.latitude}, {selectedLocation?.longitude}
              </p>
            </div>

            {userPos && selectedLocation && (
              <div className="bg-primary/5 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-primary/10">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-semibold">
                  Jarak dari Anda
                </p>
                <p className="font-black text-xl sm:text-2xl text-primary">
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

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedLocation) {
                    setMapCenter({
                      lat: selectedLocation.latitude,
                      lng: selectedLocation.longitude,
                    });
                    setSelectedLocation(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    toast.success("Peta dipusatkan ke lokasi ini");
                  }
                }}
                className="flex-1 text-sm h-10 sm:h-11"
              >
                <MapPin className="w-4 h-4 mr-2" /> Lihat di Peta
              </Button>
              <Button
                onClick={() =>
                  selectedLocation &&
                  openInMaps(
                    selectedLocation.latitude,
                    selectedLocation.longitude
                  )
                }
                className="flex-1 bg-primary hover:bg-primary/90 text-sm h-10 sm:h-11"
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

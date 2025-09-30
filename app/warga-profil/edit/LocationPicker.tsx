"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L, { Map } from "leaflet";
import "leaflet/dist/leaflet.css";

// perbaiki icon leaflet di Next
const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type LocationPickerProps = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number; // px
};

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ lat, lng, onChange, height = 280 }: LocationPickerProps) {
  const mapRef = useRef<Map | null>(null);

  const center = useMemo<[number, number]>(() => {
    // Jika sudah ada titik → fokus ke situ, kalau tidak → Indonesia tengah
    if (typeof lat === "number" && typeof lng === "number") return [lat, lng];
    return [-2.5, 118.0];
  }, [lat, lng]);

  // kalau lat/lng berubah dari luar → flyTo titiknya
  useEffect(() => {
    if (mapRef.current && typeof lat === "number" && typeof lng === "number") {
      mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 16), {
        duration: 0.6,
      });
    }
  }, [lat, lng]);

  return (
    <div style={{ height }}>
      <MapContainer
        center={center}
        zoom={typeof lat === "number" && typeof lng === "number" ? 16 : 5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        whenReady={(e) => {
          mapRef.current = e.target;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ClickHandler onPick={(la, lo) => onChange(la, lo)} />
        {typeof lat === "number" && typeof lng === "number" && (
          <Marker position={[lat, lng]} />
        )}
      </MapContainer>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Map as LMap, Marker as LMarker, LatLngBounds } from "leaflet";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";

export type MapPoint = {
  id: string; lat: number; lng: number; nama: string; kode: string;
  zonaNama: string | null; pemakaianM3: number; baselineAvg: number | null;
  baselineCount: number; pctChange: number | null; status: "NORMAL"|"ANOMALY"|"ZERO";
};

function makeIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.2)"></span>`,
    iconSize: [16, 16], iconAnchor: [8, 8],
  });
}
const iconFor = (s: MapPoint["status"]) =>
  s === "NORMAL" ? makeIcon("#22c55e") :
  s === "ANOMALY" ? makeIcon("#ef4444") : makeIcon("#9ca3af");

export default function DistribusiMap({
  points,
  height = "65vh",
  selectedId,                 // ID yang ingin difokuskan dari tabel/card
  onMarkerSelect,             // dipanggil saat user klik marker di peta (opsional)
}: {
  points: MapPoint[];
  height?: string | number;
  selectedId?: string | null;
  onMarkerSelect?: (id: string) => void;
}) {
  const mapRef = useRef<LMap | null>(null);
  const markerRefs = useRef<Map<string, LMarker>>(new Map()); // id → marker

  const bounds: LatLngBounds | null = useMemo(() => {
    const b = L.latLngBounds([]);
    for (const p of points) {
      const lat = Number(p.lat), lng = Number(p.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) b.extend([lat, lng]);
    }
    return b.isValid() ? b : null;
  }, [points]);

  const invalidate = () => mapRef.current?.invalidateSize();

  const fitNow = () => {
    const map = mapRef.current;
    if (!map) return;
    invalidate();

    if (points.length === 1) {
      const p = points[0];
      map.setView([Number(p.lat), Number(p.lng)], 17, { animate: true });
      return;
    }
    if (bounds) {
      map.fitBounds(bounds, { padding: [24, 24] });
      return;
    }
  };

  useEffect(() => {
    const t1 = setTimeout(fitNow, 0);
    const t2 = setTimeout(fitNow, 120);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, points.length]);

  // 🔴 Fokuskan marker ketika selectedId berubah dari tabel/card
  useEffect(() => {
    if (!selectedId) return;
    const map = mapRef.current;
    const m = markerRefs.current.get(selectedId);
    if (map && m) {
      const ll = m.getLatLng();
      map.flyTo(ll, Math.max(map.getZoom(), 16), { animate: true });
      m.openPopup();
    }
  }, [selectedId]);

  const onReady = () => {
    const map = mapRef.current;
    if (!map) return;
    invalidate();
    setTimeout(fitNow, 100);

    const persist = () => {
      const c = map.getCenter(); const z = map.getZoom();
      try { localStorage.setItem("tb.peta.lastView", JSON.stringify({ lat: c.lat, lng: c.lng, zoom: z })); } catch {}
    };
    map.on("moveend", persist); map.on("zoomend", persist);
  };

  return (
    <div style={{ height, width: "100%" }}>
      <MapContainer
        ref={(m) => { mapRef.current = (m as unknown as LMap) || null; }}
        center={L.latLng(-6.2, 106.8167)} zoom={12}
        style={{ height: "100%", width: "100%" }}
        whenReady={onReady}
      >
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {points.map((p) => (
          <Marker
            key={p.id}
            position={[Number(p.lat), Number(p.lng)]}
            icon={iconFor(p.status)}
            // simpan ref marker ke map
            ref={(mk) => { if (mk) markerRefs.current.set(p.id, mk); }}
            eventHandlers={{
              click: () => onMarkerSelect?.(p.id),
            }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{p.nama}</div>
                <div className="text-xs text-muted-foreground">{p.kode} • {p.zonaNama || "-"}</div>
                <div className="text-sm mt-2">Pemakaian: <b>{p.pemakaianM3} m³</b></div>
                <div className="text-sm">Rata-rata: {p.baselineAvg != null ? `${p.baselineAvg.toFixed(1)} m³ (${p.baselineCount} bln)` : "-"}</div>
                <div className="text-sm">Perubahan: {p.pctChange != null ? `${(p.pctChange * 100).toFixed(0)}%` : "-"}</div>
                <div className="mt-2">
                  {p.status === "NORMAL" && <Badge className="bg-emerald-500 text-white">Normal</Badge>}
                  {p.status === "ANOMALY" && <Badge className="bg-red-500 text-white">Abnormal</Badge>}
                  {p.status === "ZERO" && <Badge className="bg-gray-400 text-white">0 m³</Badge>}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

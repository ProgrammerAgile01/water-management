// "use client";

// import { useState } from "react";
// import useSWR from "swr";
// import { useSWRConfig } from "swr";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { useToast } from "@/hooks/use-toast";

// // ---------- Types ----------
// type CustomerData = {
//   nama: string;
//   noWA: string;
//   kodeCustomer: string;
//   alamat: string;
//   meterAwal: string;
//   zonaId: string; // "" = tidak dipilih
//   lat: string;
//   lng: string;
// };

// type ZonaLite = { id: string; nama: string; kode: string; deskripsi: string };

// const fetcher = (url: string) => fetch(url).then((r) => r.json());

// // ---------- Helpers ----------
// function normalizeWA(v: string) {
//   const digits = v.replace(/\D/g, "");
//   if (digits.startsWith("0")) return `62${digits.slice(1)}`;
//   if (digits.startsWith("62")) return digits;
//   return digits;
// }
// function genCustomerCode() {
//   const ts = Date.now().toString().slice(-6);
//   const rnd = Math.floor(Math.random() * 100)
//     .toString()
//     .padStart(2, "0");
//   return `TB${ts}${rnd}`;
// }
// const numOrNull = (v: string): number | null => {
//   const n = Number(v);
//   return Number.isFinite(n) ? n : null;
// };

// export function CustomerForm() {
//   const [isLoading, setIsLoading] = useState(false);
//   const [formData, setFormData] = useState<CustomerData>({
//     nama: "",
//     noWA: "",
//     kodeCustomer: "",
//     alamat: "",
//     meterAwal: "",
//     zonaId: "",
//     lat: "",
//     lng: "",
//   });

//   const { toast } = useToast();
//   const { mutate } = useSWRConfig();

//   // ---------- Load daftar zona (compact) ----------
//   // Ambil 500 item pertama; kalau perlu bisa ganti ke endpoint compact
//   const {
//     data: zonaResp,
//     isLoading: loadingZona,
//     error: zonaError,
//   } = useSWR<{
//     ok: boolean;
//     items: { id: string; nama: string; kode: string }[];
//   }>(`/api/zona?page=1&pageSize=500&q=`, fetcher, { revalidateOnFocus: false });

//   const zonaList: ZonaLite[] = Array.isArray(zonaResp?.items)
//     ? zonaResp!.items
//     : [];

//   // ---------- Submit ----------
//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (isLoading) return;
//     setIsLoading(true);

//     try {
//       const payload: Record<string, unknown> = {
//         nama: formData.nama.trim(),
//         wa: normalizeWA(formData.noWA),
//         alamat: formData.alamat.trim(),
//         meterAwal: Number(formData.meterAwal || 0),
//         kode: formData.kodeCustomer?.trim() || undefined,
//       };
//       if (formData.zonaId) payload.zonaId = formData.zonaId; // kirim hanya jika dipilih

//       payload.lat = numOrNull(formData.lat);
//       payload.lng = numOrNull(formData.lng);

//       const res = await fetch("/api/pelanggan", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });
//       const data = await res.json();

//       if (!res.ok || !data?.ok) {
//         throw new Error(data?.message || "Gagal menyimpan pelanggan");
//       }

//       await mutate("/api/pelanggan");

//       const kodeFix = data?.data?.pelanggan?.kode ?? payload.kode;
//       const username = data?.data?.user?.username;
//       const tempPass = data?.data?.tempPassword;

//       toast({
//         title: "Pelanggan berhasil ditambahkan",
//         description:
//           `Kode: ${kodeFix}` +
//           (username ? ` • User: ${username}` : "") +
//           (tempPass ? ` • Password: ${tempPass}` : ""),
//       });

//       setFormData({
//         nama: "",
//         noWA: "",
//         kodeCustomer: "",
//         alamat: "",
//         meterAwal: "",
//         zonaId: "",
//         lat: "",
//         lng: "",
//       });
//     } catch (err) {
//       const msg =
//         err instanceof Error
//           ? err.message
//           : "Terjadi kesalahan, silakan coba lagi";
//       toast({
//         title: "Gagal Menambahkan Pelanggan",
//         description: msg,
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ---------- Helper set state ----------
//   const set =
//     (field: keyof CustomerData) =>
//     (
//       e: React.ChangeEvent<
//         HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
//       >
//     ) =>
//       setFormData((p) => ({ ...p, [field]: e.target.value }));

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">
//       {/* Grid 2 kolom */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Nama */}
//         <div className="space-y-2">
//           <Label htmlFor="nama" className="text-base font-medium">
//             Nama Lengkap *
//           </Label>
//           <Input
//             id="nama"
//             value={formData.nama}
//             onChange={set("nama")}
//             required
//             className="h-12 text-base"
//           />
//         </div>

//         {/* No WA */}
//         <div className="space-y-2">
//           <Label htmlFor="noWA" className="text-base font-medium">
//             No. WhatsApp *
//           </Label>
//           <Input
//             id="noWA"
//             type="tel"
//             placeholder="08xxxxxxxxxx"
//             value={formData.noWA}
//             onChange={set("noWA")}
//             required
//             className="h-12 text-base"
//           />
//         </div>

//         {/* Kode Customer + Generate */}
//         <div className="space-y-2">
//           <Label htmlFor="kodeCustomer" className="text-base font-medium">
//             Kode Customer
//           </Label>
//           <div className="flex gap-2">
//             <Input
//               id="kodeCustomer"
//               placeholder="Auto generate jika kosong"
//               value={formData.kodeCustomer}
//               onChange={set("kodeCustomer")}
//               className="h-12 text-base"
//             />
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() =>
//                 setFormData((p) => ({ ...p, kodeCustomer: genCustomerCode() }))
//               }
//             >
//               Generate
//             </Button>
//           </div>
//         </div>

//         {/* Meter Awal */}
//         <div className="space-y-2">
//           <Label htmlFor="meterAwal" className="text-base font-medium">
//             Meter Awal *
//           </Label>
//           <Input
//             id="meterAwal"
//             type="number"
//             min={0}
//             placeholder="0"
//             value={formData.meterAwal}
//             onChange={set("meterAwal")}
//             required
//             className="h-12 text-base"
//           />
//         </div>

//         {/* Zona (dropdown) */}
//         <div className="space-y-2 md:col-span-2">
//           <Label htmlFor="zona" className="text-base font-medium">
//             Zona
//           </Label>
//           <select
//             id="zona"
//             value={formData.zonaId}
//             onChange={set("zonaId")}
//             className="w-full h-12 px-3 py-2 text-base bg-card/60 border border-primary/30 rounded-md text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
//             disabled={loadingZona}
//           >
//             <option value="">
//               {loadingZona ? "Memuat zona…" : "— Pilih zona (opsional) —"}
//             </option>
//             {zonaList.map((z) => (
//               <option key={z.id} value={z.id}>
//                 {z.nama} {z.deskripsi ? `– ${z.deskripsi}` : ""}
//               </option>
//             ))}
//           </select>
//           {zonaError ? (
//             <p className="text-xs text-destructive mt-1">
//               Gagal memuat daftar zona.
//             </p>
//           ) : null}
//         </div>
//       </div>

//       {/* Alamat */}
//       <div className="space-y-2">
//         <Label htmlFor="alamat" className="text-base font-medium">
//           Alamat Lengkap *
//         </Label>
//         <Textarea
//           id="alamat"
//           value={formData.alamat}
//           onChange={set("alamat")}
//           placeholder="Masukkan alamat lengkap"
//           required
//           className="min-h-[100px] text-base resize-none"
//         />
//       </div>

//       {/* Latitude & Longitude */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         <div className="space-y-2">
//           <Label htmlFor="lat" className="text-base font-medium">
//             Latitude
//           </Label>
//           <Input
//             id="lat"
//             type="number"
//             step="0.000001"
//             min={-90}
//             max={90}
//             placeholder="-7.549044"
//             value={formData.lat}
//             onChange={set("lat")}
//             className="h-12 text-base"
//           />
//         </div>
//         <div className="space-y-2">
//           <Label htmlFor="lng" className="text-base font-medium">
//             Longitude
//           </Label>
//           <Input
//             id="lng"
//             type="number"
//             step="0.000001"
//             min={-180}
//             max={180}
//             placeholder="110.605273"
//             value={formData.lng}
//             onChange={set("lng")}
//             className="h-12 text-base"
//           />
//         </div>
//       </div>

//       {/* (Opsional) Ambil lokasi dari GPS */}
//       <div>
//         <Button
//           type="button"
//           variant="outline"
//           onClick={() => {
//             if (!navigator.geolocation) return;
//             navigator.geolocation.getCurrentPosition(
//               (pos) => {
//                 const { latitude, longitude } = pos.coords;
//                 setFormData((p) => ({
//                   ...p,
//                   lat: latitude.toFixed(6),
//                   lng: longitude.toFixed(6),
//                 }));
//               },
//               () => {}
//             );
//           }}
//         >
//           Ambil Lokasi Saya
//         </Button>
//       </div>

//       {/* Submit */}
//       <div className="flex justify-end">
//         <Button
//           type="submit"
//           className="px-8 h-12 text-base"
//           disabled={isLoading}
//         >
//           {isLoading ? (
//             <span className="flex items-center gap-2">
//               <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//               Menyimpan...
//             </span>
//           ) : (
//             "Simpan Pelanggan"
//           )}
//         </Button>
//       </div>
//     </form>
//   );
// }

// components/customer-form.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import dynamic from "next/dynamic";
import L from "leaflet";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Crosshair } from "lucide-react";
import { defaultLeafletIcon } from "@/lib/leaflet-icons";

/* ===================== Map (client-only) ===================== */
const MapContainer = dynamic(
  async () => (await import("react-leaflet")).MapContainer,
  { ssr: false }
);
const TileLayer = dynamic(
  async () => (await import("react-leaflet")).TileLayer,
  { ssr: false }
);
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, {
  ssr: false,
});
const useMapEvents = dynamic(
  async () => (await import("react-leaflet")).useMapEvents,
  { ssr: false }
) as unknown as typeof import("react-leaflet").useMapEvents;

// Marker icon via CDN (langsung tampil di Next)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
(L.Marker.prototype as any).options.icon = DefaultIcon;

/* ===================== Types & helpers ===================== */
type ZonaLite = { id: string; nama: string; kode: string; deskripsi?: string };

type CustomerData = {
  nama: string;
  noWA: string;
  kodeCustomer: string;
  alamat: string;
  meterAwal: string;
  zonaId: string; // "" = tidak dipilih
  lat: string; // simpan sebagai string di UI agar presisi tidak kepotong
  lng: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function normalizeWA(v: string) {
  const digits = v.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}
function genCustomerCode() {
  const ts = Date.now().toString().slice(-6);
  const rnd = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `TB${ts}${rnd}`;
}
const numOrNull = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ===================== Komponen kecil: click picker ===================== */
function ClickPicker({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  // @ts-ignore
  useMapEvents({
    click(e: any) {
      const { lat, lng } = e.latlng;
      onPick(lat, lng);
    },
  });
  return null;
}

/* ===================== Form ===================== */
export function CustomerForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CustomerData>({
    nama: "",
    noWA: "",
    kodeCustomer: "",
    alamat: "",
    meterAwal: "",
    zonaId: "",
    lat: "",
    lng: "",
  });

  const { toast } = useToast();
  const { mutate } = useSWRConfig();

  // zona list
  const {
    data: zonaResp,
    isLoading: loadingZona,
    error: zonaError,
  } = useSWR<{
    ok: boolean;
    items: ZonaLite[];
  }>("/api/zona?page=1&pageSize=500&q=", fetcher, { revalidateOnFocus: false });
  const zonaList = Array.isArray(zonaResp?.items) ? zonaResp!.items : [];

  // Map ref (Leaflet.Map), dipakai untuk flyTo aman
  const mapRef = useRef<L.Map | null>(null);

  // nilai numerik koordinat (atau null)
  const latNum = useMemo(() => numOrNull(formData.lat), [formData.lat]);
  const lngNum = useMemo(() => numOrNull(formData.lng), [formData.lng]);
  const hasCoord = latNum != null && lngNum != null;

  // pusat awal peta (fallback Jakarta)
  const initialCenter: [number, number] = hasCoord
    ? [latNum!, lngNum!]
    : [-6.2, 106.816666];
  const initialZoom = hasCoord ? 15 : 12;

  // Koordinat berubah → flyTo (pakai ref, aman dari race/dynamic)
  useEffect(() => {
    const m: any = mapRef.current;
    if (!m || latNum == null || lngNum == null) return;
    const curZoom = typeof m.getZoom === "function" ? m.getZoom() : 15;
    if (typeof m.flyTo === "function") {
      m.flyTo([latNum, lngNum], Math.max(15, curZoom), { animate: true });
    } else if (typeof m.setView === "function") {
      m.setView([latNum, lngNum], Math.max(15, curZoom));
    }
  }, [latNum, lngNum]);

  // Geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = +pos.coords.latitude.toFixed(6);
        const lo = +pos.coords.longitude.toFixed(6);
        setFormData((p) => ({ ...p, lat: String(la), lng: String(lo) }));
      },
      () => {
        toast({
          title: "Gagal mengambil lokasi",
          description:
            "Pastikan izin lokasi aktif & sinyal GPS bagus, lalu coba lagi.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        nama: formData.nama.trim(),
        wa: normalizeWA(formData.noWA),
        alamat: formData.alamat.trim(),
        meterAwal: Number(formData.meterAwal || 0),
        kode: formData.kodeCustomer?.trim() || undefined,
        zonaId: formData.zonaId || undefined,
        lat: numOrNull(formData.lat),
        lng: numOrNull(formData.lng),
      };

      const res = await fetch("/api/pelanggan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Gagal menyimpan pelanggan");
      }

      await mutate("/api/pelanggan");

      const kodeFix = data?.data?.pelanggan?.kode ?? payload.kode;
      const username = data?.data?.user?.username;
      const tempPass = data?.data?.tempPassword;

      toast({
        title: "Pelanggan berhasil ditambahkan",
        description:
          `Kode: ${kodeFix}` +
          (username ? ` • User: ${username}` : "") +
          (tempPass ? ` • Password: ${tempPass}` : ""),
      });

      setFormData({
        nama: "",
        noWA: "",
        kodeCustomer: "",
        alamat: "",
        meterAwal: "",
        zonaId: "",
        lat: "",
        lng: "",
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan, silakan coba lagi";
      toast({
        title: "Gagal Menambahkan Pelanggan",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // helper set state
  const set =
    (field: keyof CustomerData) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
      setFormData((p) => ({ ...p, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Grid 2 kolom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="nama" className="text-base font-medium">
            Nama Lengkap *
          </Label>
          <Input
            id="nama"
            value={formData.nama}
            onChange={set("nama")}
            required
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="noWA" className="text-base font-medium">
            No. WhatsApp *
          </Label>
          <Input
            id="noWA"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={formData.noWA}
            onChange={set("noWA")}
            required
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kodeCustomer" className="text-base font-medium">
            Kode Customer
          </Label>
          <div className="flex gap-2">
            <Input
              id="kodeCustomer"
              placeholder="Auto generate jika kosong"
              value={formData.kodeCustomer}
              onChange={set("kodeCustomer")}
              className="h-12 text-base"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormData((p) => ({ ...p, kodeCustomer: genCustomerCode() }))
              }
            >
              Generate
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meterAwal" className="text-base font-medium">
            Meter Awal *
          </Label>
          <Input
            id="meterAwal"
            type="number"
            min={0}
            placeholder="0"
            value={formData.meterAwal}
            onChange={set("meterAwal")}
            required
            className="h-12 text-base"
          />
        </div>

        {/* Zona */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="zona" className="text-base font-medium">
            Blok
          </Label>
          <select
            id="zona"
            value={formData.zonaId}
            onChange={set("zonaId")}
            className="w-full h-12 px-3 py-2 text-base bg-card/60 border border-primary/30 rounded-md text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            disabled={loadingZona}
          >
            <option value="">
              {loadingZona ? "Memuat blok…" : "— Pilih blok (opsional) —"}
            </option>
            {zonaList.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nama} {z.deskripsi ? `– ${z.deskripsi}` : ""}
              </option>
            ))}
          </select>
          {zonaError ? (
            <p className="text-xs text-destructive mt-1">
              Gagal memuat daftar blok.
            </p>
          ) : null}
        </div>
      </div>

      {/* Alamat */}
      <div className="space-y-2">
        <Label htmlFor="alamat" className="text-base font-medium">
          Alamat Lengkap *
        </Label>
        <Textarea
          id="alamat"
          value={formData.alamat}
          onChange={set("alamat")}
          placeholder="Masukkan alamat lengkap"
          required
          className="min-h-[100px] text-base resize-none"
        />
      </div>

      {/* Koordinat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="lat" className="text-base font-medium">
            Latitude
          </Label>
          <Input
            id="lat"
            type="number"
            step="0.000001"
            min={-90}
            max={90}
            placeholder="-7.549044"
            value={formData.lat}
            onChange={set("lat")}
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lng" className="text-base font-medium">
            Longitude
          </Label>
          <Input
            id="lng"
            type="number"
            step="0.000001"
            min={-180}
            max={180}
            placeholder="110.605273"
            value={formData.lng}
            onChange={set("lng")}
            className="h-12 text-base"
          />
        </div>
      </div>

      {/* Aksi lokasi */}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={handleUseMyLocation}>
          <Crosshair className="w-4 h-4 mr-2" /> Ambil Lokasi Saya
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setFormData((p) => ({ ...p, lat: "", lng: "" }))}
        >
          Hapus Koordinat
        </Button>
        <div className="text-xs text-muted-foreground">
          Tip: klik peta untuk memilih titik, marker bisa digeser.
        </div>
      </div>

      {/* Map Picker */}
      <div className="rounded-md overflow-hidden border border-primary/20">
        <div className="h-64">
          {typeof window !== "undefined" && (
            <MapContainer
              ref={mapRef as any}
              center={initialCenter}
              zoom={initialZoom}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              <ClickPicker
                onPick={(la, lo) =>
                  setFormData((p) => ({
                    ...p,
                    lat: la.toFixed(6),
                    lng: lo.toFixed(6),
                  }))
                }
              />

              {hasCoord && latNum != null && lngNum != null && (
                // @ts-ignore
                <Marker
                  icon={defaultLeafletIcon}
                  position={[latNum, lngNum]}
                  draggable
                  // @ts-ignore
                  eventHandlers={{
                    dragend: (e: any) => {
                      const { lat, lng } = e.target.getLatLng();
                      setFormData((p) => ({
                        ...p,
                        lat: lat.toFixed(6),
                        lng: lng.toFixed(6),
                      }));
                    },
                  }}
                />
              )}
            </MapContainer>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          className="px-8 h-12 text-base"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Menyimpan...
            </span>
          ) : (
            "Simpan Pelanggan"
          )}
        </Button>
      </div>
    </form>
  );
}

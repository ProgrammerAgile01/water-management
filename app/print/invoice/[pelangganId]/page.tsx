// // app/print/invoice/[pelangganId]/page.tsx
// import { prisma } from "@/lib/prisma";

// export const runtime = "nodejs";

// // ===== utils format =====
// function rp(n: number) {
//   return "Rp " + Number(n || 0).toLocaleString("id-ID");
// }
// function dLong(d: Date) {
//   return d.toLocaleDateString("id-ID", {
//     day: "2-digit",
//     month: "long",
//     year: "numeric",
//   });
// }
// function ymToLong(ym: string) {
//   return new Date(ym + "-01").toLocaleDateString("id-ID", {
//     month: "long",
//     year: "numeric",
//   });
// }

// export default async function Page({
//   params,
// }: {
//   params: Promise<{ pelangganId: string }>;
// }) {
//   const { pelangganId } = await params;

//   // ===== data =====
//   const setting = await prisma.setting.findUnique({ where: { id: 1 } });
//   if (!setting) return <div className="p-10">Setting tidak ditemukan</div>;

//   const tagihan = await prisma.tagihan.findFirst({
//     where: { pelangganId, deletedAt: null },
//     orderBy: { periode: "desc" },
//     select: {
//       id: true,
//       periode: true,
//       tarifPerM3: true,
//       abonemen: true,
//       totalTagihan: true,
//       denda: true,
//       statusBayar: true,
//       tglJatuhTempo: true,
//       createdAt: true,
//       pelanggan: { select: { kode: true, nama: true, alamat: true } },
//     },
//   });
//   if (!tagihan) return <div className="p-10">Tagihan tidak ditemukan</div>;

//   const catat = await prisma.catatMeter.findFirst({
//     where: {
//       pelangganId,
//       deletedAt: null,
//       periode: { kodePeriode: tagihan.periode },
//     },
//     select: { meterAwal: true, meterAkhir: true, pemakaianM3: true },
//   });

//   // ===== hitung =====
//   const meterAwal = catat?.meterAwal ?? 0;
//   const meterAkhir = catat?.meterAkhir ?? meterAwal;
//   const pemakaian = catat?.pemakaianM3 ?? Math.max(0, meterAkhir - meterAwal);

//   const biayaAdmin = setting.biayaAdmin ?? 0;
//   const biayaLayanan = (setting as any)?.biayaLayanan ?? 0; // opsional
//   const denda = tagihan.denda ?? 0;

//   const biayaPemakaian = (tagihan.tarifPerM3 || 0) * pemakaian;
//   const abonemen = tagihan.abonemen || 0;

//   // total tagihan (dasar + denda) — ringkas di atas
//   const totalTagihanHeader = biayaPemakaian + abonemen + denda;

//   // total bayar akhir (dengan biaya tambahan)
//   const totalBayar = totalTagihanHeader + biayaAdmin + biayaLayanan;

//   const perusahaan = setting.namaPerusahaan || "Tirta Bening";
//   const alamatPerusahaan = setting.alamat || "Alamat perusahaan";
//   const telpPerusahaan = setting.telepon || "-";
//   const emailPerusahaan = setting.email || "-";

//   const invoiceNo = `INV/${(tagihan.createdAt ?? new Date())
//     .toISOString()
//     .slice(0, 10)
//     .replace(/-/g, "")}/${(tagihan.id || "").slice(-6).toUpperCase()}`;

//   const due = tagihan.tglJatuhTempo || new Date();

//   // siapkan baris biaya (sembunyikan yang 0 biar bersih)
//   const items = [
//     {
//       label: `Pemakaian ${pemakaian} m³ × ${rp(
//         tagihan.tarifPerM3 || 0
//       )} (Tarif/m³)`,
//       amount: biayaPemakaian,
//     },
//     { label: "Abonemen", amount: abonemen },
//     { label: "Denda", amount: denda },
//     { label: "Biaya Admin", amount: biayaAdmin },
//     { label: "Biaya Layanan", amount: biayaLayanan },
//   ].filter((x) => (x.amount ?? 0) > 0);

//   return (
//     <div className="w-[794px] mx-auto text-[12px] text-zinc-900 bg-white">
//       {/* PRINT CSS */}
//       <style>{`
//         @page { size: A4; margin: 18mm 14mm; }
//         @media print { .no-print { display: none } }
//       `}</style>

//       {/* ===== Header brand & meta ===== */}
//       <div className="flex items-start justify-between gap-6">
//         {/* Branding kiri */}
//         <div className="flex items-center gap-3">
//           {/* logo placeholder (ganti src kalau ada logo) */}
//           <div className="w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-semibold">
//             TB
//           </div>
//           <div>
//             <div className="text-[20px] font-semibold leading-6">
//               {perusahaan}
//             </div>
//             <div className="text-zinc-500">{alamatPerusahaan}</div>
//             <div className="text-zinc-500">
//               Telp: {telpPerusahaan} • Email: {emailPerusahaan}
//             </div>
//           </div>
//         </div>

//         {/* Meta invoice kanan */}
//         <div className="shrink-0 w-[280px] rounded-xl border border-zinc-200 bg-zinc-50">
//           <div className="px-4 py-3 border-b border-zinc-200 bg-white rounded-t-xl">
//             <div className="text-[13px] text-zinc-500">Invoice</div>
//             <div className="font-semibold text-[16px]">{invoiceNo}</div>
//           </div>
//           <div className="px-4 py-3 space-y-2">
//             <div className="flex justify-between">
//               <div className="text-zinc-500">Tanggal</div>
//               <div className="font-medium">
//                 {dLong(tagihan.createdAt ?? new Date())}
//               </div>
//             </div>
//             <div className="flex justify-between">
//               <div className="text-zinc-500">Periode</div>
//               <div className="font-medium">{ymToLong(tagihan.periode)}</div>
//             </div>
//             <div className="flex justify-between">
//               <div className="text-zinc-500">Jatuh Tempo</div>
//               <div className="font-medium">{dLong(due)}</div>
//             </div>
//             <div className="flex justify-between">
//               <div className="text-zinc-500">Status</div>
//               <div
//                 className={`font-semibold ${
//                   tagihan.statusBayar === "PAID"
//                     ? "text-emerald-600"
//                     : "text-amber-600"
//                 }`}
//               >
//                 {tagihan.statusBayar === "PAID" ? "LUNAS" : "BELUM BAYAR"}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ===== Bill To ===== */}
//       <div className="mt-6 rounded-xl border border-zinc-200 overflow-hidden">
//         <div className="px-4 py-2 bg-zinc-50 text-[13px] font-semibold">
//           Tagihan Untuk
//         </div>
//         <div className="px-4 py-3 grid grid-cols-3 gap-4 text-[12px]">
//           <div>
//             <div className="text-zinc-500">Nama Pelanggan</div>
//             <div className="font-medium">{tagihan.pelanggan.nama}</div>
//           </div>
//           <div>
//             <div className="text-zinc-500">Kode Pelanggan</div>
//             <div className="font-medium">{tagihan.pelanggan.kode}</div>
//           </div>
//           <div>
//             <div className="text-zinc-500">Alamat</div>
//             <div className="font-medium">{tagihan.pelanggan.alamat}</div>
//           </div>
//         </div>
//       </div>

//       {/* ===== Stand Meter ===== */}
//       <div className="mt-6 rounded-xl border border-zinc-200 overflow-hidden">
//         <div className="px-4 py-2 bg-zinc-50 text-[13px] font-semibold">
//           Detail Stand Meter
//         </div>
//         <div className="grid grid-cols-4 gap-4 px-4 py-3 text-[12px]">
//           <div>
//             <div className="text-zinc-500">Meter Awal</div>
//             <div className="font-medium">{meterAwal}</div>
//           </div>
//           <div>
//             <div className="text-zinc-500">Meter Akhir</div>
//             <div className="font-medium">{meterAkhir}</div>
//           </div>
//           <div>
//             <div className="text-zinc-500">Pemakaian</div>
//             <div className="font-medium">{pemakaian} m³</div>
//           </div>
//           <div>
//             <div className="text-zinc-500">Tarif/m³</div>
//             <div className="font-medium">{rp(tagihan.tarifPerM3 || 0)}</div>
//           </div>
//         </div>
//       </div>

//       {/* ===== Cards ringkasan ===== */}
//       <div className="mt-6 grid grid-cols-3 gap-4">
//         <div className="rounded-xl border border-zinc-200 bg-white p-4">
//           <div className="text-zinc-500 text-[12px]">Total Tagihan</div>
//           <div className="text-[18px] font-semibold">
//             {rp(totalTagihanHeader)}
//           </div>
//         </div>
//         <div className="rounded-xl border border-zinc-200 bg-white p-4">
//           <div className="text-zinc-500 text-[12px]">Biaya Tambahan</div>
//           <div className="text-[14px] font-medium">
//             Admin: {rp(biayaAdmin)}{" "}
//             {biayaLayanan ? `• Layanan: ${rp(biayaLayanan)}` : ""}
//             {denda ? ` • Denda: ${rp(denda)}` : ""}
//           </div>
//         </div>
//         <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
//           <div className="text-emerald-700 text-[12px]">Total Bayar</div>
//           <div className="text-[20px] font-bold text-emerald-700">
//             {rp(totalBayar)}
//           </div>
//         </div>
//       </div>

//       {/* ===== Tabel Rincian Biaya ===== */}
//       <div className="mt-6 rounded-xl border border-zinc-200 overflow-hidden">
//         <div className="px-4 py-2 bg-zinc-50 text-[13px] font-semibold">
//           Rincian Biaya
//         </div>
//         <table className="w-full text-[12px]">
//           <thead className="bg-white border-b border-zinc-200">
//             <tr>
//               <th className="text-left px-4 py-2 font-semibold">Keterangan</th>
//               <th className="text-right px-4 py-2 font-semibold">Jumlah</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((it, idx) => (
//               <tr key={idx} className="odd:bg-white even:bg-zinc-50">
//                 <td className="px-4 py-2">{it.label}</td>
//                 <td className="px-4 py-2 text-right">{rp(it.amount)}</td>
//               </tr>
//             ))}
//             <tr className="bg-emerald-50 border-t border-emerald-200">
//               <td className="px-4 py-2 font-bold text-emerald-700">
//                 Total Bayar
//               </td>
//               <td className="px-4 py-2 text-right font-bold text-emerald-700">
//                 {rp(totalBayar)}
//               </td>
//             </tr>
//           </tbody>
//         </table>
//       </div>

//       {/* ===== Pembayaran & catatan ===== */}
//       <div className="mt-6 grid grid-cols-3 gap-6">
//         <div className="col-span-2 rounded-xl border border-zinc-200 overflow-hidden">
//           <div className="px-4 py-2 bg-zinc-50 text-[13px] font-semibold">
//             Metode Pembayaran
//           </div>
//           <div className="px-4 py-3 space-y-1">
//             <div>• Tunai di kantor kami.</div>
//             <div>• BCA 123456789 a.n. {perusahaan}.</div>
//             {/* Tambah VA/QRIS di sini bila ada */}
//           </div>
//         </div>
//         <div className="rounded-xl border border-zinc-200 overflow-hidden">
//           <div className="px-4 py-2 bg-zinc-50 text-[13px] font-semibold">
//             Catatan
//           </div>
//           <div className="px-4 py-3 text-zinc-700">
//             Mohon lakukan pembayaran sebelum <b>{dLong(due)}</b>. Simpan invoice
//             ini sebagai bukti tagihan Anda.
//           </div>
//         </div>
//       </div>

//       {/* Footer */}
//       <div className="mt-10 text-center text-zinc-500">
//         Terima kasih atas kepercayaan Anda
//       </div>
//     </div>
//   );
// }

// app/print/invoice/[pelangganId]/page.tsx
import { prisma } from "@/lib/prisma";
import Image from "next/image";

export const runtime = "nodejs";

// ===== utils format =====
function rp(n: number) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function dLong(d: Date) {
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function ymToLong(ym: string) {
  return new Date(ym + "-01").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ pelangganId: string }>;
  searchParams?: Promise<{ pdf?: string; compact?: string }>;
}) {
  const { pelangganId } = await params;
  const sp = (await searchParams) || {};
  const isPdf = sp?.pdf === "1";
  const compact = sp?.compact === "1"; // pakai compact untuk 1 halaman

  // ===== data =====
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting) return <div className="p-10">Setting tidak ditemukan</div>;

  const tagihan = await prisma.tagihan.findFirst({
    where: { pelangganId, deletedAt: null },
    orderBy: { periode: "desc" },
    select: {
      id: true,
      periode: true,
      tarifPerM3: true,
      abonemen: true,
      denda: true,
      statusBayar: true,
      tglJatuhTempo: true,
      createdAt: true,
      pelanggan: { select: { kode: true, nama: true, alamat: true } },
    },
  });
  if (!tagihan) return <div className="p-10">Tagihan tidak ditemukan</div>;

  const catat = await prisma.catatMeter.findFirst({
    where: {
      pelangganId,
      deletedAt: null,
      periode: { kodePeriode: tagihan.periode },
    },
    select: { meterAwal: true, meterAkhir: true, pemakaianM3: true },
  });

  // ===== hitung =====
  const meterAwal = catat?.meterAwal ?? 0;
  const meterAkhir = catat?.meterAkhir ?? meterAwal;
  const pemakaian = catat?.pemakaianM3 ?? Math.max(0, meterAkhir - meterAwal);

  const biayaAdmin = setting.biayaAdmin ?? 0;
  const biayaLayanan = (setting as any)?.biayaLayanan ?? 0;
  const denda = tagihan.denda ?? 0;
  const biayaPemakaian = (tagihan.tarifPerM3 || 0) * pemakaian;
  const abonemen = tagihan.abonemen || 0;

  const subtotal = biayaPemakaian + abonemen + denda;
  const totalBayar = subtotal + biayaAdmin + biayaLayanan;

  const perusahaan = setting.namaPerusahaan || "Tirta Bening";
  const alamatPerusahaan = setting.alamat || "Alamat perusahaan";
  const telpPerusahaan = setting.telepon || "-";
  const emailPerusahaan = setting.email || "-";

  const invoiceNo = `INV/${(tagihan.createdAt ?? new Date())
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}/${(tagihan.id || "").slice(-6).toUpperCase()}`;
  const due = tagihan.tglJatuhTempo || new Date();

  // Rincian biaya (akan diringkas di mode compact)
  const fullItems = [
    {},
    {
      label: `Pemakaian ${pemakaian} m³ × ${rp(
        tagihan.tarifPerM3 || 0
      )} (Tarif/m³)`,
      amount: biayaPemakaian,
    },
    { label: "Abonemen", amount: abonemen },
    { label: "Denda", amount: denda },
    { label: "Biaya Admin", amount: biayaAdmin },
    { label: "Biaya Layanan", amount: biayaLayanan },
  ].filter((x) => (x.amount ?? 0) > 0);

  const MAX_ROWS = 3;
  const showItems = compact ? fullItems.slice(0, MAX_ROWS) : fullItems;
  const hiddenCount = compact
    ? Math.max(0, fullItems.length - showItems.length)
    : 0;
  const hiddenSum = compact
    ? fullItems.slice(MAX_ROWS).reduce((s, x) => s + (x.amount || 0), 0)
    : 0;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const pdfUrl = `${appUrl}/api/print/invoice/${pelangganId}`; // akan pakai compact=1 dari endpoint

  return (
    <div className="mx-auto text-zinc-900 bg-white">
      {/* ==== CSS A5 + COMPACT ==== */}
      <style>{`
        @page { size: A5 portrait; margin: 10mm; }
        @media print { .no-print { display: none !important } }
        :root {
          --fz-body: ${compact ? "12pt" : "14pt"};
          --fz-small: ${compact ? "10pt" : "11pt"};
          --fz-label: ${compact ? "10pt" : "11pt"};
          --fz-title: ${compact ? "20pt" : "22pt"};
          --fz-subtitle: ${compact ? "12pt" : "14pt"};
          --fz-number: ${compact ? "14pt" : "16pt"};
          --fz-hero: ${compact ? "18pt" : "20pt"};
          --card-gap: ${compact ? "8pt" : "12pt"};
          --card-pad: ${compact ? "10pt" : "14pt"};
          --radius: 8px;
        }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .card { border: 1px solid #E5E7EB; border-radius: var(--radius); overflow: hidden; }
        .sectionTitle { background:#F9FAFB; padding:6pt 10pt; font-weight:600; font-size:var(--fz-subtitle); }
        .pad { padding: var(--card-pad); }
      `}</style>

      {/* kontainer fix A5 */}
      <div className="max-w-[148mm] px-[6mm] pt-[6mm] pb-[4mm] text-[var(--fz-body)] leading-[1.35]">
        {/* HEADER (brand + nomor invoice ringkas) */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Logo perusahaan */}
            <div className="w-20 rounded-xl overflow-hidden flex items-center justify-center bg-white">
              <Image
                src="/logo.png" // path file di /public
                alt="Logo Perusahaan"
                className="w-full h-full object-contain"
                width={50}
                height={50}
              />
            </div>
            <div>
              <div
                className="font-semibold text-2xl"
                style={{ lineHeight: 1.1 }}
              >
                {perusahaan}
              </div>
              {!compact && (
                <>
                  <div className="text-zinc-500 text-[var(--fz-small)]">
                    {alamatPerusahaan}
                  </div>
                  <div className="text-zinc-500 text-sm">
                    Telp: {telpPerusahaan} • Email: {emailPerusahaan}
                  </div>
                </>
              )}
              {/* nomor invoice kecil di bawah judul */}
              <div className="mt-1 text-sm text-zinc-600">
                <span className="text-zinc-500">Tagihan:</span>{" "}
                <span className="font-medium">{invoiceNo}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PELANGGAN */}
        <div className="mt-[var(--card-gap)] card">
          <div className="sectionTitle">Pelanggan</div>
          <div className="pad grid grid-cols-4 gap-x-6 gap-y-2">
            <div>
              <div className="text-zinc-500 text-[var(--fz-label)]">Nama</div>
              <div className="font-medium text-[var(--fz-number)]">
                {tagihan.pelanggan.nama}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[var(--fz-label)]">Kode</div>
              <div className="font-medium text-[var(--fz-number)]">
                {tagihan.pelanggan.kode}
              </div>
            </div>
            {!compact && (
              <div className="col-span-2">
                <div className="text-zinc-500 text-[var(--fz-label)]">
                  Alamat
                </div>
                <div className="font-medium">{tagihan.pelanggan.alamat}</div>
              </div>
            )}
          </div>
        </div>

        {/* METER */}
        <div className="mt-[var(--card-gap)] card">
          <div className="sectionTitle">Status Tagihan</div>
          <div className="pad grid grid-cols-3 gap-x-6 gap-y-2">
            <div>
              <div className="text-zinc-500 text-[var(--fz-label)]">
                Periode
              </div>
              <div className="font-medium text-[var(--fz-number)]">
                {ymToLong(tagihan.periode)}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[var(--fz-label)]">
                Jatuh Tempo
              </div>
              <div className="font-medium text-[var(--fz-number)]">
                {dLong(due)}
              </div>
            </div>
            <div>
              <div className="text-zinc-500">Status</div>
              <div
                className={`font-semibold ${
                  tagihan.statusBayar === "PAID"
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                {tagihan.statusBayar === "PAID" ? "LUNAS" : "BELUM BAYAR"}
              </div>
            </div>
            {/* <div><div className="text-zinc-500 text-[var(--fz-label)]">Status</div><div className="font-medium text-[var(--fz-number)]">{tagihan.statusBayar}</div></div> */}
            {/* <div><div className="text-zinc-500 text-[var(--fz-label)]">Tarif/m³</div><div className="font-medium text-[var(--fz-number)]">{rp(tagihan.tarifPerM3 || 0)}</div></div> */}
          </div>
        </div>

        {/* RINGKASAN */}
        {/* <div className="mt-[var(--card-gap)] grid grid-cols-1 gap-[var(--card-gap)]">
          <div className="card pad">
            <div className="text-zinc-500 text-[var(--fz-label)]">Subtotal</div>
            <div className="font-semibold text-[var(--fz-number)]">{rp(subtotal)}</div>
          </div>
          {!compact && (
            <div className="card pad">
              <div className="text-zinc-500 text-[var(--fz-label)]">Biaya Tambahan</div>
              <div>Admin: {rp(biayaAdmin)}{biayaLayanan ? ` • Layanan: ${rp(biayaLayanan)}` : ""}{denda ? ` • Denda: ${rp(denda)}` : ""}</div>
            </div>
          )}
          <div className="card pad" style={{ background: "#ECFDF5", borderColor: "#A7F3D0" }}>
            <div className="text-emerald-700 text-[var(--fz-label)]">Total Bayar</div>
            <div className="font-bold text-emerald-700" style={{ fontSize: "var(--fz-hero)" }}>{rp(totalBayar)}</div>
          </div>
        </div> */}

        {/* RINCIAN (ringkas saat compact) */}
        <div className="mt-[var(--card-gap)] card overflow-hidden">
          <div className="sectionTitle">Rincian</div>
          <table className="w-full" style={{ fontSize: "var(--fz-body)" }}>
            <thead
              className="bg-white"
              style={{ borderBottom: "1px solid #E5E7EB" }}
            >
              <tr>
                <th className="text-left px-3 py-1.5 font-semibold">
                  Keterangan
                </th>
                <th className="text-right px-3 py-1.5 font-semibold">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {showItems.map((it, idx) => (
                <tr key={idx} className={idx % 2 ? "bg-zinc-50" : ""}>
                  <td className="px-3 py-1.5">{it.label}</td>
                  <td className="px-3 py-1.5 text-right">
                    {rp(it.amount || 0)}
                  </td>
                </tr>
              ))}
              {compact && hiddenCount > 0 && (
                <tr className="bg-zinc-50">
                  <td className="px-3 py-1.5 text-zinc-600">
                    + {hiddenCount} item lainnya
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-600">
                    {rp(hiddenSum)}
                  </td>
                </tr>
              )}
              <tr
                className="bg-emerald-50"
                style={{ borderTop: "1px solid #A7F3D0" }}
              >
                <td className="px-3 py-1.5 font-bold text-emerald-700">
                  Total Bayar
                </td>
                <td className="px-3 py-1.5 text-right font-bold text-emerald-700">
                  {rp(totalBayar)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* PEMBAYARAN + CATATAN (digabung saat compact) */}
        {/* <div className="mt-[var(--card-gap)] card">
          <div className="sectionTitle">Pembayaran & Catatan</div>
          <div className="pad space-y-1" style={{ fontSize: "var(--fz-body)" }}>
            <div>• Tunai di kantor kami.</div>
            <div>• BCA 123456789 a.n. {perusahaan}.</div>
            <div className="text-zinc-700">
              Mohon bayar sebelum <b>{dLong(due)}</b>. Simpan invoice ini
              sebagai bukti.
            </div>
          </div>
        </div> */}

        {/* Footer + tombol unduh */}
        {/* <div className="mt-[var(--card-gap)] text-center text-zinc-500 text-[var(--fz-small)]">
          Terima kasih atas kepercayaan Anda
        </div> */}
      </div>
    </div>
  );
}

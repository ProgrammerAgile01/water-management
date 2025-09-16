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

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
function renderTagihanLaluText(n: number) {
  if (n > 0) return `Kurang ${rp(n)}`;
  if (n < 0) return `Sisa ${rp(Math.abs(n))}`;
  return "Rp 0";
}

type PageProps = {
  params: { tagihanId: string };
  searchParams?: { compact?: string };
};

export default async function Page({ params, searchParams }: PageProps) {
  const { tagihanId } = params;
  const compact = (searchParams?.compact ?? "") === "1";

  // ===== data umum =====
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting) return <div className="p-10">Setting tidak ditemukan</div>;

  // ===== ambil tagihan + relasi catatMeter (JANGAN cari via periode lagi) =====
  const tagihan = await prisma.tagihan.findUnique({
    where: { id: tagihanId },
    select: {
      id: true,
      periode: true,
      tarifPerM3: true,
      abonemen: true,
      denda: true,
      statusBayar: true,
      tglJatuhTempo: true,
      createdAt: true,
      pelangganId: true,
      totalTagihan: true,
      tagihanLalu: true,
      sisaKurang: true,
      pelanggan: { select: { kode: true, nama: true, alamat: true } },
      // ★ ambil angka meter dari relasi 1↔1
      catatMeter: { select: { meterAwal: true, meterAkhir: true, pemakaianM3: true } },
    },
  });
  if (!tagihan) return <div className="p-10">Tagihan tidak ditemukan</div>;

  // ===== hitung dari relasi catatMeter =====
  const meterAwal = tagihan.catatMeter?.meterAwal ?? 0;
  const meterAkhir = tagihan.catatMeter?.meterAkhir ?? meterAwal;
  const pemakaian = tagihan.catatMeter?.pemakaianM3 ?? Math.max(0, meterAkhir - meterAwal);

  const biayaAdmin = setting.biayaAdmin ?? 0;
  const biayaLayanan = (setting as any)?.biayaLayanan ?? 0; // kalau ada
  const denda = tagihan.denda ?? 0;
  const biayaPemakaian = (tagihan.tarifPerM3 || 0) * pemakaian;
  const abonemen = tagihan.abonemen || 0;

  // subtotal = pemakaian + abonemen + denda
  const subtotal = biayaPemakaian + abonemen + denda;
  // totalBayar (versi tampilan) = subtotal + admin + layanan
  const totalBayarHitung = subtotal + biayaAdmin + biayaLayanan;

  // Gunakan angka resmi dari DB kalau ada (ini yang dipakai di WA)
  const tagihanSekarang = tagihan.totalTagihan ?? totalBayarHitung;

  // Ringkasan “gabungan”
  const tagihanLalu = tagihan.tagihanLalu ?? 0; // +/−
  const totalGabungan = tagihanLalu + tagihanSekarang;

  const perusahaan = setting.namaPerusahaan || "Tirta Bening";
  const alamatPerusahaan = setting.alamat || "Alamat perusahaan";

  const invoiceNo = `TAG-${(tagihan.createdAt ?? new Date())
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${(tagihan.id || "").slice(-6).toUpperCase()}`;
  const due = tagihan.tglJatuhTempo || new Date();

  // Rincian biaya (akan diringkas di mode compact)
  const fullItems = [
    { label: `Pemakaian ${pemakaian} m³ × ${rp(tagihan.tarifPerM3 || 0)} (Tarif/m³)`, amount: biayaPemakaian },
    { label: "Abonemen", amount: abonemen },
    { label: "Denda", amount: denda },
    { label: "Biaya Admin", amount: biayaAdmin },
    { label: "Biaya Layanan", amount: biayaLayanan },
  ].filter((x) => (x.amount ?? 0) > 0);

  const MAX_ROWS = 5;
  const showItems = compact ? fullItems.slice(0, MAX_ROWS) : fullItems;
  const hiddenCount = compact ? Math.max(0, fullItems.length - showItems.length) : 0;
  const hiddenSum = compact ? fullItems.slice(MAX_ROWS).reduce((s, x) => s + (x.amount || 0), 0) : 0;

  return (
    <div className="mx-auto text-zinc-900 bg-white">
      <style>{`
        @media print { .no-print { display: none !important } }
        :root {
          --fz-body:     ${compact ? "9pt" : "10pt"};
          --fz-small:    ${compact ? "8pt" : "9pt"};
          --fz-label:    ${compact ? "8pt" : "9pt"};
          --fz-title:    ${compact ? "14pt" : "16pt"};
          --fz-subtitle: ${compact ? "9pt" : "10pt"};
          --fz-number:   ${compact ? "10pt" : "11pt"};
          --fz-hero:     ${compact ? "12pt" : "14pt"};
          --card-gap: ${compact ? "4pt" : "8pt"};
          --card-pad: ${compact ? "6pt" : "8pt"};
          --radius: 10px;
          --green1: #16a34a;
          --green2: #22c55e;
        }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .headerBar{ background: linear-gradient(135deg,var(--green1),var(--green2)); color:#fff; padding:12pt 14pt; display:flex; align-items:center; gap:10pt; }
        .brandTitle{ font-weight:800; font-size:var(--fz-title); line-height:1.1 }
        .brandSub{ font-size:var(--fz-small); opacity:.95 }
        .card { border: 1px solid #E5E7EB; border-radius: var(--radius); overflow: hidden; background:#fff; }
        .sectionTitle { background:#F9FAFB; padding:6pt 10pt; font-weight:600; font-size:var(--fz-subtitle); }
        .pad { padding: var(--card-pad); }
        #__next-build-watcher,[data-nextjs-toast],[data-nextjs-dialog-overlay],[data-nextjs-portal]{display:none!important}
      `}</style>

      <div className="max-w-[380px] mx-auto">
        {/* HEADER */}
        <div className="headerBar">
          <div className="w-14 h-14 rounded-md overflow-hidden flex items-center justify-center">
            <Image src="/logo.png" alt="Logo Perusahaan" className="w-14 h-14 object-contain" width={48} height={48} />
          </div>
          <div>
            <div className="brandTitle">{perusahaan}</div>
            <div className="brandSub">{alamatPerusahaan}</div>
            <div className="brandSub">Tagihan: <span className="font-semibold">{invoiceNo}</span></div>
          </div>
        </div>

        <div className="px-3 pt-3 pb-4 text-[var(--fz-body)] leading-[1.35]">
          {/* PELANGGAN */}
          <div className="card">
            <div className="sectionTitle">Pelanggan</div>
            <div className="pad grid grid-cols-4 gap-x-4 gap-y-2">
              <div>
                <div className="text-zinc-500 text-[var(--fz-label)]">Nama</div>
                <div className="font-medium text-[var(--fz-number)]">{tagihan.pelanggan.nama}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-[var(--fz-label)]">Kode</div>
                <div className="font-medium text-[var(--fz-number)]">{tagihan.pelanggan.kode}</div>
              </div>
              {!compact && (
                <div className="col-span-2 ml-6">
                  <div className="text-zinc-500 text-[var(--fz-label)]">Alamat</div>
                  <div className="font-medium">{tagihan.pelanggan.alamat}</div>
                </div>
              )}
            </div>
          </div>

          {/* STATUS TAGIHAN */}
          <div className="mt-[var(--card-gap)] card">
            <div className="sectionTitle">Status Tagihan</div>
            <div className="pad grid grid-cols-3 gap-x-4 gap-y-2">
              <div>
                <div className="text-zinc-500 text-[var(--fz-label)]">Periode</div>
                <div className="font-medium text-[var(--fz-number)]">{ymToLong(tagihan.periode)}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-[var(--fz-label)]">Jatuh Tempo</div>
                <div className="font-medium text-[var(--fz-number)]">{dLong(due)}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-[var(--fz-label)]">Status</div>
                <div className={`font-semibold ${tagihan.statusBayar === "PAID" ? "text-emerald-700" : "text-amber-700"}`}>
                  {tagihan.statusBayar === "PAID" ? "LUNAS" : "BELUM BAYAR"}
                </div>
              </div>
            </div>
          </div>

          {/* RINCIAN */}
          <div className="mt-[var(--card-gap)] card overflow-hidden">
            <div className="sectionTitle">Rincian</div>
            <table className="w-full">
              <thead className="bg-white" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <tr>
                  <th className="text-left px-3 py-1.5 font-semibold">Keterangan</th>
                  <th className="text-right px-8 py-1.5 font-semibold">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {showItems.map((it, idx) => (
                  <tr key={idx} className={idx % 2 ? "bg-zinc-50" : ""}>
                    <td className="px-3 py-1.5">{it.label}</td>
                    <td className="px-3 py-1.5 text-right">{rp(it.amount || 0)}</td>
                  </tr>
                ))}

                {compact && hiddenCount > 0 && (
                  <tr className="bg-zinc-50">
                    <td className="px-3 py-1.5 text-zinc-600">+ {hiddenCount} item lainnya</td>
                    <td className="px-3 py-1.5 text-right text-zinc-600">{rp(hiddenSum)}</td>
                  </tr>
                )}

                <tr className="bg-zinc-50">
                  <td className="px-3 py-1.5">Tagihan Bulan Lalu</td>
                  <td className="px-3 py-1.5 text-right">{renderTagihanLaluText(tagihanLalu)}</td>
                </tr>

                <tr style={{ borderTop: "1px solid #E5E7EB" }}>
                  <td className="px-3 py-1.5 font-semibold">Tagihan Bulan Ini</td>
                  <td className="px-3 py-1.5 text-right font-semibold">{rp(tagihanSekarang)}</td>
                </tr>

                <tr className="bg-emerald-50" style={{ borderTop: "1px solid #A7F3D0" }}>
                  <td className="px-3 py-1.5 font-bold text-emerald-700">Total Tagihan</td>
                  <td className="px-3 py-1.5 text-right font-bold text-emerald-700">{rp(totalGabungan)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
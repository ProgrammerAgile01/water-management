import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const revalidate = 0;

function fmtIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0);
}
function periodToLong(ym: string) {
  const d = new Date(`${ym}-01T00:00:00`);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function tanggalID(d?: Date | null) {
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

type PageProps = {
  params: { tagihanId: string };
  searchParams: { payId?: string };
};

export default async function KwitansiPage({
  params,
  searchParams,
}: PageProps) {
  // TANPA print secret
  const tagihan = await prisma.tagihan.findUnique({
    where: { id: params.tagihanId },
    include: {
      pelanggan: { select: { nama: true, kode: true, alamat: true } },
    },
  });
  if (!tagihan) return notFound();

  const pembayaran = searchParams.payId
    ? await prisma.pembayaran.findUnique({ where: { id: searchParams.payId } })
    : await prisma.pembayaran.findFirst({
        where: { tagihanId: params.tagihanId, deletedAt: null },
        orderBy: { tanggalBayar: "desc" },
      });
  if (!pembayaran) return notFound();

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });

  const nomorKwitansi =
    `KW-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(
      2,
      "0"
    )}` +
    `-${tagihan.pelanggan?.kode || "CUST"}-${String(Math.random()).slice(
      2,
      8
    )}`;

  const data = {
    alamatPerusahaan: setting?.alamat || "Boyolali",
    perusahaan: setting?.namaPerusahaan || "Perusahaan Air Bersih",
    logoUrl: setting?.logoUrl || "", // kalau kosong, pakai blok gradient
    nomorKwitansi,
    pelangganNama: tagihan.pelanggan?.nama || "-",
    pelangganKode: tagihan.pelanggan?.kode || "-",
    periode: periodToLong(tagihan.periode),
    tanggalBayar: tanggalID(pembayaran.tanggalBayar),
    metode: pembayaran.metode,
    totalTagihan: fmtIDR(tagihan.totalTagihan), // TANPA denda
    jumlahBayar: fmtIDR(pembayaran.jumlahBayar),
    keterangan: pembayaran.keterangan || "",
    alamat: tagihan.pelanggan?.alamat || "",
  };

  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Kwitansi Pembayaran</title>
        <style>{`
          /* ==== Tampilan struk untuk layar HP & screenshot ==== */

/* jangan pakai @page di sini—bikin area kosong saat screenshot */
html, body {
  margin: 0; padding: 0;
  height: 100%;
  font-family: "Segoe UI", Roboto, Arial, sans-serif;
  background: #f5f6f8; color: #0f172a;
  -webkit-print-color-adjust: exact;
}

/* isolasi konten di dalam wrapper Next */
#__next > *:not(#kwitansi-root) { display: none !important; }

/* kanvas kwitansi */
#kwitansi-root {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 8px;
  background: transparent;
}

/* lebar “kertas” diset ke 380px (ukuran ponsel); ini yang di-screenshot */
.paper{
  width: 380px;                    /* <— inti: lebih sempit = teks tampak besar */
  background:#fff;
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
  display:flex;
  flex-direction:column;
  box-sizing: border-box;
  overflow: hidden;
}

/* header lebih tegas */
.header{
  display:flex; align-items:center; gap:12px;
  padding:16px;
  color:#fff;
  background: linear-gradient(135deg, #16a34a, #22c55e);
}
.logo{ width:50px; height:50px; border-radius:10px; background:url('/logo.png') center/cover no-repeat; flex-shrink:0; }
.brand{ line-height:1.25 }
.brand .company{ font-weight:800; font-size:18px; letter-spacing:.2px; }
.brand .subtitle{ font-size:12px; opacity:.95 }

/* section & card */
.section{ padding: 14px; }
.card{
  border:1px solid #e5e7eb; border-radius:12px; padding:14px; background:#fff;
  box-shadow:0 1px 2px rgba(0,0,0,.04);
}
.card + .card{ margin-top:12px; }

/* baris data — perbesar font */
.row{
  display:flex; justify-content:space-between; gap:12px;
  margin:10px 0; font-size:16px;               /* <— lebih besar */
}
.key{ color:#6b7280; }
.val{ color:#111827; font-weight:600; text-align:right; max-width:60%; }

/* elemen kecil */
.divider{ height:1px; background:#e5e7eb; margin:12px 0; }
.badge{ display:inline-block; border-radius:999px; background:#dcfce7; color:#166534; padding:5px 12px; font-size:12px; font-weight:800; }
.muted{ color:#6b7280; font-size:12px; }
.foot{ text-align:center; color:#6b7280; font-size:12px; padding:14px; border-top:1px solid #e5e7eb; margin-top:auto; }
        `}</style>
      </head>
      <body>
        <div id="kwitansi-root">
          <div className="paper">
            {/* HEADER */}
            <div className="header">
              <div className="logo" />
              <div className="brand">
                <div className="company">{data.perusahaan}</div>
                <div className="subtitle">
                  {data.alamatPerusahaan}
                </div>
                <div className="subtitle">
                  No. {data.nomorKwitansi}
                </div>
              </div>
            </div>

            {/* CARD: Info Pelanggan & Tagihan */}
            <h1 className="text-center mt-2 font-semibold text-xl">Kwitansi Pembayaran</h1>
            <div className="section">
              <div className="card">
                <div className="row">
                  <div className="key">Nama Pelanggan</div>
                  <div className="val">{data.pelangganNama}</div>
                </div>
                <div className="row">
                  <div className="key">Kode Pelanggan</div>
                  <div className="val">{data.pelangganKode}</div>
                </div>
                <div className="row">
                  <div className="key">Alamat</div>
                  <div
                    className="val"
                    style={{ maxWidth: "56%", whiteSpace: "pre-wrap" }}
                  >
                    {data.alamat || "-"}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="row">
                  <div className="key">Periode Tagihan</div>
                  <div className="val">{data.periode}</div>
                </div>
                <div className="row">
                  <div className="key">Tanggal Pembayaran</div>
                  <div className="val">{data.tanggalBayar}</div>
                </div>
                <div className="row">
                  <div className="key">Metode</div>
                  <div className="val">{data.metode}</div>
                </div>
              </div>

              <div className="card">
                <div className="row">
                  <div className="key">Total Tagihan</div>
                  <div className="val">{data.totalTagihan}</div>
                </div>
                <div className="row">
                  <div className="key">Jumlah Dibayar</div>
                  <div className="val">{data.jumlahBayar}</div>
                </div>
                <div className="row">
                  <div className="key">Status</div>
                  <div className="val">
                    <span className="badge">LUNAS</span>
                  </div>
                </div>
                {data.keterangan ? (
                  <>
                    <div className="divider" />
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div className="key" style={{ fontSize: "12px" }}>
                        Keterangan
                      </div>
                      <div
                        className="val"
                        style={{
                          fontWeight: 400,
                          color: "#374151",
                          maxWidth: "60%",
                          textAlign: "right",
                        }}
                      >
                        {data.keterangan}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* FOOTER */}
            <div className="foot">
              Bukti sah pembayaran untuk layanan air bersih. Simpan dokumen ini
              untuk arsip Anda.
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

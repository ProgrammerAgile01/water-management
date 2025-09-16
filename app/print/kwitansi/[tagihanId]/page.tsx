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
          /* ukuran struk + margin */
          @page { size: 95mm 170mm; margin: 6mm; }

          html, body {
            margin: 0; padding: 0;
            height: 100%;
            font-family: "Segoe UI", Roboto, Arial, sans-serif;
            background: #f3f4f6; color: #0f172a;
            -webkit-print-color-adjust: exact;
          }

          /* --- Isolasi konten: hanya #kwitansi-root yang tampil --- */
          body > *:not(#kwitansi-root) { display: none !important; }

          /* layout */
          #kwitansi-root { width: 100%; display: flex; justify-content: center; }
          .paper { width: 100%; overflow: hidden; background:#fff; box-shadow: 0 4px 10px rgba(0,0,0,.08); }

          .paper{
  display:flex;
  flex-direction:column;
  /* 170mm - (margin @page 6mm atas + 6mm bawah) = area konten cetak */
  min-height: calc(170mm - 12mm);
  /* jaga sudut kasus overflow */
  box-sizing: border-box;
}
  
          /* header hijau */
          .header {
            display: flex; align-items: center; gap: 12px;
            padding: 14px;
            color: #fff;
            background: linear-gradient(135deg, #16a34a, #22c55e);
          }
          .logo {
            width:44px; height:44px; border-radius:8px;
            background: url('/logo.png') center/cover no-repeat;
            flex-shrink:0;
          }
          .brand { display:flex; flex-direction:column; line-height:1.2 }
          .brand .company { font-weight: 800; font-size: 14px; letter-spacing: .2px; }
          .brand .subtitle { font-size: 11px; opacity: .95 }

          /* card section */
          .section { padding: 14px; }
          .card {
            border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; background:#fff;
            box-shadow: 0 1px 2px rgba(0,0,0,.04);
          }
          .card + .card { margin-top: 10px; }

          /* rows */
          .row { display:flex; justify-content:space-between; gap:10px; margin:8px 0; font-size: 13px; }
          .key { color:#6b7280; }
          .val { color:#111827; font-weight: 600; text-align:right; }

          .divider { height:1px; background:#e5e7eb; margin: 10px 0; }

          .badge {
            display:inline-block; border-radius: 999px; background:#dcfce7; color:#166534;
            padding: 4px 10px; font-size: 11px; font-weight: 700;
          }

          .muted { color:#6b7280; font-size: 11px; }
          .foot  { text-align:center; color:#6b7280; font-size:11px; padding: 12px; border-top:1px solid #e5e7eb;  margin-top: auto; }
          @media screen{
  .paper{ min-height: 100vh; }
}
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
                <div className="subtitle font-semibold">
                  Kwitansi Pembayaran
                </div>
                <div className="subtitle">
                  No. {data.nomorKwitansi}
                </div>
              </div>
            </div>

            {/* CARD: Info Pelanggan & Tagihan */}
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
                    <span className="badge">TERVERIFIKASI</span>
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

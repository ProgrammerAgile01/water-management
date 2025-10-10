// // // app/api/support/_bot.ts
// // export function botAutoReplyFor(text: string) {
// //   const t = (text || "").trim().toLowerCase();

// //   if (t === "help" || t === "/help") {
// //     return `Daftar perintah:
// // • help — menampilkan perintah
// // • piutang — ringkasan piutang + export
// // • jadwal — jadwal catat hari ini
// // • tagihan <kode> — link tagihan pelanggan
// // • kwitansi <kode> — link kwitansi terakhir
// // • statuswa — status koneksi WhatsApp`;
// //   }

// //   if (t === "piutang" || t === "/piutang") {
// //     return `Ringkasan Piutang (bulan berjalan)
// // - Total pelanggan menunggak: (contoh) 23
// // - Total nominal: Rp 12.450.000
// // - Export Excel: /api/laporan/piutang?format=xlsx
// // - Tabel ringkas: /laporan/piutang`;
// //   }

// //   return null;
// // }

// // export function waLinkForAdminForward(
// //   body: string,
// //   phoneIntl = "6281234982153"
// // ) {
// //   return `https://wa.me/${phoneIntl}?text=${encodeURIComponent(body)}`;
// // }

// // app/api/support/_bot.ts
// import { PrismaClient } from "@prisma/client";

// // format rupiah ringkas
// const rupiah = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

// // periode sekarang (YYYY-MM)
// export function currentPeriod() {
//   const d = new Date();
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   return `${y}-${m}`;
// }

// // ===== AUTO REPLY DINAMIS =====
// export async function botAutoReplyFor(
//   text: string,
//   prisma: PrismaClient
// ): Promise<string | null> {
//   const raw = (text || "").trim();
//   const t = raw.toLowerCase();
//   const [cmd, ...rest] = t.split(/\s+/);
//   const arg = rest.join(" ").trim();

//   // 1) HELP
//   if (cmd === "help" || cmd === "/help") {
//     return `Daftar perintah:
// • help — menampilkan perintah
// • piutang — ringkasan piutang bulan berjalan
// • jadwal — jadwal catat hari ini
// • tagihan <kode> — link tagihan pelanggan
// • kwitansi <kode> — link kwitansi terakhir
// • statuswa — status koneksi WhatsApp`;
//   }

//   // 2) PIUTANG (bulan berjalan)
//   if (cmd === "piutang" || cmd === "/piutang") {
//     const periode = currentPeriod();

//     // ambil tagihan UNPAID periode ini
//     const items = await prisma.tagihan.findMany({
//       where: {
//         periode,
//         statusBayar: "UNPAID",
//         deletedAt: null,
//       },
//       select: { totalTagihan: true },
//     });

//     const totalPelanggan = items.length;
//     const totalNominal = items.reduce((a, b) => a + (b.totalTagihan || 0), 0);

//     return `Ringkasan Piutang (${periode})
// - Total pelanggan menunggak: ${totalPelanggan}
// - Total nominal: ${rupiah(totalNominal)}
// - Export Excel: /api/laporan/piutang?format=xlsx
// - Tabel ringkas: /laporan/piutang`;
//   }

//   // 3) JADWAL HARI INI
//   if (cmd === "jadwal") {
//     const today = new Date();
//     const start = new Date(today);
//     start.setHours(0, 0, 0, 0);
//     const end = new Date(today);
//     end.setHours(23, 59, 59, 999);

//     const list = await prisma.jadwalPencatatan.findMany({
//       where: {
//         tanggalRencana: { gte: start, lte: end },
//       },
//       include: {
//         zona: { select: { nama: true } },
//         petugas: { select: { name: true } },
//       },
//       orderBy: { tanggalRencana: "asc" },
//       take: 10,
//     });

//     if (list.length === 0) {
//       return "Jadwal hari ini kosong.";
//     }

//     const lines = list.map((j, i) => {
//       const jam = new Date(j.tanggalRencana).toLocaleTimeString("id-ID", {
//         hour: "2-digit",
//         minute: "2-digit",
//       });
//       return `${i + 1}. ${j.zona?.nama || "-"} — ${jam} — Petugas: ${
//         j.petugas?.name || "-"
//       }`;
//     });

//     return `Jadwal Pencatatan Hari Ini:\n${lines.join("\n")}`;
//   }

//   // 4) TAGIHAN <kodePelanggan>
//   if (cmd === "tagihan" && arg) {
//     const pelanggan = await prisma.pelanggan.findUnique({
//       where: { kode: arg.toUpperCase() },
//       select: { id: true, nama: true },
//     });
//     if (!pelanggan) return `Pelanggan dengan kode "${arg}" tidak ditemukan.`;

//     const periode = currentPeriod();
//     const tagihan = await prisma.tagihan.findUnique({
//       where: { pelangganId_periode: { pelangganId: pelanggan.id, periode } },
//       select: { id: true, statusBayar: true },
//     });

//     if (!tagihan)
//       return `Belum ada tagihan periode ${periode} untuk ${pelanggan.nama}.`;
//     return `Tagihan ${pelanggan.nama} (${periode})
// Status: ${tagihan.statusBayar}
// Lihat: /api/tagihan/preview/${tagihan.id}`;
//   }

//   // 5) KWITANSI <kodePelanggan>
//   if (cmd === "kwitansi" && arg) {
//     const pelanggan = await prisma.pelanggan.findUnique({
//       where: { kode: arg.toUpperCase() },
//       select: { id: true, nama: true },
//     });
//     if (!pelanggan) return `Pelanggan dengan kode "${arg}" tidak ditemukan.`;

//     const lastPay = await prisma.pembayaran.findFirst({
//       where: {
//         tagihan: { pelangganId: pelanggan.id, deletedAt: null },
//         deletedAt: null,
//       },
//       include: { tagihan: { select: { periode: true, id: true } } },
//       orderBy: { tanggalBayar: "desc" },
//     });

//     if (!lastPay) return `Belum ada pembayaran untuk ${pelanggan.nama}.`;
//     return `Kwitansi terakhir ${pelanggan.nama}
// Periode: ${lastPay.tagihan?.periode}
// Jumlah: ${rupiah(lastPay.jumlahBayar)}
// Kwitansi: /api/kwitansi/${lastPay.id}`;
//   }

//   // 6) STATUSWA — contoh sederhana baca Setting.whatsappCs sebagai indikator
//   if (cmd === "statuswa") {
//     const s = await prisma.setting.findUnique({ where: { id: 1 } });
//     const no = s?.whatsappCs?.replace(/^\+?0/, "62") ?? "N/A";
//     // di sini kamu bisa tambahkan pengecekan status gateway kalau ada tabel status koneksi
//     return `WhatsApp Admin: ${no}\nStatus: TERSEDIA`;
//   }

//   return null;
// }

// // Link wa.me untuk forward manual (opsional)
// export function waLinkForAdminForward(
//   body: string,
//   phoneIntl = "62857022127770"
// ) {
//   return `https://wa.me/${phoneIntl}?text=${encodeURIComponent(body)}`;
// }

// app/api/support/_bot.ts
import type { PrismaClient } from "@prisma/client";

// Nomor WA admin (gunakan HANYA untuk tombol manual)
export const ADMIN_WA = "6281234982153";

const fmtIDR = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const yyyymm = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/**
 * Kembalikan balasan otomatis untuk teks tertentu.
 * Jika butuh data DB (piutang/jadwal), berikan prisma instance.
 */
export async function botAutoReplyFor(text: string, prisma?: PrismaClient) {
  const t = (text || "").trim().toLowerCase();

  // --- HELP ---
  if (t === "help" || t === "/help") {
    return `Daftar perintah:
• help — menampilkan perintah
• piutang — ringkasan piutang bulan berjalan
• jadwal — jadwal catat HARI INI
• tagihan <kode> — link tagihan pelanggan
• kwitansi <kode> — link kwitansi terakhir
• statuswa — status koneksi WhatsApp`;
  }

  if (!prisma) return null;

  // --- PIUTANG (bulan berjalan, UNPAID) ---
  if (t === "piutang" || t === "/piutang") {
    const periode = yyyymm(new Date());
    const rows = await prisma.tagihan.findMany({
      where: { periode, statusBayar: { not: "PAID" }, deletedAt: null as any },
      select: {
        totalTagihan: true,
        pelanggan: { select: { nama: true, kode: true } },
      },
    });

    const totalNominal = rows.reduce((s, r) => s + (r.totalTagihan || 0), 0);
    const jml = rows.length;

    const top3 = rows
      .slice(0, 3)
      .map(
        (r, i) =>
          `${i + 1}. ${r.pelanggan?.nama ?? "-"} (${r.pelanggan?.kode ?? "-"})`
      )
      .join("\n");

    return `Ringkasan Piutang — ${periode}
- Jumlah pelanggan menunggak: ${jml}
- Total nominal: ${fmtIDR(totalNominal)}
${
  jml ? `- Top 3: \n${top3}\n` : ""
}- Export Excel: /api/laporan/piutang?format=xlsx
- Lihat tabel: /laporan/piutang`;
  }

  // --- JADWAL (hari ini) ---
  if (t === "jadwal" || t === "/jadwal") {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );

    const items = await prisma.jadwalPencatatan.findMany({
      where: { tanggalRencana: { gte: start, lt: end } },
      orderBy: { tanggalRencana: "asc" },
      take: 50,
      select: {
        bulan: true,
        tanggalRencana: true,
        target: true,
        progress: true,
        status: true,
      },
    });

    if (items.length === 0) return "Jadwal hari ini kosong.";

    const lines = items
      .map((j, i) => {
        const jam = new Date(j.tanggalRencana!).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${i + 1}. ${j.bulan} • ${jam} • target ${j.target} • progress ${
          j.progress
        } • status ${j.status}`;
      })
      .join("\n");

    return `Jadwal HARI INI (${items.length}):\n${lines}`;
  }

  // --- TAGIHAN & KWITANSI ---
  if (t.startsWith("tagihan ")) {
    const kode = t.split(/\s+/)[1]?.trim();
    if (!kode) return "Format: tagihan <kode>";
    return `Link tagihan ${kode}: /tagihan-pembayaran?kode=${encodeURIComponent(
      kode
    )}`;
  }
  if (t.startsWith("kwitansi ")) {
    const kode = t.split(/\s+/)[1]?.trim();
    if (!kode) return "Format: kwitansi <kode>";
    return `Kwitansi terakhir ${kode}: /tagihan-pembayaran?kode=${encodeURIComponent(
      kode
    )}#kwitansi`;
  }

  if (t === "statuswa" || t === "/statuswa") {
    // Jika ada checker WA, ganti sesuai status real.
    return "Status WhatsApp: CONNECTED";
  }

  return null;
}

/** Hanya dipakai tombol manual (bukan otomatis) */
export function waLinkForAdminForward(body: string, phoneIntl = ADMIN_WA) {
  return `https://wa.me/${phoneIntl}?text=${encodeURIComponent(body)}`;
}

/* scripts/backfill-info.ts
   Backfill Tagihan.info:
   - [PREV_CLEARED:YYYY-MM,...] di bulan “pembayaran yang melunasi carry”
   - [PAID_BY:YYYY-MM] di bulan asal tagihan yg tertutup di bulan lain
   - [CREDIT:n] saat sisaKurang < 0 (lebih bayar)
   Aman diulang: merge marker, tanpa duplikasi.
*/

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ log: ["warn", "error"] });

type TRow = {
  id: string;
  pelangganId: string;
  periode: string;               // "YYYY-MM"
  totalTagihan: number;
  tagihanLalu: number;
  sisaKurang: number;
  info: string | null;
  dibayar: number;                // total pembayaran bulan ini
};

function parseInfo(info?: string | null) {
  const s = info || "";
  const prevCleared = (() => {
    const m = s.match(/\[PREV_CLEARED:([0-9,\-\s]+)\]/);
    if (!m) return new Set<string>();
    return new Set(
      m[1].split(",").map(x => x.trim()).filter(Boolean)
    );
  })();
  const paidBy = (() => {
    const m = s.match(/\[PAID_BY:(\d{4}-\d{2})\]/);
    return m ? m[1] : null;
  })();
  const credit = (() => {
    const m = s.match(/\[CREDIT:(\d+)\]/);
    return m ? Number(m[1]) : 0;
  })();
  return { prevCleared, paidBy, credit };
}

function buildInfo(existing: string | null, patch: {
  addPrevCleared?: string[];   // months to add
  setPaidBy?: string | null;   // set once (keep earliest if already set)
  setCredit?: number | null;   // replace with latest computed
}) {
  const cur = parseInfo(existing);
  const prevSet = new Set(cur.prevCleared);
  (patch.addPrevCleared || []).forEach(m => prevSet.add(m));

  const tokens: string[] = [];

  if (prevSet.size > 0) {
    tokens.push(`[PREV_CLEARED:${Array.from(prevSet).join(",")}]`);
  }

  const paidBy = cur.paidBy || patch.setPaidBy || null;
  if (paidBy) tokens.push(`[PAID_BY:${paidBy}]`);

  if (typeof patch.setCredit === "number") {
    if (patch.setCredit > 0) tokens.push(`[CREDIT:${Math.round(patch.setCredit)}]`);
  } else if (cur.credit > 0) {
    // pertahankan kredit lama jika tidak ada patch
    tokens.push(`[CREDIT:${Math.round(cur.credit)}]`);
  }

  const base = (existing || "").replace(/\[(PREV_CLEARED|PAID_BY|CREDIT):[^\]]+\]/g, "").trim();
  return [base, tokens.join(" ")].filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim() || null;
}

function ymCmp(a: string, b: string) {
  // ascending
  return a.localeCompare(b, undefined, { numeric: true });
}

// Core: alokasi pembayaran bulan berjalan ke “carry lama dulu (FIFO)”, lalu ke tagihan bulan ini.
async function processPelanggan(pelangganId: string, dryRun = true) {
  // Ambil semua tagihan pelanggan ini (ASC periode) + total bayar per tagihan
  const rowsRaw = await prisma.tagihan.findMany({
    where: { pelangganId, deletedAt: null },
    orderBy: { periode: "asc" },
    select: {
      id: true, pelangganId: true, periode: true,
      totalTagihan: true, tagihanLalu: true, sisaKurang: true, info: true,
      pembayarans: { where: { deletedAt: null }, select: { jumlahBayar: true } },
    },
  });

  const rows: TRow[] = rowsRaw.map(t => ({
    id: t.id,
    pelangganId: t.pelangganId,
    periode: t.periode,
    totalTagihan: t.totalTagihan || 0,
    tagihanLalu: t.tagihanLalu || 0,
    sisaKurang: t.sisaKurang || 0,
    info: t.info || null,
    dibayar: t.pembayarans.reduce((a, p) => a + (p.jumlahBayar || 0), 0),
  }));

  // FIFO daftar carry yang belum lunas dari bulan-bulan sebelumnya
  // Isi awal: bulan-bulan sebelum iterasi yg punya sisaKurang>0 di akhir bulannya akan “terlihat” sebagai carry bulan berikutnya.
  // Kita rekonstruksi berdasar perjalanan waktu.
  type CarryItem = { periode: string; left: number; tagihanId: string };
  const openCarries: CarryItem[] = [];

  // helper: jumlahkan carry terbuka (debug)
  const totalOpen = () => openCarries.reduce((a,c)=>a+c.left,0);

  // catat patch per bulan
  const patches: Record<string, { addPrevCleared: string[]; setPaidBy?: string | null; setCredit?: number | null }> = {};

  for (const r of rows) {
    patches[r.id] = { addPrevCleared: [] };

    let pay = r.dibayar;

    // 1) bayar carry lama lebih dulu (FIFO)
    const clearedThisMonth: string[] = [];
    for (let i = 0; i < openCarries.length && pay > 0; ) {
      const c = openCarries[i];
      const take = Math.min(pay, c.left);
      c.left -= take;
      pay    -= take;
      if (c.left <= 0) {
        // carry bulan c.periode lunas di r.periode
        clearedThisMonth.push(c.periode);
        // tulis PAID_BY ke bulan asal (c)
        // (jika sebelumnya sudah ada PAID_BY, biarkan yg lama)
        const prevPatch = patches[c.tagihanId] || { addPrevCleared: [] };
        prevPatch.setPaidBy = prevPatch.setPaidBy ?? r.periode;
        patches[c.tagihanId] = prevPatch;

        openCarries.splice(i, 1);
      } else {
        i++;
      }
    }

    // 2) catat di bulan ini kalau ada carry yang tertutup
    if (clearedThisMonth.length) {
      clearedThisMonth.sort(ymCmp);
      patches[r.id].addPrevCleared.push(...clearedThisMonth);
    }

    // 3) sisa pay baru masuk ke tagihan bulan ini → cek apakah lebih bayar
    // Kita tidak perlu memaksa ulang angka; cukup pasang CREDIT sesuai DB sisaKurang
    if (r.sisaKurang < 0) {
      patches[r.id].setCredit = Math.abs(r.sisaKurang);
    } else {
      patches[r.id].setCredit = 0; // hapus CREDIT jika tidak ada
    }

    // 4) jika akhir bulan ini masih kurang (>0), tambahkan sebagai carry terbuka
    const residualThisMonth = Math.max(r.sisaKurang, 0);
    if (residualThisMonth > 0) {
      openCarries.push({ periode: r.periode, left: residualThisMonth, tagihanId: r.id });
    }

    // Konsistensi ringan (opsional, debug):
    // if (Math.abs(totalOpen() - residualThisMonth) > 0 && r.tagihanLalu !== totalOpen()) { ... }
  }

  // Tulis patch ke DB
  const ops = Object.entries(patches).map(([tagihanId, p]) => {
    return prisma.tagihan.update({
      where: { id: tagihanId },
      data: { info: buildInfo(rows.find(x=>x.id===tagihanId)?.info ?? null, p) },
    });
  });

  if (dryRun) {
    return { pelangganId, updated: ops.length, dryRun: true };
  } else {
    await prisma.$transaction(ops);
    return { pelangganId, updated: ops.length, dryRun: false };
  }
}

async function main() {
  const DRY = process.env.DRY_RUN !== "0"; // default DRY_RUN=1
  console.log(`[backfill-info] start. dryRun=${DRY ? "YES" : "NO"}`);

  // Ambil semua pelanggan yg punya tagihan
  const pids = await prisma.tagihan.findMany({
    where: { deletedAt: null },
    select: { pelangganId: true },
    distinct: ["pelangganId"],
  }).then(rs => rs.map(r => r.pelangganId));

  let ok = 0;
  for (const pid of pids) {
    const res = await processPelanggan(pid, DRY);
    ok += 1;
    console.log(`- pelanggan ${pid}: planned updates=${res.updated} dry=${res.dryRun}`);
  }

  console.log(`[backfill-info] done. processed pelanggan=${ok}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
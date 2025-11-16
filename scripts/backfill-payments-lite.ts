/**
 * scripts/backfill-payments-lite.ts
 *
 * Backfill minimal:
 *  - rebuild detailPembayaran untuk pembayaran per pelanggan
 *  - recalc & write only: tagihan.sudahBayar, tagihan.belumBayar
 *
 * Safety: DRY_RUN=1 untuk simulasi (no DB writes).
 * To apply: FORCE=1
 *
 * Usage:
 * DRY_RUN=1 node -r ts-node/register scripts/backfill-payments-lite.ts
 * FORCE=1 node -r ts-node/register scripts/backfill-payments-lite.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DRY_RUN = !!process.env.DRY_RUN;
const FORCE = !!process.env.FORCE;

async function log(...args: any[]) {
  console.log(new Date().toISOString(), ...args);
}

async function run() {
  if (!DRY_RUN && !FORCE) {
    console.error("Safety: set DRY_RUN=1 to simulate or FORCE=1 to apply.");
    process.exit(1);
  }

  log("Start backfill (lite)", { DRY_RUN, FORCE });

  // Option: you can restrict pelanggan by filter here for faster tests
  const pelangganList = await prisma.pelanggan.findMany({
    select: { id: true, nama: true, kode: true },
  });

  log(`Pelanggan to process: ${pelangganList.length}`);

  let totalDetailCreated = 0;
  let totalPayments = 0;

  for (const p of pelangganList) {
    // get tagihan and pembayaran for this pelanggan
    const tagihanList = await prisma.tagihan.findMany({
      where: { pelangganId: p.id, deletedAt: null },
      orderBy: { periode: "asc" },
      select: { id: true, periode: true, totalTagihan: true },
    });
    if (!tagihanList.length) continue;

    const pembayaranList = await prisma.pembayaran.findMany({
      where: { tagihan: { pelangganId: p.id }, deletedAt: null },
      orderBy: { tanggalBayar: "asc" },
      select: {
        id: true,
        tagihanId: true,
        jumlahBayar: true,
        tanggalBayar: true,
      },
    });
    if (!pembayaranList.length) continue;

    log(
      `Processing pelanggan ${p.kode || p.id}: tagihan=${
        tagihanList.length
      }, pembayaran=${pembayaranList.length}`
    );

    // Work inside a transaction per pelanggan
    await prisma.$transaction(async (tx) => {
      const pembayaranIds = pembayaranList.map((x) => x.id);

      // delete existing detailPembayaran for these pembayaran (so we rebuild for them)
      if (pembayaranIds.length > 0) {
        if (DRY_RUN) {
          log(
            `[DRY_RUN] would delete detailPembayaran for ${pembayaranIds.length} pembayaran`
          );
        } else {
          await tx.detailPembayaran.deleteMany({
            where: { pembayaranId: { in: pembayaranIds } },
          });
          log(
            `Deleted existing detailPembayaran for ${pembayaranIds.length} pembayaran`
          );
        }
      }

      // build simple in-memory map of tagihan remaining amounts
      type TTag = { id: string; periode: string; totalTagihan: number };
      const tagMap: Record<
        string,
        { total: number; sudahBayar: number; belum: number; periode: string }
      > = {};
      for (const t of tagihanList as TTag[]) {
        const total = t.totalTagihan ?? 0;
        tagMap[t.id] = {
          total,
          sudahBayar: 0,
          belum: total,
          periode: t.periode,
        };
      }

      // allocate each payment across oldest tagihan -> newest
      let createdForThisPelanggan = 0;
      for (const pay of pembayaranList) {
        let dana = Math.round(pay.jumlahBayar || 0);
        if (dana <= 0) continue;
        totalPayments++;

        for (const t of tagihanList) {
          if (dana <= 0) break;
          const state = tagMap[t.id];
          if (!state) continue;
          const before = state.belum;
          if (before <= 0) continue;

          const potong = Math.min(before, dana);

          if (DRY_RUN) {
            log(
              `[DRY_RUN] pembayaran ${pay.id} -> tagihan ${state.periode} potong=${potong}`
            );
          } else {
            await tx.detailPembayaran.create({
              data: {
                pembayaranId: pay.id,
                tagihanId: t.id,
                pelangganId: p.id,
                periode: state.periode,
                jumlahTerbayar: potong,
              },
            });
          }

          // update in-memory
          state.sudahBayar += potong;
          state.belum = Math.max(0, state.belum - potong);

          dana -= potong;
          createdForThisPelanggan++;
        }
      } // end payments loop

      // Now persist hanya sudahBayar & belumBayar per tagihan
      for (const t of tagihanList) {
        const s = tagMap[t.id];
        const newSudah = s.sudahBayar;
        const newBelum = Math.max(0, s.total - newSudah);

        if (DRY_RUN) {
          log(
            `[DRY_RUN] Would update tagihan ${t.id}: sudahBayar=${newSudah}, belumBayar=${newBelum}`
          );
        } else {
          await tx.tagihan.update({
            where: { id: t.id },
            data: {
              sudahBayar: newSudah,
              belumBayar: newBelum,
              // intentionally NOT touching: statusBayar, sisaKurang, info, statusVerif
            },
          });
        }
      }

      totalDetailCreated += createdForThisPelanggan;
    }); // end tx per pelanggan
  } // end pelanggan loop

  log("Finished backfill (lite)", { totalPayments, totalDetailCreated });
}

run()
  .then(() => {
    log("DONE");
    process.exit(0);
  })
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  });

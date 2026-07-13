import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export type LedgerChange = {
  id: string;
  periode: string;
  before: {
    tagihanLalu: number;
    sudahBayar: number;
    belumBayar: number;
    sisaKurang: number;
    statusBayar: string;
  };
  after: {
    tagihanLalu: number;
    sudahBayar: number;
    belumBayar: number;
    sisaKurang: number;
    statusBayar: "PAID" | "UNPAID";
  };
};

export type RebuildPaymentLedgerOptions = {
  pelangganId: string;
  fromPeriode?: string;
  dryRun?: boolean;
};

function n(value: number | null | undefined) {
  return Number(value || 0);
}

function hasChanged(change: LedgerChange) {
  return (
    change.before.tagihanLalu !== change.after.tagihanLalu ||
    change.before.sudahBayar !== change.after.sudahBayar ||
    change.before.belumBayar !== change.after.belumBayar ||
    change.before.sisaKurang !== change.after.sisaKurang ||
    change.before.statusBayar !== change.after.statusBayar
  );
}

export async function rebuildPaymentLedger(
  tx: Tx,
  options: RebuildPaymentLedgerOptions
) {
  const tags = await tx.tagihan.findMany({
    where: {
      pelangganId: options.pelangganId,
      deletedAt: null,
      ...(options.fromPeriode ? { periode: { gte: options.fromPeriode } } : {}),
    },
    orderBy: { periode: "asc" },
    select: {
      id: true,
      periode: true,
      totalTagihan: true,
      tagihanLalu: true,
      denda: true,
      sudahBayar: true,
      belumBayar: true,
      sisaKurang: true,
      statusBayar: true,
    },
  });

  if (!tags.length) return [] satisfies LedgerChange[];

  const tagIds = tags.map((t) => t.id);

  const details = await tx.detailPembayaran.findMany({
    where: {
      tagihanId: { in: tagIds },
      pelangganId: options.pelangganId,
      pembayaran: { deletedAt: null },
      tagihan: { deletedAt: null },
    },
    select: {
      tagihanId: true,
      jumlahTerbayar: true,
      pembayaranId: true,
    },
  });

  const detailPaidByTagihan = new Map<string, number>();
  const detailPaidByPayment = new Map<string, number>();
  for (const d of details) {
    detailPaidByTagihan.set(
      d.tagihanId,
      (detailPaidByTagihan.get(d.tagihanId) || 0) + n(d.jumlahTerbayar)
    );
    detailPaidByPayment.set(
      d.pembayaranId,
      (detailPaidByPayment.get(d.pembayaranId) || 0) + n(d.jumlahTerbayar)
    );
  }

  const payments = await tx.pembayaran.findMany({
    where: {
      deletedAt: null,
      tagihanId: { in: tagIds },
      tagihan: { pelangganId: options.pelangganId, deletedAt: null },
    },
    select: {
      id: true,
      tagihanId: true,
      jumlahBayar: true,
    },
  });

  const extraCreditByAnchor = new Map<string, number>();
  for (const p of payments) {
    const detailTotal = detailPaidByPayment.get(p.id) || 0;
    const extra = Math.max(0, n(p.jumlahBayar) - detailTotal);
    if (extra > 0) {
      extraCreditByAnchor.set(
        p.tagihanId,
        (extraCreditByAnchor.get(p.tagihanId) || 0) + extra
      );
    }
  }

  let carry = n(tags[0].tagihanLalu);
  const changes: LedgerChange[] = [];

  for (const tagihan of tags) {
    const sudahBayar = detailPaidByTagihan.get(tagihan.id) || 0;
    const extraCredit = extraCreditByAnchor.get(tagihan.id) || 0;
    const sisaKurang =
      carry + n(tagihan.totalTagihan) + n(tagihan.denda) - sudahBayar - extraCredit;
    const belumBayar = Math.max(0, sisaKurang);
    const statusBayar = sisaKurang <= 0 ? "PAID" : "UNPAID";

    const change: LedgerChange = {
      id: tagihan.id,
      periode: tagihan.periode,
      before: {
        tagihanLalu: n(tagihan.tagihanLalu),
        sudahBayar: n(tagihan.sudahBayar),
        belumBayar: n(tagihan.belumBayar),
        sisaKurang: n(tagihan.sisaKurang),
        statusBayar: tagihan.statusBayar,
      },
      after: {
        tagihanLalu: carry,
        sudahBayar,
        belumBayar,
        sisaKurang,
        statusBayar,
      },
    };

    if (hasChanged(change)) {
      changes.push(change);
      if (!options.dryRun) {
        await tx.tagihan.update({
          where: { id: tagihan.id },
          data: change.after,
        });
      }
    }

    carry = sisaKurang;
  }

  return changes;
}

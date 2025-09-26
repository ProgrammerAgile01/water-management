// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export async function GET(req: Request) {
//   try {
//     const now = new Date();
//     const today = new Date(now.toISOString().slice(0, 10));

//     // Ambil semua tagihan yang masih UNPAID / ada sisa kurang
//     const bills = await prisma.tagihan.findMany({
//       where: {
//         deletedAt: null,
//         OR: [{ statusBayar: { not: "PAID" } }, { sisaKurang: { gt: 0 } }],
//       },
//       include: {
//         pelanggan: {
//           select: { nama: true, alamat: true, wa: true },
//         },
//         pembayarans: {
//           select: { jumlahBayar: true },
//         },
//       },
//       orderBy: { tglJatuhTempo: "asc" },
//       take: 300,
//     });

//     const items = bills.map((bill) => {
//       // total bayar yang sudah masuk
//       const totalPaid = bill.pembayarans.reduce((a, b) => a + b.jumlahBayar, 0);
//       const remaining = bill.totalTagihan - totalPaid;

//       const overdueDays =
//         bill.tglJatuhTempo < today
//           ? Math.floor(
//               (today.getTime() - bill.tglJatuhTempo.getTime()) /
//                 (1000 * 60 * 60 * 24)
//             )
//           : 0;

//       return {
//         id: bill.id,
//         name: bill.pelanggan?.nama ?? "-",
//         address: bill.pelanggan?.alamat ?? "-",
//         phone: bill.pelanggan?.wa ?? "",
//         period: bill.periode,
//         amount: remaining > 0 ? remaining : bill.sisaKurang,
//         dueDate: bill.tglJatuhTempo.toISOString().slice(0, 10),
//         daysOverdue: overdueDays,
//         status: bill.statusBayar,
//       };
//     });

//     return NextResponse.json({ items, total: items.length });
//   } catch (e: any) {
//     console.error("API belum-bayar error:", e);
//     return NextResponse.json(
//       { error: e?.message ?? "Server error" },
//       { status: 500 }
//     );
//   }
// }

// app/api/laporan-dashboard/belum-bayar/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const now = new Date();
    const today = new Date(now.toISOString().slice(0, 10));

    // Ambil semua tagihan yang masih ada sisa
    const bills = await prisma.tagihan.findMany({
      where: {
        deletedAt: null,
        OR: [{ statusBayar: { not: "PAID" } }, { sisaKurang: { gt: 0 } }],
      },
      include: {
        pelanggan: { select: { nama: true, alamat: true, wa: true } },
        pembayarans: { select: { jumlahBayar: true } },
      },
      orderBy: { tglJatuhTempo: "asc" },
      take: 300,
    });

    const items = bills
      .map((bill) => {
        const totalPaid = bill.pembayarans.reduce(
          (a, b) => a + (b.jumlahBayar || 0),
          0
        );
        const remainingRaw = (bill.totalTagihan || 0) - totalPaid;
        const remaining = Math.max(0, bill.sisaKurang ?? remainingRaw);

        const overdueDays =
          bill.tglJatuhTempo < today
            ? Math.floor(
                (today.getTime() - bill.tglJatuhTempo.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0;

        return {
          id: bill.id,
          name: bill.pelanggan?.nama ?? "-",
          address: bill.pelanggan?.alamat ?? "-",
          phone: bill.pelanggan?.wa ?? "",
          period: bill.periode,
          amount: remaining,
          dueDate: bill.tglJatuhTempo.toISOString().slice(0, 10),
          daysOverdue: overdueDays,
          status: bill.statusBayar,
        };
      })
      .filter((x) => x.amount > 0);

    return NextResponse.json({ items, total: items.length });
  } catch (e: any) {
    console.error("API belum-bayar error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

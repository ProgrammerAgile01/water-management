import PDFDocument from "pdfkit"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const periode = req.nextUrl.searchParams.get("periode") ?? ""
  if (!/^\d{4}-\d{2}$/.test(periode)) return new Response("Bad Request", { status: 400 })

  const rows = await prisma.tagihan.findMany({
    where: { periode, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      pelanggan: { select: { kode: true, nama: true, alamat: true, wa: true } },
      tarifPerM3: true, abonemen: true, totalTagihan: true, denda: true,
    },
  })

  const doc = new PDFDocument({ margin: 40, size: "A4" })
  const chunks: Uint8Array[] = []
  doc.on("data", (c) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))

  doc.fontSize(16).text(`Rekap Tagihan Air - Periode ${periode}`, { align: "center" })
  doc.moveDown()

  rows.forEach((r, idx) => {
    if (idx > 0) doc.addPage()
    doc.fontSize(12).text(`Kode: ${r.pelanggan.kode}`)
    doc.text(`Nama: ${r.pelanggan.nama}`)
    doc.text(`Alamat: ${r.pelanggan.alamat}`)
    doc.moveDown(0.5)
    doc.text(`Tarif/m³: Rp ${r.tarifPerM3.toLocaleString("id-ID")}`)
    doc.text(`Abonemen: Rp ${r.abonemen.toLocaleString("id-ID")}`)
    doc.text(`Denda: Rp ${r.denda.toLocaleString("id-ID")}`)
    doc.moveDown(0.5)
    doc.fontSize(14).text(`TOTAL: Rp ${r.totalTagihan.toLocaleString("id-ID")}`, { align: "right" })
  })

  doc.end()
  const buf = await done
  return new Response(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="tagihan-${periode}.pdf"`,
    },
  })
}
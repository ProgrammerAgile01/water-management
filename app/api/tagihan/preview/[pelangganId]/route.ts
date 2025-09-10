import PDFDocument from "pdfkit"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(_: NextRequest, { params }: { params: { pelangganId: string } }) {
  const id = params.pelangganId
  // ambil tagihan paling baru
  const t = await prisma.tagihan.findFirst({
    where: { pelangganId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { periode: true, tarifPerM3: true, abonemen: true, totalTagihan: true, denda: true,
      pelanggan: { select: { kode: true, nama: true, alamat: true } } },
  })
  if (!t) return new Response("Not Found", { status: 404 })

  const doc = new PDFDocument({ margin: 50, size: "A4" })
  const chunks: Uint8Array[] = []
  doc.on("data", (c) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))

  doc.fontSize(16).text("Tagihan Air", { align: "center" })
  doc.moveDown()
  doc.fontSize(12).text(`Periode: ${t.periode}`)
  doc.text(`Kode: ${t.pelanggan.kode}`)
  doc.text(`Nama: ${t.pelanggan.nama}`)
  doc.text(`Alamat: ${t.pelanggan.alamat}`)
  doc.moveDown()
  doc.text(`Tarif/m³: Rp ${t.tarifPerM3.toLocaleString("id-ID")}`)
  doc.text(`Abonemen: Rp ${t.abonemen.toLocaleString("id-ID")}`)
  doc.text(`Denda: Rp ${t.denda.toLocaleString("id-ID")}`)
  doc.moveDown()
  doc.fontSize(14).text(`TOTAL: Rp ${t.totalTagihan.toLocaleString("id-ID")}`, { align: "right" })
  doc.end()

  const buf = await done
  return new Response(buf, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="tagihan-${t.pelanggan.kode}.pdf"` },
  })
}
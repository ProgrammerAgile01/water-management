// import PDFDocument from "pdfkit"
// import { prisma } from "@/lib/prisma"
// import { NextRequest } from "next/server"

// export async function GET(_: NextRequest, { params }: { params: { pelangganId: string } }) {
//   const id = params.pelangganId
//   // ambil tagihan paling baru
//   const t = await prisma.tagihan.findFirst({
//   where: { pelangganId: id, deletedAt: null },
//   orderBy: { periode: "desc" }, // ⬅️ ganti createdAt -> periode
//   select: {
//     periode: true, tarifPerM3: true, abonemen: true, totalTagihan: true, denda: true,
//     pelanggan: { select: { kode: true, nama: true, alamat: true } },
//   },
// });
//   if (!t) return new Response("Not Found", { status: 404 })

//   const doc = new PDFDocument({ margin: 50, size: "A4" })
//   const chunks: Uint8Array[] = []
//   doc.on("data", (c) => chunks.push(c))
//   const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))

//   doc.fontSize(16).text("Tagihan Air", { align: "center" })
//   doc.moveDown()
//   doc.fontSize(12).text(`Periode: ${t.periode}`)
//   doc.text(`Kode: ${t.pelanggan.kode}`)
//   doc.text(`Nama: ${t.pelanggan.nama}`)
//   doc.text(`Alamat: ${t.pelanggan.alamat}`)
//   doc.moveDown()
//   doc.text(`Tarif/m³: Rp ${t.tarifPerM3.toLocaleString("id-ID")}`)
//   doc.text(`Abonemen: Rp ${t.abonemen.toLocaleString("id-ID")}`)
//   doc.text(`Denda: Rp ${t.denda.toLocaleString("id-ID")}`)
//   doc.moveDown()
//   doc.fontSize(14).text(`TOTAL: Rp ${t.totalTagihan.toLocaleString("id-ID")}`, { align: "right" })
//   doc.end()

//   const buf = await done
//   return new Response(buf, {
//     headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="tagihan-${t.pelanggan.kode}.pdf"` },
//   })
// }

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer";

let browserPromise: Promise<Browser> | null = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  }
  return browserPromise;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ pelangganId: string }> }) {
  const { pelangganId } = await ctx.params;

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3011";

  const url = `${origin.replace(/\/$/, "")}/print/invoice/${pelangganId}`;

  let page: puppeteer.Page | null = null;
  try {
    const browser = await getBrowser();   
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });

    const pdf = await page.pdf({
      // format: "A5",
      printBackground: true,
      preferCSSPageSize: true,
      // margin: { top: "20mm", bottom: "20mm", left: "12mm", right: "12mm" },
    });

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${pelangganId}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[html->pdf] error:", e);
    return new NextResponse("Internal Error", { status: 500 });
  } finally {
    if (page) await page.close();    
  }
}

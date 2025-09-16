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

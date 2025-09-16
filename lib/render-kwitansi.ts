import { getBrowser } from "./puppeteer-singleton";
import path from "node:path";
import fs from "node:fs/promises";

export async function renderKwitansiToJPG(opts: { tplUrl: string; outName: string }) {
  const { tplUrl, outName } = opts;
  const imgDir = path.join(process.cwd(), "public", "uploads", "payment", "kwitansi", "img");
  await fs.mkdir(imgDir, { recursive: true });
  const outPath = path.join(imgDir, outName);
  const publicUrl = `/uploads/payment/kwitansi/img/${outName}`;

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // cepat: cukup domcontentloaded; networkidle0 sering lama
    await page.setViewport({ width: 380, height: 800, deviceScaleFactor: 2 });
    await page.goto(tplUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.evaluate(() => { document.body.style.background = "#ffffff"; });
    await page.screenshot({ path: outPath, type: "jpeg", quality: 90, fullPage: false });
  } finally {
    try { await page.close(); } catch {}
  }
  return publicUrl;
}
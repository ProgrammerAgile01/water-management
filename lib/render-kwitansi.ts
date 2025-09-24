import { getBrowser } from "./puppeteer-singleton";
// import path from "node:path";
import fs from "node:fs/promises";
import { resolveUploadPath } from "./uploads";

export async function renderKwitansiToJPG(opts: { tplUrl: string; outName: string }) {
  const { tplUrl, outName } = opts;

  // const imgDir = path.join(process.cwd(), "public", "uploads", "payment", "kwitansi", "img");
  // await fs.mkdir(imgDir, { recursive: true });
  // const outPath = path.join(imgDir, outName);
  // const publicUrl = `/uploads/payment/kwitansi/img/${outName}`;

  // simpan ke .uploads/payment/kwitansi/img
  const relSegments = ["payment", "kwitansi", "img"];
  const absDir = resolveUploadPath(...relSegments);
  await fs.mkdir(absDir, { recursive: true });
  const absPath = resolveUploadPath(...relSegments, outName);
  const apiUrl = `/api/file/${relSegments.join("/")}/${outName}`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  // bantu debug kalau ada error di page
  page.on("console", (msg) => console.log("[kwitansi:console]", msg.text()));
  page.on("pageerror", (err) => console.error("[kwitansi:error]", err));

  try {
    await page.setViewport({ width: 380, height: 1000, deviceScaleFactor: 2 });

    // masuk ke halaman & tunggu jaringan relatif idle
    await page.goto(tplUrl, { waitUntil: "networkidle2", timeout: 60_000 });

    // TUNGGU konten utama muncul (ganti selector jika perlu)
    await page.waitForSelector(".paper", { visible: true, timeout: 20_000 });

    // tunggu font/layout siap (kalau tersedia)
    try { await page.evaluate(() => (document as any).fonts?.ready); } catch {}

    // pastikan background putih (jangan transparan)
    await page.evaluate(() => { document.body.style.background = "#ffffff"; });

    // screenshot ELEMEN (lebih aman daripada fullPage)
    const el = await page.$(".paper");
    const buffer = el
      ? await el.screenshot({ type: "jpeg", quality: 90 })
      : await page.screenshot({ type: "jpeg", quality: 90, fullPage: true });

    await fs.writeFile(absPath, buffer);
    return apiUrl;
  } finally {
    try { await page.close(); } catch {}
  }
}

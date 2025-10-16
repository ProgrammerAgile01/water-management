// import { getBrowser } from "./puppeteer-singleton";
// // import path from "node:path";
// import fs from "node:fs/promises";
// import { resolveUploadPath } from "./uploads";

// export async function renderKwitansiToJPG(opts: { tplUrl: string; outName: string }) {
//   const { tplUrl, outName } = opts;

//   // const imgDir = path.join(process.cwd(), "public", "uploads", "payment", "kwitansi", "img");
//   // await fs.mkdir(imgDir, { recursive: true });
//   // const outPath = path.join(imgDir, outName);
//   // const publicUrl = `/uploads/payment/kwitansi/img/${outName}`;

//   // simpan ke .uploads/payment/kwitansi/img
//   const relSegments = ["payment", "kwitansi", "img"];
//   const absDir = resolveUploadPath(...relSegments);
//   await fs.mkdir(absDir, { recursive: true });
//   const absPath = resolveUploadPath(...relSegments, outName);
//   const apiUrl = `/api/file/${relSegments.join("/")}/${outName}`;

//   const browser = await getBrowser();
//   const page = await browser.newPage();

//   // bantu debug kalau ada error di page
//   page.on("console", (msg) => console.log("[kwitansi:console]", msg.text()));
//   page.on("pageerror", (err) => console.error("[kwitansi:error]", err));

//   try {
//     await page.setViewport({ width: 380, height: 1000, deviceScaleFactor: 2 });

//     // masuk ke halaman & tunggu jaringan relatif idle
//     await page.goto(tplUrl, { waitUntil: "networkidle2", timeout: 60_000 });

//     // TUNGGU konten utama muncul (ganti selector jika perlu)
//     await page.waitForSelector(".paper", { visible: true, timeout: 20_000 });

//     // tunggu font/layout siap (kalau tersedia)
//     try { await page.evaluate(() => (document as any).fonts?.ready); } catch {}

//     // pastikan background putih (jangan transparan)
//     await page.evaluate(() => { document.body.style.background = "#ffffff"; });

//     // screenshot ELEMEN (lebih aman daripada fullPage)
//     const el = await page.$(".paper");
//     const buffer = el
//       ? await el.screenshot({ type: "jpeg", quality: 90 })
//       : await page.screenshot({ type: "jpeg", quality: 90, fullPage: true });

//     await fs.writeFile(absPath, buffer);
//     return apiUrl;
//   } finally {
//     try { await page.close(); } catch {}
//   }
// }

// lib/render-kwitansi.ts
// // lib/render-kwitansi.ts
// import { getBrowser } from "./puppeteer-singleton";
// import fs from "node:fs/promises";
// import path from "node:path";
// import { resolveUploadPath } from "./uploads";

// type RenderOpts = {
//   tplUrl: string;
//   outName: string;
//   selector?: string; // default ".paper"
//   persist?: boolean; // default false → EPHEMERAL (return base64)
// };

// /** Render halaman kwitansi ke JPG.
//  *  - persist=false (default) → { base64, filename } (tanpa simpan)
//  *  - persist=true             → simpan ke .uploads/payment/kwitansi/img dan return /api/file/...
//  */
// export async function renderKwitansiToJPG(
//   opts: RenderOpts
// ): Promise<string | { base64: string; filename: string }> {
//   const { tplUrl, outName, selector = ".paper", persist = false } = opts;

//   const relSegments = ["payment", "kwitansi", "img"];
//   const absDir = resolveUploadPath(...relSegments);
//   const absPath = resolveUploadPath(...relSegments, outName);
//   const apiUrl = `/api/file/${relSegments.join("/")}/${outName}`;

//   const browser = await getBrowser();
//   const page = await browser.newPage();

//   page.on("console", (msg) => console.log("[kwitansi:console]", msg.text()));
//   page.on("pageerror", (err) => console.error("[kwitansi:error]", err));

//   try {
//     await page.setViewport({ width: 380, height: 1000, deviceScaleFactor: 2 });
//     await page.goto(tplUrl, { waitUntil: "networkidle2", timeout: 60_000 });

//     try {
//       await page.waitForSelector(selector, { visible: true, timeout: 20_000 });
//     } catch {}
//     try {
//       await page.evaluate(() => (document as any).fonts?.ready);
//     } catch {}

//     await page.evaluate(() => {
//       document.body.style.background = "#ffffff";
//     });

//     const el = await page.$(selector);
//     const buffer = el
//       ? await el.screenshot({ type: "jpeg", quality: 85 })
//       : await page.screenshot({ type: "jpeg", quality: 85, fullPage: true });

//     if (!persist) {
//       return { base64: buffer.toString("base64"), filename: outName };
//     }

//     await fs.mkdir(absDir, { recursive: true });
//     await fs.writeFile(absPath, buffer);
//     return apiUrl;
//   } finally {
//     try {
//       await page.close();
//     } catch {}
//   }
// }

import { getBrowser } from "./puppeteer-singleton";
import fs from "node:fs/promises";
import { resolveUploadPath } from "./uploads";

/** Hasil: string (api url) jika persist=true, atau base64+filename jika persist=false  */
export type RenderOut =
  | string
  | {
      base64: string; // base64 murni TANPA prefix data:
      filename: string; // nama file yang rapi
      mimeType: "image/jpeg";
    };

export async function renderKwitansiToJPG(opts: {
  tplUrl: string;
  outName: string;
  persist?: boolean; // default true (simpan ke storage)
}): Promise<RenderOut> {
  const { tplUrl, outName, persist = true } = opts;

  const relSegments = ["payment", "kwitansi", "img"];
  const absDir = resolveUploadPath(...relSegments);
  const absPath = resolveUploadPath(...relSegments, outName);
  const apiUrl = `/api/file/${relSegments.join("/")}/${outName}`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  page.on("console", (msg) => console.log("[kwitansi:console]", msg.text()));
  page.on("pageerror", (err) => console.error("[kwitansi:error]", err));

  try {
    await page.setViewport({ width: 380, height: 1000, deviceScaleFactor: 2 });
    await page.goto(tplUrl, { waitUntil: "networkidle2", timeout: 60_000 });
    await page
      .waitForSelector(".paper", { visible: true, timeout: 20_000 })
      .catch(() => {});
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    await page.evaluate(() => {
      document.body.style.background = "#ffffff";
    });

    const el = await page.$(".paper");
    const buffer = el
      ? await el.screenshot({ type: "jpeg", quality: 90 })
      : await page.screenshot({ type: "jpeg", quality: 90, fullPage: true });

    if (!persist) {
      // mode EPHEMERAL → langsung kembalikan base64 (tanpa simpan file)
      return {
        base64: Buffer.from(buffer).toString("base64"),
        filename: outName,
        mimeType: "image/jpeg",
      };
    }

    // mode PERSIST → simpan di .uploads lalu kembalikan /api/file/...
    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(absPath, buffer);
    return apiUrl;
  } finally {
    try {
      await page.close();
    } catch {}
  }
}

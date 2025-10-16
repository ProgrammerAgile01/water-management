// import { getBrowser } from "./puppeteer-singleton";
// import path from "node:path";
// import fs from "node:fs/promises";
// import { resolveUploadPath } from "./uploads";

// export async function renderPageToJPG(opts: {
//   tplUrl: string;
//   outName: string;
//   subdir?: string; // default: "billing/img"
//   selector?: string; // default: ".paper"
// }) {
//   const { tplUrl, outName, subdir = "billing/img", selector = ".paper" } = opts;

//   // const imgDir = path.join(process.cwd(), "public", "uploads", subdir);
//   // await fs.mkdir(imgDir, { recursive: true });
//   // const outPath = path.join(imgDir, outName);
//   // const publicUrl = `/uploads/${subdir}/${outName}`;

//   const relSegments = subdir.split("/").filter(Boolean);
//   const absDir = resolveUploadPath(...relSegments);
//   await fs.mkdir(absDir, { recursive: true });
//   const absPath = resolveUploadPath(...relSegments, outName);
//   const apiUrl = `/api/file/${relSegments.join("/")}/${outName}`;

//   const browser = await getBrowser();
//   const page = await browser.newPage();

//   page.on("console", (m) => console.log("[render:console]", m.text()));
//   page.on("pageerror", (e) => console.error("[render:error]", e));

//   try {
//     await page.setViewport({ width: 380, height: 1200, deviceScaleFactor: 2 });
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
//       ? await el.screenshot({ type: "jpeg", quality: 90 })
//       : await page.screenshot({ type: "jpeg", quality: 90, fullPage: true });

//     await fs.writeFile(absPath, buffer);
//     return apiUrl;
//   } finally {
//     try {
//       await page.close();
//     } catch {}
//   }
// }

// lib/render-page-to-jpg.ts
// import { getBrowser } from "./puppeteer-singleton";
// import fs from "node:fs/promises";
// import path from "node:path";
// import { resolveUploadPath } from "./uploads";

// type RenderOpts = {
//   tplUrl: string;
//   outName: string;
//   subdir?: string; // hanya dipakai jika persist=true
//   selector?: string; // default ".paper"
//   persist?: boolean; // default false → EPHEMERAL (return base64)
// };

// /** Render halaman umum (tagihan, dll) ke JPG. */
// export async function renderPageToJPG(
//   opts: RenderOpts
// ): Promise<string | { base64: string; filename: string }> {
//   const {
//     tplUrl,
//     outName,
//     subdir = "billing/img",
//     selector = ".paper",
//     persist = false,
//   } = opts;

//   const relSegments = subdir.split("/").filter(Boolean);
//   const absDir = resolveUploadPath(...relSegments);
//   const absPath = resolveUploadPath(...relSegments, outName);
//   const apiUrl = `/api/file/${relSegments.join("/")}/${outName}`;

//   const browser = await getBrowser();
//   const page = await browser.newPage();

//   page.on("console", (m) => console.log("[render:console]", m.text()));
//   page.on("pageerror", (e) => console.error("[render:error]", e));

//   try {
//     await page.setViewport({ width: 380, height: 1200, deviceScaleFactor: 2 });
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

export type RenderOut =
  | string
  | {
      base64: string;
      filename: string;
      mimeType: "image/jpeg";
    };

export async function renderPageToJPG(opts: {
  tplUrl: string;
  outName: string;
  subdir?: string; // default: "billing/img"
  selector?: string; // default: ".paper"
  persist?: boolean; // default: true
}): Promise<RenderOut> {
  const {
    tplUrl,
    outName,
    subdir = "billing/img",
    selector = ".paper",
    persist = true,
  } = opts;

  const relSegments = subdir.split("/").filter(Boolean);
  const absDir = resolveUploadPath(...relSegments);
  const absPath = resolveUploadPath(...relSegments, outName);
  const apiUrl = `/api/file/${relSegments.join("/")}/${outName}`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  page.on("console", (m) => console.log("[render:console]", m.text()));
  page.on("pageerror", (e) => console.error("[render:error]", e));

  try {
    await page.setViewport({ width: 380, height: 1200, deviceScaleFactor: 2 });
    await page.goto(tplUrl, { waitUntil: "networkidle2", timeout: 60_000 });
    await page
      .waitForSelector(selector, { visible: true, timeout: 20_000 })
      .catch(() => {});
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    await page.evaluate(() => {
      document.body.style.background = "#ffffff";
    });

    const el = await page.$(selector);
    const buffer = el
      ? await el.screenshot({ type: "jpeg", quality: 90 })
      : await page.screenshot({ type: "jpeg", quality: 90, fullPage: true });

    if (!persist) {
      return {
        base64: Buffer.from(buffer).toString("base64"),
        filename: outName,
        mimeType: "image/jpeg",
      };
    }

    await fs.mkdir(absDir, { recursive: true });
    await fs.writeFile(absPath, buffer);
    return apiUrl;
  } finally {
    try {
      await page.close();
    } catch {}
  }
}

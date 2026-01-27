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

  if (!/^https?:\/\//.test(tplUrl)) {
    throw new Error(`Invalid tplUrl (must be absolute): ${tplUrl}`);
  }
  console.log("[KWITANSI] Render URL:", tplUrl);

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

    await page.evaluateOnNewDocument(() => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const r of regs) r.unregister();
        });
      }
    });

    await page.setRequestInterception(true);

    page.on("request", (req) => {
      const url = req.url();

      if (
        url.includes("vercel") ||
        url.includes("analytics") ||
        url.includes("sw.js") ||
        url.includes("service-worker") ||
        req.resourceType() === "font"
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const html = await fetch(tplUrl).then((r) => r.text());
    await page.setContent(html, { waitUntil: "domcontentloaded" });
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

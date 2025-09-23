import { getBrowser } from "./puppeteer-singleton";
import path from "node:path";
import fs from "node:fs/promises";

export async function renderPageToJPG(opts: {
  tplUrl: string;
  outName: string;
  subdir?: string; // default: "billing/img"
  selector?: string; // default: ".paper"
}) {
  const { tplUrl, outName, subdir = "billing/img", selector = ".paper" } = opts;

  const imgDir = path.join(process.cwd(), "public", "uploads", subdir);
  await fs.mkdir(imgDir, { recursive: true });
  const outPath = path.join(imgDir, outName);
  const publicUrl = `/uploads/${subdir}/${outName}`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  page.on("console", (m) => console.log("[render:console]", m.text()));
  page.on("pageerror", (e) => console.error("[render:error]", e));

  try {
    await page.setViewport({ width: 380, height: 1200, deviceScaleFactor: 2 });
    await page.goto(tplUrl, { waitUntil: "networkidle2", timeout: 60_000 });
    try {
      await page.waitForSelector(selector, { visible: true, timeout: 20_000 });
    } catch {}
    try {
      await page.evaluate(() => (document as any).fonts?.ready);
    } catch {}
    await page.evaluate(() => {
      document.body.style.background = "#ffffff";
    });

    const el = await page.$(selector);
    const buffer = el
      ? await el.screenshot({ type: "jpeg", quality: 90 })
      : await page.screenshot({ type: "jpeg", quality: 90, fullPage: true });

    await fs.writeFile(outPath, buffer);
    return publicUrl;
  } finally {
    try {
      await page.close();
    } catch {}
  }
}

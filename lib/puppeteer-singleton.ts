import chromium from "@sparticuz/chromium";
import puppeteer, { Browser } from "puppeteer-core";

let _browser: Browser | null = null;

export async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;

  _browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--single-process",
    ],
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  _browser.on("disconnected", () => {
    _browser = null;
  });

  return _browser;
}
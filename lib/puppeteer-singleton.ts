import puppeteer, { Browser } from "puppeteer";

let _browser: Browser | null = null;

export async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return _browser;
}

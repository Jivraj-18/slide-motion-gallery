// Tests the live page in real Chrome: HTML-in-Canvas path and fallback path.
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

mkdirSync("shots", { recursive: true });
let failed = 0;
const check = (ok, name) => { console.log((ok ? "PASS " : "FAIL ") + name); if (!ok) failed++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

for (const [expected, args] of [["native", []], ["fallback", ["--disable-blink-features=CanvasDrawElement"]]]) {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true,
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", ...args] });
  console.log("---", expected, await browser.version());
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(process.env.PAGE_URL + "?t=" + Date.now(), { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.documentElement.dataset.ready, { timeout: 30000 }).catch(() => {});
  await wait(800);
  const state = await page.evaluate(() => ({ ...document.documentElement.dataset, error: document.getElementById("deck").dataset.error || "" }));
  check(state.mode === expected, `${expected} mode detected (got ${state.mode})`);
  check(state.ready === "1", "slides captured " + state.error);
  await page.screenshot({ path: `shots/${expected}-page.png`, fullPage: true });

  const frame = await page.$("#frame");
  const idle = await frame.screenshot({ path: `shots/${expected}-slide1.png` });
  const snaps = await page.evaluate(() => [0, 1, 2, 3].map(i => window.segue.snap(i)));
  check(new Set(snaps).size === 4 && snaps.every(s => s.length > 10000), "four distinct, non-blank slide textures");
  for (const [i, s] of snaps.entries()) {
    const view = await browser.newPage();
    await view.setViewport({ width: 800, height: 450 });
    await view.setContent(`<body style="margin:0;background:#f0f"><img src="${s}" style="width:800px">`);
    await view.screenshot({ path: `shots/${expected}-texture${i + 1}.png` });
    await view.close();
  }
  await page.bringToFront();

  for (const id of await page.evaluate(() => window.segue.ids)) {
    await page.evaluate(id => window.segue.seek(id, 0.47), id);
    await wait(250);
    const mid = await frame.screenshot({ path: `shots/${expected}-mid-${id}.png` });
    check(!mid.equals(idle), id + " renders a mid-transition frame");
  }

  await page.evaluate(() => window.segue.seek("push", 0));
  await page.$eval("#dur", e => e.value = "0.4");
  await page.click("#play"); await wait(2000);
  check(await page.$eval("#count", e => e.textContent) === "2 / 4", "Play advances one slide");
  await frame.screenshot({ path: `shots/${expected}-slide2.png` });
  await page.click("#prev"); await wait(2000);
  check(await page.$eval("#count", e => e.textContent) === "1 / 4", "Back returns");
  const before = await page.evaluate(() => window.segue.snap(0));
  await page.$eval("#edit", e => { e.value = "Hello, team"; e.dispatchEvent(new Event("input")); });
  await wait(600);
  check(before !== await page.evaluate(() => window.segue.snap(0)), "edited headline reaches the slide texture");

  await page.setViewport({ width: 390, height: 844 }); await wait(800);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= 391), "no sideways scroll on phone");
  await page.screenshot({ path: `shots/${expected}-phone.png`, fullPage: true });
  check(!errors.length, "no console errors " + errors.join(" | "));
  await browser.close();
}
process.exit(failed ? 1 : 0);

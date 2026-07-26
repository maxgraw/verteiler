import { chromium } from "playwright";

const URL = "http://localhost:5177/";
const CSV = "/home/max/Repos/verteiler/tests/fixtures/engpass.csv";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 780, height: 1400 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e}`));
page.on("requestfailed", (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
page.on("worker", (w) => logs.push(`[worker created] ${w.url()}`));

await page.goto(URL, { waitUntil: "networkidle" });

await page.locator(".step").nth(7).locator(".step-header").click();
await page.setInputFiles("#csv-input", CSV);
await page.waitForTimeout(400);

await page.locator(".step").nth(9).locator(".step-header").click();
await page.waitForTimeout(200);
const btn = page.getByRole("button", { name: "Verteilung berechnen" });
console.log("run button disabled:", await btn.isDisabled());
await btn.click();

for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(2500);
  const state = await page.evaluate(() => ({
    running: !!document.querySelector(".progress-info"),
    status: document.querySelector(".progress-status")?.textContent?.trim(),
    error: document.querySelector('[data-variant="error"]')?.textContent?.trim(),
    tiles: document.querySelectorAll(".spread-item").length,
  }));
  console.log(i, JSON.stringify(state));
  if (state.tiles || state.error) break;
}

console.log("--- logs ---");
console.log(logs.join("\n") || "none");
await page.screenshot({ path: "/tmp/verteiler-debug.png", fullPage: true });
await browser.close();

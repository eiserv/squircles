import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const port = 5174;
const server = spawn(process.execPath, ["scripts/serve-playground.mjs"], {
  cwd: fileURLToPath(root),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
let browser;
try {
  // Capture only after the startup message; a port conflict must fail the run.
  await Promise.race([
    once(server.stdout, "data"),
    once(server, "exit").then(() => { throw new Error("The preview server could not start."); }),
    once(server, "error").then(([error]) => { throw error; }),
  ]);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1040, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator("#squircle path").waitFor();
  await page.evaluate(() => document.fonts.ready);

  const images = [
    ["#playground", "playground.png", 976],
    ["#analysis", "smoothing-extremes.png", 600],
  ];
  for (const [selector, filename, width] of images) {
    if (selector === "#analysis") {
      await page.locator("#width").fill("160");
      await page.locator("#height").fill("160");
      await page.locator("#radius").fill("40");
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    const screenshot = await page.locator(selector).screenshot();
    const frame = await browser.newPage({ viewport: { width: width + 80, height: 1200 }, deviceScaleFactor: 2 });
    await frame.setContent(`<style>
      html, body { margin: 0; background: transparent; }
      figure { display: inline-block; margin: 0; padding: 24px 40px 48px; }
      img { display: block; width: ${width}px; height: auto; border-radius: 12px; box-shadow: 0 12px 24px rgb(0 0 0 / .14), 0 1px 3px rgb(0 0 0 / .08); }
    </style><figure><img alt="" src="data:image/png;base64,${screenshot.toString("base64")}" /></figure>`);
    await frame.locator("img").evaluate((img) => img.decode());
    await frame.locator("figure").screenshot({ path: fileURLToPath(new URL(`docs/media/${filename}`, root)), omitBackground: true });
    await frame.close();
    console.log(`README image created: ${filename}`);
  }
} finally {
  await browser?.close();
  server.kill();
}

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
  // Erst nach der Startmeldung fotografieren; ein Portkonflikt bricht den Lauf ab.
  await Promise.race([
    once(server.stdout, "data"),
    once(server, "exit").then(() => { throw new Error("Der Vorschau-Server konnte nicht starten."); }),
    once(server, "error").then(([error]) => { throw error; }),
  ]);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1040, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator("#squircle path").waitFor();
  await page.evaluate(() => document.fonts.ready);

  const bilder = [
    ["#werkzeug", "playground.png", 976],
    ["#analyse", "smoothing-extremes.png", 600],
  ];
  for (const [selector, filename, width] of bilder) {
    if (selector === "#analyse") {
      await page.locator("#breite").fill("160");
      await page.locator("#hoehe").fill("160");
      await page.locator("#radius").fill("40");
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    const screenshot = await page.locator(selector).screenshot();
    const rahmen = await browser.newPage({ viewport: { width: width + 80, height: 1200 }, deviceScaleFactor: 2 });
    await rahmen.setContent(`<style>
      html, body { margin: 0; background: transparent; }
      figure { display: inline-block; margin: 0; padding: 24px 40px 48px; }
      img { display: block; width: ${width}px; height: auto; border-radius: 12px; box-shadow: 0 12px 24px rgb(0 0 0 / .14), 0 1px 3px rgb(0 0 0 / .08); }
    </style><figure><img alt="" src="data:image/png;base64,${screenshot.toString("base64")}" /></figure>`);
    await rahmen.locator("img").evaluate((img) => img.decode());
    await rahmen.locator("figure").screenshot({ path: fileURLToPath(new URL(`docs/media/${filename}`, root)), omitBackground: true });
    await rahmen.close();
    console.log(`README-Bild erstellt: ${filename}`);
  }
} finally {
  await browser?.close();
  server.kill();
}

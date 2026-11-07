import { test, expect } from "@playwright/test";

test("Spielwiese passt auf kleine Bildschirme und aktualisiert die Kontur", async ({ page }) => {
  const fehler = [];
  page.on("pageerror", (error) => fehler.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const pfad = page.locator("#squircle path");
  await expect(pfad).toHaveAttribute("d", /^M /);
  const vorher = await pfad.getAttribute("d");
  await page.locator("#radius").fill("0");
  await expect(pfad).not.toHaveAttribute("d", vorher);
  await expect(page.locator("#hinweis")).toHaveText("Ohne Radius sind beide Formen identisch.");
  await page.locator("#breite").fill("420");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(fehler).toEqual([]);
});

test("DOM-Messung berücksichtigt vertikale und seitliche Schreibrichtungen", async ({ page }) => {
  await page.goto("/");
  for (const writingMode of ["horizontal-tb", "vertical-rl", "sideways-rl"]) {
    await page.evaluate(async (mode) => {
      document.getElementById("messung")?.remove();
      const { applySquircle } = await import("/dist/dom/index.js");
      const element = document.createElement("div");
      element.id = "messung";
      element.style.cssText = `width:160px;height:80px;writing-mode:${mode};border:1px solid black;border-radius:16px;background:white;box-sizing:border-box`;
      document.body.append(element);
      applySquircle(element);
    }, writingMode);
    await expect(page.locator("#messung [data-squircle-stroke]")).toHaveAttribute("viewBox", "0 0 160 80");
  }
});

test("Inline-Änderungen bleiben beim Neuzeichnen und Aufräumen erhalten", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("button");
    element.id = "dynamisch";
    element.style.cssText = "width:180px;height:64px;border-radius:16px;background:rgb(10, 10, 10);padding:8px";
    document.body.append(element);
    window.aufraeumen = applySquircle(element);
  });
  const element = page.locator("#dynamisch");
  await expect(element.locator("[data-squircle-fill]")).toHaveCSS("background-color", "rgb(10, 10, 10)");
  await element.evaluate((node) => {
    node.style.backgroundColor = "rgb(70, 70, 70)";
    node.style.padding = "12px";
    node.style.setProperty("--squircle-smoothing", "0.5");
  });
  await expect(element.locator("[data-squircle-fill]")).toHaveCSS("background-color", "rgb(70, 70, 70)");
  await page.evaluate(() => { window.aufraeumen(); window.aufraeumen(); });
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(0);
  await expect(element).toHaveCSS("background-color", "rgb(70, 70, 70)");
  await expect(element).toHaveCSS("padding-top", "12px");
  await expect(element).toHaveCSS("--squircle-smoothing", "0.5");
});

test("ohne ResizeObserver funktionieren Start, Fensteränderung und Aufräumen", async ({ page }) => {
  await page.addInitScript(() => { window.ResizeObserver = undefined; });
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("div");
    element.id = "ersatz";
    element.style.cssText = "width:160px;height:80px;border:1px solid black;border-radius:16px;box-sizing:border-box";
    document.body.append(element);
    window.aufraeumen = applySquircle(element);
  });
  await expect(page.locator("#ersatz svg")).toHaveAttribute("viewBox", "0 0 160 80");
  await page.evaluate(() => {
    document.getElementById("ersatz").style.width = "200px";
    window.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("#ersatz svg")).toHaveAttribute("viewBox", "0 0 200 80");
  await page.evaluate(() => window.aufraeumen());
  await expect(page.locator("#ersatz svg")).toHaveCount(0);
});

test("React folgt dem Wechsel des nativen Elements", async ({ page }) => {
  await page.goto("/react/");
  const element = page.locator("[data-wechsel]");
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(1);
  await page.getByRole("button", { name: "Element wechseln" }).click();
  await expect(element).toHaveJSProperty("tagName", "A");
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(1);
  await page.getByRole("button", { name: "Element wechseln" }).click();
  await expect(element).toHaveJSProperty("tagName", "BUTTON");
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(1);
});

test("Svelte-Action aktualisiert Optionen und räumt mehrfach sicher auf", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { squircle } = await import("/dist/svelte/index.js");
    const element = document.createElement("button");
    element.id = "action";
    element.style.cssText = "width:160px;height:80px;border:1px solid black;border-radius:16px;box-sizing:border-box";
    document.body.append(element);
    window.action = squircle(element);
  });
  const kontur = page.locator("#action path");
  await expect(kontur).toHaveAttribute("d", /^M /);
  const vorher = await kontur.getAttribute("d");
  await page.evaluate(() => window.action.update({ radius: 0 }));
  await expect(kontur).not.toHaveAttribute("d", vorher);
  await page.evaluate(() => window.action.update());
  await expect(kontur).toHaveAttribute("d", vorher);
  await page.evaluate(() => { window.action.destroy(); window.action.destroy(); window.action.update({ radius: 24 }); });
  await expect(page.locator("#action [data-squircle-fill]")).toHaveCount(0);
  await expect(page.locator("#action")).toHaveCSS("border-top-color", "rgb(0, 0, 0)");
});

test("Darstellung erzeugt im Ruhezustand keine weiteren DOM-Änderungen", async ({ page }) => {
  await page.goto("/react/");
  await expect(page.locator("[data-wechsel] [data-squircle-fill]")).toHaveCount(1);
  const anzahl = await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    let count = 0;
    const observer = new MutationObserver((records) => { count += records.length; });
    observer.observe(document.querySelector("[data-wechsel]"), { attributes: true, childList: true, subtree: true });
    for (let i = 0; i < 8; i++) await new Promise(requestAnimationFrame);
    observer.disconnect();
    return count;
  });
  expect(anzahl).toBe(0);
});

test("Svelte rendert Action und Attachment mit reaktiven Änderungen", async ({ page }) => {
  const fehler = [];
  page.on("pageerror", (error) => fehler.push(error.message));
  await page.goto("/svelte/");
  const kontur = page.locator("[data-action] path");
  await expect(kontur).toHaveAttribute("d", /^M /);
  await expect(page.locator("[data-attachment] [data-squircle-fill]")).toHaveCount(1);
  const vorher = await kontur.getAttribute("d");
  await page.getByRole("slider", { name: "Glättung" }).fill("0");
  await expect(kontur).not.toHaveAttribute("d", vorher);
  await page.getByRole("button", { name: "Beispiel entfernen" }).click();
  await expect(page.locator("[data-action]")).toHaveCount(0);
  await page.getByRole("button", { name: "Beispiel anzeigen" }).click();
  await expect(kontur).toHaveAttribute("d", /^M /);
  expect(fehler).toEqual([]);
});

test("entfernte Inline-Stile und Prioritäten bleiben nach dem Aufräumen korrekt", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("div");
    element.id = "inline";
    element.style.cssText = "width:160px;height:80px;background:rgb(20,20,20);padding:4px;border-radius:16px";
    document.body.append(element);
    window.aufraeumen = applySquircle(element);
  });
  await expect(page.locator("#inline [data-squircle-fill]")).toHaveCount(1);
  await page.locator("#inline").evaluate((node) => {
    node.style.removeProperty("padding");
    node.style.setProperty("background-color", "rgb(80, 80, 80)", "important");
  });
  await expect(page.locator("#inline [data-squircle-fill]")).toHaveCSS("background-color", "rgb(80, 80, 80)");
  await page.evaluate(() => window.aufraeumen());
  const styles = await page.locator("#inline").evaluate((node) => ({
    padding: node.style.padding,
    priority: node.style.getPropertyPriority("background-color"),
    color: node.style.backgroundColor,
  }));
  expect(styles).toEqual({ padding: "", priority: "important", color: "rgb(80, 80, 80)" });
});

test("vollständig geschrumpfte Schatten verhindern die Darstellung nicht", async ({ page }) => {
  const fehler = [];
  page.on("pageerror", (error) => fehler.push(error.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("div");
    element.id = "schatten";
    element.style.cssText = "width:160px;height:80px;background:white;border-radius:16px;box-shadow:0 2px 4px -100px oklch(40% 0 0)";
    document.body.append(element);
    applySquircle(element);
  });
  await expect(page.locator("#schatten [data-squircle-fill]")).toHaveCount(1);
  await expect(page.locator("#schatten [data-squircle-shadow]")).toHaveCount(0);
  expect(fehler).toEqual([]);
});

test("ein komplett ersetztes style-Attribut bleibt nach dem Aufräumen erhalten", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("div");
    element.id = "ersetzte-stile";
    element.style.cssText = "width:160px;height:80px;background:black;border:1px solid black;border-radius:16px;padding:4px";
    document.body.append(element);
    window.aufraeumen = applySquircle(element);
  });
  const element = page.locator("#ersetzte-stile");
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(1);
  await element.evaluate((node) => { node.style.cssText = "width:200px;height:100px;background:rgb(60,60,60);border:2px solid rgb(90,90,90);border-radius:24px"; });
  await expect(element.locator("svg")).toHaveAttribute("viewBox", "0 0 200 100");
  await expect(element.locator("[data-squircle-fill]")).toHaveCSS("background-color", "rgb(60, 60, 60)");
  await page.evaluate(() => window.aufraeumen());
  await expect(element).toHaveCSS("border-top-color", "rgb(90, 90, 90)");
  await expect(element).toHaveCSS("padding-top", "0px");
  await expect(element).toHaveCSS("background-color", "rgb(60, 60, 60)");
});

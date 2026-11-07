import { test, expect } from "@playwright/test";

test("playground fits small screens and updates the outline", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const path = page.locator("#squircle path");
  await expect(path).toHaveAttribute("d", /^M /);
  const before = await path.getAttribute("d");
  await page.locator("#radius").fill("0");
  await expect(path).not.toHaveAttribute("d", before);
  await expect(page.locator("#note")).toHaveText("Without a radius, both shapes are identical.");
  await page.locator("#width").fill("420");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("DOM measurement handles vertical and sideways writing modes", async ({ page }) => {
  await page.goto("/");
  for (const writingMode of ["horizontal-tb", "vertical-rl", "sideways-rl"]) {
    await page.evaluate(async (mode) => {
      document.getElementById("measurement")?.remove();
      const { applySquircle } = await import("/dist/dom/index.js");
      const element = document.createElement("div");
      element.id = "measurement";
      element.style.cssText = `width:160px;height:80px;writing-mode:${mode};border:1px solid black;border-radius:16px;background:white;box-sizing:border-box`;
      document.body.append(element);
      applySquircle(element);
    }, writingMode);
    await expect(page.locator("#measurement [data-squircle-stroke]")).toHaveAttribute("viewBox", "0 0 160 80");
  }
});

test("inline changes survive redraw and cleanup", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("button");
    element.id = "dynamic";
    element.style.cssText = "width:180px;height:64px;border-radius:16px;background:rgb(10, 10, 10);padding:8px";
    document.body.append(element);
    window.cleanup = applySquircle(element);
  });
  const element = page.locator("#dynamic");
  await expect(element.locator("[data-squircle-fill]")).toHaveCSS("background-color", "rgb(10, 10, 10)");
  await element.evaluate((node) => {
    node.style.backgroundColor = "rgb(70, 70, 70)";
    node.style.padding = "12px";
    node.style.setProperty("--squircle-smoothing", "0.5");
  });
  await expect(element.locator("[data-squircle-fill]")).toHaveCSS("background-color", "rgb(70, 70, 70)");
  await page.evaluate(() => { window.cleanup(); window.cleanup(); });
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(0);
  await expect(element).toHaveCSS("background-color", "rgb(70, 70, 70)");
  await expect(element).toHaveCSS("padding-top", "12px");
  await expect(element).toHaveCSS("--squircle-smoothing", "0.5");
});

test("startup, window resize, and cleanup work without ResizeObserver", async ({ page }) => {
  await page.addInitScript(() => { window.ResizeObserver = undefined; });
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("div");
    element.id = "fallback";
    element.style.cssText = "width:160px;height:80px;border:1px solid black;border-radius:16px;box-sizing:border-box";
    document.body.append(element);
    window.cleanup = applySquircle(element);
  });
  await expect(page.locator("#fallback svg")).toHaveAttribute("viewBox", "0 0 160 80");
  await page.evaluate(() => {
    document.getElementById("fallback").style.width = "200px";
    window.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("#fallback svg")).toHaveAttribute("viewBox", "0 0 200 80");
  await page.evaluate(() => window.cleanup());
  await expect(page.locator("#fallback svg")).toHaveCount(0);
});

test("React follows a change of the native host element", async ({ page }) => {
  await page.goto("/react/");
  const element = page.locator("[data-switch]");
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(1);
  await page.getByRole("button", { name: "Switch element" }).click();
  await expect(element).toHaveJSProperty("tagName", "A");
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(1);
  await page.getByRole("button", { name: "Switch element" }).click();
  await expect(element).toHaveJSProperty("tagName", "BUTTON");
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(1);
});

test("Svelte action updates options and safely handles repeated cleanup", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { squircle } = await import("/dist/svelte/index.js");
    const element = document.createElement("button");
    element.id = "action";
    element.style.cssText = "width:160px;height:80px;border:1px solid black;border-radius:16px;box-sizing:border-box";
    document.body.append(element);
    window.action = squircle(element);
  });
  const stroke = page.locator("#action path");
  await expect(stroke).toHaveAttribute("d", /^M /);
  const before = await stroke.getAttribute("d");
  await page.evaluate(() => window.action.update({ radius: 0 }));
  await expect(stroke).not.toHaveAttribute("d", before);
  await page.evaluate(() => window.action.update());
  await expect(stroke).toHaveAttribute("d", before);
  await page.evaluate(() => { window.action.destroy(); window.action.destroy(); window.action.update({ radius: 24 }); });
  await expect(page.locator("#action [data-squircle-fill]")).toHaveCount(0);
  await expect(page.locator("#action")).toHaveCSS("border-top-color", "rgb(0, 0, 0)");
});

test("idle rendering produces no further DOM mutations", async ({ page }) => {
  await page.goto("/react/");
  await expect(page.locator("[data-switch] [data-squircle-fill]")).toHaveCount(1);
  const count = await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    let count = 0;
    const observer = new MutationObserver((records) => { count += records.length; });
    observer.observe(document.querySelector("[data-switch]"), { attributes: true, childList: true, subtree: true });
    for (let i = 0; i < 8; i++) await new Promise(requestAnimationFrame);
    observer.disconnect();
    return count;
  });
  expect(count).toBe(0);
});

test("Svelte renders actions and attachments with reactive changes", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/svelte/");
  const stroke = page.locator("[data-action] path");
  await expect(stroke).toHaveAttribute("d", /^M /);
  await expect(page.locator("[data-attachment] [data-squircle-fill]")).toHaveCount(1);
  const before = await stroke.getAttribute("d");
  await page.getByRole("slider", { name: "Smoothing" }).fill("0");
  await expect(stroke).not.toHaveAttribute("d", before);
  await page.getByRole("button", { name: "Remove example" }).click();
  await expect(page.locator("[data-action]")).toHaveCount(0);
  await page.getByRole("button", { name: "Show example" }).click();
  await expect(stroke).toHaveAttribute("d", /^M /);
  expect(errors).toEqual([]);
});

test("removed inline styles and priorities remain correct after cleanup", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("div");
    element.id = "inline";
    element.style.cssText = "width:160px;height:80px;background:rgb(20,20,20);padding:4px;border-radius:16px";
    document.body.append(element);
    window.cleanup = applySquircle(element);
  });
  await expect(page.locator("#inline [data-squircle-fill]")).toHaveCount(1);
  await page.locator("#inline").evaluate((node) => {
    node.style.removeProperty("padding");
    node.style.setProperty("background-color", "rgb(80, 80, 80)", "important");
  });
  await expect(page.locator("#inline [data-squircle-fill]")).toHaveCSS("background-color", "rgb(80, 80, 80)");
  await page.evaluate(() => window.cleanup());
  const styles = await page.locator("#inline").evaluate((node) => ({
    padding: node.style.padding,
    priority: node.style.getPropertyPriority("background-color"),
    color: node.style.backgroundColor,
  }));
  expect(styles).toEqual({ padding: "", priority: "important", color: "rgb(80, 80, 80)" });
});

test("fully contracted shadows do not prevent rendering", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("div");
    element.id = "shadow";
    element.style.cssText = "width:160px;height:80px;background:white;border-radius:16px;box-shadow:0 2px 4px -100px oklch(40% 0 0)";
    document.body.append(element);
    applySquircle(element);
  });
  await expect(page.locator("#shadow [data-squircle-fill]")).toHaveCount(1);
  await expect(page.locator("#shadow [data-squircle-shadow]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a fully replaced style attribute survives cleanup", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { applySquircle } = await import("/dist/dom/index.js");
    const element = document.createElement("div");
    element.id = "replaced-styles";
    element.style.cssText = "width:160px;height:80px;background:black;border:1px solid black;border-radius:16px;padding:4px";
    document.body.append(element);
    window.cleanup = applySquircle(element);
  });
  const element = page.locator("#replaced-styles");
  await expect(element.locator("[data-squircle-fill]")).toHaveCount(1);
  await element.evaluate((node) => { node.style.cssText = "width:200px;height:100px;background:rgb(60,60,60);border:2px solid rgb(90,90,90);border-radius:24px"; });
  await expect(element.locator("svg")).toHaveAttribute("viewBox", "0 0 200 100");
  await expect(element.locator("[data-squircle-fill]")).toHaveCSS("background-color", "rgb(60, 60, 60)");
  await page.evaluate(() => window.cleanup());
  await expect(element).toHaveCSS("border-top-color", "rgb(90, 90, 90)");
  await expect(element).toHaveCSS("padding-top", "0px");
  await expect(element).toHaveCSS("background-color", "rgb(60, 60, 60)");
});

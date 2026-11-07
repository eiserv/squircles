import { createSquircleClipPath } from "../clip-path.js";
import {
  parseBoxShadow,
  readBorderFromComputed,
  readSurfaceFromComputed,
  resolveRadiusFromComputed,
  resolveSmoothingFromComputed,
  type StyleReader,
} from "../css/index.js";
import { createSquirclePath, type SquircleRadius } from "../geometry.js";
import type { ElementSize } from "../size.js";
import { isVoidElement } from "./void-elements.js";

export type SquircleGeometryOptions = Readonly<{
  radius?: SquircleRadius;
  smoothing?: number;
  preserveSmoothing?: boolean;
  clipContent?: boolean;
}>;

const FILL = "data-squircle-fill";
const STROKE = "data-squircle-stroke";
const SHADOW = "data-squircle-shadow";
const SELECTOR = `[${FILL}], [${STROKE}], [${SHADOW}]`;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Alle CSS-Eigenschaften, die syncLayers vom Element benötigt. */
const READ_PROPERTIES = [
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "--squircle-smoothing",
  "--squircle-preserve-smoothing",
  "border-top-width",
  "border-top-style",
  "border-top-color",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "transition",
  "box-shadow",
  "position",
] as const;

type InlineState = { authored: string; applied: string };
const originalInline = new WeakMap<HTMLElement, InlineState>();

function rememberInline(host: HTMLElement): void {
  if (!originalInline.has(host)) {
    originalInline.set(host, {
      authored: host.style.cssText,
      applied: host.style.cssText,
    });
  }
}

/** Übernimmt nachträgliche Inline-Änderungen, etwa aus reaktiven Frameworks. */
function reconcileInline(host: HTMLElement): InlineState | undefined {
  const state = originalInline.get(host);
  if (!state || state.applied === host.style.cssText) return state;

  const authored = host.ownerDocument.createElement("span").style;
  const applied = host.ownerDocument.createElement("span").style;
  authored.cssText = state.authored;
  applied.cssText = state.applied;
  const current = host.style;
  const properties = new Set([...Array.from(applied), ...Array.from(current)]);
  for (const property of properties) {
    const value = current.getPropertyValue(property);
    const priority = current.getPropertyPriority(property);
    if (value !== applied.getPropertyValue(property) || priority !== applied.getPropertyPriority(property)) {
      if (value) authored.setProperty(property, value, priority);
      else authored.removeProperty(property);
    }
  }
  state.authored = authored.cssText;
  return state;
}

function rememberApplied(host: HTMLElement): void {
  const state = originalInline.get(host);
  if (state) state.applied = host.style.cssText;
}

/**
 * Hebt eigene Überschreibungen zum Lesen kurz auf. Übergänge bleiben dabei deaktiviert,
 * damit das Lesen keine neuen Übergänge und damit Endlosschleifen auslöst.
 */
function readAuthoredStyles(host: HTMLElement): StyleReader {
  const applied = host.style.cssText;
  const authored = reconcileInline(host)?.authored ?? applied;
  const computed = getComputedStyle(host);
  const snapshot = new Map<string, string>();

  // transition wird am Element nicht überschrieben und lässt sich direkt lesen.
  snapshot.set("transition", computed.getPropertyValue("transition"));

  host.style.cssText = authored;
  host.style.setProperty("transition", "none");

  for (const property of READ_PROPERTIES) {
    if (property === "transition") {
      continue;
    }

    snapshot.set(property, computed.getPropertyValue(property));
  }

  // Überschreibungen bei deaktivierten Übergängen anwenden und erst danach die
  // ursprüngliche Übergangsregel wiederherstellen.
  host.style.cssText = applied;
  host.style.setProperty("transition", "none");
  computed.getPropertyValue("transition");
  host.style.cssText = applied;

  return {
    getPropertyValue: (property: string) => snapshot.get(property) ?? "",
  };
}

/**
 * Absolute Positionen beziehen sich auf die Innenfläche, die Geometrie auf die
 * Rahmenfläche. Der negative Versatz gleicht die Rahmenbreite aus.
 */
function createLayer(
  marker: string,
  zIndex: number,
  borderWidth: number,
): HTMLElement {
  const layer = document.createElement("span");
  layer.setAttribute(marker, "");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = `position:absolute;inset:${-borderWidth}px;z-index:${zIndex};pointer-events:none;`;
  return layer;
}

export function clearLayers(host: HTMLElement): void {
  for (const layer of Array.from(host.querySelectorAll(SELECTOR))) {
    if (layer.parentElement === host) {
      layer.remove();
    }
  }

  const inline = reconcileInline(host);

  if (inline !== undefined) {
    host.style.cssText = inline.authored;
    originalInline.delete(host);
  }
}

export function syncLayers(
  host: HTMLElement,
  size: ElementSize,
  options: SquircleGeometryOptions,
): void {
  rememberInline(host);

  const styles = readAuthoredStyles(host);
  const fromCss = resolveSmoothingFromComputed(styles);
  const radius = options.radius ?? resolveRadiusFromComputed(styles, size);
  const smoothing = options.smoothing ?? fromCss.smoothing;
  const preserveSmoothing =
    options.preserveSmoothing ?? fromCss.preserveSmoothing;
  const border = readBorderFromComputed(styles);
  const surface = readSurfaceFromComputed(styles);
  const shadows = parseBoxShadow(styles.getPropertyValue("box-shadow"));
  const geometry = { ...size, radius, smoothing, preserveSmoothing };

  // Leere HTML-Elemente erhalten ausschließlich einen Clip-Pfad.
  if (isVoidElement(host.tagName)) {
    host.style.setProperty("clip-path", createSquircleClipPath(geometry));
    rememberApplied(host);
    return;
  }

  clearLayers(host);
  rememberInline(host);

  // Den Schnappschuss verwenden: Erneutes Lesen ohne Überschreibungen könnte Übergänge
  // auslösen.
  if (styles.getPropertyValue("position") === "static") {
    host.style.setProperty("position", "relative");
  }

  host.style.setProperty("isolation", "isolate");

  for (const shadow of shadows) {
    const width = size.width + shadow.spread * 2;
    const height = size.height + shadow.spread * 2;
    // Stark negative Ausbreitung kann den Schatten vollständig aufbrauchen.
    if (width <= 0 || height <= 0) continue;

    const layer = createLayer(SHADOW, -3, border.width);
    layer.style.transform = `translate(${shadow.offsetX}px, ${shadow.offsetY}px)`;
    // blur() erwartet die Standardabweichung, box-shadow deren doppelten Wert.
    layer.style.filter = `blur(${shadow.blur / 2}px)`;

    const shape = document.createElement("span");
    shape.style.cssText = `position:absolute;inset:${-shadow.spread}px;`;
    shape.style.background = shadow.color;
    shape.style.clipPath = createSquircleClipPath({
      width,
      height,
      radius,
      smoothing,
      preserveSmoothing,
    });

    layer.append(shape);
    host.append(layer);
  }

  // Den ursprünglichen Schatten erst nach erfolgreichem Zeichnen unterdrücken.
  if (shadows.length > 0) {
    host.style.setProperty("box-shadow", "none");
  }

  const fill = createLayer(FILL, -2, border.width);
  fill.style.backgroundColor = surface.backgroundColor;
  fill.style.backgroundImage = surface.backgroundImage;
  fill.style.backgroundSize = surface.backgroundSize;
  fill.style.backgroundPosition = surface.backgroundPosition;
  fill.style.backgroundRepeat = surface.backgroundRepeat;
  fill.style.transition = surface.transition;
  fill.style.clipPath = createSquircleClipPath(geometry);
  host.append(fill);

  host.style.setProperty("background-color", "transparent");
  host.style.setProperty("background-image", "none");

  if (border.width > 0) {
    const stroke = document.createElementNS(SVG_NAMESPACE, "svg");
    stroke.setAttribute(STROKE, "");
    stroke.setAttribute("aria-hidden", "true");
    stroke.setAttribute("focusable", "false");
    stroke.setAttribute("preserveAspectRatio", "none");
    stroke.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
    // Die Korrektur der Rahmenfläche als explizite Größe; SVG verwendet sonst seine
    // intrinsische Größe.
    const outset = `calc(100% + ${border.width * 2}px)`;
    stroke.style.cssText = `position:absolute;left:${-border.width}px;top:${-border.width}px;z-index:-1;width:${outset};height:${outset};overflow:visible;pointer-events:none;display:block;`;

    const path = document.createElementNS(SVG_NAMESPACE, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", border.color);
    path.setAttribute("stroke-width", String(border.width));
    path.setAttribute("vector-effect", "non-scaling-stroke");
    path.setAttribute("shape-rendering", "geometricPrecision");
    path.setAttribute(
      "d",
      createSquirclePath({ ...geometry, inset: border.width / 2 }),
    );

    stroke.append(path);
    host.append(stroke);

    // Die transparente Kontur erhält die Abmessungen und verhindert Layoutsprünge.
    host.style.setProperty("border-color", "transparent");
  }

  if (options.clipContent === true) {
    host.style.setProperty("clip-path", createSquircleClipPath(geometry));
  }
  rememberApplied(host);
}

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

/** All CSS properties syncLayers needs from the host element. */
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

/** Preserves later inline changes, including those made by reactive frameworks. */
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
 * Temporarily lifts our overrides while reading authored styles. Transitions stay
 * disabled so reads cannot start new transitions and endless updates.
 */
function readAuthoredStyles(host: HTMLElement): StyleReader {
  const applied = host.style.cssText;
  const authored = reconcileInline(host)?.authored ?? applied;
  const computed = getComputedStyle(host);
  const snapshot = new Map<string, string>();

  // The host transition is never overridden, so it can be read directly.
  snapshot.set("transition", computed.getPropertyValue("transition"));

  host.style.cssText = authored;
  host.style.setProperty("transition", "none");

  for (const property of READ_PROPERTIES) {
    if (property === "transition") {
      continue;
    }

    snapshot.set(property, computed.getPropertyValue(property));
  }

  // Apply overrides with transitions disabled, then restore the author's transition
  // rule.
  host.style.cssText = applied;
  host.style.setProperty("transition", "none");
  computed.getPropertyValue("transition");
  host.style.cssText = applied;

  return {
    getPropertyValue: (property: string) => snapshot.get(property) ?? "",
  };
}

/**
 * Absolute positioning uses the padding box; geometry uses the border box. The
 * negative offset compensates for the border width.
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

  // Void elements receive only a clip path.
  if (isVoidElement(host.tagName)) {
    host.style.setProperty("clip-path", createSquircleClipPath(geometry));
    rememberApplied(host);
    return;
  }

  clearLayers(host);
  rememberInline(host);

  // Use the snapshot: reading again without overrides could trigger transitions.
  if (styles.getPropertyValue("position") === "static") {
    host.style.setProperty("position", "relative");
  }

  host.style.setProperty("isolation", "isolate");

  for (const shadow of shadows) {
    const width = size.width + shadow.spread * 2;
    const height = size.height + shadow.spread * 2;
    // A sufficiently negative spread can consume the entire shadow.
    if (width <= 0 || height <= 0) continue;

    const layer = createLayer(SHADOW, -3, border.width);
    layer.style.transform = `translate(${shadow.offsetX}px, ${shadow.offsetY}px)`;
    // blur() uses the standard deviation; box-shadow uses twice that value.
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

  // Suppress the original outer shadows after processing their replacement shapes.
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
    // Express the border-box correction as an explicit size; otherwise SVG uses its
    // intrinsic size.
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

    // A transparent border preserves dimensions and prevents layout shifts.
    host.style.setProperty("border-color", "transparent");
  }

  if (options.clipContent === true) {
    host.style.setProperty("clip-path", createSquircleClipPath(geometry));
  }
  rememberApplied(host);
}

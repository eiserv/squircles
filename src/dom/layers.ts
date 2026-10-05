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

/** Everything `syncLayers` needs from the element's own CSS. */
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

const originalInline = new WeakMap<HTMLElement, string>();

function rememberInline(host: HTMLElement): void {
  if (!originalInline.has(host)) {
    originalInline.set(host, host.style.cssText);
  }
}

/**
 * Reads the styles the author wrote rather than the ones this module applied,
 * by restoring the author's inline style for the duration of the read.
 *
 * Transitions stay off for the whole round trip. Otherwise lifting an
 * override on a transitioned property starts a transition (and another one
 * back on restore); its `transitionrun` schedules the next sync, which lifts
 * the overrides again, and the element never settles.
 */
function readAuthoredStyles(host: HTMLElement): StyleReader {
  const applied = host.style.cssText;
  const authored = originalInline.get(host) ?? applied;
  const computed = getComputedStyle(host);
  const snapshot = new Map<string, string>();

  // This module never writes `transition` on the host, so the applied state
  // already reports the authored value.
  snapshot.set("transition", computed.getPropertyValue("transition"));

  host.style.cssText = authored;
  host.style.setProperty("transition", "none");

  for (const property of READ_PROPERTIES) {
    if (property === "transition") {
      continue;
    }

    snapshot.set(property, computed.getPropertyValue(property));
  }

  // Settle on the overrides while transitions are still off, so restoring the
  // author's transition afterwards leaves nothing to animate.
  host.style.cssText = applied;
  host.style.setProperty("transition", "none");
  computed.getPropertyValue("transition");
  host.style.cssText = applied;

  return {
    getPropertyValue: (property: string) => snapshot.get(property) ?? "",
  };
}

/**
 * Absolute offsets resolve against the padding box, but the geometry is
 * measured on the border box. Pulling every layer out by the border width
 * lines the two up again; without it a bordered element loses the outermost
 * band of its shape and the corners read as square.
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

  const inline = originalInline.get(host);

  if (inline !== undefined) {
    host.style.cssText = inline;
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

  // A void element has no room for layers; only the clip survives.
  if (isVoidElement(host.tagName)) {
    host.style.setProperty("clip-path", createSquircleClipPath(geometry));
    return;
  }

  clearLayers(host);
  rememberInline(host);

  // From the snapshot: a fresh read here would see the host without its
  // overrides and start the very transitions readAuthoredStyles avoids.
  if (styles.getPropertyValue("position") === "static") {
    host.style.setProperty("position", "relative");
  }

  host.style.setProperty("isolation", "isolate");

  for (const shadow of shadows) {
    const layer = createLayer(SHADOW, -3, border.width);
    layer.style.transform = `translate(${shadow.offsetX}px, ${shadow.offsetY}px)`;
    // CSS blur() takes a standard deviation; box-shadow's blur is twice that.
    layer.style.filter = `blur(${shadow.blur / 2}px)`;

    const shape = document.createElement("span");
    shape.style.cssText = `position:absolute;inset:${-shadow.spread}px;`;
    shape.style.background = shadow.color;
    shape.style.clipPath = createSquircleClipPath({
      width: size.width + shadow.spread * 2,
      height: size.height + shadow.spread * 2,
      radius,
      smoothing,
      preserveSmoothing,
    });

    layer.append(shape);
    host.append(layer);
  }

  // Only suppress the original once a replacement has actually been drawn.
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
    // Same border box correction as createLayer, expressed as a size because
    // an SVG with four offsets and no size falls back to its intrinsic one.
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

    // Keeping the border box intact avoids a layout shift.
    host.style.setProperty("border-color", "transparent");
  }

  if (options.clipContent === true) {
    host.style.setProperty("clip-path", createSquircleClipPath(geometry));
  }
}

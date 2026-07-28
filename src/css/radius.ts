import type { SquircleCornerRadii } from "../geometry.js";
import type { ElementSize } from "../size.js";
import type { StyleReader } from "./types.js";

const CORNER_PROPERTIES = {
  topLeft: "border-top-left-radius",
  topRight: "border-top-right-radius",
  bottomRight: "border-bottom-right-radius",
  bottomLeft: "border-bottom-left-radius",
} as const;

function toPixels(value: string, basis: number): number {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return value.trimEnd().endsWith("%") ? (parsed / 100) * basis : parsed;
}

/**
 * A squircle corner is circular, so an elliptical CSS corner is reduced to the
 * circle that fits inside it. Percentages resolve per axis first.
 */
function resolveCorner(value: string, size: ElementSize): number {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const horizontal = parts[0] ?? "0";
  const vertical = parts[1] ?? horizontal;

  return Math.max(
    0,
    Math.min(toPixels(horizontal, size.width), toPixels(vertical, size.height)),
  );
}

export function resolveRadiusFromComputed(
  styles: StyleReader,
  size: ElementSize,
): SquircleCornerRadii {
  return {
    topLeft: resolveCorner(
      styles.getPropertyValue(CORNER_PROPERTIES.topLeft),
      size,
    ),
    topRight: resolveCorner(
      styles.getPropertyValue(CORNER_PROPERTIES.topRight),
      size,
    ),
    bottomRight: resolveCorner(
      styles.getPropertyValue(CORNER_PROPERTIES.bottomRight),
      size,
    ),
    bottomLeft: resolveCorner(
      styles.getPropertyValue(CORNER_PROPERTIES.bottomLeft),
      size,
    ),
  };
}

export function resolveSmoothingFromComputed(styles: StyleReader): {
  smoothing: number;
  preserveSmoothing: boolean;
} {
  const raw = Number.parseFloat(
    styles.getPropertyValue("--squircle-smoothing"),
  );
  const preserve = styles
    .getPropertyValue("--squircle-preserve-smoothing")
    .trim();

  return {
    smoothing: Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1,
    preserveSmoothing:
      preserve !== "" && preserve !== "0" && preserve !== "false",
  };
}

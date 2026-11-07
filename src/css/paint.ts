import type { SquircleBorder, SquircleSurface, StyleReader } from "./types.js";

function read(styles: StyleReader, property: string, fallback: string): string {
  const value = styles.getPropertyValue(property).trim();
  return value === "" ? fallback : value;
}

/**
 * Reads only the top border. Per-side, dashed, and dotted borders cannot be
 * represented by a single SVG stroke.
 */
export function readBorderFromComputed(styles: StyleReader): SquircleBorder {
  const style = read(styles, "border-top-style", "none");
  const width = Number.parseFloat(read(styles, "border-top-width", "0"));
  const color = read(styles, "border-top-color", "transparent");

  return {
    width: style === "solid" && Number.isFinite(width) ? Math.max(0, width) : 0,
    color,
  };
}

export function readSurfaceFromComputed(styles: StyleReader): SquircleSurface {
  return {
    backgroundColor: read(styles, "background-color", "transparent"),
    backgroundImage: read(styles, "background-image", "none"),
    backgroundSize: read(styles, "background-size", "auto"),
    backgroundPosition: read(styles, "background-position", "0% 0%"),
    backgroundRepeat: read(styles, "background-repeat", "repeat"),
    transition: read(styles, "transition", "none"),
  };
}

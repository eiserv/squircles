import { createSquirclePath, type SquirclePathOptions } from "./geometry.js";

/**
 * Builds a ready CSS `clip-path` value. Returns `none` for a degenerate box,
 * so the result is always assignable to the property.
 */
export function createSquircleClipPath(options: SquirclePathOptions): string {
  const path = createSquirclePath(options);
  return path === "" ? "none" : `path('${path}')`;
}

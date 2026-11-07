import { createSquirclePath, type SquirclePathOptions } from "./geometry.js";

/** Builds a ready-to-use CSS clip path. Empty boxes return the valid value `none`. */
export function createSquircleClipPath(options: SquirclePathOptions): string {
  const path = createSquirclePath(options);
  return path === "" ? "none" : `path('${path}')`;
}

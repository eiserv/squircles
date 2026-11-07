import { createSquirclePath, type SquirclePathOptions } from "./geometry.js";

/**
 * Erzeugt einen direkt verwendbaren CSS-Clip-Pfad. Leere Flächen ergeben den gültigen
 * Wert `none`.
 */
export function createSquircleClipPath(options: SquirclePathOptions): string {
  const path = createSquirclePath(options);
  return path === "" ? "none" : `path('${path}')`;
}

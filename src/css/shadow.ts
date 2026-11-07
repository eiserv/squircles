import type { SquircleShadow } from "./types.js";

const LENGTH = /^-?(?:\d*\.)?\d+(?:e[+-]?\d+)?px$/i;

/** Trennt nur außerhalb von Funktionen, auch bei beliebig tiefer Verschachtelung. */
function splitOutsideFunctions(value: string, separator: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const character of value) {
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    } else if (separator.test(character) && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  parts.push(current);

  return parts.map((part) => part.trim()).filter(Boolean);
}

/** Behält auch moderne Farbfunktionen wie oklch() und color() unverändert bei. */
function parseShadow(part: string): SquircleShadow | null {
  const text = part.trim();

  if (text === "" || text === "none" || /\binset\b/.test(text)) {
    return null;
  }

  const tokens = splitOutsideFunctions(text, /\s/);
  const lengths = tokens.filter((token) => LENGTH.test(token));
  const color = tokens.filter((token) => !LENGTH.test(token)).join(" ") || "currentColor";

  if (lengths.length < 2 || lengths.length > 4) {
    return null;
  }

  const [offsetX = "0", offsetY = "0", blur = "0", spread = "0"] = lengths;

  return {
    color,
    offsetX: Number.parseFloat(offsetX),
    offsetY: Number.parseFloat(offsetY),
    blur: Number.parseFloat(blur),
    spread: Number.parseFloat(spread),
  };
}

export function parseBoxShadow(value: string): readonly SquircleShadow[] {
  const text = value.trim();

  if (text === "" || text === "none") {
    return [];
  }

  return splitOutsideFunctions(text, /,/)
    .map(parseShadow)
    .filter((shadow): shadow is SquircleShadow => shadow !== null);
}

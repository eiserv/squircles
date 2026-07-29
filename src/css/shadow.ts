import type { SquircleShadow } from "./types.js";

const COLOR = /(rgba?\([^)]*\)|#[0-9a-f]{3,8}|\b[a-z]+\b(?!\s*\())/i;
const LENGTH = /-?\d*\.?\d+px/g;

/** Splits on commas that are not inside a colour function. */
function splitShadows(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const character of value) {
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  parts.push(current);

  return parts.filter((part) => part.trim() !== "");
}

/**
 * Computed `box-shadow` always serialises the colour first, which is why the
 * colour can be lifted out before the lengths are read.
 */
function parseShadow(part: string): SquircleShadow | null {
  const text = part.trim();

  if (text === "" || text === "none" || /\binset\b/.test(text)) {
    return null;
  }

  const color = COLOR.exec(text)?.[0] ?? "currentColor";
  const lengths = text.replace(color, " ").match(LENGTH);

  if (!lengths || lengths.length < 2) {
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

  return splitShadows(text)
    .map(parseShadow)
    .filter((shadow): shadow is SquircleShadow => shadow !== null);
}

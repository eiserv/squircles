import { useMemo, type RefObject } from "react";
import { createSquircleClipPath } from "../clip-path.js";
import type { SquirclePathOptions } from "../geometry.js";
import type { ElementSize } from "../size.js";
import { useElementSize } from "./use-element-size.js";

export type UseSquircleClipPathOptions = Omit<
  SquirclePathOptions,
  "width" | "height"
> & {
  size?: ElementSize;
};

export type SquircleClipPathResult = Readonly<{
  clipPath: string;
  size: ElementSize | null;
  ready: boolean;
}>;

/** Gives an own component the CSS `clip-path` value for its measured box. */
export function useSquircleClipPath<T extends Element>(
  ref: RefObject<T | null>,
  options: UseSquircleClipPathOptions = {},
): SquircleClipPathResult {
  const {
    size: fixedSize,
    radius,
    smoothing,
    preserveSmoothing,
    inset,
    precision,
  } = options;
  const size = useElementSize(ref, fixedSize);
  const clipPath = useMemo(
    () =>
      size
        ? createSquircleClipPath({
            width: size.width,
            height: size.height,
            ...(radius !== undefined ? { radius } : {}),
            ...(smoothing !== undefined ? { smoothing } : {}),
            ...(preserveSmoothing !== undefined ? { preserveSmoothing } : {}),
            ...(inset !== undefined ? { inset } : {}),
            ...(precision !== undefined ? { precision } : {}),
          })
        : "none",
    [inset, precision, preserveSmoothing, radius, size, smoothing],
  );

  return { clipPath, size, ready: clipPath !== "none" };
}

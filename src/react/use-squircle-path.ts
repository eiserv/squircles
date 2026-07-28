import { useMemo, type RefObject } from "react";
import {
  createSquirclePath,
  type SquirclePathOptions,
} from "../geometry.js";
import { useElementSize, type ElementSize } from "./use-element-size.js";

export type UseSquirclePathOptions = Omit<
  SquirclePathOptions,
  "width" | "height"
> & {
  size?: ElementSize;
};

export type SquirclePathResult = Readonly<{
  path: string;
  size: ElementSize | null;
  ready: boolean;
}>;

export function useSquirclePath<T extends Element>(
  ref: RefObject<T | null>,
  options: UseSquirclePathOptions = {},
): SquirclePathResult {
  const {
    size: fixedSize,
    radius,
    smoothing,
    preserveSmoothing,
    inset,
    precision,
  } = options;
  const size = useElementSize(ref, fixedSize);
  const path = useMemo(
    () =>
      size
        ? createSquirclePath({
            width: size.width,
            height: size.height,
            ...(radius !== undefined ? { radius } : {}),
            ...(smoothing !== undefined ? { smoothing } : {}),
            ...(preserveSmoothing !== undefined
              ? { preserveSmoothing }
              : {}),
            ...(inset !== undefined ? { inset } : {}),
            ...(precision !== undefined ? { precision } : {}),
          })
        : "",
    [
      inset,
      precision,
      preserveSmoothing,
      radius,
      size,
      smoothing,
    ],
  );

  return {
    path,
    size,
    ready: path.length > 0,
  };
}

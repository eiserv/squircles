import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { observeElementSize } from "../dom/observe-size.js";
import type { ElementSize } from "../size.js";

export type { ElementSize };

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useElementSize<T extends Element>(
  ref: RefObject<T | null>,
  fixedSize?: ElementSize,
): ElementSize | null {
  const [size, setSize] = useState<ElementSize | null>(null);

  useBrowserLayoutEffect(() => {
    if (fixedSize || !ref.current) return;
    return observeElementSize(ref.current, (next) => {
      setSize((current) =>
        current?.width === next.width && current.height === next.height
          ? current
          : next,
      );
    });
  }, [fixedSize?.height, fixedSize?.width, ref]);

  return fixedSize ?? size;
}

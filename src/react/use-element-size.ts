import {
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";

export type ElementSize = Readonly<{
  width: number;
  height: number;
}>;

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function roundLayoutSize(value: number): number {
  return Math.round(value * 64) / 64;
}

function readBorderBox(entry: ResizeObserverEntry): ElementSize | null {
  const sizes = entry.borderBoxSize as
    | ResizeObserverSize
    | readonly ResizeObserverSize[];
  const size = Array.isArray(sizes)
    ? sizes[0]
    : (sizes as ResizeObserverSize);

  if (!size) {
    return null;
  }

  const writingMode = getComputedStyle(entry.target).writingMode;
  const vertical = writingMode.startsWith("vertical");

  return {
    width: roundLayoutSize(vertical ? size.blockSize : size.inlineSize),
    height: roundLayoutSize(vertical ? size.inlineSize : size.blockSize),
  };
}

export function useElementSize<T extends Element>(
  ref: RefObject<T | null>,
  fixedSize?: ElementSize,
): ElementSize | null {
  const [size, setSize] = useState<ElementSize | null>(null);

  useBrowserLayoutEffect(() => {
    if (fixedSize) {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const update = (next: ElementSize) => {
      if (next.width <= 0 || next.height <= 0) {
        return;
      }

      setSize((current) =>
        current?.width === next.width && current.height === next.height
          ? current
          : next,
      );
    };

    if (typeof ResizeObserver === "undefined") {
      const rect = element.getBoundingClientRect();
      update({
        width: roundLayoutSize(rect.width),
        height: roundLayoutSize(rect.height),
      });
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(-1);
      if (!entry) {
        return;
      }

      const borderBox = readBorderBox(entry);
      if (borderBox) {
        update(borderBox);
        return;
      }

      const rect = element.getBoundingClientRect();
      update({
        width: roundLayoutSize(rect.width),
        height: roundLayoutSize(rect.height),
      });
    });

    observer.observe(element, { box: "border-box" });
    return () => observer.disconnect();
  }, [fixedSize?.height, fixedSize?.width, ref]);

  return fixedSize ?? size;
}

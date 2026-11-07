import type { ElementSize } from "../size.js";
import { observeElementSize } from "./observe-size.js";
import {
  clearLayers,
  syncLayers,
  type SquircleGeometryOptions,
} from "./layers.js";

const REREAD_EVENTS = ["pointerenter", "pointerleave", "focusin", "focusout"] as const;

/** Ignores transition events from descendant elements. */
const TRANSITION_EVENTS = ["transitionrun", "transitionend"] as const;

/**
 * Shapes an element from its CSS. The returned cleanup removes the layers and
 * restores the authored inline styles.
 */
export function applySquircle(
  element: HTMLElement,
  options: SquircleGeometryOptions = {},
): () => void {
  let size: ElementSize | null = null;
  let frame = 0;
  let disposed = false;

  const sync = (): void => {
    frame = 0;

    if (disposed || !size || size.width <= 0 || size.height <= 0) {
      return;
    }

    syncLayers(element, size, options);
    // Discard our own style mutations to avoid an endless update loop.
    mutationObserver.takeRecords();
  };

  // Coalesce hover, focus, and class changes into a single frame.
  const schedule = (): void => {
    if (disposed || frame !== 0) {
      return;
    }

    frame = requestAnimationFrame(sync);
  };

  const measure = (next: ElementSize): void => {
    if (size?.width === next.width && size.height === next.height) {
      return;
    }

    size = next;
    schedule();
  };

  const mutationObserver = new MutationObserver(schedule);
  mutationObserver.observe(element, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  const stopMeasuring = observeElementSize(element, measure);

  const scheduleOwnTransition = (event: Event): void => {
    if (event.target === element) {
      schedule();
    }
  };

  for (const type of REREAD_EVENTS) {
    element.addEventListener(type, schedule);
  }

  for (const type of TRANSITION_EVENTS) {
    element.addEventListener(type, scheduleOwnTransition);
  }

  return () => {
    if (disposed) return;
    disposed = true;

    if (frame !== 0) {
      cancelAnimationFrame(frame);
    }

    stopMeasuring();
    mutationObserver.disconnect();

    for (const type of REREAD_EVENTS) {
      element.removeEventListener(type, schedule);
    }

    for (const type of TRANSITION_EVENTS) {
      element.removeEventListener(type, scheduleOwnTransition);
    }

    clearLayers(element);
  };
}

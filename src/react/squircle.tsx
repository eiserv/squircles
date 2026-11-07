import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { applySquircle } from "../dom/apply-squircle.js";
import type { SquircleGeometryOptions } from "../dom/layers.js";
import { isVoidElement } from "../dom/void-elements.js";
import type { SquircleRadius } from "../geometry.js";

type PolymorphicRef<Component extends ElementType> =
  ComponentPropsWithRef<Component>["ref"];

type SquircleOwnProps = {
  as?: ElementType;
  children?: ReactNode;
  /** Overrides the element's CSS border-radius. */
  radius?: SquircleRadius;
  /** Overrides the element's CSS --squircle-smoothing. */
  smoothing?: number;
  preserveSmoothing?: boolean;
  /**
   * Also clips children. Leave disabled on controls with focus outlines outside the
   * shape.
   */
  clipContent?: boolean;
};

export type SquircleProps<Component extends ElementType = "div"> =
  SquircleOwnProps &
    Omit<
      ComponentPropsWithoutRef<Component>,
      keyof SquircleOwnProps | "as"
    > & {
      as?: Component;
    };

export type SquircleComponent = <Component extends ElementType = "div">(
  props: SquircleProps<Component> & {
    ref?: PolymorphicRef<Component>;
  },
) => ReactElement | null;

function SquircleImplementation(
  {
    as,
    children,
    radius,
    smoothing,
    preserveSmoothing,
    clipContent,
    ...elementProps
  }: SquircleProps<ElementType>,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const Element: ElementType = as ?? "div";
  const ref = useRef<HTMLElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLElement);

  const options = useMemo<SquircleGeometryOptions>(
    () => ({
      ...(radius !== undefined ? { radius } : {}),
      ...(smoothing !== undefined ? { smoothing } : {}),
      ...(preserveSmoothing !== undefined ? { preserveSmoothing } : {}),
      ...(clipContent !== undefined ? { clipContent } : {}),
    }),
    [clipContent, preserveSmoothing, radius, smoothing],
  );

  useEffect(() => {
    const element = ref.current;
    return element ? applySquircle(element, options) : undefined;
  }, [Element, options]);

  // Layers are managed outside React. Two createElement arguments omit children on
  // void HTML elements.
  const hostProps = { ref, ...elementProps };

  return typeof Element === "string" && isVoidElement(Element)
    ? createElement(Element, hostProps)
    : createElement(Element, hostProps, children);
}

export const Squircle = forwardRef<
  HTMLElement,
  SquircleProps<ElementType>
>(SquircleImplementation) as unknown as SquircleComponent;

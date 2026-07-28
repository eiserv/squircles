import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  createSquirclePath,
  resolveSquircleRadii,
  type SquircleRadius,
} from "../geometry.js";
import { SquircleSurface } from "./squircle-surface.js";
import { useElementSize } from "./use-element-size.js";

type PolymorphicRef<Component extends ElementType> =
  ComponentPropsWithRef<Component>["ref"];

type SquircleOwnProps = {
  as?: ElementType;
  children?: ReactNode;
  radius?: SquircleRadius;
  smoothing?: number;
  preserveSmoothing?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /**
   * Clips child content to the outer squircle. Keep this false on controls
   * whose focus outline must remain visible.
   */
  clipContent?: boolean;
  surfaceClassName?: string;
  surfaceStyle?: CSSProperties;
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

function mergeBoxShadows(
  fallback: string | undefined,
  boxShadow: CSSProperties["boxShadow"],
): string | undefined {
  if (!fallback) {
    return boxShadow;
  }

  return boxShadow ? `${fallback}, ${boxShadow}` : fallback;
}

function SquircleImplementation(
  {
    as,
    children,
    radius = 0,
    smoothing = 1,
    preserveSmoothing = false,
    fill = "transparent",
    stroke = "transparent",
    strokeWidth = 0,
    clipContent = false,
    surfaceClassName,
    surfaceStyle,
    style,
    ...elementProps
  }: SquircleProps<ElementType>,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const Element: ElementType = as ?? "div";
  const ref = useRef<HTMLElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLElement);
  const size = useElementSize(ref);
  const ready = size !== null;
  const radii = useMemo(() => resolveSquircleRadii(radius), [radius]);
  const clipPath = useMemo(
    () =>
      clipContent && size
        ? `path('${createSquirclePath({
            width: size.width,
            height: size.height,
            radius,
            smoothing,
            preserveSmoothing,
          })}')`
        : undefined,
    [clipContent, preserveSmoothing, radius, size, smoothing],
  );
  const fallbackRing =
    !ready && strokeWidth > 0 && stroke !== "transparent"
      ? `inset 0 0 0 ${strokeWidth}px ${stroke}`
      : undefined;

  const elementStyle: CSSProperties = {
    ...style,
    position: style?.position ?? "relative",
    isolation: style?.isolation ?? "isolate",
    backgroundColor: ready ? "transparent" : fill,
    borderTopLeftRadius: radii.topLeft,
    borderTopRightRadius: radii.topRight,
    borderBottomRightRadius: radii.bottomRight,
    borderBottomLeftRadius: radii.bottomLeft,
    boxShadow: mergeBoxShadows(fallbackRing, style?.boxShadow),
    ...(clipContent
      ? {
          clipPath,
          overflow: "hidden",
        }
      : {}),
  };

  Object.assign(elementStyle, {
    cornerShape: "squircle",
  });

  return (
    <Element
      ref={ref}
      data-squircle-ready={ready ? "" : undefined}
      style={elementStyle}
      {...elementProps}
    >
      {size ? (
        <SquircleSurface
          className={surfaceClassName}
          radius={radius}
          smoothing={smoothing}
          preserveSmoothing={preserveSmoothing}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          width={size.width}
          height={size.height}
          style={{ zIndex: -1, ...surfaceStyle }}
        />
      ) : null}
      {children}
    </Element>
  );
}

export const Squircle = forwardRef<
  HTMLElement,
  SquircleProps<ElementType>
>(SquircleImplementation) as unknown as SquircleComponent;

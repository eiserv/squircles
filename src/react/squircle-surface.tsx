import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type SVGAttributes,
} from "react";
import type { SquircleRadius } from "../geometry.js";
import { useSquirclePath } from "./use-squircle-path.js";

export type SquircleSurfaceProps = Omit<
  SVGAttributes<SVGSVGElement>,
  | "children"
  | "fill"
  | "height"
  | "radius"
  | "stroke"
  | "strokeWidth"
  | "viewBox"
  | "width"
> & {
  radius?: SquircleRadius;
  smoothing?: number;
  preserveSmoothing?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
  pathProps?: Omit<
    SVGAttributes<SVGPathElement>,
    "d" | "fill" | "stroke" | "strokeWidth"
  >;
};

const surfaceStyle: CSSProperties = {
  display: "block",
  inset: 0,
  overflow: "visible",
  pointerEvents: "none",
  position: "absolute",
  width: "100%",
  height: "100%",
};

export const SquircleSurface = forwardRef<
  SVGSVGElement,
  SquircleSurfaceProps
>(function SquircleSurface(
  {
    radius = 0,
    smoothing = 1,
    preserveSmoothing = false,
    fill = "transparent",
    stroke = "transparent",
    strokeWidth = 0,
    width,
    height,
    pathProps,
    style,
    ...svgProps
  },
  forwardedRef,
) {
  const ref = useRef<SVGSVGElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as SVGSVGElement);

  const fixedSize =
    width !== undefined && height !== undefined ? { width, height } : undefined;
  const { path, size, ready } = useSquirclePath(ref, {
    radius,
    smoothing,
    preserveSmoothing,
    inset: strokeWidth / 2,
    ...(fixedSize ? { size: fixedSize } : {}),
  });

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      data-squircle-ready={ready ? "" : undefined}
      focusable="false"
      preserveAspectRatio="none"
      viewBox={size ? `0 0 ${size.width} ${size.height}` : undefined}
      style={{ ...surfaceStyle, ...style }}
      {...svgProps}
    >
      {path ? (
        <path
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          shapeRendering="geometricPrecision"
          {...pathProps}
          d={path}
        />
      ) : null}
    </svg>
  );
});

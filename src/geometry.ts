export type SquircleCornerRadii = Readonly<{
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
}>;

export type SquircleRadius = number | Partial<SquircleCornerRadii>;

export type SquirclePathOptions = Readonly<{
  width: number;
  height: number;
  radius?: SquircleRadius;
  /**
   * Figma corner smoothing in the range 0..1.
   * 0 is a regular rounded rectangle; 1 is fully smoothed.
   */
  smoothing?: number;
  /**
   * Keeps the requested smoothing when a corner has little room.
   * Figma-compatible budget clamping is used by default.
   */
  preserveSmoothing?: boolean;
  /**
   * Moves the path inward on all sides and reduces the radii by the same
   * amount. Use half a stroke width to keep an SVG stroke inside the box.
   */
  inset?: number;
  /** Decimal places used in the generated SVG path. */
  precision?: number;
}>;

type CornerName = keyof SquircleCornerRadii;

type CornerCurve = Readonly<{
  radius: number;
  reach: number;
  firstControl: number;
  secondControl: number;
  tangentX: number;
  tangentY: number;
  arcDelta: number;
}>;

const DEFAULT_RADII: SquircleCornerRadii = {
  topLeft: 0,
  topRight: 0,
  bottomRight: 0,
  bottomLeft: 0,
};

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function resolveRadii(radius: SquircleRadius | undefined): SquircleCornerRadii {
  if (typeof radius === "number") {
    assertFinite("radius", radius);
    const value = Math.max(0, radius);

    return {
      topLeft: value,
      topRight: value,
      bottomRight: value,
      bottomLeft: value,
    };
  }

  if (!radius) {
    return DEFAULT_RADII;
  }

  const resolve = (corner: CornerName): number => {
    const value = radius[corner] ?? 0;
    assertFinite(`radius.${corner}`, value);
    return Math.max(0, value);
  };

  return {
    topLeft: resolve("topLeft"),
    topRight: resolve("topRight"),
    bottomRight: resolve("bottomRight"),
    bottomLeft: resolve("bottomLeft"),
  };
}

function insetRadii(
  radii: SquircleCornerRadii,
  inset: number,
): SquircleCornerRadii {
  return {
    topLeft: Math.max(0, radii.topLeft - inset),
    topRight: Math.max(0, radii.topRight - inset),
    bottomRight: Math.max(0, radii.bottomRight - inset),
    bottomLeft: Math.max(0, radii.bottomLeft - inset),
  };
}

/**
 * Allocates each corner a share of both adjacent sides. This is deterministic,
 * symmetric, and guarantees that neighboring corner reaches never overlap.
 */
function getCornerBudgets(
  width: number,
  height: number,
  radii: SquircleCornerRadii,
): SquircleCornerRadii {
  const share = (
    length: number,
    radius: number,
    adjacentRadius: number,
  ): number => {
    const total = radius + adjacentRadius;
    return total === 0 ? 0 : (length * radius) / total;
  };

  return {
    topLeft: Math.min(
      share(width, radii.topLeft, radii.topRight),
      share(height, radii.topLeft, radii.bottomLeft),
    ),
    topRight: Math.min(
      share(width, radii.topRight, radii.topLeft),
      share(height, radii.topRight, radii.bottomRight),
    ),
    bottomRight: Math.min(
      share(width, radii.bottomRight, radii.bottomLeft),
      share(height, radii.bottomRight, radii.topRight),
    ),
    bottomLeft: Math.min(
      share(width, radii.bottomLeft, radii.bottomRight),
      share(height, radii.bottomLeft, radii.topLeft),
    ),
  };
}

function createCornerCurve(
  requestedRadius: number,
  requestedSmoothing: number,
  preserveSmoothing: boolean,
  budget: number,
): CornerCurve {
  const radius = Math.min(requestedRadius, budget);

  if (radius === 0) {
    return {
      radius: 0,
      reach: 0,
      firstControl: 0,
      secondControl: 0,
      tangentX: 0,
      tangentY: 0,
      arcDelta: 0,
    };
  }

  let smoothing = requestedSmoothing;
  let reach = (1 + smoothing) * radius;

  if (!preserveSmoothing) {
    smoothing = Math.min(smoothing, Math.max(0, budget / radius - 1));
    reach = Math.min((1 + smoothing) * radius, budget);
  }

  const arcDegrees = 90 * (1 - smoothing);
  const arcDelta =
    Math.sin(toRadians(arcDegrees / 2)) * radius * Math.SQRT2;
  const transitionDegrees = (90 - arcDegrees) / 2;
  const tangentDistance =
    radius * Math.tan(toRadians(transitionDegrees / 2));
  const tangentAngle = 45 * smoothing;
  const tangentX =
    tangentDistance * Math.cos(toRadians(tangentAngle));
  const tangentY = tangentX * Math.tan(toRadians(tangentAngle));

  let secondControl =
    (reach - arcDelta - tangentX - tangentY) / 3;
  let firstControl = secondControl * 2;

  if (preserveSmoothing && reach > budget) {
    const controlBudget =
      budget - tangentY - arcDelta - tangentX;
    const minimumFirstControl = controlBudget / 6;
    const maximumSecondControl =
      controlBudget - minimumFirstControl;

    secondControl = Math.min(secondControl, maximumSecondControl);
    firstControl = controlBudget - secondControl;
    reach = budget;
  }

  return {
    radius,
    reach,
    firstControl,
    secondControl,
    tangentX,
    tangentY,
    arcDelta,
  };
}

function createFormatter(precision: number): (value: number) => string {
  return (value: number): string => {
    const rounded = Number(value.toFixed(precision));
    return Object.is(rounded, -0) ? "0" : String(rounded);
  };
}

function topRight(curve: CornerCurve, number: (value: number) => string) {
  if (curve.radius === 0) {
    return "";
  }

  const { firstControl, secondControl, tangentX, tangentY, radius, arcDelta } =
    curve;
  const arc =
    arcDelta === 0
      ? ""
      : ` a ${number(radius)} ${number(radius)} 0 0 1 ${number(arcDelta)} ${number(arcDelta)}`;

  return ` c ${number(firstControl)} 0 ${number(firstControl + secondControl)} 0 ${number(firstControl + secondControl + tangentX)} ${number(tangentY)}${arc} c ${number(tangentY)} ${number(tangentX)} ${number(tangentY)} ${number(secondControl + tangentX)} ${number(tangentY)} ${number(firstControl + secondControl + tangentX)}`;
}

function bottomRight(curve: CornerCurve, number: (value: number) => string) {
  if (curve.radius === 0) {
    return "";
  }

  const { firstControl, secondControl, tangentX, tangentY, radius, arcDelta } =
    curve;
  const arc =
    arcDelta === 0
      ? ""
      : ` a ${number(radius)} ${number(radius)} 0 0 1 ${number(-arcDelta)} ${number(arcDelta)}`;

  return ` c 0 ${number(firstControl)} 0 ${number(firstControl + secondControl)} ${number(-tangentY)} ${number(firstControl + secondControl + tangentX)}${arc} c ${number(-tangentX)} ${number(tangentY)} ${number(-(secondControl + tangentX))} ${number(tangentY)} ${number(-(firstControl + secondControl + tangentX))} ${number(tangentY)}`;
}

function bottomLeft(curve: CornerCurve, number: (value: number) => string) {
  if (curve.radius === 0) {
    return "";
  }

  const { firstControl, secondControl, tangentX, tangentY, radius, arcDelta } =
    curve;
  const arc =
    arcDelta === 0
      ? ""
      : ` a ${number(radius)} ${number(radius)} 0 0 1 ${number(-arcDelta)} ${number(-arcDelta)}`;

  return ` c ${number(-firstControl)} 0 ${number(-(firstControl + secondControl))} 0 ${number(-(firstControl + secondControl + tangentX))} ${number(-tangentY)}${arc} c ${number(-tangentY)} ${number(-tangentX)} ${number(-tangentY)} ${number(-(secondControl + tangentX))} ${number(-tangentY)} ${number(-(firstControl + secondControl + tangentX))}`;
}

function topLeft(curve: CornerCurve, number: (value: number) => string) {
  if (curve.radius === 0) {
    return "";
  }

  const { firstControl, secondControl, tangentX, tangentY, radius, arcDelta } =
    curve;
  const arc =
    arcDelta === 0
      ? ""
      : ` a ${number(radius)} ${number(radius)} 0 0 1 ${number(arcDelta)} ${number(-arcDelta)}`;

  return ` c 0 ${number(-firstControl)} 0 ${number(-(firstControl + secondControl))} ${number(tangentY)} ${number(-(firstControl + secondControl + tangentX))}${arc} c ${number(tangentX)} ${number(-tangentY)} ${number(secondControl + tangentX)} ${number(-tangentY)} ${number(firstControl + secondControl + tangentX)} ${number(-tangentY)}`;
}

/**
 * Creates a compact SVG path for Figma-style smoothed corners.
 *
 * The implementation follows Figma's published cubic Bézier construction.
 * It adds strict input handling, per-corner radii, deterministic corner
 * budgeting, and an inset mode intended for artifact-free SVG strokes.
 */
export function createSquirclePath({
  width,
  height,
  radius = 0,
  smoothing = 1,
  preserveSmoothing = false,
  inset = 0,
  precision = 4,
}: SquirclePathOptions): string {
  assertFinite("width", width);
  assertFinite("height", height);
  assertFinite("smoothing", smoothing);
  assertFinite("inset", inset);
  assertFinite("precision", precision);

  if (width < 0 || height < 0) {
    throw new RangeError("width and height must be zero or greater");
  }

  if (width === 0 || height === 0) {
    return "";
  }

  const safeInset = clamp(inset, 0, Math.min(width, height) / 2);
  const innerWidth = width - safeInset * 2;
  const innerHeight = height - safeInset * 2;

  if (innerWidth === 0 || innerHeight === 0) {
    return "";
  }

  const safeSmoothing = clamp(smoothing, 0, 1);
  const safePrecision = Math.round(clamp(precision, 0, 8));
  const number = createFormatter(safePrecision);
  const radii = insetRadii(resolveRadii(radius), safeInset);
  const budgets = getCornerBudgets(innerWidth, innerHeight, radii);
  const curves: Record<CornerName, CornerCurve> = {
    topLeft: createCornerCurve(
      radii.topLeft,
      safeSmoothing,
      preserveSmoothing,
      budgets.topLeft,
    ),
    topRight: createCornerCurve(
      radii.topRight,
      safeSmoothing,
      preserveSmoothing,
      budgets.topRight,
    ),
    bottomRight: createCornerCurve(
      radii.bottomRight,
      safeSmoothing,
      preserveSmoothing,
      budgets.bottomRight,
    ),
    bottomLeft: createCornerCurve(
      radii.bottomLeft,
      safeSmoothing,
      preserveSmoothing,
      budgets.bottomLeft,
    ),
  };

  const left = safeInset;
  const top = safeInset;
  const right = width - safeInset;
  const bottom = height - safeInset;

  return [
    `M ${number(right - curves.topRight.reach)} ${number(top)}`,
    topRight(curves.topRight, number),
    ` L ${number(right)} ${number(bottom - curves.bottomRight.reach)}`,
    bottomRight(curves.bottomRight, number),
    ` L ${number(left + curves.bottomLeft.reach)} ${number(bottom)}`,
    bottomLeft(curves.bottomLeft, number),
    ` L ${number(left)} ${number(top + curves.topLeft.reach)}`,
    topLeft(curves.topLeft, number),
    " Z",
  ]
    .join("")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function resolveSquircleRadii(
  radius: SquircleRadius | undefined,
): SquircleCornerRadii {
  return resolveRadii(radius);
}

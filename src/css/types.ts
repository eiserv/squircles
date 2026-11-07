/**
 * The structural subset of CSSStyleDeclaration needed by the readers, keeping them
 * testable in Node without a DOM.
 */
export type StyleReader = Readonly<{
  getPropertyValue(property: string): string;
}>;

export type SquircleShadow = Readonly<{
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
}>;

export type SquircleBorder = Readonly<{
  width: number;
  color: string;
}>;

export type SquircleSurface = Readonly<{
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: string;
  transition: string;
}>;

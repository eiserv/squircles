/**
 * The slice of CSSStyleDeclaration these readers need. Declaring it
 * structurally keeps this directory free of DOM types and testable in Node.
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

/**
 * Minimaler struktureller Ausschnitt aus CSSStyleDeclaration, damit die Leser ohne DOM
 * in Node testbar bleiben.
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

import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ComponentPropsWithoutRef,
} from "react";
import { Squircle } from "../src/react/index.js";

const CustomLink = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(function CustomLink(props, ref) {
  return <a ref={ref} {...props} />;
});

const button = (
  <Squircle as="button" type="submit" radius={8} smoothing={0.8}>
    Absenden
  </Squircle>
);

const image = <Squircle as="img" src="/a.jpg" alt="Ein Bild" radius={16} />;

const link = (
  <Squircle as={CustomLink} href="/contact/" radius={8}>
    Kontakt
  </Squircle>
);

type InferredButtonProps = ComponentPropsWithoutRef<typeof Squircle>;
const defaultProps: InferredButtonProps = { radius: 12 };

// @ts-expect-error Die Gestaltung erfolgt per CSS.
const invalidPaint = <Squircle as="button" fill="#192d73" />;

// @ts-expect-error Native Schaltflächen unterstützen kein href.
const invalidButton = <Squircle as="button" href="/wrong" />;

void button;
void defaultProps;
void image;
void invalidButton;
void invalidPaint;
void link;

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
  <Squircle as="button" type="submit" radius={8} strokeWidth={1}>
    Submit
  </Squircle>
);

const link = (
  <Squircle as={CustomLink} href="/kontakt/" radius={8}>
    Kontakt
  </Squircle>
);

type InferredButtonProps = ComponentPropsWithoutRef<typeof Squircle>;
const defaultProps: InferredButtonProps = { radius: 12 };

// @ts-expect-error A native button does not accept href.
const invalidButton = <Squircle as="button" href="/wrong" />;

void button;
void defaultProps;
void invalidButton;
void link;

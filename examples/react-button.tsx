"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { Squircle } from "squircles/react";

type BaseProps = {
  children: ReactNode;
  className?: string;
};

type LinkProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & {
    href: string;
  };

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: undefined;
  };

/**
 * Minimal integration for a link-or-button component.
 *
 * Put state colors in CSS variables so hover/focus/disabled changes do not
 * trigger geometry work:
 *
 * .button { --button-fill: #192d73; --button-stroke: #e5e7eb; }
 * .button:hover { --button-fill: #14245e; }
 */
export function ExampleButton(props: LinkProps | ButtonProps) {
  const shapeProps = {
    radius: 8,
    smoothing: 1,
    fill: "var(--button-fill, transparent)",
    stroke: "var(--button-stroke, transparent)",
    strokeWidth: 1,
  } as const;

  if ("href" in props && props.href) {
    const { children, ...linkProps } = props;
    return (
      <Squircle as="a" {...shapeProps} {...linkProps}>
        {children}
      </Squircle>
    );
  }

  const { children, type = "button", ...buttonProps } = props as ButtonProps;
  return (
    <Squircle as="button" type={type} {...shapeProps} {...buttonProps}>
      {children}
    </Squircle>
  );
}

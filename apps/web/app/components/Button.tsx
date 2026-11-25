import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import styles from "./Button.module.css";
import { classNames } from "./class-names";

type ButtonVariant = "primary" | "secondary" | "icon";

interface BaseProps {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}

type LinkButtonProps = BaseProps &
  Omit<ComponentProps<typeof Link>, keyof BaseProps | "href"> & { href: string };

type NativeButtonProps = BaseProps &
  Omit<ComponentProps<"button">, keyof BaseProps> & { href?: undefined };

export type ButtonProps = LinkButtonProps | NativeButtonProps;

function buildClassName(variant: ButtonVariant, className: string | undefined): string {
  return classNames(styles.button, styles[variant], className);
}

export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { variant = "primary", className, children, ...linkProps } = props;
    return (
      <Link className={buildClassName(variant, className)} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { variant = "primary", className, children, type = "button", ...buttonProps } = props;
  return (
    <button type={type} className={buildClassName(variant, className)} {...buttonProps}>
      {children}
    </button>
  );
}

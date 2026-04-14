import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const buttonVariantClasses = {
  default: "button--default",
  destructive: "button--destructive",
  outline: "button--outline",
  secondary: "button--secondary",
  ghost: "button--ghost",
  link: "button--link",
} as const;

const buttonSizeClasses = {
  default: "",
  sm: "button--sm",
  lg: "button--lg",
  icon: "button--icon",
} as const;

type ButtonVariant = keyof typeof buttonVariantClasses;
type ButtonSize = keyof typeof buttonSizeClasses;

function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "button",
    buttonVariantClasses[variant] ?? buttonVariantClasses.default,
    buttonSizeClasses[size] ?? buttonSizeClasses.default,
    className,
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={buttonVariants({ variant, size, className })} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

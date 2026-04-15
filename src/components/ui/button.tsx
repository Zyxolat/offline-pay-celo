import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";

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
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp className={buttonVariants({ variant, size, className })} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={disabled || loading}
        data-loading={loading ? "true" : "false"}
        {...props}
      >
        {loading ? <Loader2 className="button__spinner" size={16} /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

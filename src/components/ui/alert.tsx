import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = {
  default: "",
  destructive: "alert--destructive",
} as const;

type AlertVariant = keyof typeof alertVariants;

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }
>(({ className, variant = "default", ...props }, ref) => (
  <div ref={ref} role="alert" className={cn("alert", alertVariants[variant], className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("alert__title", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("alert__description", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

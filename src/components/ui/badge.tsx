import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "badge--default",
  secondary: "badge--secondary",
  destructive: "badge--destructive",
  outline: "badge--outline",
} as const;

type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <div className={cn("badge", badgeVariants[variant], className)} {...props} />;
}

export { Badge, badgeVariants };

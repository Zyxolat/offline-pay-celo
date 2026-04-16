import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export const Button = ({
  children,
  className = "",
  variant = "primary",
  fullWidth = false,
  type = "button",
  ...props
}: ButtonProps) => {
  const classes = [
    "offlinepay-button",
    `offlinepay-button--${variant}`,
    fullWidth ? "offlinepay-button--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
};

export default Button;

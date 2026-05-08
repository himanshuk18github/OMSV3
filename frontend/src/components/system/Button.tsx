import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 border border-brand-600 dark:border-brand-500 shadow-theme-sm hover:shadow-theme-md",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700",
  outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
  ghost: "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
  danger: "bg-error-500 text-white hover:bg-error-600 border border-error-600 dark:border-error-500 shadow-theme-sm hover:shadow-theme-md",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm font-medium",
  lg: "px-6 py-3 text-base font-medium",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  startIcon,
  endIcon,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center gap-2 rounded-lg border transition-all duration-200 font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none",
          sizeClasses[size],
          variantClasses[variant],
          className,
        ),
      )}
      {...rest}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
}
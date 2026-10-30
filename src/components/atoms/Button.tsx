import * as React from "react";
import { cn } from "@/lib/utils";
import { Kbd } from "./Kbd";

export type ButtonVariant = "accent" | "secondary" | "ghost" | "quiet" | "success" | "danger";
export type ButtonSize = "xs" | "sm" | "md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Keyboard hint rendered inside the button (LocalCan style). */
  kbd?: string;
  /** Marketing pill: uppercase mono, fully rounded (Griffin). */
  pill?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  accent: "bg-accent text-accent-ink hover:opacity-90",
  secondary: "bg-transparent text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover",
  ghost: "bg-transparent text-ink-2 hover:bg-hover hover:text-ink",
  quiet: "bg-transparent text-ink-3 hover:text-ink px-0",
  success: "bg-green text-accent-ink hover:opacity-90",
  danger: "bg-transparent text-red shadow-[inset_0_0_0_1px_var(--red)] hover:bg-red hover:text-accent-ink",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-[11.5px] gap-1",
  sm: "h-8 px-3 text-[12.5px] gap-1.5",
  md: "h-10 px-4 text-[13px] gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "sm", kbd, pill, icon, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition-[background,opacity,color] duration-[120ms] disabled:pointer-events-none disabled:opacity-40",
        pill ? "rounded-full font-mono uppercase tracking-[0.06em] text-[11.5px]" : "rounded-control",
        variants[variant],
        sizes[size],
        pill && size === "md" && "h-11 px-5",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {kbd ? <Kbd className="ml-1" tone={variant === "accent" ? "inverse" : "default"}>{kbd}</Kbd> : null}
    </button>
  );
});

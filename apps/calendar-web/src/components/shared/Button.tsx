import { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "gradient" | "glass" | "glow" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {

  const baseStyles =
    "font-semibold rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-visible cursor-pointer";

  const variantStyles = {
    primary: "bg-gradient-to-br from-primary-400 to-primary-600 hover:brightness-110 border-[3px] border-primary-200/60 transform hover:-translate-y-1 shadow-[0_8px_32px_0_rgba(14,116,144,0.5),0_6px_0_0_rgb(7,89,133),inset_0_3px_8px_0_rgba(255,255,255,0.6),inset_0_-3px_8px_0_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_0_rgba(14,116,144,0.7),0_8px_0_0_rgb(7,89,133),inset_0_4px_10px_0_rgba(255,255,255,0.7),inset_0_-4px_10px_0_rgba(0,0,0,0.4)] active:translate-y-[6px] active:shadow-[0_2px_8px_0_rgba(14,116,144,0.3),0_0px_0_0_rgb(7,89,133),inset_0_1px_4px_0_rgba(0,0,0,0.4),inset_0_-1px_4px_0_rgba(255,255,255,0.3)]",
    secondary: "bg-gradient-to-br from-orange-300 via-accent-400 to-orange-500 hover:brightness-110 border-[3px] border-orange-200/70 transform hover:-translate-y-1 shadow-[0_8px_32px_0_rgba(249,115,22,0.5),0_6px_0_0_rgb(194,65,12),inset_0_3px_8px_0_rgba(255,255,255,0.6),inset_0_-3px_8px_0_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_0_rgba(249,115,22,0.7),0_8px_0_0_rgb(194,65,12),inset_0_4px_10px_0_rgba(255,255,255,0.7),inset_0_-4px_10px_0_rgba(0,0,0,0.4)] active:translate-y-[6px] active:shadow-[0_2px_8px_0_rgba(249,115,22,0.3),0_0px_0_0_rgb(194,65,12),inset_0_1px_4px_0_rgba(0,0,0,0.4),inset_0_-1px_4px_0_rgba(255,255,255,0.3)]",
    outline: "bg-gradient-to-br from-white via-primary-50/50 to-primary-100/60 border-[3px] border-primary-400 hover:brightness-105 transform hover:-translate-y-1 shadow-[0_8px_32px_0_rgba(14,116,144,0.4),0_6px_0_0_rgb(14,116,144),inset_0_3px_8px_0_rgba(255,255,255,1),inset_0_-3px_8px_0_rgba(14,116,144,0.25)] hover:shadow-[0_12px_40px_0_rgba(14,116,144,0.6),0_8px_0_0_rgb(14,116,144),inset_0_4px_10px_0_rgba(255,255,255,1),inset_0_-4px_10px_0_rgba(14,116,144,0.35)] active:translate-y-[6px] active:shadow-[0_2px_8px_0_rgba(14,116,144,0.2),0_0px_0_0_rgb(14,116,144),inset_0_1px_4px_0_rgba(14,116,144,0.3),inset_0_-1px_4px_0_rgba(255,255,255,0.8)]",
    gradient: "bg-gradient-to-br from-primary-400 via-primary-500 to-accent-400 hover:brightness-110 border-[3px] border-primary-200/60 transform hover:-translate-y-1 shadow-[0_8px_32px_0_rgba(14,116,144,0.5),0_6px_0_0_rgb(7,89,133),inset_0_3px_8px_0_rgba(255,255,255,0.6),inset_0_-3px_8px_0_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_0_rgba(14,116,144,0.7),0_8px_0_0_rgb(7,89,133),inset_0_4px_10px_0_rgba(255,255,255,0.7),inset_0_-4px_10px_0_rgba(0,0,0,0.4)] active:translate-y-[6px] active:shadow-[0_2px_8px_0_rgba(14,116,144,0.3),0_0px_0_0_rgb(7,89,133),inset_0_1px_4px_0_rgba(0,0,0,0.4),inset_0_-1px_4px_0_rgba(255,255,255,0.3)] animate-gradient-x bg-[length:200%_200%]",
    glass: "bg-gradient-to-br from-white/50 to-white/10 backdrop-blur-xl border-[3px] border-white/70 hover:brightness-110 transform hover:-translate-y-1 shadow-[0_8px_32px_0_rgba(31,38,135,0.4),0_6px_0_0_rgba(255,255,255,0.4),inset_0_3px_8px_0_rgba(255,255,255,0.9),inset_0_-3px_8px_0_rgba(31,38,135,0.2)] hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.6),0_8px_0_0_rgba(255,255,255,0.5),inset_0_4px_10px_0_rgba(255,255,255,1),inset_0_-4px_10px_0_rgba(31,38,135,0.3)] active:translate-y-[6px] active:shadow-[0_2px_8px_0_rgba(31,38,135,0.2),0_0px_0_0_rgba(255,255,255,0.2),inset_0_1px_4px_0_rgba(31,38,135,0.3),inset_0_-1px_4px_0_rgba(255,255,255,0.7)]",
    glow: "bg-gradient-to-br from-primary-400 to-primary-600 hover:brightness-110 border-[3px] border-primary-200/60 transform hover:-translate-y-1 shadow-[0_8px_32px_0_rgba(14,116,144,0.7),0_6px_0_0_rgb(7,89,133),inset_0_3px_8px_0_rgba(255,255,255,0.6),inset_0_-3px_8px_0_rgba(0,0,0,0.3)] hover:shadow-[0_0_50px_10px_rgba(14,116,144,0.9),0_8px_0_0_rgb(7,89,133),inset_0_4px_10px_0_rgba(255,255,255,0.7),inset_0_-4px_10px_0_rgba(0,0,0,0.4)] active:translate-y-[6px] active:shadow-[0_0_10px_2px_rgba(14,116,144,0.5),0_0px_0_0_rgb(7,89,133),inset_0_1px_4px_0_rgba(0,0,0,0.4),inset_0_-1px_4px_0_rgba(255,255,255,0.3)] animate-pulse-glow",
    ghost: "bg-gradient-to-br from-white/15 to-transparent hover:from-white/25 hover:to-white/5 hover:brightness-110 border-[3px] border-current/40 hover:border-current/60 shadow-[inset_0_3px_8px_0_rgba(255,255,255,0.4),inset_0_-3px_8px_0_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-[inset_0_1px_4px_0_rgba(0,0,0,0.3),inset_0_-1px_4px_0_rgba(255,255,255,0.3)]",
  };

  const variantTextColors = {
    primary: "#f0f9ff",
    secondary: "#fef3c7",
    outline: "#0284c7",
    gradient: "#ffffff",
    glass: "#ffffff",
    glow: "#f0f9ff",
    ghost: "inherit",
  };

  const sizeStyles = {
    sm: "py-2 px-4 text-sm",
    md: "py-3 px-6 text-base",
    lg: "py-4 px-8 text-lg",
  };

  const gapStyles = {
    sm: "gap-1.5",
    md: "gap-3",
    lg: "gap-3",
  };

  const widthStyles = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
      style={{
        color: variantTextColors[variant],
      }}
      disabled={disabled}
      {...props}
    >
      {/* Glass reflection highlight - applied to all variants */}
      <span
        className="absolute inset-0 rounded-full bg-gradient-to-br from-white/80 via-white/20 to-transparent pointer-events-none z-[1]"
        style={{
          clipPath: "ellipse(45% 35% at 30% 20%)",
        }}
      />

      <span className={`relative z-10 flex items-center justify-center ${gapStyles[size]}`}>{children}</span>
    </button>
  );
}

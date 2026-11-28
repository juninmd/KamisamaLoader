import * as React from "react"
import { Button as SonidoButton } from "@juninmd/sonido"

/**
 * Compatibility layer for the Button API the app already uses.
 * Rendering, focus ring, loading and press behaviour come from Sonido.
 */
export type ButtonVariant =
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "glass"

export type ButtonSize = "default" | "sm" | "lg" | "icon"

export interface ButtonProps
    extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
    variant?: ButtonVariant
    size?: ButtonSize
}

const VARIANTS: Record<
    ButtonVariant,
    { variant: "primary" | "secondary" | "ghost" | "danger" | "link"; appearance?: "outline" }
> = {
    default: { variant: "primary" },
    destructive: { variant: "danger" },
    outline: { variant: "secondary", appearance: "outline" },
    secondary: { variant: "secondary" },
    ghost: { variant: "ghost" },
    link: { variant: "link" },
    glass: { variant: "ghost", appearance: "outline" },
}

const SIZES: Record<ButtonSize, "md" | "sm" | "lg" | "icon"> = {
    default: "md",
    sm: "sm",
    lg: "lg",
    icon: "icon",
}

const GLASS = "bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 text-white"

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        const mapped = VARIANTS[variant]
        return (
            <SonidoButton
                ref={ref}
                variant={mapped.variant}
                appearance={mapped.appearance}
                size={SIZES[size]}
                press={variant === "default"}
                className={[variant === "glass" ? GLASS : "", className].filter(Boolean).join(" ")}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }

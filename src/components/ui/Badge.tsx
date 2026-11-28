import {
    Badge as SonidoBadge,
    type BadgeProps as SonidoBadgeProps,
} from "@juninmd/sonido"

/**
 * Compatibility layer for the Badge API the app already uses.
 * Tones and shapes are Sonido's; only the legacy `variant` names are mapped.
 */
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "glass"

export interface BadgeProps extends SonidoBadgeProps {
    variant?: BadgeVariant
}

const VARIANTS: Record<BadgeVariant, Pick<SonidoBadgeProps, "tone" | "appearance" | "className">> = {
    default: { tone: "accent", appearance: "solid" },
    secondary: { tone: "neutral", appearance: "soft" },
    destructive: { tone: "danger", appearance: "solid" },
    outline: { tone: "neutral", appearance: "soft", className: "bg-transparent border-white/20" },
    glass: { tone: "neutral", appearance: "soft", className: "backdrop-blur-md bg-black/40" },
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const mapped = VARIANTS[variant]
    const merged = [mapped.className, className].filter(Boolean).join(" ")
    return <SonidoBadge tone={mapped.tone} appearance={mapped.appearance} className={merged} {...props} />
}

export { Badge }

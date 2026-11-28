import * as React from "react"
import {
    Card as SonidoCard,
    CardHeader as SonidoCardHeader,
    CardTitle as SonidoCardTitle,
    CardBody,
    CardFooter as SonidoCardFooter,
} from "@juninmd/sonido"

/**
 * Sonido surfaces with the padding that the app already applies through its
 * own utility classes (`p-4`, `p-6`). `CardContent` maps to Sonido `CardBody`.
 */
export type CardProps = React.ComponentPropsWithoutRef<typeof SonidoCard>

type CardWithRef = React.ForwardRefExoticComponent<
    CardProps & React.RefAttributes<HTMLDivElement>
>

const SonidoCardWithRef = SonidoCard as unknown as CardWithRef

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
    <SonidoCardWithRef
        ref={ref}
        surface="glass"
        padding="none"
        className={className}
        {...props}
    />
))
Card.displayName = "Card"

const CardHeader = SonidoCardHeader
const CardTitle = SonidoCardTitle
const CardDescription = (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-sm text-muted-foreground" {...props} />
)
const CardContent = CardBody
const CardFooter = SonidoCardFooter

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

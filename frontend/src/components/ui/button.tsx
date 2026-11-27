import { cn } from "../../lib/utils"
import type { ButtonHTMLAttributes } from "react"
import { framedUI } from "../../lib/framed" //// Neoffice

type Variant = "primary" | "outline" | "ghost"

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600",
  outline:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 focus-visible:outline-zinc-400",
  ghost: "text-zinc-600 hover:bg-zinc-100 focus-visible:outline-zinc-400",
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      //// Neoffice — framed in the desk: the desk's button (10 px corners, Karla 600; the ink comes from the tokens of
      //// index.css), and `data-variant` tells the framed drawer which button is its ink action (the key it shows).
      data-variant={variant}
      className={cn(
        framedUI()
          ? "inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-semibold"
          : "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium",
        "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

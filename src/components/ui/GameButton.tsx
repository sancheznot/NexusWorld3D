import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type GameButtonVariant =
  | "classic"
  | "retro"
  | "neon"
  | "modern"
  | "start"
  | "custom";

type VariantProps = {
  variant?: GameButtonVariant;
  className?: string;
  children: React.ReactNode;
};

export type GameButtonProps =
  | (VariantProps &
      Omit<ComponentProps<typeof Link>, "className" | "children"> & {
        href: string;
      })
  | (VariantProps &
      Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
        href?: undefined;
      });

const baseStyles =
  "relative font-bold py-3 px-6 min-h-[48px] sm:py-4 sm:px-8 sm:min-h-0 rounded-xl transition-all duration-100 flex items-center justify-center gap-2 select-none active:transform touch-manipulation text-center";

const variants: Record<GameButtonVariant, string> = {
  classic: `
    bg-blue-500 text-white
    border-b-[6px] border-blue-700
    hover:bg-blue-400 hover:border-blue-600
    active:border-b-0 active:translate-y-[6px]
    shadow-lg
  `,
  retro: `
    bg-green-500 text-black uppercase tracking-wider
    border-4 border-black
    shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
    hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
    hover:translate-x-[2px] hover:translate-y-[2px]
    active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
    rounded-none
  `,
  neon: `
    bg-transparent text-cyan-400 border-2 border-cyan-400
    shadow-[0_0_15px_rgba(34,211,238,0.5)]
    hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_30px_rgba(34,211,238,0.8)]
    active:scale-95
    italic
  `,
  modern: `
    bg-gradient-to-r from-purple-600 to-pink-600 text-white
    hover:from-purple-500 hover:to-pink-500
    hover:scale-110 hover:rotate-2
    active:scale-90 active:-rotate-2
    shadow-xl shadow-purple-500/30
  `,
  start: `
    bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg
    border-b-[8px] border-red-900
    hover:from-orange-400 hover:to-red-500
    active:border-b-0 active:translate-y-[8px]
    shadow-2xl shadow-orange-500/20
  `,
  /** ES: Usa `style` (p. ej. gradiente desde admin). EN: Use `style` (e.g. admin gradient). */
  custom: `
    text-white
    border-b-[6px] border-black/30
    hover:brightness-110
    active:border-b-0 active:translate-y-[6px]
    shadow-lg
  `,
};

function classFor(variant: GameButtonVariant, className: string) {
  return [baseStyles, variants[variant], className].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * ES: Botón estilo juego; con `href` renderiza `Link` (Next).
 * EN: Game-style button; with `href` renders Next `Link`.
 */
export function GameButton({
  variant = "classic",
  className = "",
  children,
  href,
  ...rest
}: GameButtonProps) {
  const cls = classFor(variant, className);

  if (href) {
    return (
      <Link href={href} className={cls} {...(rest as Omit<ComponentProps<typeof Link>, "href" | "className" | "children">)}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}

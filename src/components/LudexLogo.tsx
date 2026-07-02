import { cn } from "@/lib/cn";

interface LudexLogoProps {
  compact?: boolean;
  className?: string;
}

export function LudexLogo({ compact = false, className }: LudexLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="Ludex">
      <div className="relative grid size-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-[0_0_28px_rgba(139,77,255,.3)]">
        <span className="translate-y-[-1px] text-xl font-black tracking-[-0.08em] text-white">
          L
        </span>
        <div className="absolute -right-2 -bottom-2 size-5 rounded-full bg-white/20 blur-sm" />
      </div>
      {!compact && (
        <div>
          <p className="text-[17px] leading-none font-bold tracking-[-0.03em] text-white">Ludex</p>
          <p className="mt-1 text-[9px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
            Game Library
          </p>
        </div>
      )}
    </div>
  );
}

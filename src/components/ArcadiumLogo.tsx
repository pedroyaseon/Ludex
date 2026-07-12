import { cn } from "@/lib/cn";

interface ArcadiumLogoProps {
  compact?: boolean;
  className?: string;
}

export function ArcadiumLogo({ compact = false, className }: ArcadiumLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-label="Arcadium">
      <img src="/arcadium-icon.png" alt="" className="size-10 rounded-xl" />
      {!compact && (
        <div>
          <p className="text-[17px] leading-none font-bold tracking-[-0.03em] text-white">
            Arcadium
          </p>
          <p className="mt-1 text-[9px] font-semibold tracking-[0.22em] text-zinc-500 uppercase">
            Game Library
          </p>
        </div>
      )}
    </div>
  );
}

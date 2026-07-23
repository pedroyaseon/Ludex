import { cn } from "@/lib/cn";

interface ArcadiumLogoProps {
  compact?: boolean;
  className?: string;
}

export function ArcadiumLogo({ compact = false, className }: ArcadiumLogoProps) {
  if (compact) {
    return (
      <img
        src="/arcadium-icon.png"
        alt="Arcadium"
        className={cn("size-10 rounded-xl", className)}
      />
    );
  }

  return (
    <div
      className={cn("relative h-12 w-full max-w-[196px] overflow-hidden", className)}
      aria-label="Arcadium"
    >
      <img
        src="/arcadium-logo.png"
        alt="Arcadium"
        className="absolute -top-[33px] -left-[9px] w-[212px] max-w-none"
      />
    </div>
  );
}

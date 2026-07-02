import type { Platform } from "@/types/domain";
import { cn } from "@/lib/cn";

export type PlatformSelection = "ALL" | Platform;

interface PlatformFilterProps {
  value: PlatformSelection;
  onChange: (value: PlatformSelection) => void;
}

export function PlatformFilter({ value, onChange }: PlatformFilterProps) {
  return (
    <div
      className="inline-flex h-12 items-center rounded-xl border border-white/[0.075] bg-white/[0.025] p-1"
      aria-label="Filtrar por plataforma"
    >
      {(["ALL", "PS2"] as const).map((platform) => (
        <button
          key={platform}
          type="button"
          onClick={() => onChange(platform)}
          className={cn(
            "h-9 rounded-lg px-3.5 text-xs font-semibold transition-all",
            value === platform
              ? "bg-white/[0.09] text-white shadow-sm"
              : "text-zinc-600 hover:text-zinc-300",
          )}
        >
          {platform === "ALL" ? "Todos" : platform}
        </button>
      ))}
      <button
        type="button"
        disabled
        title="Suporte a PS3 planejado"
        className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold text-zinc-700"
      >
        PS3{" "}
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] tracking-wider uppercase">
          Em breve
        </span>
      </button>
    </div>
  );
}

import { Database, Image, LoaderCircle, Sparkles } from "lucide-react";

export function LibrarySyncLoader() {
  return (
    <div
      className="relative isolate min-h-[420px] overflow-hidden rounded-[24px] border border-white/[0.075] bg-white/[0.018]"
      role="status"
      aria-live="polite"
      aria-label="Sincronizando novos jogos"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_35%,rgba(76,115,255,0.14),transparent_38%)]" />
      <div className="absolute top-1/2 left-1/2 -z-10 size-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-brand-500/[0.06] blur-3xl" />

      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
        <div className="relative grid size-20 place-items-center rounded-[22px] border border-brand-300/15 bg-brand-500/10 shadow-[0_20px_70px_rgba(42,80,255,.2)]">
          <Sparkles className="text-brand-200" size={29} />
          <LoaderCircle
            className="absolute -inset-2 size-24 animate-spin text-brand-400/60"
            strokeWidth={1}
          />
        </div>

        <h3 className="mt-7 text-xl font-semibold tracking-[-0.025em] text-zinc-100">
          Preparando novos jogos
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
          O Arcadium está identificando os títulos e sincronizando capas e informações da sua
          biblioteca.
        </p>

        <div className="mt-7 flex items-center gap-2.5 text-[11px] font-medium text-zinc-500">
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-black/15 px-3 py-1.5">
            <Database size={12} /> Metadados
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-black/15 px-3 py-1.5">
            <Image size={12} /> Capas
          </span>
        </div>

        <div className="mt-7 h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.05]">
          <div className="h-full w-1/2 animate-[sync-progress_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-brand-500 via-cyan-300 to-brand-500" />
        </div>
        <span className="mt-3 text-[10px] tracking-[0.16em] text-zinc-600 uppercase">
          Sincronização automática
        </span>
      </div>
    </div>
  );
}

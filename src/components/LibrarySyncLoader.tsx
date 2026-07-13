import { LoaderCircle } from "lucide-react";

export function LibrarySyncLoader() {
  return (
    <div
      className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5"
      role="status"
      aria-live="polite"
      aria-label="Sincronizando novos jogos"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-300">
          <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-300">Atualizando biblioteca</p>
          <p className="mt-0.5 truncate text-[10px] text-zinc-600">
            Identificando jogos, capas e informações.
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden bg-white/[0.04]">
        <div className="h-full w-1/3 animate-[sync-progress_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-brand-300 to-transparent motion-reduce:animate-none" />
      </div>
    </div>
  );
}

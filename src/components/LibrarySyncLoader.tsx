export function LibrarySyncLoader() {
  return (
    <div
      className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5"
      role="status"
      aria-live="polite"
      aria-label="Sincronizando novos jogos"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center gap-1 rounded-xl bg-brand-500/10">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-1 rounded-full bg-brand-300 motion-reduce:animate-none"
              style={{
                animation: `sync-dot 1.2s ease-in-out ${dot * 140}ms infinite`,
              }}
            />
          ))}
        </span>
        <p className="text-xs font-semibold text-zinc-300">Atualizando biblioteca</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden bg-white/[0.04]">
        <div className="h-full w-full animate-[sync-progress_1.8s_linear_infinite] bg-gradient-to-r from-transparent via-brand-300/80 to-transparent motion-reduce:animate-none" />
      </div>
    </div>
  );
}

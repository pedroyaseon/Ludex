import { AlertCircle, Heart, Plus, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyLibraryState } from "@/components/EmptyLibraryState";
import { GameGrid, GameGridSkeleton } from "@/components/GameGrid";
import { PageHeader } from "@/components/PageHeader";
import { PlatformFilter, type PlatformSelection } from "@/components/PlatformFilter";
import { SearchBar } from "@/components/SearchBar";
import { useGames } from "@/features/games/useGames";
import { cn } from "@/lib/cn";

export function Home() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<PlatformSelection>("ALL");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { games, isLoading, isSyncing, syncError, lastSyncResult, libraryState, refresh } =
    useGames({
      search,
      platform,
      favoritesOnly,
    });
  const lastSyncedAt = libraryState.lastSyncedAt
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(libraryState.lastSyncedAt))
    : undefined;

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-7 sm:px-8 md:px-10 md:py-9 xl:px-12">
      <div className="pointer-events-none absolute top-[-300px] right-[-180px] size-[640px] rounded-full bg-brand-700/[0.07] blur-[120px]" />
      <div className="relative mx-auto max-w-[1540px]">
        <PageHeader
          eyebrow="Biblioteca local"
          title="Sua coleção"
          description="Seus jogos de PS2 organizados em um só lugar, com detecção automática na pasta configurada."
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={isSyncing}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Escaneando" : "Reescanear"}
              </button>
              <Link
                to="/import"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
              >
                <Plus size={17} /> Adicionar jogos
              </Link>
            </div>
          }
        />

        {(isSyncing || syncError || lastSyncResult) && (
          <div
            className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-xs leading-relaxed ${
              syncError
                ? "border-rose-300/15 bg-rose-300/[0.045] text-rose-100/75"
                : "border-emerald-300/10 bg-emerald-300/[0.035] text-emerald-100/60"
            }`}
          >
            {syncError ? (
              <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-300" />
            ) : (
              <RefreshCw
                size={17}
                className={`mt-0.5 shrink-0 text-emerald-300 ${isSyncing ? "animate-spin" : ""}`}
              />
            )}
            <span>
              {syncError
                ? syncError
                : isSyncing
                  ? "Detectando jogos automaticamente na pasta configurada..."
                  : `${lastSyncResult?.scanResult.files.length ?? 0} jogos detectados automaticamente em ${lastSyncResult?.scanResult.request.folderPath ?? "sua pasta PS2"}. ${lastSyncResult?.stats.removed ? `${lastSyncResult.stats.removed} removidos da biblioteca local porque não existem mais na pasta.` : ""}`}
            </span>
          </div>
        )}

        <section className="mt-6 grid gap-3 md:grid-cols-4" aria-label="Status da biblioteca">
          {[
            { label: "Indexados", value: libraryState.totalGames.toString() },
            { label: "Adicionados", value: String(libraryState.lastSyncStats?.added ?? 0) },
            { label: "Atualizados", value: String(libraryState.lastSyncStats?.updated ?? 0) },
            { label: "Removidos", value: String(libraryState.lastSyncStats?.removed ?? 0) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <p className="text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        {(lastSyncedAt || libraryState.lastScannedFolderPath) && (
          <p className="mt-3 text-[11px] text-zinc-700">
            {lastSyncedAt ? `Última sincronização: ${lastSyncedAt}` : "Biblioteca sincronizada"}{" "}
            {libraryState.lastScannedFolderPath ? `· ${libraryState.lastScannedFolderPath}` : ""}
            {libraryState.lastScanDurationMilliseconds
              ? ` · ${libraryState.lastScanDurationMilliseconds} ms`
              : ""}
          </p>
        )}

        <section
          className="mt-9 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"
          aria-label="Ferramentas da biblioteca"
        >
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex flex-wrap items-center gap-3">
            <PlatformFilter value={platform} onChange={setPlatform} />
            <button
              type="button"
              onClick={() => setFavoritesOnly((value) => !value)}
              className={cn(
                "flex h-12 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors",
                favoritesOnly
                  ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                  : "border-white/[0.075] bg-white/[0.025] text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Heart size={15} fill={favoritesOnly ? "currentColor" : "none"} /> Favoritos
            </button>
            <button
              type="button"
              title="Mais filtros serão adicionados futuramente"
              className="grid size-12 place-items-center rounded-xl border border-white/[0.075] bg-white/[0.025] text-zinc-600 hover:text-zinc-300"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </section>

        <section className="mt-9" aria-labelledby="library-heading">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 id="library-heading" className="text-sm font-semibold text-zinc-200">
                {favoritesOnly ? "Favoritos" : "Todos os jogos"}
              </h2>
              {!isLoading && (
                <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold text-zinc-600">
                  {games.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-700">
              {isSyncing ? "Atualizando biblioteca local" : "Ordenado por atividade recente"}
            </p>
          </div>

          {isLoading ? (
            <GameGridSkeleton />
          ) : games.length ? (
            <GameGrid games={games} />
          ) : (
            <EmptyLibraryState isSearchResult={Boolean(search || favoritesOnly)} />
          )}
        </section>
      </div>
    </div>
  );
}

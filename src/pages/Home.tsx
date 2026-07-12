import { CircleAlert, Heart, Radio } from "lucide-react";
import { useState } from "react";
import { EmptyLibraryState } from "@/components/EmptyLibraryState";
import { GameGrid, GameGridSkeleton } from "@/components/GameGrid";
import { PlatformFilter, type PlatformSelection } from "@/components/PlatformFilter";
import { SearchBar } from "@/components/SearchBar";
import { useGames } from "@/features/games/useGames";
import { cn } from "@/lib/cn";

export function Home() {
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<PlatformSelection>("ALL");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { games, isLoading, monitorStatus, libraryState } = useGames({
    search,
    platform,
    favoritesOnly,
  });

  const status =
    monitorStatus === "error"
      ? { label: "Monitor indisponível", icon: CircleAlert, tone: "text-amber-300" }
      : monitorStatus === "syncing" || monitorStatus === "starting"
        ? { label: "Atualizando", icon: Radio, tone: "text-brand-300" }
        : monitorStatus === "watching"
          ? { label: "Biblioteca ao vivo", icon: Radio, tone: "text-emerald-300" }
          : { label: "Configure uma pasta", icon: CircleAlert, tone: "text-zinc-500" };
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen px-5 py-7 sm:px-8 md:px-10 md:py-9 xl:px-12">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-zinc-600 uppercase">
              Coleção
            </p>
            <div className="mt-1.5 flex items-baseline gap-3">
              <h1 className="text-3xl font-semibold tracking-[-0.045em] text-white md:text-4xl">
                Biblioteca
              </h1>
              <span className="text-sm font-medium text-zinc-600">{libraryState.totalGames}</span>
            </div>
          </div>
          <div
            className={cn(
              "flex h-9 items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 text-[11px] font-medium",
              status.tone,
            )}
          >
            <StatusIcon
              size={13}
              className={cn(
                monitorStatus === "syncing" && "animate-pulse",
                monitorStatus === "watching" && "drop-shadow-[0_0_5px_currentColor]",
              )}
            />
            {status.label}
          </div>
        </header>

        <section className="mt-9 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex flex-wrap items-center gap-2">
            <PlatformFilter value={platform} onChange={setPlatform} />
            <button
              type="button"
              onClick={() => setFavoritesOnly((value) => !value)}
              aria-pressed={favoritesOnly}
              className={cn(
                "flex h-12 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors",
                favoritesOnly
                  ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                  : "border-white/[0.075] bg-white/[0.025] text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Heart size={15} fill={favoritesOnly ? "currentColor" : "none"} />
              Favoritos
            </button>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="library-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="library-heading" className="text-sm font-semibold text-zinc-300">
              {favoritesOnly ? "Favoritos" : search ? "Resultados" : "Todos os jogos"}
            </h2>
            {!isLoading && (
              <span className="text-[11px] text-zinc-600">
                {games.length} {games.length === 1 ? "jogo" : "jogos"}
              </span>
            )}
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

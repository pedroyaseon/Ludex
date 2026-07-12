import { Clock3, Heart, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPlaytime } from "@/lib/formatters";
import type { Game } from "@/types/domain";

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const cover = game.coverLocalPath ?? game.coverUrl;

  return (
    <article className="game-card group min-w-0">
      <Link
        to={`/games/${game.id}`}
        className="relative block aspect-[5/7] overflow-hidden rounded-[18px] border border-white/[0.075] bg-zinc-900 shadow-[0_18px_55px_rgba(0,0,0,.18)] outline-none transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-white/15 group-hover:shadow-[0_25px_65px_rgba(0,0,0,.38)] focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        {cover ? (
          <img
            src={cover}
            alt={`Capa de ${game.title}`}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-brand-700 to-zinc-950 text-5xl font-black text-white/20">
            {game.title.slice(0, 1)}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
        <span className="absolute top-3 left-3 rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-[9px] font-bold tracking-[0.14em] text-white/80 uppercase backdrop-blur-md">
          {game.platform}
        </span>
        {game.isFavorite && (
          <span className="absolute top-3 right-3 grid size-8 place-items-center rounded-full border border-white/10 bg-black/45 text-rose-300 backdrop-blur-md">
            <Heart size={14} fill="currentColor" />
          </span>
        )}

        <div className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-between opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-white/75">
            <Clock3 size={12} /> {formatPlaytime(game.playtimeSeconds)}
          </span>
          <span className="grid size-10 place-items-center rounded-full bg-white text-black shadow-lg">
            <Play size={15} fill="currentColor" className="translate-x-px" />
          </span>
        </div>
      </Link>
      <div className="px-1 pt-3">
        <Link
          to={`/games/${game.id}`}
          className="block truncate text-[13px] font-semibold text-zinc-200 hover:text-white"
        >
          {game.title}
        </Link>
        <p className="mt-1 text-[11px] text-zinc-600">
          {[game.releaseYear, game.genre].filter(Boolean).join(" · ")}
        </p>
      </div>
    </article>
  );
}

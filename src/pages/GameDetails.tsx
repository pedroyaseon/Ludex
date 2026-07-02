import {
  ArrowLeft,
  Check,
  Clock3,
  Gamepad2,
  HardDrive,
  Heart,
  Info,
  Play,
  Settings2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { gamesService } from "@/features/games/games.service";
import { formatLastPlayed, formatPlaytime } from "@/lib/formatters";
import type { Game } from "@/types/domain";

export function GameDetails() {
  const { gameId = "" } = useParams();
  const [game, setGame] = useState<Game>();
  const [isLoading, setIsLoading] = useState(true);
  const [showLaunchNotice, setShowLaunchNotice] = useState(false);

  useEffect(() => {
    let isActive = true;
    void gamesService.getById(gameId).then((result) => {
      if (isActive) {
        setGame(result);
        setIsLoading(false);
      }
    });
    return () => {
      isActive = false;
    };
  }, [gameId]);

  if (isLoading) {
    return <div className="min-h-screen animate-pulse bg-white/[0.02]" />;
  }

  if (!game) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Jogo não encontrado</h1>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 text-sm text-brand-300 hover:text-brand-100"
          >
            <ArrowLeft size={16} /> Voltar para a biblioteca
          </Link>
        </div>
      </div>
    );
  }

  const cover = game.coverLocalPath ?? game.coverUrl;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {cover && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[540px] overflow-hidden opacity-30">
          <img
            src={cover}
            alt=""
            className="size-full scale-125 object-cover object-[50%_35%] blur-[65px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/25 via-ink-950/75 to-ink-950" />
        </div>
      )}

      <div className="relative mx-auto max-w-[1350px] px-5 py-7 sm:px-8 md:px-10 md:py-9 xl:px-12">
        <Link
          to="/"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/15 px-3.5 text-xs font-medium text-zinc-400 backdrop-blur-md hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft size={15} /> Biblioteca
        </Link>

        <div className="mt-10 grid gap-9 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)] xl:gap-14">
          <div>
            <div className="aspect-[5/7] overflow-hidden rounded-[24px] border border-white/10 bg-zinc-900 shadow-[0_35px_90px_rgba(0,0,0,.45)]">
              {cover ? (
                <img src={cover} alt={`Capa de ${game.title}`} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-6xl font-black text-white/10">
                  {game.title[0]}
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-zinc-400 hover:text-white">
                <Heart
                  size={15}
                  fill={game.isFavorite ? "currentColor" : "none"}
                  className={game.isFavorite ? "text-rose-300" : ""}
                />{" "}
                Favorito
              </button>
              <button className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-zinc-400 hover:text-white">
                <Settings2 size={15} /> Perfil
              </button>
            </div>
          </div>

          <div className="self-end pb-2 lg:pt-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-brand-300/20 bg-brand-500/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.13em] text-brand-300 uppercase">
                {game.platform}
              </span>
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold text-zinc-500">
                {game.region}
              </span>
              <span className="text-xs text-zinc-600">{game.releaseYear}</span>
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl leading-[1.03] font-bold tracking-[-0.055em] text-white sm:text-5xl xl:text-6xl">
              {game.title}
            </h1>
            <p className="mt-4 text-sm font-medium text-zinc-500">{game.genre}</p>
            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-zinc-400">{game.description}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLaunchNotice(true)}
                className="inline-flex h-13 min-w-40 items-center justify-center gap-2.5 rounded-2xl bg-brand-500 px-6 text-sm font-bold text-white shadow-[0_16px_45px_rgba(139,77,255,.28)] transition-all hover:-translate-y-0.5 hover:bg-brand-400"
              >
                <Play size={18} fill="currentColor" /> Jogar
              </button>
              <div className="flex h-13 items-center gap-3 rounded-2xl border border-white/[0.075] bg-black/15 px-4 backdrop-blur-sm">
                <span className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-zinc-400">
                  <Gamepad2 size={16} />
                </span>
                <div>
                  <p className="text-[10px] text-zinc-600">Emulador</p>
                  <p className="text-xs font-semibold text-zinc-300">PCSX2 · Padrão</p>
                </div>
                <Check size={14} className="ml-2 text-emerald-400" />
              </div>
            </div>

            {showLaunchNotice && (
              <div className="mt-4 flex max-w-xl items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.055] p-3.5 text-xs leading-relaxed text-amber-100/70">
                <Info size={16} className="mt-0.5 shrink-0 text-amber-300" />A execução real será
                conectada ao launcher nativo em uma etapa futura. O perfil do PCSX2 já está
                representado na arquitetura.
              </div>
            )}

            <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-4">
              {[
                {
                  label: "Tempo jogado",
                  value: formatPlaytime(game.playtimeSeconds),
                  icon: Clock3,
                },
                { label: "Última sessão", value: formatLastPlayed(game.lastPlayedAt), icon: Play },
                { label: "Formato", value: game.fileExtension.toUpperCase(), icon: HardDrive },
                { label: "Serial", value: game.serial ?? "—", icon: Info },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-[#0b0c11]/90 p-4">
                  <Icon size={15} className="mb-4 text-zinc-600" />
                  <dt className="text-[10px] text-zinc-600">{label}</dt>
                  <dd className="mt-1 text-xs font-semibold text-zinc-300">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

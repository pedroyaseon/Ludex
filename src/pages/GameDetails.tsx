import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderOpen,
  Images,
  Info,
  Play,
  Square,
  X,
} from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GameVideoPlayer } from "@/components/GameVideoPlayer";
import { launchProfilesService } from "@/features/emulators/launch-profiles.service";
import { launcherService } from "@/features/emulators/launcher.service";
import {
  playSessionsService,
  type ActivePlaySession,
} from "@/features/games/play-sessions.service";
import { gamesService } from "@/features/games/games.service";
import { libraryUpdatedEvent } from "@/features/library-scanner/library-monitor.service";
import { settingsService } from "@/features/settings/settings.service";
import { formatLastPlayed, formatPlaytime } from "@/lib/formatters";
import type { Game, PlaySession } from "@/types/domain";

export function GameDetails() {
  const { gameId = "" } = useParams();
  const [game, setGame] = useState<Game>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string>();
  const [launchMessageType, setLaunchMessageType] = useState<"success" | "error">("success");
  const [activeSession, setActiveSession] = useState<ActivePlaySession>();
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedArtworkIndex, setSelectedArtworkIndex] = useState<number>();

  useEffect(() => {
    let isActive = true;
    void gamesService.getById(gameId).then(async (result) => {
      if (!isActive) return;
      setGame(result);
      if (result) {
        const [runningSession, playSessions] = await Promise.all([
          playSessionsService.getActiveForGame(result.id),
          playSessionsService.listForGame(result.id),
        ]);
        setActiveSession(runningSession);
        setSessions(playSessions);
      }
      setIsLoading(false);
    });
    return () => {
      isActive = false;
    };
  }, [gameId]);

  useEffect(() => {
    const handleLibraryUpdated = () => {
      void gamesService.getById(gameId).then((updatedGame) => {
        if (updatedGame) setGame(updatedGame);
      });
    };
    window.addEventListener(libraryUpdatedEvent, handleLibraryUpdated);
    return () => window.removeEventListener(libraryUpdatedEvent, handleLibraryUpdated);
  }, [gameId]);

  useEffect(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }
    const updateElapsedTime = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000)),
      );
    };
    updateElapsedTime();
    const intervalId = window.setInterval(updateElapsedTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeSession]);

  useEffect(() => {
    if (selectedArtworkIndex === undefined) return;
    const artworkCount = game?.metadata?.screenshots.length ?? 0;
    if (artworkCount === 0) {
      setSelectedArtworkIndex(undefined);
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedArtworkIndex(undefined);
      if (event.key === "ArrowLeft") {
        setSelectedArtworkIndex((current) =>
          current === undefined ? current : (current - 1 + artworkCount) % artworkCount,
        );
      }
      if (event.key === "ArrowRight") {
        setSelectedArtworkIndex((current) =>
          current === undefined ? current : (current + 1) % artworkCount,
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game?.metadata?.screenshots.length, selectedArtworkIndex]);

  const recentSessions = useMemo(() => sessions.slice(0, 4), [sessions]);

  async function handleLaunch() {
    if (!game || isLaunching) return;
    setIsLaunching(true);
    setLaunchMessage(undefined);
    try {
      const settings = await settingsService.get();
      const emulatorPath = settings.emulatorPaths[game.platform];
      if (!emulatorPath) {
        throw new Error("Configure o caminho do PCSX2 em Configurações antes de jogar.");
      }
      const launchProfile = await launchProfilesService.getForGame(game);
      const result = await launcherService.launchGame({
        emulatorPath,
        game,
        profile: launchProfile,
      });
      const session = await playSessionsService.start(
        game,
        launchProfile.emulatorId,
        result.processId,
      );
      setActiveSession(session);
      setLaunchMessageType("success");
      setLaunchMessage(`PCSX2 iniciado. Sessão local ativa no processo ${result.processId}.`);
    } catch (launchError) {
      setLaunchMessageType("error");
      setLaunchMessage(launchError instanceof Error ? launchError.message : String(launchError));
    } finally {
      setIsLaunching(false);
    }
  }

  async function handleFinishSession() {
    if (!game || !activeSession) return;
    const finishedSession = await playSessionsService.finish(game.id);
    if (!finishedSession) return;
    const updatedGame = await gamesService.recordFinishedSession(
      game.id,
      finishedSession.durationSeconds ?? 0,
    );
    setGame(updatedGame ?? game);
    setActiveSession(undefined);
    setSessions(await playSessionsService.listForGame(game.id));
    setLaunchMessageType("success");
    setLaunchMessage(
      `Sessão finalizada. ${formatPlaytime(finishedSession.durationSeconds ?? 0)} adicionados.`,
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen animate-pulse px-10 py-12">
        <div className="h-[440px] rounded-[28px] bg-white/[0.025]" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Jogo não encontrado</h1>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 text-sm text-brand-300">
            <ArrowLeft size={16} /> Voltar para a biblioteca
          </Link>
        </div>
      </div>
    );
  }

  const cover = game.coverLocalPath ?? game.metadata?.cover?.imageUrl ?? game.coverUrl;
  const background = game.metadata?.background?.imageUrl ?? game.metadata?.screenshots[0]?.imageUrl;
  const gallery = game.metadata?.screenshots ?? [];
  const selectedArtwork =
    selectedArtworkIndex === undefined ? undefined : gallery[selectedArtworkIndex];
  const information = [
    { label: "Desenvolvedor", value: game.developer },
    { label: "Publicadora", value: game.publisher },
    { label: "Lançamento", value: game.releasedAt },
    { label: "Avaliação", value: game.rating ? `${game.rating.toFixed(1)} / 5` : undefined },
    { label: "Metacritic", value: game.metacritic ? String(game.metacritic) : undefined },
    { label: "Região", value: game.region },
  ].filter((item) => item.value);

  return (
    <div className="relative min-h-screen overflow-hidden pb-16">
      {(background ?? cover) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] overflow-hidden">
          <img
            src={background ?? cover}
            alt=""
            className="size-full scale-105 object-cover object-center opacity-25 blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/20 via-ink-950/80 to-ink-950" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/75 via-transparent to-ink-950/35" />
        </div>
      )}

      <div className="relative mx-auto max-w-[1540px] px-5 py-7 sm:px-8 md:px-10 md:py-9 xl:px-12">
        <Link
          to="/"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3.5 text-xs font-medium text-zinc-400 backdrop-blur-md transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft size={15} /> Biblioteca
        </Link>

        <header className="mt-8 grid items-end gap-7 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-10">
          <div className="mx-auto w-full max-w-[280px] lg:mx-0">
            <div className="aspect-[5/7] overflow-hidden rounded-[24px] border border-white/10 bg-zinc-900 shadow-[0_35px_90px_rgba(0,0,0,.45)]">
              {cover ? (
                <img src={cover} alt={`Capa de ${game.title}`} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-gradient-to-br from-brand-700 to-zinc-950 text-7xl font-black text-white/15">
                  {game.title[0]}
                </div>
              )}
            </div>
          </div>

          <div className="pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-brand-300/20 bg-brand-500/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.13em] text-brand-300 uppercase">
                {game.platform}
              </span>
              {game.releaseYear && (
                <span className="text-xs text-zinc-500">{game.releaseYear}</span>
              )}
              {game.genre && <span className="text-xs text-zinc-500">{game.genre}</span>}
            </div>
            <h1 className="mt-4 max-w-5xl text-4xl leading-[1.02] font-bold tracking-[-0.055em] text-white sm:text-5xl xl:text-7xl">
              {game.title}
            </h1>
            <p className="mt-5 line-clamp-3 max-w-4xl text-[15px] leading-7 text-zinc-400">
              {game.description ?? "Informações do jogo sendo preparadas pelo Arcadium."}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleLaunch()}
                disabled={isLaunching || Boolean(activeSession)}
                className="inline-flex h-12 min-w-40 items-center justify-center gap-2.5 rounded-2xl bg-brand-500 px-6 text-sm font-bold text-white shadow-[0_16px_45px_rgba(139,77,255,.28)] transition-all hover:-translate-y-0.5 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play size={18} fill="currentColor" />
                {activeSession ? "Sessão ativa" : isLaunching ? "Abrindo..." : "Jogar"}
              </button>
              {activeSession && (
                <button
                  type="button"
                  onClick={() => void handleFinishSession()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-5 text-sm font-bold text-emerald-100/80"
                >
                  <Square size={14} fill="currentColor" /> Finalizar sessão
                </button>
              )}
              <div className="flex h-12 min-w-36 items-center gap-3 rounded-2xl border border-white/[0.075] bg-black/20 px-4 backdrop-blur-sm">
                <Clock3 size={15} className="text-zinc-500" />
                <div>
                  <p className="text-[9px] text-zinc-600">Tempo jogado</p>
                  <p className="text-xs font-semibold text-zinc-300">
                    {formatPlaytime(game.playtimeSeconds)}
                  </p>
                </div>
              </div>
              <div className="flex h-12 min-w-40 items-center gap-3 rounded-2xl border border-white/[0.075] bg-black/20 px-4 backdrop-blur-sm">
                <Play size={15} className="text-zinc-500" />
                <div>
                  <p className="text-[9px] text-zinc-600">Última sessão</p>
                  <p className="text-xs font-semibold text-zinc-300">
                    {formatLastPlayed(game.lastPlayedAt)}
                  </p>
                </div>
              </div>
            </div>

            {launchMessage && (
              <div
                className={`mt-4 flex max-w-2xl items-start gap-3 rounded-xl border p-3.5 text-xs ${
                  launchMessageType === "success"
                    ? "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/70"
                    : "border-rose-300/15 bg-rose-300/[0.055] text-rose-100/75"
                }`}
              >
                <Info size={15} className="shrink-0" />
                <span>
                  {launchMessage}
                  {launchMessageType === "error" && (
                    <Link to="/settings" className="ml-1 font-semibold underline">
                      Abrir configurações.
                    </Link>
                  )}
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.75fr)]">
          <main className="min-w-0 space-y-10">
            {game.metadata?.videos.length ? (
              <GameVideoPlayer gameTitle={game.title} videos={game.metadata.videos} />
            ) : null}

            {game.metadata?.screenshots.length ? (
              <section aria-labelledby="gallery-heading">
                <div className="mb-4 flex items-center gap-2">
                  <Images size={17} className="text-brand-300" />
                  <h2 id="gallery-heading" className="text-base font-semibold text-white">
                    Galeria
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {gallery.slice(0, 6).map((artwork, index) => (
                    <button
                      type="button"
                      key={artwork.imageUrl}
                      onClick={() => setSelectedArtworkIndex(index)}
                      className={`group/gallery overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] ${index === 0 ? "col-span-2 row-span-2" : ""}`}
                    >
                      <img
                        src={artwork.imageUrl}
                        alt={`Screenshot de ${game.title}`}
                        loading="lazy"
                        className="aspect-video size-full object-cover transition-transform duration-300 group-hover/gallery:scale-[1.025]"
                      />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </main>

          <aside className="space-y-5">
            {activeSession && (
              <section className="rounded-[22px] border border-emerald-300/10 bg-emerald-300/[0.04] p-5">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-300 uppercase">
                  Sessão em andamento
                </p>
                <p className="mt-3 text-2xl font-semibold text-emerald-50/90">
                  {formatPlaytime(elapsedSeconds)}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-emerald-100/45">
                  O tempo é registrado ao finalizar a sessão.
                </p>
              </section>
            )}

            {information.length > 0 && (
              <section className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-5">
                <h2 className="text-sm font-semibold text-white">Sobre o jogo</h2>
                <dl className="mt-5 space-y-4">
                  {information.map((item) => (
                    <div
                      key={item.label}
                      className="border-b border-white/[0.055] pb-4 last:border-0 last:pb-0"
                    >
                      <dt className="text-[10px] text-zinc-600">{item.label}</dt>
                      <dd className="mt-1.5 text-xs font-semibold text-zinc-300">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-5">
              <h2 className="text-sm font-semibold text-white">Arquivo local</h2>
              <p className="mt-3 break-all font-mono text-[10px] leading-5 text-zinc-500">
                {game.filePath}
              </p>
              <button
                type="button"
                onClick={() => void revealItemInDir(game.filePath)}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                <FolderOpen size={15} /> Abrir pasta
              </button>
            </section>

            {recentSessions.length > 0 && (
              <section className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-5">
                <h2 className="text-sm font-semibold text-white">Histórico recente</h2>
                <div className="mt-3 divide-y divide-white/[0.06]">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-3 text-xs"
                    >
                      <span className="text-zinc-500">{formatLastPlayed(session.startedAt)}</span>
                      <span className="font-semibold text-zinc-300">
                        {formatPlaytime(session.durationSeconds ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {selectedArtwork && selectedArtworkIndex !== undefined && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria ampliada"
        >
          <button
            type="button"
            onClick={() => setSelectedArtworkIndex(undefined)}
            className="absolute top-5 right-5 z-10 grid size-11 place-items-center rounded-full border border-white/10 bg-black/45 text-white/70 backdrop-blur-md hover:bg-white/10 hover:text-white"
            aria-label="Fechar galeria"
          >
            <X size={19} />
          </button>
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setSelectedArtworkIndex(
                    (selectedArtworkIndex - 1 + gallery.length) % gallery.length,
                  )
                }
                className="absolute left-5 z-10 grid size-12 place-items-center rounded-full border border-white/10 bg-black/45 text-white/70 backdrop-blur-md hover:bg-white/10 hover:text-white"
                aria-label="Imagem anterior"
              >
                <ChevronLeft size={23} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedArtworkIndex((selectedArtworkIndex + 1) % gallery.length)}
                className="absolute right-5 z-10 grid size-12 place-items-center rounded-full border border-white/10 bg-black/45 text-white/70 backdrop-blur-md hover:bg-white/10 hover:text-white"
                aria-label="Próxima imagem"
              >
                <ChevronRight size={23} />
              </button>
            </>
          )}
          <img
            src={selectedArtwork.imageUrl}
            alt={`Screenshot ampliada de ${game.title}`}
            className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"
          />
          <span className="absolute bottom-6 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-semibold text-white/60 backdrop-blur-md">
            {selectedArtworkIndex + 1} / {gallery.length}
          </span>
        </div>
      )}
    </div>
  );
}

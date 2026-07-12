import {
  ArrowLeft,
  Check,
  Clock3,
  FolderOpen,
  Gamepad2,
  HardDrive,
  Heart,
  Info,
  Play,
  RefreshCw,
  Star,
  Square,
  Settings2,
} from "lucide-react";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  launchProfilesService,
  type LaunchProfileDraft,
} from "@/features/emulators/launch-profiles.service";
import { launcherService } from "@/features/emulators/launcher.service";
import { gamesService } from "@/features/games/games.service";
import {
  playSessionsService,
  type ActivePlaySession,
} from "@/features/games/play-sessions.service";
import { settingsService } from "@/features/settings/settings.service";
import { formatLastPlayed, formatPlaytime } from "@/lib/formatters";
import type { Game, LaunchProfile, PlaySession } from "@/types/domain";

export function GameDetails() {
  const { gameId = "" } = useParams();
  const [game, setGame] = useState<Game>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string>();
  const [launchMessageType, setLaunchMessageType] = useState<"success" | "error">("success");
  const [profile, setProfile] = useState<LaunchProfile>();
  const [profileDraft, setProfileDraft] = useState<LaunchProfileDraft>();
  const [profileSaved, setProfileSaved] = useState(false);
  const [activeSession, setActiveSession] = useState<ActivePlaySession>();
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadataMessage, setMetadataMessage] = useState<string>();

  useEffect(() => {
    let isActive = true;
    void gamesService.getById(gameId).then(async (result) => {
      if (isActive) {
        setGame(result);
        if (result) {
          const [launchProfile, runningSession, playSessions] = await Promise.all([
            launchProfilesService.getForGame(result),
            playSessionsService.getActiveForGame(result.id),
            playSessionsService.listForGame(result.id),
          ]);
          setProfile(launchProfile);
          setProfileDraft({
            fullscreen: launchProfile.fullscreen,
            customArgs: launchProfile.customArgs ?? "",
            resolutionPreset: launchProfile.resolutionPreset ?? "native",
            controllerProfile: launchProfile.controllerProfile ?? "default",
          });
          setActiveSession(runningSession);
          setSessions(playSessions);
        }
        setIsLoading(false);
      }
    });
    return () => {
      isActive = false;
    };
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

      const launchProfile: LaunchProfile =
        profile ?? (await launchProfilesService.getForGame(game));
      setProfile(launchProfile);
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
      setLaunchMessage(
        `PCSX2 iniciado com sucesso. Sessão local iniciada no processo ${result.processId}.`,
      );
    } catch (launchError) {
      setLaunchMessageType("error");
      setLaunchMessage(launchError instanceof Error ? launchError.message : String(launchError));
    } finally {
      setIsLaunching(false);
    }
  }

  async function handleSaveProfile() {
    if (!game || !profileDraft) return;
    const savedProfile = await launchProfilesService.saveForGame(game, profileDraft);
    setProfile(savedProfile);
    setProfileDraft({
      fullscreen: savedProfile.fullscreen,
      customArgs: savedProfile.customArgs ?? "",
      resolutionPreset: savedProfile.resolutionPreset ?? "native",
      controllerProfile: savedProfile.controllerProfile ?? "default",
    });
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 1600);
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
      `Sessão finalizada. ${formatPlaytime(finishedSession.durationSeconds ?? 0)} adicionados ao tempo jogado.`,
    );
  }

  async function handleRevealGameFile() {
    if (!game) return;
    await revealItemInDir(game.filePath);
  }

  async function handleFetchMetadata() {
    if (!game || isFetchingMetadata) return;
    setIsFetchingMetadata(true);
    setMetadataMessage(undefined);
    try {
      const updatedGame = await gamesService.enrichMetadata(game.id);
      if (updatedGame) setGame(updatedGame);
      setMetadataMessage(
        updatedGame?.metadataStatus === "matched"
          ? "Informações atualizadas pela RAWG."
          : "Nenhuma correspondência de PS2 foi encontrada na RAWG.",
      );
    } catch (error) {
      setMetadataMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsFetchingMetadata(false);
    }
  }

  async function handleOpenRawg() {
    if (!game?.rawgUrl) return;
    await openUrl(game.rawgUrl);
  }

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
                <div className="grid size-full place-items-center p-6 text-center">
                  <div>
                    <p className="text-6xl font-black text-white/10">{game.title[0]}</p>
                    <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-zinc-700 uppercase">
                      Local PS2
                    </p>
                  </div>
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
              {game.region && (
                <span className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold text-zinc-500">
                  {game.region}
                </span>
              )}
              {game.releaseYear && (
                <span className="text-xs text-zinc-600">{game.releaseYear}</span>
              )}
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl leading-[1.03] font-bold tracking-[-0.055em] text-white sm:text-5xl xl:text-6xl">
              {game.title}
            </h1>
            <p className="mt-4 text-sm font-medium text-zinc-500">{game.genre}</p>
            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-zinc-400">{game.description}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleFetchMetadata()}
                disabled={isFetchingMetadata}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 text-xs font-semibold text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                <RefreshCw size={15} className={isFetchingMetadata ? "animate-spin" : ""} />
                {isFetchingMetadata
                  ? "Consultando RAWG..."
                  : game.metadataStatus === "matched"
                    ? "Atualizar informações"
                    : "Buscar informações"}
              </button>
              {metadataMessage && <span className="text-xs text-zinc-500">{metadataMessage}</span>}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleLaunch()}
                disabled={isLaunching || Boolean(activeSession)}
                className="inline-flex h-13 min-w-40 items-center justify-center gap-2.5 rounded-2xl bg-brand-500 px-6 text-sm font-bold text-white shadow-[0_16px_45px_rgba(139,77,255,.28)] transition-all hover:-translate-y-0.5 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Play size={18} fill="currentColor" />{" "}
                {activeSession ? "Sessão ativa" : isLaunching ? "Abrindo..." : "Jogar"}
              </button>
              {activeSession && (
                <button
                  type="button"
                  onClick={() => void handleFinishSession()}
                  className="inline-flex h-13 min-w-40 items-center justify-center gap-2.5 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-5 text-sm font-bold text-emerald-100/80 hover:bg-emerald-400/[0.11]"
                >
                  <Square size={15} fill="currentColor" /> Finalizar sessão
                </button>
              )}
              <div className="flex h-13 items-center gap-3 rounded-2xl border border-white/[0.075] bg-black/15 px-4 backdrop-blur-sm">
                <span className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-zinc-400">
                  <Gamepad2 size={16} />
                </span>
                <div>
                  <p className="text-[10px] text-zinc-600">Emulador</p>
                  <p className="text-xs font-semibold text-zinc-300">PCSX2 · padrão</p>
                </div>
                <Check size={14} className="ml-2 text-emerald-400" />
              </div>
            </div>

            {launchMessage && (
              <div
                className={`mt-4 flex max-w-xl items-start gap-3 rounded-xl border p-3.5 text-xs leading-relaxed ${
                  launchMessageType === "success"
                    ? "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-100/70"
                    : "border-rose-300/15 bg-rose-300/[0.055] text-rose-100/75"
                }`}
              >
                <Info
                  size={16}
                  className={`mt-0.5 shrink-0 ${
                    launchMessageType === "success" ? "text-emerald-300" : "text-rose-300"
                  }`}
                />
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

            {game.metadataStatus === "matched" && (
              <section className="mt-5 max-w-3xl rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-brand-300 uppercase">
                      Informações do jogo
                    </p>
                    <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      {[
                        { label: "Desenvolvedor", value: game.developer },
                        { label: "Publicadora", value: game.publisher },
                        { label: "Lançamento", value: game.releasedAt },
                        {
                          label: "Avaliação RAWG",
                          value: game.rating ? `${game.rating.toFixed(1)} / 5` : undefined,
                        },
                        {
                          label: "Metacritic",
                          value: game.metacritic ? String(game.metacritic) : undefined,
                        },
                      ]
                        .filter((item) => item.value)
                        .map((item) => (
                          <div key={item.label}>
                            <dt className="text-[10px] text-zinc-600">{item.label}</dt>
                            <dd className="mt-1 text-xs font-semibold text-zinc-300">
                              {item.value}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                  {game.rawgUrl && (
                    <a
                      href={game.rawgUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => {
                        event.preventDefault();
                        void handleOpenRawg();
                      }}
                      className="inline-flex shrink-0 items-center gap-2 text-[11px] font-semibold text-zinc-500 hover:text-brand-300"
                    >
                      <Star size={14} /> Dados e imagens por RAWG
                    </a>
                  )}
                </div>
              </section>
            )}

            {activeSession && (
              <div className="mt-5 max-w-3xl rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.035] p-4">
                <p className="text-[10px] font-semibold tracking-wider text-emerald-300 uppercase">
                  Sessão em andamento
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-50/80">
                  {formatPlaytime(elapsedSeconds)}
                </p>
                <p className="mt-1 text-[11px] text-emerald-100/45">
                  O Ludex registra o tempo quando você clicar em Finalizar sessão. O emulador não é
                  encerrado automaticamente.
                </p>
              </div>
            )}

            <section className="mt-6 grid max-w-3xl gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Perfil de execução</h2>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      Argumentos são enviados diretamente ao PCSX2, sem shell.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveProfile()}
                    className="h-9 rounded-xl bg-white px-3 text-xs font-bold text-zinc-950 hover:bg-zinc-200"
                  >
                    {profileSaved ? "Salvo" : "Salvar"}
                  </button>
                </div>

                {profileDraft && (
                  <div className="mt-4 space-y-3">
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.07] bg-black/10 p-3">
                      <span>
                        <span className="block text-xs font-semibold text-zinc-300">
                          Abrir em tela cheia
                        </span>
                        <span className="mt-1 block text-[10px] text-zinc-600">
                          Adiciona --fullscreen ao processo.
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={profileDraft.fullscreen}
                        onChange={(event) =>
                          setProfileDraft({ ...profileDraft, fullscreen: event.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <span className="relative h-6 w-11 rounded-full bg-zinc-800 after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-zinc-400 after:transition-transform peer-checked:bg-brand-500 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-[10px] font-semibold text-zinc-500">
                          Resolução
                        </span>
                        <select
                          value={profileDraft.resolutionPreset}
                          onChange={(event) =>
                            setProfileDraft({
                              ...profileDraft,
                              resolutionPreset: event.target.value,
                            })
                          }
                          className="h-10 w-full rounded-xl border border-white/[0.08] bg-zinc-950 px-3 text-xs text-zinc-300 outline-none"
                        >
                          <option value="native">Nativo</option>
                          <option value="2x">2x</option>
                          <option value="3x">3x</option>
                          <option value="4x">4x</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-[10px] font-semibold text-zinc-500">
                          Controle
                        </span>
                        <input
                          value={profileDraft.controllerProfile}
                          onChange={(event) =>
                            setProfileDraft({
                              ...profileDraft,
                              controllerProfile: event.target.value,
                            })
                          }
                          className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-xs text-zinc-300 outline-none"
                          placeholder="default"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold text-zinc-500">
                        Argumentos extras
                      </span>
                      <input
                        value={profileDraft.customArgs}
                        onChange={(event) =>
                          setProfileDraft({ ...profileDraft, customArgs: event.target.value })
                        }
                        className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 font-mono text-[11px] text-zinc-300 outline-none"
                        placeholder='ex: "--nogui"'
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <h2 className="text-sm font-semibold text-white">Arquivo local</h2>
                <p className="mt-3 break-all font-mono text-[10px] leading-relaxed text-zinc-500">
                  {game.filePath}
                </p>
                <button
                  type="button"
                  onClick={() => void handleRevealGameFile()}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  <FolderOpen size={15} /> Abrir pasta do jogo
                </button>
              </div>
            </section>

            {recentSessions.length > 0 && (
              <section className="mt-6 max-w-3xl rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}

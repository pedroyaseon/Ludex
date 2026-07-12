import {
  Check,
  Database,
  FolderOpen,
  Gamepad2,
  Globe2,
  Monitor,
  KeyRound,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { gamesService, type LibraryState } from "@/features/games/games.service";
import { settingsService } from "@/features/settings/settings.service";
import { nativeDialogs } from "@/lib/native-dialogs";
import { metadataService } from "@/features/metadata/metadata.service";
import type { AppSettings } from "@/features/settings/settings.types";

const sections = [
  { id: "library", label: "Biblioteca", icon: FolderOpen },
  { id: "emulators", label: "Emuladores", icon: Gamepad2 },
  { id: "appearance", label: "Aparência", icon: Monitor },
  { id: "general", label: "Geral", icon: Globe2 },
];

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>();
  const [libraryState, setLibraryState] = useState<LibraryState>({ totalGames: 0 });
  const [activeSection, setActiveSection] = useState("library");
  const [saved, setSaved] = useState(false);
  const [libraryCleared, setLibraryCleared] = useState(false);
  const [isClearLibraryDialogOpen, setIsClearLibraryDialogOpen] = useState(false);
  const [rawgConfigured, setRawgConfigured] = useState(false);
  const [igdbConfigured, setIgdbConfigured] = useState(false);

  useEffect(() => {
    void settingsService.get().then(setSettings);
    void gamesService.getLibraryState().then(setLibraryState);
    void metadataService.configuration().then(({ rawg, igdb }) => {
      setRawgConfigured(rawg);
      setIgdbConfigured(igdb);
    });
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSettings(await settingsService.update(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  async function handleThemeChange(theme: AppSettings["theme"]) {
    if (!settings) return;
    setSettings({ ...settings, theme });
    setSettings(await settingsService.update({ theme }));
  }

  async function handleClearLibrary() {
    await gamesService.clear();
    setLibraryState({ totalGames: 0 });
    setIsClearLibraryDialogOpen(false);
    setLibraryCleared(true);
    window.setTimeout(() => setLibraryCleared(false), 1800);
  }

  async function handlePickLibraryFolder() {
    if (!settings) return;
    const folderPath = await nativeDialogs.pickFolder(settings.libraryFolders.PS2?.folderPath);
    if (!folderPath) return;

    setSettings({
      ...settings,
      libraryFolders: {
        ...settings.libraryFolders,
        PS2: {
          folderPath,
          recursiveScan: settings.libraryFolders.PS2?.recursiveScan ?? true,
          autoScan: settings.libraryFolders.PS2?.autoScan ?? true,
        },
      },
    });
  }

  async function handlePickPcsx2Executable() {
    if (!settings) return;
    const executablePath = await nativeDialogs.pickExecutable(settings.emulatorPaths.PS2);
    if (!executablePath) return;

    setSettings({
      ...settings,
      emulatorPaths: { ...settings.emulatorPaths, PS2: executablePath },
    });
  }

  if (!settings) return <div className="min-h-screen animate-pulse bg-white/[0.015]" />;

  return (
    <div className="min-h-screen px-5 py-7 sm:px-8 md:px-10 md:py-9 xl:px-12">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Preferências"
          title="Configurações"
          description="Ajuste emuladores e comportamento do aplicativo. Nesta versão, as preferências ficam salvas localmente no desktop."
          actions={
            <button
              onClick={() => void handleSave()}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? "Salvo" : "Salvar alterações"}
            </button>
          }
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
          <nav className="space-y-1" aria-label="Seções das configurações">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition-colors ${activeSection === id ? "bg-white/[0.07] text-white" : "text-zinc-600 hover:bg-white/[0.03] hover:text-zinc-300"}`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          <div className="min-w-0">
            {activeSection === "library" && (
              <div className="space-y-5">
                <section className="rounded-3xl border border-white/[0.075] bg-white/[0.025] p-5 sm:p-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-white">Biblioteca PS2</h2>
                      <p className="mt-1 text-xs text-zinc-600">
                        Configure a pasta monitorada para detecção automática de jogos locais.
                      </p>
                    </div>
                    <span className="rounded-lg border border-brand-300/10 bg-brand-400/[0.06] px-2.5 py-1 text-[9px] font-bold tracking-wider text-brand-200 uppercase">
                      Auto-scan
                    </span>
                  </div>

                  <div className="mt-7 space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold text-zinc-500">
                        Pasta de ISOs PS2
                      </span>
                      <div className="flex gap-2">
                        <input
                          value={settings.libraryFolders.PS2?.folderPath ?? ""}
                          onChange={(event) =>
                            setSettings({
                              ...settings,
                              libraryFolders: {
                                ...settings.libraryFolders,
                                PS2: {
                                  folderPath: event.target.value,
                                  recursiveScan: settings.libraryFolders.PS2?.recursiveScan ?? true,
                                  autoScan: settings.libraryFolders.PS2?.autoScan ?? true,
                                },
                              },
                            })
                          }
                          className="h-11 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 font-mono text-[11px] text-zinc-400 outline-none focus:border-brand-400/30"
                          placeholder="F:\ISOs PS2"
                        />
                        <button
                          type="button"
                          onClick={() => void handlePickLibraryFolder()}
                          className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-zinc-400 hover:text-white"
                        >
                          <FolderOpen size={15} />
                          Selecionar
                        </button>
                      </div>
                      <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
                        Ao abrir a Home, o Ludex escaneia essa pasta e atualiza a biblioteca local.
                      </p>
                    </label>

                    {[
                      {
                        key: "autoScan" as const,
                        title: "Detectar jogos automaticamente",
                        description: "Escaneia a pasta configurada ao abrir a biblioteca.",
                      },
                      {
                        key: "recursiveScan" as const,
                        title: "Incluir subpastas",
                        description: "Procura ISOs e imagens PS2 em toda a árvore de diretórios.",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.07] bg-black/10 p-4"
                      >
                        <span>
                          <span className="block text-xs font-semibold text-zinc-300">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-[10px] text-zinc-600">
                            {item.description}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={settings.libraryFolders.PS2?.[item.key] ?? true}
                          onChange={(event) =>
                            setSettings({
                              ...settings,
                              libraryFolders: {
                                ...settings.libraryFolders,
                                PS2: {
                                  folderPath: settings.libraryFolders.PS2?.folderPath ?? "",
                                  recursiveScan: settings.libraryFolders.PS2?.recursiveScan ?? true,
                                  autoScan: settings.libraryFolders.PS2?.autoScan ?? true,
                                  [item.key]: event.target.checked,
                                },
                              },
                            })
                          }
                          className="peer sr-only"
                        />
                        <span className="relative h-6 w-11 rounded-full bg-zinc-800 after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-zinc-400 after:transition-transform peer-checked:bg-brand-500 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-white/[0.075] bg-white/[0.025] p-5 sm:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-zinc-400">
                        <Database size={19} />
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-white">
                          Manutenção da biblioteca
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                          {libraryState.totalGames} jogos indexados no armazenamento local. Limpar
                          remove apenas o índice do Ludex; suas ISOs permanecem intactas.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsClearLibraryDialogOpen(true)}
                      disabled={libraryState.totalGames === 0}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-300/15 bg-rose-400/[0.07] px-4 text-xs font-semibold text-rose-100/80 hover:bg-rose-400/[0.11] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {libraryCleared ? <Check size={16} /> : <Trash2 size={16} />}
                      {libraryCleared ? "Biblioteca limpa" : "Limpar índice local"}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeSection === "emulators" && (
              <section className="rounded-3xl border border-white/[0.075] bg-white/[0.025] p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">Emuladores</h2>
                    <p className="mt-1 text-xs text-zinc-600">
                      Configure a pasta ou o executável usado para cada plataforma.
                    </p>
                  </div>
                  <span className="rounded-lg border border-emerald-300/10 bg-emerald-400/[0.06] px-2.5 py-1 text-[9px] font-bold tracking-wider text-emerald-300 uppercase">
                    PS2 ativo
                  </span>
                </div>
                <div className="mt-7 space-y-4">
                  <div className="rounded-2xl border border-white/[0.075] bg-black/15 p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-indigo-400/10 text-indigo-300">
                        <Gamepad2 size={18} />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-200">PCSX2</h3>
                        <p className="text-[10px] text-zinc-600">PlayStation 2 · emulador padrão</p>
                      </div>
                      <Check size={16} className="ml-auto text-emerald-400" />
                    </div>
                    <label className="mt-5 block">
                      <span className="mb-2 block text-[10px] font-semibold text-zinc-500">
                        Pasta ou executável
                      </span>
                      <div className="flex gap-2">
                        <input
                          value={settings.emulatorPaths.PS2 ?? ""}
                          onChange={(event) =>
                            setSettings({
                              ...settings,
                              emulatorPaths: { ...settings.emulatorPaths, PS2: event.target.value },
                            })
                          }
                          className="h-11 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 font-mono text-[11px] text-zinc-400 outline-none focus:border-brand-400/30"
                          placeholder="F:\PCSX2 ou F:\PCSX2\pcsx2-qt.exe"
                        />
                        <button
                          type="button"
                          onClick={() => void handlePickPcsx2Executable()}
                          className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-zinc-400 hover:text-white"
                        >
                          <FolderOpen size={15} />
                          Selecionar
                        </button>
                      </div>
                      <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
                        O Ludex valida o caminho e inicia o PCSX2 diretamente, sem shell.
                      </p>
                    </label>
                  </div>
                  <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01] p-4 opacity-50 sm:p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-white/[0.04] text-zinc-600">
                        <Gamepad2 size={18} />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-500">RPCS3</h3>
                        <p className="text-[10px] text-zinc-700">PlayStation 3 · suporte futuro</p>
                      </div>
                      <span className="ml-auto rounded bg-white/5 px-2 py-1 text-[8px] font-bold text-zinc-600 uppercase">
                        Em breve
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeSection === "appearance" && (
              <section className="rounded-3xl border border-white/[0.075] bg-white/[0.025] p-5 sm:p-7">
                <h2 className="text-base font-semibold text-white">Aparência</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Escolha o visual do launcher. A alteração é aplicada e salva imediatamente.
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <button
                    onClick={() => void handleThemeChange("dark")}
                    className={`rounded-2xl border p-4 text-left ${settings.theme === "dark" ? "border-brand-300/20 bg-brand-500/[0.07]" : "border-white/[0.07]"}`}
                  >
                    <div className="h-24 rounded-xl bg-[#08090d] p-3">
                      <div className="h-3 w-1/3 rounded bg-white/10" />
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <span className="h-12 rounded bg-white/5" />
                        <span className="h-12 rounded bg-white/5" />
                        <span className="h-12 rounded bg-white/5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-zinc-300">Escuro</p>
                  </button>
                  <button
                    onClick={() => void handleThemeChange("light")}
                    className={`rounded-2xl border p-4 text-left ${settings.theme === "light" ? "border-brand-300/20 bg-brand-500/[0.07]" : "border-white/[0.07]"}`}
                  >
                    <div className="h-24 rounded-xl border border-zinc-200 bg-[#f3f5f9] p-3">
                      <div className="h-3 w-1/3 rounded bg-zinc-300" />
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <span className="h-12 rounded border border-zinc-200 bg-white" />
                        <span className="h-12 rounded border border-zinc-200 bg-white" />
                        <span className="h-12 rounded border border-zinc-200 bg-white" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-zinc-300">Claro</p>
                  </button>
                  <button
                    onClick={() => void handleThemeChange("system")}
                    className={`rounded-2xl border p-4 text-left ${settings.theme === "system" ? "border-brand-300/20 bg-brand-500/[0.07]" : "border-white/[0.07]"}`}
                  >
                    <div className="grid h-24 grid-cols-2 overflow-hidden rounded-xl">
                      <div className="bg-[#08090d]" />
                      <div className="bg-zinc-100" />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-zinc-300">Seguir sistema</p>
                  </button>
                </div>
              </section>
            )}

            {activeSection === "general" && (
              <section className="rounded-3xl border border-white/[0.075] bg-white/[0.025] p-5 sm:p-7">
                <h2 className="text-base font-semibold text-white">Geral</h2>
                <div className="mt-6 flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-black/10 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-400/10 text-brand-300">
                    <KeyRound size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-semibold text-zinc-300">Metadados RAWG</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          rawgConfigured
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {rawgConfigured ? "Configurada" : "Chave ausente"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-600">
                      Configure <code>RAWG_API_KEY</code> no arquivo <code>.env</code> local. A
                      chave é lida apenas pelo backend Rust e não é exposta à interface.
                    </p>
                    <p className="mt-2 text-[10px] text-zinc-600">
                      IGDB/Twitch:{" "}
                      <span className={igdbConfigured ? "text-emerald-300" : "text-amber-300"}>
                        {igdbConfigured ? "configurada" : "credenciais ausentes"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-6 divide-y divide-white/[0.06]">
                  {[
                    {
                      key: "checkForUpdates" as const,
                      title: "Verificar atualizações",
                      description: "Procura novas versões ao iniciar.",
                    },
                    {
                      key: "minimizeToTray" as const,
                      title: "Minimizar para a bandeja",
                      description: "Mantém o Ludex ativo em segundo plano.",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-center justify-between py-4"
                    >
                      <span>
                        <span className="block text-xs font-semibold text-zinc-300">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-[10px] text-zinc-600">
                          {item.description}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={settings[item.key]}
                        onChange={(event) =>
                          setSettings({ ...settings, [item.key]: event.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <span className="relative h-6 w-11 rounded-full bg-zinc-800 after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-zinc-400 after:transition-transform peer-checked:bg-brand-500 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.035] p-4">
                  <ShieldCheck size={18} className="shrink-0 text-emerald-300" />
                  <p className="text-[11px] leading-relaxed text-emerald-100/55">
                    O Ludex não envia sua biblioteca ou caminhos locais para servidores externos.
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={isClearLibraryDialogOpen}
        title="Limpar índice local?"
        description="Essa ação remove apenas a biblioteca indexada no Ludex. Os arquivos originais de jogos não são apagados, movidos ou modificados."
        confirmLabel="Limpar índice"
        tone="danger"
        onCancel={() => setIsClearLibraryDialogOpen(false)}
        onConfirm={() => void handleClearLibrary()}
      />
    </div>
  );
}

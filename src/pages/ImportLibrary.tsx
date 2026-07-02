import {
  Check,
  ChevronRight,
  FileArchive,
  FolderOpen,
  Info,
  LoaderCircle,
  ScanSearch,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { scannerService } from "@/features/library-scanner/scanner.service";
import { supportedExtensions, type ScanResult } from "@/features/library-scanner/scanner.types";

export function ImportLibrary() {
  const [folderPath, setFolderPath] = useState("D:/Games/PS2");
  const [recursive, setRecursive] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult>();

  async function handleScan() {
    if (!folderPath.trim()) return;
    setIsScanning(true);
    setResult(undefined);
    const scanResult = await scannerService.preview({ folderPath, platform: "PS2", recursive });
    setResult(scanResult);
    setIsScanning(false);
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-7 sm:px-8 md:px-10 md:py-9 xl:px-12">
      <div className="pointer-events-none absolute top-[-250px] left-[10%] size-[550px] rounded-full bg-cyan-500/[0.045] blur-[120px]" />
      <div className="relative mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Biblioteca"
          title="Importar jogos"
          description="Aponte para uma pasta local. Nesta preview, a varredura é simulada e nenhum arquivo será alterado."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-3xl border border-white/[0.075] bg-white/[0.025] p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500/12 text-brand-300">
                <FolderOpen size={20} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-white">Pasta de jogos</h2>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Selecione onde seus arquivos de PS2 estão armazenados.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold text-zinc-400">
                  Caminho da pasta
                </span>
                <div className="flex gap-2">
                  <input
                    value={folderPath}
                    onChange={(event) => setFolderPath(event.target.value)}
                    className="h-12 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-brand-400/30 focus:ring-4 focus:ring-brand-500/[0.05]"
                    placeholder="D:/Games/PS2"
                  />
                  <button
                    type="button"
                    title="Seletor nativo será integrado futuramente"
                    className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white"
                  >
                    <FolderOpen size={18} />
                  </button>
                </div>
              </label>

              <div>
                <span className="mb-2 block text-[11px] font-semibold text-zinc-400">
                  Plataforma
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex h-14 items-center justify-between rounded-xl border border-brand-300/20 bg-brand-500/[0.08] px-4 text-left">
                    <span>
                      <span className="block text-sm font-semibold text-white">PlayStation 2</span>
                      <span className="mt-0.5 block text-[10px] text-zinc-500">PCSX2</span>
                    </span>
                    <Check size={16} className="text-brand-300" />
                  </button>
                  <button
                    disabled
                    className="flex h-14 cursor-not-allowed items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 text-left opacity-45"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-zinc-500">
                        PlayStation 3
                      </span>
                      <span className="mt-0.5 block text-[10px] text-zinc-700">Em breve</span>
                    </span>
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[0.07] bg-black/10 p-4">
                <span>
                  <span className="block text-xs font-semibold text-zinc-300">
                    Incluir subpastas
                  </span>
                  <span className="mt-1 block text-[10px] text-zinc-600">
                    Procura jogos em toda a árvore de diretórios.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={recursive}
                  onChange={(event) => setRecursive(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 rounded-full bg-zinc-800 transition-colors after:absolute after:top-1 after:left-1 after:size-4 after:rounded-full after:bg-zinc-400 after:transition-transform peer-checked:bg-brand-500 peer-checked:after:translate-x-5 peer-checked:after:bg-white" />
              </label>

              <button
                type="button"
                onClick={() => void handleScan()}
                disabled={isScanning || !folderPath.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-bold text-white shadow-[0_14px_35px_rgba(139,77,255,.18)] hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <LoaderCircle size={17} className="animate-spin" /> Analisando pasta...
                  </>
                ) : (
                  <>
                    <ScanSearch size={17} /> Analisar biblioteca
                  </>
                )}
              </button>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-white/[0.075] bg-white/[0.025] p-5">
              <div className="flex items-center gap-3">
                <FileArchive size={18} className="text-brand-300" />
                <h2 className="text-sm font-semibold text-white">Formatos aceitos</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {supportedExtensions.PS2.map((extension) => (
                  <span
                    key={extension}
                    className="rounded-lg border border-white/[0.07] bg-black/15 px-2.5 py-1.5 font-mono text-[10px] text-zinc-400"
                  >
                    {extension}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
                Arquivos específicos de PS1 não fazem parte do escopo do Ludex.
              </p>
            </div>
            <div className="flex gap-3 rounded-2xl border border-sky-300/10 bg-sky-300/[0.035] p-4">
              <Info size={17} className="mt-0.5 shrink-0 text-sky-300/70" />
              <p className="text-[11px] leading-relaxed text-sky-100/55">
                O Ludex apenas indexará referências. Seus arquivos originais permanecerão no local
                atual.
              </p>
            </div>
          </aside>
        </div>

        {result && (
          <section className="mt-5 rounded-3xl border border-emerald-300/10 bg-emerald-300/[0.025] p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <Check size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {result.files.length} jogos encontrados
                  </h2>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    Resultado simulado em {result.durationMilliseconds} ms · {result.ignoredCount}{" "}
                    arquivos ignorados
                  </p>
                </div>
              </div>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-zinc-950">
                Revisar importação <ChevronRight size={15} />
              </button>
            </div>
            <div className="mt-5 divide-y divide-white/[0.055] border-t border-white/[0.055]">
              {result.files.map((file) => (
                <div key={file.path} className="flex items-center justify-between py-3 text-xs">
                  <span className="truncate text-zinc-400">{file.fileName}</span>
                  <span className="ml-3 rounded bg-white/5 px-2 py-1 font-mono text-[9px] text-zinc-600">
                    {file.extension}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

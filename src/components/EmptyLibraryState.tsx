import { FolderPlus, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyLibraryStateProps {
  isSearchResult?: boolean;
}

export function EmptyLibraryState({ isSearchResult = false }: EmptyLibraryStateProps) {
  return (
    <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-white/10 bg-white/[0.018] p-8 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-zinc-500">
          <Gamepad2 size={24} />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-white">
          {isSearchResult ? "Nenhum jogo encontrado" : "Sua biblioteca está esperando"}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
          {isSearchResult
            ? "Tente outro nome, gênero ou ajuste os filtros da plataforma."
            : "Importe uma pasta com seus jogos locais de PS2 para começar a organizar a coleção."}
        </p>
        {!isSearchResult && (
          <Link
            to="/import"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(139,77,255,.2)] hover:bg-brand-400"
          >
            <FolderPlus size={17} /> Importar biblioteca
          </Link>
        )}
      </div>
    </div>
  );
}

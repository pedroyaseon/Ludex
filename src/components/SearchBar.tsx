import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Buscar na biblioteca...",
}: SearchBarProps) {
  return (
    <label className="group relative block w-full min-w-0 sm:max-w-md">
      <Search
        size={18}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-brand-300"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-white/[0.075] bg-white/[0.035] pr-11 pl-11 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-brand-400/35 focus:bg-white/[0.05] focus:ring-4 focus:ring-brand-500/[0.06]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-zinc-600 hover:bg-white/5 hover:text-white"
        >
          <X size={15} />
        </button>
      )}
    </label>
  );
}

import { Library, Plus, Settings, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { LudexLogo } from "@/components/LudexLogo";
import { cn } from "@/lib/cn";

const navigation = [
  { label: "Biblioteca", to: "/", icon: Library },
  { label: "Importar", to: "/import", icon: Plus },
  { label: "Ajustes", to: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[228px] flex-col border-r border-white/[0.065] bg-[#0b0c11]/95 px-4 py-6 backdrop-blur-xl md:flex">
        <LudexLogo className="px-2" />

        <nav className="mt-10 space-y-1.5" aria-label="Navegação principal">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]"
                    : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-lg transition-colors",
                      isActive
                        ? "bg-brand-500/15 text-brand-300"
                        : "text-zinc-600 group-hover:text-zinc-300",
                    )}
                  >
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto overflow-hidden rounded-2xl border border-brand-400/10 bg-gradient-to-br from-brand-500/[0.11] to-transparent p-4">
          <div className="mb-3 grid size-8 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
            <Sparkles size={16} />
          </div>
          <p className="text-xs font-semibold text-zinc-200">Sua coleção, do seu jeito.</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
            Local, privada e pronta para jogar.
          </p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-zinc-500 uppercase">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            PCSX2 configurado
          </div>
        </div>

        <p className="mt-4 px-2 text-[10px] text-zinc-700">Ludex Preview · v0.1.0</p>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-[#111218]/90 p-2 shadow-2xl backdrop-blur-xl md:hidden">
        {navigation.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-w-20 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium",
                isActive ? "bg-brand-500/15 text-brand-300" : "text-zinc-500",
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

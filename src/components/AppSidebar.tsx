import { Library, RefreshCw, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { LudexLogo } from "@/components/LudexLogo";
import { cn } from "@/lib/cn";

const navigation = [
  { label: "Biblioteca", to: "/", icon: Library },
  { label: "Importação manual", shortLabel: "Importar", to: "/import", icon: RefreshCw },
  { label: "Ajustes", to: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <>
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[228px] flex-col border-r border-white/[0.055] bg-[#090a0e]/95 px-4 py-6 backdrop-blur-xl md:flex">
        <LudexLogo className="px-2" />
        <nav className="mt-10 space-y-1" aria-label="Navegação principal">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/[0.07] text-white"
                    : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "text-brand-300" : "text-zinc-600"}>
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 text-[10px] text-zinc-700">Ludex Preview · v0.5.1</p>
      </aside>

      <nav className="app-mobile-nav fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-[#111218]/90 p-2 shadow-2xl backdrop-blur-xl md:hidden">
        {navigation.map(({ label, shortLabel, to, icon: Icon }) => (
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
            {shortLabel ?? label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

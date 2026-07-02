import type { ReactNode } from "react";
import { LudexLogo } from "@/components/LudexLogo";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        <LudexLogo className="mb-7 md:hidden" />
        {eyebrow && (
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-brand-300 uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-[-0.045em] text-white md:text-[38px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}

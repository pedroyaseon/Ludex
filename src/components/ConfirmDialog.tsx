import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="theme-surface-strong w-full max-w-md rounded-3xl border border-white/[0.09] bg-[#111218] p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${
              tone === "danger"
                ? "bg-rose-400/[0.10] text-rose-300"
                : "bg-brand-400/[0.10] text-brand-300"
            }`}
          >
            <AlertTriangle size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">{description}</p>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-xs font-semibold text-zinc-400 hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-10 rounded-xl px-4 text-xs font-bold ${
              tone === "danger"
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "bg-white text-zinc-950 hover:bg-zinc-200"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

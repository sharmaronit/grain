import type { LucideIcon } from "lucide-react";

export function GrainState({ icon: Icon, eyebrow, title, description, action, className = "" }: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div className={`grain-state flex flex-col items-center justify-center rounded-[28px] px-6 py-10 text-center ${className}`}>
      <div className="grain-state-icon mb-6 grid h-16 w-16 place-items-center rounded-full" aria-hidden="true">
        <Icon className="h-6 w-6 text-ink" strokeWidth={1.6} />
      </div>
      {eyebrow && <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-mute">{eyebrow}</p>}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-3 max-w-[260px] text-[13px] leading-relaxed text-body">{description}</p>
      {action && <button type="button" data-lg-press onClick={action.onClick} className="grain-state-action mt-7 min-h-11 rounded-full px-6 py-3 text-xs font-semibold text-ink transition active:scale-95">{action.label}</button>}
    </div>
  );
}

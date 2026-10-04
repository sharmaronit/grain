import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { SettingsToggle } from "./SettingsToggle";

export function FeatureSettingsCard({
  id,
  title,
  description,
  enabled,
  onToggle,
  setupLabel,
  summary,
  children,
}: {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  setupLabel: string;
  summary: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const expanded = enabled && open;
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="settings-glass rounded-3xl overflow-hidden divide-y divide-[color:var(--hairline)]"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h3 id={`${id}-heading`} className="text-sm font-medium text-ink">
            {title}
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-mute">{description}</p>
        </div>
        <SettingsToggle
          checked={enabled}
          ariaLabel={`Enable ${title}`}
          onChange={() => {
            if (enabled) setOpen(false);
            onToggle();
          }}
        />
      </div>
      {enabled && (
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-xs focus-visible:outline-offset-[-3px]"
          aria-expanded={expanded}
          aria-controls={expanded ? `${id}-controls` : undefined}
          onClick={() => setOpen(!open)}
        >
          <span className="text-body">{setupLabel}</span>
          <span className="flex items-center gap-2 text-mute">
            {summary}
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      )}
      {expanded && (
        <div id={`${id}-controls`} className="space-y-3 px-4 py-3">
          {children}
        </div>
      )}
    </section>
  );
}

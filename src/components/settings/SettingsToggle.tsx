export function SettingsToggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-lg-press
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ink/30 ${
        checked ? "bg-ink border-ink" : "bg-canvas border-[color:var(--hairline)]"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 rounded-full shadow-sm transition-all duration-200 ${
          checked ? "translate-x-[22px] bg-on-ink" : "translate-x-[3px] bg-ink"
        }`}
      />
    </button>
  );
}

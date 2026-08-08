import { useState } from "react";
import { X } from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-body">{label}</label>
      {children}
    </div>
  );
}

export function ProfileEditSheet({
  profile,
  onClose,
  onSave,
}: {
  profile: { name: string; tagline: string; initials: string };
  onClose: () => void;
  onSave: (next: { name: string; tagline: string; initials: string }) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [tagline, setTagline] = useState(profile.tagline);
  const [initials, setInitials] = useState(profile.initials);
  const [initialsTouched, setInitialsTouched] = useState(false);

  const derivedInitials = (name || "U")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const effectiveInitials = (initialsTouched ? initials : derivedInitials).slice(0, 2).toUpperCase() || "U";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] rounded-3xl bg-white/5 backdrop-blur-[40px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.3)] text-white p-6 shadow-2xl animate-fade-in-up flex flex-col border border-[color:var(--hairline-mid)]"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Edit profile</h2>
            <p className="text-[11px] font-medium text-mute mt-1">Update how you show up in the app</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] text-ink transition hover:bg-[color:var(--surface-pressed)] active:scale-95"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] p-4 border border-white/10">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10 backdrop-blur-[40px] border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.25)] text-white font-display text-lg font-bold">
              {effectiveInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold text-ink">{name || "Your name"}</p>
              <p className="truncate text-xs text-body mt-0.5">{tagline || "Your tagline"}</p>
            </div>
          </div>

          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-2xl bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] px-4 py-3.5 text-sm font-medium text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)] focus:ring-2 focus:ring-ink transition-all"
            />
          </Field>

          <Field label="Tagline">
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short line about you"
              maxLength={80}
              className="w-full rounded-2xl bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] px-4 py-3.5 text-sm font-medium text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)] focus:ring-2 focus:ring-ink transition-all"
            />
          </Field>

          <Field label="Avatar initials">
            <input
              value={initialsTouched ? initials : derivedInitials}
              onChange={(e) => {
                setInitialsTouched(true);
                setInitials(e.target.value.slice(0, 2));
              }}
              placeholder="e.g. JD"
              maxLength={2}
              className="w-full rounded-2xl bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] px-4 py-3.5 text-sm font-medium uppercase tracking-wider text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)] focus:ring-2 focus:ring-ink transition-all"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              data-lg-press
              onClick={onClose}
              className="pill w-full border-2 border-[color:var(--hairline-mid)] bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] py-3 text-xs font-bold text-ink hover:bg-[color:var(--surface-pressed)] transition-all"
            >
              Cancel
            </button>
            <button
              data-lg-press
              onClick={() =>
                onSave({
                  name: name.trim() || "You",
                  tagline: tagline.trim() || profile.tagline,
                  initials: effectiveInitials,
                })
              }
              className="pill w-full bg-white/10 backdrop-blur-[40px] border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] py-3 text-xs font-bold text-on-ink shadow-lg shadow-black/20 hover:scale-[0.98] transition-all"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { SheetShell } from "../SheetShell";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-body">{label}</label>
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
    <SheetShell onClose={onClose} title="Edit profile" subtitle="Update how you show up in the app">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-canvas-soft p-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-ink text-on-ink font-display text-lg font-bold">
            {effectiveInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink">{name || "Your name"}</p>
            <p className="truncate text-[11px] text-body">{tagline || "Your tagline"}</p>
          </div>
        </div>

        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <Field label="Tagline">
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A short line about you"
            maxLength={80}
            className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <Field label="Avatar initials (1–2 letters)">
          <input
            value={initialsTouched ? initials : derivedInitials}
            onChange={(e) => {
              setInitialsTouched(true);
              setInitials(e.target.value.slice(0, 2));
            }}
            placeholder="e.g. JD"
            maxLength={2}
            className="w-32 rounded-2xl bg-canvas-soft px-4 py-3 text-sm uppercase tracking-wider text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            data-lg-press
            onClick={onClose}
            className="pill w-full border border-[color:var(--hairline)] bg-canvas-soft py-3 text-sm font-semibold text-ink"
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
            className="btn-primary-uber w-full py-3 text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </SheetShell>
  );
}

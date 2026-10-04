import { memo, useCallback, useState, type RefObject } from "react";

const CATEGORIES = ["Mind", "Health", "Growth", "Focus", "Fitness", "Admin"];

export const HabitCategoryPicker = memo(function HabitCategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (category: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={value === category}
          onClick={() => onChange(category)}
          className="habit-category-option pill px-3 py-1.5 text-[11px] font-medium"
        >
          {category}
        </button>
      ))}
    </div>
  );
});

// Keep taps local to this field. The draft ref survives sheet dismissal and is
// read on save, without rerendering the dashboard behind the blurred sheet.
export const HabitCategoryDraftPicker = memo(function HabitCategoryDraftPicker({
  draft,
}: {
  draft: RefObject<string>;
}) {
  const [category, setCategory] = useState(draft.current);
  const choose = useCallback(
    (next: string) => {
      draft.current = next;
      setCategory(next);
    },
    [draft],
  );
  return <HabitCategoryPicker value={category} onChange={choose} />;
});

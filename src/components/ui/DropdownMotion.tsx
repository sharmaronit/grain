import { useEffect, useState, type ReactNode } from "react";

type DropdownMotionProps = {
  open: boolean;
  className?: string;
  children: ReactNode;
};

/** Keeps a menu mounted briefly so its close animation can finish. */
export function DropdownMotion({ open, className = "", children }: DropdownMotionProps) {
  const [present, setPresent] = useState(open);

  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }

    const timer = window.setTimeout(() => setPresent(false), 300);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!present) return null;

  return (
    <div
      className={`grain-dropdown-motion ${open ? "grain-dropdown-motion--open" : "grain-dropdown-motion--closed pointer-events-none"} ${className}`}
      aria-hidden={!open}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";

/** Animate intrinsic content height while keeping collapsed controls inaccessible. */
export function CollapseMotion({ open, id, className = "", children }: {
  open: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className={`grain-collapse ${open ? "grain-collapse--open" : ""} ${className}`}
      inert={!open} aria-hidden={!open}>
      <div className="grain-collapse-inner">{children}</div>
    </div>
  );
}

interface DismissibleOverlay {
  close: (afterClose?: () => void) => void;
  owner: () => () => void;
  priority: number;
}

const overlays: DismissibleOverlay[] = [];
const topOverlay = () =>
  overlays.reduce<DismissibleOverlay | undefined>(
    (top, overlay) => (!top || overlay.priority >= top.priority ? overlay : top),
    undefined,
  );

export function dismissTopOverlay(): boolean {
  const overlay = topOverlay();
  if (!overlay) return false;
  overlay.close();
  return true;
}

export function requestOverlayClose(onClose: () => void, afterClose?: () => void): void {
  const overlay = [...overlays].reverse().find((item) => item.owner() === onClose);
  if (overlay) overlay.close(afterClose);
  else {
    onClose();
    afterClose?.();
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented || !topOverlay()) return;
  event.preventDefault();
  dismissTopOverlay();
}

export function registerOverlayDismissal(overlay: DismissibleOverlay): () => void {
  if (overlays.length === 0 && typeof document !== "undefined")
    document.addEventListener("keydown", onKeyDown);
  overlays.push(overlay);
  return () => {
    const index = overlays.indexOf(overlay);
    if (index >= 0) overlays.splice(index, 1);
    if (overlays.length === 0 && typeof document !== "undefined")
      document.removeEventListener("keydown", onKeyDown);
  };
}

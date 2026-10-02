import { useSyncExternalStore } from "react";

export type SyncPhase = "saved" | "syncing" | "failed";

interface SyncSnapshot {
  pending: number;
  failed: number;
  lastSyncedAt: number | null;
}

let snapshot: SyncSnapshot = { pending: 0, failed: 0, lastSyncedAt: null };
const listeners = new Set<() => void>();
const failedWrites = new Map<number, () => Promise<unknown>>();
let writeId = 0;

function emit(next: Partial<SyncSnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

export async function runTrackedWrite<T>(operation: () => Promise<T>): Promise<T | undefined> {
  const id = ++writeId;
  emit({ pending: snapshot.pending + 1 });

  const completion = operation().then(
    (value) => {
      failedWrites.delete(id);
      emit({ pending: Math.max(0, snapshot.pending - 1), failed: failedWrites.size, lastSyncedAt: Date.now() });
      return value;
    },
    (error) => {
      failedWrites.set(id, operation);
      emit({ pending: Math.max(0, snapshot.pending - 1), failed: failedWrites.size });
      throw error;
    },
  );

  // Firestore applies the mutation to its persistent local cache immediately,
  // while this promise waits for server acknowledgement. Never make the form
  // wait for that round trip; the global sync indicator owns confirmation and
  // retry feedback.
  void completion.catch(() => undefined);
  return undefined;
}

export function retryFailedWrites(): void {
  const operations = Array.from(failedWrites.values());
  failedWrites.clear();
  emit({ failed: 0 });
  operations.forEach((operation) => {
    void runTrackedWrite(operation).catch(() => undefined);
  });
}

export function useSyncStatus(): SyncSnapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => snapshot,
  );
}

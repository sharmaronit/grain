import { useState, useEffect } from "react";
import type { GoalDoc } from "../lib/firestore";
import { usePageVisible } from "./usePageVisible";
import { readLocalData, subscribeLocalData } from "../lib/local-data";

interface UseGoalsResult {
  goals: GoalDoc[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

export function useGoals(userId: string | null): UseGoalsResult {
  const pageVisible = usePageVisible();
  const [goals, setGoals] = useState<GoalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!userId) {
      setGoals([]);
      setLoading(false);
      return;
    }
    if (!pageVisible) return;

    setLoading(true);
    setError(null);

    const refresh = () => {
      try {
        const fetchedGoals = readLocalData(userId).goals.slice();
        fetchedGoals.sort((a, b) => {
          const timeA = a.createdAt?.getTime() || 0;
          const timeB = b.createdAt?.getTime() || 0;
          return timeB - timeA;
        });
        setGoals(fetchedGoals);
        setError(null);
      } catch (error) {
        setError(error instanceof Error ? error : new Error("Goals could not be read"));
      }
        setLoading(false);
    };
    refresh();
    return subscribeLocalData(userId, refresh);
  }, [userId, pageVisible, retryNonce]);

  return { goals, loading, error, retry: () => setRetryNonce((value) => value + 1) };
}

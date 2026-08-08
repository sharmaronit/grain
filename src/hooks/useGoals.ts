import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { goalFromDoc, type GoalDoc } from "../lib/firestore";

interface UseGoalsResult {
  goals: GoalDoc[];
  loading: boolean;
  error: Error | null;
}

export function useGoals(userId: string | null): UseGoalsResult {
  console.log("[useGoals hook] called with userId:", userId);
  const [goals, setGoals] = useState<GoalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log("[useGoals hook] useEffect running for userId:", userId);
    if (!userId) {
      console.log("[useGoals hook] userId is null, clearing goals");
      setGoals([]);
      setLoading(false);
      return;
    }

    console.log("[useGoals hook] creating query for userId:", userId);
    const q = query(
      collection(db(), "users", userId, "goals")
    );

    console.log("[useGoals hook] attaching onSnapshot...");
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        console.log("[useGoals] SNAPSHOT RECEIVED. Document count:", snap.docs.length);
        const fetchedGoals = snap.docs.map((doc) => {
          const data = doc.data();
          console.log("[useGoals] Doc data:", doc.id, data);
          return goalFromDoc(data, doc.id);
        });
        
        console.log("[useGoals] Parsed goals before sort:", fetchedGoals);
        
        // Sort in memory to include items with pending serverTimestamp (which might evaluate to null or 0)
        fetchedGoals.sort((a, b) => {
          const timeA = a.createdAt?.getTime() || 0;
          const timeB = b.createdAt?.getTime() || 0;
          return timeB - timeA;
        });
        
        console.log("[useGoals] Goals after sort, setting state:", fetchedGoals);
        setGoals(fetchedGoals);
        setLoading(false);
      },
      (err) => {
        console.error("[useGoals] snapshot error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { goals, loading, error };
}

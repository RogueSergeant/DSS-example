/**
 * Generic data-fetching hook for JSON files in public/data/.
 * Returns { data, loading, error } with typed output.
 */

import { useState, useEffect } from 'react';

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useData<T>(path: string): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d: T) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, loading, error };
}

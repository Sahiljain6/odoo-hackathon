import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

// usage: const { data, loading, error, refetch } = useFetch('/vehicles');
export function useFetch(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(path);
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: load };
}

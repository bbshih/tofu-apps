import { useState, useEffect } from 'react';
import type { Poll } from '@seacalendar/shared';

interface UsePollResult {
  poll: Poll | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePoll(pollId: string | undefined): UsePollResult {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoll = async () => {
    if (!pollId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/polls/${pollId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Poll not found');
        }
        throw new Error('Failed to load poll');
      }

      const data = await response.json();
      setPoll(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPoll(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [pollId]);

  return { poll, loading, error, refetch: fetchPoll };
}

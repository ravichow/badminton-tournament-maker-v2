import { TournamentState, PredefinedRoster } from '../types/tournament';
import { getLocalTournaments } from '../initialData';

export async function syncTournamentState(tournamentId: string, state: TournamentState): Promise<void> {
  // Always update local storage first for instant offline responsiveness
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`smashops_state_${tournamentId}`, JSON.stringify(state));
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync', tournament: state }),
    });
    if (!res.ok) {
      console.warn('D1 sync returned status:', res.status);
    }
  } catch (error) {
    console.warn('Could not sync tournament to Cloudflare D1 (operating offline):', error);
  }
}

export function subscribeTournament(
  tournamentId: string,
  callback: (data: TournamentState | null) => void
): () => void {
  let isActive = true;

  const check = async () => {
    try {
      const res = await fetch(`/api/tournaments?id=${encodeURIComponent(tournamentId)}`);
      if (!isActive) return;
      if (res.status === 404) {
        callback(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (isActive && data && data.tournament) {
          callback(data.tournament);
        }
      }
    } catch (e) {
      // Offline fallback: check local storage
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`smashops_state_${tournamentId}`);
        if (saved) {
          try {
            callback(JSON.parse(saved));
          } catch (err) {}
        }
      }
    }
  };

  // Immediate check
  check();

  // Poll every 4 seconds for live court and score updates
  const interval = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      check();
    }
  }, 4000);

  return () => {
    isActive = false;
    clearInterval(interval);
  };
}

export async function deleteTournamentFromD1(tournamentId: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`smashops_state_${tournamentId}`);
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: tournamentId }),
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to delete tournament from Cloudflare D1:', e);
    return false;
  }
}

export async function fetchAllTournaments(): Promise<TournamentState[]> {
  const localList = getLocalTournaments();

  try {
    const res = await fetch('/api/tournaments');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.tournaments)) {
        const cloudTournaments = data.tournaments as TournamentState[];
        const cloudIds = new Set(cloudTournaments.map((t) => t.id));

        // Purge deleted/stale tournaments from device localStorage so they don't ghost
        if (typeof window !== 'undefined') {
          localList.forEach((lt) => {
            if (!cloudIds.has(lt.id)) {
              try {
                localStorage.removeItem(`smashops_state_${lt.id}`);
              } catch (e) {}
            }
          });
        }

        return cloudTournaments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      }
    }
  } catch (e) {
    console.warn('Could not fetch tournament archives from Cloudflare D1:', e);
  }

  // Offline fallback to device localStorage
  return localList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function cleanDraftsFromD1(currentId: string): Promise<number> {
  try {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clean_drafts', currentId }),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.deletedCount || 0;
    }
  } catch (e) {
    console.error('Failed to clean drafts in D1:', e);
  }
  return 0;
}

export async function fetchPredefinedRoster(): Promise<PredefinedRoster | null> {
  try {
    const res = await fetch('/api/roster');
    if (res.ok) {
      const data = await res.json();
      if (data && data.roster && Array.isArray(data.roster.teams) && Array.isArray(data.roster.players)) {
        return data.roster as PredefinedRoster;
      }
    }
  } catch (e) {
    console.warn('Could not fetch predefined roster from D1:', e);
  }
  return null;
}

export async function syncPredefinedRoster(roster: PredefinedRoster): Promise<void> {
  try {
    await fetch('/api/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roster),
    });
  } catch (e) {
    console.error('Failed to sync predefined roster to D1:', e);
  }
}

export function subscribePredefinedRoster(callback: (data: PredefinedRoster | null) => void): () => void {
  let isActive = true;

  const check = async () => {
    const remote = await fetchPredefinedRoster();
    if (isActive && remote) {
      callback(remote);
    }
  };

  // Immediate check
  check();

  // Periodic poll every 10 seconds
  const interval = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      check();
    }
  }, 10000);

  return () => {
    isActive = false;
    clearInterval(interval);
  };
}

export function isD1Configured(): boolean {
  return true;
}

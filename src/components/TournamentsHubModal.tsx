import React, { useState, useEffect } from 'react';
import { TournamentState } from '../types/tournament';
import { fetchAllTournaments, deleteTournamentFromD1 } from '../services/api';

interface HubProps {
  currentTournament: TournamentState;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onSelectTournament: (id: string) => void;
  onDeleteCurrentTournament: (id: string) => void;
  onCreateUpcoming: (name: string, date: string) => void;
}

export const TournamentsHubModal: React.FC<HubProps> = ({
  currentTournament,
  isOpen,
  isAdmin,
  onClose,
  onSelectTournament,
  onDeleteCurrentTournament,
  onCreateUpcoming,
}) => {
  const [tournaments, setTournaments] = useState<TournamentState[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showScheduleForm, setShowScheduleForm] = useState<boolean>(false);
  const [upcomingName, setUpcomingName] = useState<string>('');
  const [upcomingDate, setUpcomingDate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchAllTournaments()
        .then((list) => {
          setTournaments(list);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upcomingName || !upcomingDate) {
      alert('Please provide both tournament name and date.');
      return;
    }
    onCreateUpcoming(upcomingName, upcomingDate);
    setUpcomingName('');
    setUpcomingDate('');
    setShowScheduleForm(false);
    fetchAllTournaments().then(setTournaments);
  };

  const handleCleanOldTournaments = async () => {
    if (!confirm('Clean up old tournaments and keep only the latest 3 in database?')) return;
    setLoading(true);
    try {
      const list = await fetchAllTournaments();
      if (list.length > 3) {
        const toDelete = list.slice(3);
        for (const t of toDelete) {
          await deleteTournamentFromD1(t.id);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(`smashops_state_${t.id}`);
            } catch (e) {}
          }
        }
        const remaining = await fetchAllTournaments();
        setTournaments(remaining);
        alert(`Cleaned up ${toDelete.length} old tournaments! Showing latest 3.`);
      } else {
        alert('Database already contains 3 or fewer tournaments.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanInactiveDrafts = async () => {
    try {
      setLoading(true);
      const list = await fetchAllTournaments();
      const emptyDrafts = list.filter((t) => {
        if (t.id === currentTournament.id) return false;
        const matches = Object.values(t.matches || {});
        const hasCompletedMatch = matches.some((m) => m && m.isComplete);
        return !hasCompletedMatch;
      });

      if (emptyDrafts.length === 0) {
        alert('No empty draft tournaments found (all other tournaments have completed matches).');
        return;
      }

      if (!confirm(`Found ${emptyDrafts.length} empty draft tournament(s) with 0 completed matches.\nPermanently delete them from cloud database?`)) {
        return;
      }

      for (const t of emptyDrafts) {
        await deleteTournamentFromD1(t.id);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`smashops_state_${t.id}`);
          } catch (e) {}
        }
      }

      const remaining = await fetchAllTournaments();
      setTournaments(remaining);
      alert(`Cleaned up ${emptyDrafts.length} empty draft tournament(s)!`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (tId: string, tName: string) => {
    if (!confirm(`Are you sure you want to permanently delete tournament "${tName}"?\n\nAll recorded matches, scores, and standings will be erased.`)) {
      return;
    }
    setLoading(true);
    try {
      await deleteTournamentFromD1(tId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`smashops_state_${tId}`);
        } catch (e) {}
      }
      const updated = await fetchAllTournaments();
      setTournaments(updated);
      if (tId === currentTournament.id) {
        onDeleteCurrentTournament(tId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl border border-courtborder bg-surface p-6 text-ink shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto transition-colors duration-200">
        <div className="flex justify-between items-center border-b border-courtborder pb-3">
          <h3 className="text-base font-black text-brand">🏆 Tournaments Hub & Scouting</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink-muted hover:text-ink flex items-center justify-center text-xs font-bold transition"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-ink-muted">
          Switch between active tournaments, scout past archives, or schedule upcoming games.
        </p>

        {isAdmin && (
          <div className="bg-app p-4 rounded-2xl border border-courtborder space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <span className="text-xs font-bold text-brand">⚡ Organizer Action</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanInactiveDrafts}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black border border-amber-500/30 transition shadow-xs"
                  title="Purge tournaments with 0 completed matches"
                >
                  🧹 Purge Drafts
                </button>
                <button
                  type="button"
                  onClick={handleCleanOldTournaments}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black border border-rose-500/30 transition shadow-xs"
                  title="Purge old tournaments and keep only the latest 3"
                >
                  🧹 Keep Latest 3
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(!showScheduleForm)}
                  className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-ink border border-courtborder shadow-xs transition"
                >
                  {showScheduleForm ? 'Cancel' : '📅 Schedule Upcoming'}
                </button>
              </div>
            </div>

            {showScheduleForm && (
              <form onSubmit={handleScheduleSubmit} className="space-y-3 pt-2 border-t border-courtborder">
                <input
                  type="text"
                  placeholder="Tournament Name..."
                  value={upcomingName}
                  onChange={(e) => setUpcomingName(e.target.value)}
                  className="w-full bg-surface border border-courtborder rounded-xl p-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand font-semibold"
                />
                <input
                  type="date"
                  value={upcomingDate}
                  onChange={(e) => setUpcomingDate(e.target.value)}
                  className="w-full bg-surface border border-courtborder rounded-xl p-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand font-semibold"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand hover:bg-brand-hover text-brand-text text-xs font-black rounded-xl shadow transition"
                >
                  Save Upcoming Tournament
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tournament List */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Available Tournaments</span>
          {loading ? (
            <div className="py-8 text-center text-xs text-ink-muted font-medium">Loading tournaments from cloud...</div>
          ) : tournaments.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-muted font-medium">No archived tournaments found in cloud. Current tournament is active.</div>
          ) : (
            tournaments.map((t) => {
              const isCurrent = t.id === currentTournament.id;
              const dateStr = new Date(t.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              const matches = Object.values(t.matches || {});
              const completedCount = matches.filter((m) => m && m.isComplete).length;

              return (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                    isCurrent
                      ? 'bg-brand/10 border-brand/50 shadow-xs'
                      : 'bg-app border-courtborder hover:bg-surface'
                  }`}
                >
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-ink truncate">{t.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] bg-brand text-brand-text font-black px-2 py-0.5 rounded-full shadow-xs">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-ink-muted block mt-0.5 font-medium">
                      {dateStr} • {Object.keys(t.teams || {}).length} Teams • {completedCount}/{matches.length} Matches • <strong className="text-brand uppercase">{t.currentStage}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isCurrent && (
                      <button
                        onClick={() => {
                          onSelectTournament(t.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-ink border border-courtborder shadow-xs transition"
                      >
                        Switch
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteItem(t.id, t.name)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30 transition shadow-xs"
                        title={`Delete tournament "${t.name}"`}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

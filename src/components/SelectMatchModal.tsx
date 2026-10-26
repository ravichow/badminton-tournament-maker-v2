import React, { useState, useEffect, useMemo } from 'react';
import { Match, Team, Player, Court } from '../types/tournament';
import { getTeamPlayerNames, getMatchCourtConflict } from '../utils/engine';
import { MatchStageBadge } from './MatchStageBadge';

interface SelectMatchModalProps {
  courtName: string;
  courtId: string;
  isOpen: boolean;
  matches: Match[];
  courts: Record<string, Court>;
  allMatches: Record<string, Match>;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  onClose: () => void;
  onDispatch: (matchId: string, courtId: string) => void;
}

export const SelectMatchModal: React.FC<SelectMatchModalProps> = ({
  courtName,
  courtId,
  isOpen,
  matches,
  courts,
  allMatches,
  teams,
  players,
  onClose,
  onDispatch,
}) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  // Evaluate conflict status for all matches
  const evaluatedMatches = useMemo(() => {
    return matches.map((m) => {
      const conflict = getMatchCourtConflict(m, courts, allMatches, teams, players, courtId);
      return {
        match: m,
        conflict,
        isReady: !conflict,
      };
    });
  }, [matches, courts, allMatches, teams, players, courtId]);

  const readyMatches = useMemo(() => evaluatedMatches.filter((item) => item.isReady), [evaluatedMatches]);
  const busyMatches = useMemo(() => evaluatedMatches.filter((item) => !item.isReady), [evaluatedMatches]);

  // Whenever modal opens or ready matches change, auto-select the first conflict-free match
  useEffect(() => {
    if (isOpen) {
      if (readyMatches.length > 0) {
        setSelectedMatchId(readyMatches[0].match.id);
      } else {
        setSelectedMatchId('');
      }
    }
  }, [isOpen, readyMatches]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!selectedMatchId) return;

    const candidate = matches.find((m) => m.id === selectedMatchId);
    const conflict = getMatchCourtConflict(candidate, courts, allMatches, teams, players, courtId);
    if (conflict) {
      alert(`Cannot send to court:\n${conflict}. Please wait for their match to finish.`);
      return;
    }

    onDispatch(selectedMatchId, courtId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-courtborder bg-surface p-5 text-ink shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-courtborder pb-3 mb-3">
          <div>
            <h3 className="text-base font-extrabold text-ink">Select Match for {courtName}</h3>
            <p className="text-xs text-ink-muted">Choose a waiting match to dispatch to this court</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-ink flex items-center justify-center text-xs font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Readiness Summary Banner */}
        <div className="mb-3">
          {readyMatches.length > 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong>{readyMatches.length} match{readyMatches.length === 1 ? '' : 'es'}</strong> ready to play immediately with no court conflicts.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-medium">
              <span>⏳</span>
              <span>All remaining teams are currently playing on other courts. Next match will unlock when they finish.</span>
            </div>
          )}
        </div>

        {/* List of matches (Ready first, then Busy) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {matches.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-muted italic">
              No matches currently waiting in the queue.
            </div>
          ) : (
            <>
              {/* SECTION 1: Ready to Play Now */}
              {readyMatches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-1">
                    <span>🟢 Ready to Play Now ({readyMatches.length})</span>
                    <span className="font-normal text-[10px] text-ink-muted">No wait needed</span>
                  </div>

                  {readyMatches.map(({ match: m }) => {
                    const isSelected = selectedMatchId === m.id;
                    const t1 = m.team1Id ? teams[m.team1Id] : null;
                    const t2 = m.team2Id ? teams[m.team2Id] : null;
                    const t1Lineup = getTeamPlayerNames(t1, players);
                    const t2Lineup = getTeamPlayerNames(t2, players);

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMatchId(m.id)}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-brand bg-brand/10 ring-2 ring-brand/40 shadow-sm'
                            : 'border-courtborder bg-surface hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <input
                            type="radio"
                            name="selected_match"
                            checked={isSelected}
                            onChange={() => setSelectedMatchId(m.id)}
                            className="w-4 h-4 text-brand focus:ring-0 cursor-pointer"
                          />
                          <div className="truncate">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <MatchStageBadge stage={m.stage} stageIdentifier={m.stageIdentifier} size="sm" />
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                                Ready Now
                              </span>
                            </div>

                            <span className="text-xs font-bold block truncate text-ink">
                              {t1?.name || 'TBD'} vs {t2?.name || 'TBD'}
                            </span>
                            <span className="text-[11px] text-ink-muted block truncate mt-0.5">
                              👤 {t1Lineup} vs {t2Lineup}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-sm font-black text-brand shrink-0">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION 2: Busy on Other Courts */}
              {busyMatches.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-courtborder/60">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1">
                    <span>⏳ Busy on Another Court ({busyMatches.length})</span>
                    <span className="font-normal text-[10px] text-ink-muted">Unlocks when match finishes</span>
                  </div>

                  {busyMatches.map(({ match: m, conflict }) => {
                    const t1 = m.team1Id ? teams[m.team1Id] : null;
                    const t2 = m.team2Id ? teams[m.team2Id] : null;
                    const t1Lineup = getTeamPlayerNames(t1, players);
                    const t2Lineup = getTeamPlayerNames(t2, players);

                    return (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 opacity-60 flex items-center justify-between gap-3 cursor-not-allowed"
                        title={`${conflict}. Please wait for match to finish.`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <input
                            type="radio"
                            name="selected_match"
                            disabled
                            className="w-4 h-4 opacity-30 cursor-not-allowed"
                          />
                          <div className="truncate">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <MatchStageBadge stage={m.stage} stageIdentifier={m.stageIdentifier} size="sm" />
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded truncate">
                                ⏳ {conflict}
                              </span>
                            </div>

                            <span className="text-xs font-bold block truncate text-ink-muted">
                              {t1?.name || 'TBD'} vs {t2?.name || 'TBD'}
                            </span>
                            <span className="text-[11px] text-ink-muted block truncate mt-0.5">
                              👤 {t1Lineup} vs {t2Lineup}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0 uppercase tracking-wider">
                          In Play
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="border-t border-courtborder pt-3 mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-ink border border-courtborder transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!selectedMatchId || readyMatches.every((r) => r.match.id !== selectedMatchId)}
            className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-text text-xs font-black shadow-lg transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🚀 Send to {courtName}
          </button>
        </div>
      </div>
    </div>
  );
};

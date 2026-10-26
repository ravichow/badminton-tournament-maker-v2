import React from 'react';
import { Court, Match, Team, Player } from '../types/tournament';
import { getTeamPlayerNames, getMatchCourtConflict } from '../utils/engine';
import { MatchStageBadge } from './MatchStageBadge';

interface CourtCardProps {
  court: Court;
  currentMatch: Match | null;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  isAdmin: boolean;
  isTournamentEnded: boolean;
  onEnterScore: (match: Match) => void;
  onOpenDispatch: (court: Court) => void;
  onInspectTeam: (teamId: string) => void;
  courts?: Record<string, Court>;
  allMatches?: Record<string, Match>;
  waitingMatches?: Match[];
  onQuickDispatch?: (matchId: string, courtId: string) => void;
}

export const CourtCard: React.FC<CourtCardProps> = ({
  court,
  currentMatch,
  teams,
  players,
  isAdmin,
  isTournamentEnded,
  onEnterScore,
  onOpenDispatch,
  onInspectTeam,
  courts = {},
  allMatches = {},
  waitingMatches = [],
  onQuickDispatch,
}) => {
  const isLive = Boolean(currentMatch && !currentMatch.isComplete);
  const t1 = (currentMatch?.team1Id && teams) ? teams[currentMatch.team1Id] : null;
  const t2 = (currentMatch?.team2Id && teams) ? teams[currentMatch.team2Id] : null;

  const t1Players = getTeamPlayerNames(t1, players);
  const t2Players = getTeamPlayerNames(t2, players);

  // If court is vacant, find the first match with zero conflicts
  const firstReadyMatch = !isLive && waitingMatches.length > 0
    ? waitingMatches.find(m => !getMatchCourtConflict(m, courts, allMatches, teams, players, court.id))
    : null;

  const readyT1 = firstReadyMatch?.team1Id ? teams[firstReadyMatch.team1Id] : null;
  const readyT2 = firstReadyMatch?.team2Id ? teams[firstReadyMatch.team2Id] : null;

  return (
    <div className={`rounded-3xl border p-4 sm:p-5 shadow-lg flex flex-col justify-between transition-all ${
      isLive
        ? 'bg-surface border-alert/40 dark:border-alert/50 shadow-alert/5'
        : firstReadyMatch
        ? 'bg-surface border-emerald-500/30 dark:border-emerald-500/40 shadow-emerald-500/5'
        : 'bg-surface border-slate-200 dark:border-slate-800'
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg sm:text-xl font-black text-ink-heading court-header-name">{court.name}</span>
            {currentMatch ? (
              <MatchStageBadge stage={currentMatch.stage} stageIdentifier={currentMatch.stageIdentifier} size="sm" />
            ) : firstReadyMatch ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Available</span>
            ) : (
              <span className="text-[11px] font-bold text-ink-muted">Available</span>
            )}
          </div>

          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-alert text-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              LIVE
            </span>
          ) : firstReadyMatch ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              READY
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-surface-soft text-brand border border-brand/20">
              WAITING
            </span>
          )}
        </div>

        {/* Match Board */}
        {currentMatch ? (
          <div className="space-y-2.5 my-2">
            {/* Team 1 Card */}
            <div 
              onClick={() => t1 && onInspectTeam(t1.id)}
              className="flex items-center justify-between p-3 rounded-2xl bg-surface-soft border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-brand transition"
            >
              <div className="truncate pr-2">
                <span className="font-black text-base sm:text-lg text-ink-heading block truncate court-team-title">
                  {t1?.name || 'TBD'}
                </span>
                <span className="text-xs sm:text-sm text-ink-muted font-semibold block truncate mt-0.5 court-players-sub">
                  👤 {t1Players}
                </span>
              </div>
              <span className="text-4xl sm:text-5xl font-black font-mono text-brand shrink-0 court-score-val tracking-tight">
                {currentMatch.score1}
              </span>
            </div>

            {/* Team 2 Card */}
            <div 
              onClick={() => t2 && onInspectTeam(t2.id)}
              className="flex items-center justify-between p-3 rounded-2xl bg-surface-soft border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-brand transition"
            >
              <div className="truncate pr-2">
                <span className="font-black text-base sm:text-lg text-ink-heading block truncate court-team-title">
                  {t2?.name || 'TBD'}
                </span>
                <span className="text-xs sm:text-sm text-ink-muted font-semibold block truncate mt-0.5 court-players-sub">
                  👤 {t2Players}
                </span>
              </div>
              <span className="text-4xl sm:text-5xl font-black font-mono text-brand shrink-0 court-score-val tracking-tight">
                {currentMatch.score2}
              </span>
            </div>
          </div>
        ) : firstReadyMatch ? (
          <div className="p-3.5 my-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-ink">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Ready to Dispatch
              </span>
              <MatchStageBadge stage={firstReadyMatch.stage} stageIdentifier={firstReadyMatch.stageIdentifier} size="sm" />
            </div>
            <div className="font-extrabold text-sm text-ink-heading truncate">
              {readyT1?.name || 'TBD'} vs {readyT2?.name || 'TBD'}
            </div>
            <div className="text-[11px] text-ink-muted font-medium truncate mt-0.5">
              👤 {getTeamPlayerNames(readyT1, players)} vs {getTeamPlayerNames(readyT2, players)}
            </div>
          </div>
        ) : (
          <div className="py-7 my-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center text-xs text-ink-muted bg-surface-soft/40">
            <span className="text-2xl mb-1">🏸</span>
            <span>Court is ready for the next scheduled game</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-4">
        {currentMatch ? (
          isAdmin ? (
            <button
              type="button"
              onClick={() => onEnterScore(currentMatch)}
              disabled={isTournamentEnded}
              className={`w-full py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base font-black shadow-md flex items-center justify-center gap-2 transition transform active:scale-98 ${
                isTournamentEnded
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-hover text-brand-text shadow-brand/20'
              }`}
            >
              <span>▶</span>
              <span>Open Scorekeeper</span>
            </button>
          ) : (
            <div className="w-full py-2.5 text-center text-xs font-bold text-ink-muted bg-surface-soft border border-slate-200 dark:border-slate-800 rounded-2xl">
              Match In Progress
            </div>
          )
        ) : firstReadyMatch && isAdmin ? (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => onQuickDispatch ? onQuickDispatch(firstReadyMatch.id, court.id) : onOpenDispatch(court)}
              disabled={isTournamentEnded}
              className={`w-full py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition transform active:scale-95 ${
                isTournamentEnded
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-brand hover:bg-brand-hover text-brand-text shadow-brand/20'
              }`}
            >
              <span>⚡</span>
              <span>Dispatch {readyT1?.name || 'T1'} vs {readyT2?.name || 'T2'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDispatch(court)}
              className="w-full text-center text-[11px] font-bold text-ink-muted hover:text-brand transition py-0.5"
            >
              or choose another waiting match ▾
            </button>
          </div>
        ) : (
          isAdmin ? (
            <button
              type="button"
              onClick={() => onOpenDispatch(court)}
              disabled={isTournamentEnded}
              className={`w-full py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition active:scale-95 ${
                isTournamentEnded
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink'
              }`}
            >
              <span>+</span>
              <span>Dispatch Next Match</span>
            </button>
          ) : (
            <div className="w-full py-2 text-center text-xs text-ink-muted font-medium">
              Awaiting next call
            </div>
          )
        )}
      </div>
    </div>
  );
};

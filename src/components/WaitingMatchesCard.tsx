import React, { useMemo } from 'react';
import { Match, Team, Player, Court } from '../types/tournament';
import { getTeamPlayerNames, sortWaitingMatchesByRestTime, getMatchCourtConflict } from '../utils/engine';
import { MatchStageBadge } from './MatchStageBadge';

interface WaitingMatchesCardProps {
  matches: Match[];
  courts: Record<string, Court>;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  isAdmin: boolean;
  onSelectMatchToSend?: (match: Match) => void;
  onInspectTeam: (teamId: string) => void;
  allMatches?: Record<string, Match>;
}

export const WaitingMatchesCard: React.FC<WaitingMatchesCardProps> = ({
  allMatches = {},
  matches,
  courts,
  teams,
  players,
  isAdmin,
  onSelectMatchToSend,
  onInspectTeam,
}) => {
  // Check if any court is currently free
  const vacantCourt = useMemo(() => {
    return Object.values(courts || {}).find(c => !c.currentMatchId);
  }, [courts]);

  // Sort matches by rest time first, then prioritize ready matches at the top
  const sortedAndEvaluatedMatches = useMemo(() => {
    const restSorted = sortWaitingMatchesByRestTime(matches, allMatches);
    const evaluated = restSorted.map((m) => {
      // Evaluate conflict against the vacant court if one exists, otherwise across all courts
      const conflict = getMatchCourtConflict(m, courts, allMatches, teams, players, vacantCourt?.id);
      return {
        match: m,
        conflict,
        isReady: !conflict,
      };
    });

    // Partition: Ready matches at top, busy matches below
    const ready = evaluated.filter(item => item.isReady);
    const busy = evaluated.filter(item => !item.isReady);
    return [...ready, ...busy];
  }, [matches, courts, allMatches, teams, players, vacantCourt]);

  const readyCount = sortedAndEvaluatedMatches.filter(item => item.isReady).length;

  return (
    <div className="rounded-3xl border border-courtborder bg-surface p-5 shadow-sm flex flex-col transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-black text-ink">Waiting Matches</h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-brand/10 text-brand border border-brand/20">
            {matches.length}
          </span>
          {readyCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {readyCount} Ready
            </span>
          )}
        </div>
        <span className="text-ink-muted text-xs font-semibold">Queue</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] pr-1">
        {sortedAndEvaluatedMatches.length === 0 ? (
          <div className="py-12 text-center text-xs text-ink-muted italic">
            No matches waiting. All scheduled matches are either playing or finished!
          </div>
        ) : (
          sortedAndEvaluatedMatches.map(({ match: m, conflict, isReady }) => {
            const isBusy = !isReady;
            const t1 = (m.team1Id && teams) ? teams[m.team1Id] : null;
            const t2 = (m.team2Id && teams) ? teams[m.team2Id] : null;

            return (
              <div
                key={m.id}
                onClick={() => {
                  if (isAdmin && !isBusy) {
                    onSelectMatchToSend?.(m);
                  }
                }}
                className={`p-3.5 rounded-2xl border transition relative overflow-hidden flex items-center justify-between gap-3 ${
                  isBusy
                    ? 'opacity-60 border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 cursor-not-allowed'
                    : isAdmin
                    ? 'border-courtborder bg-surface hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer group shadow-xs hover:border-brand/40'
                    : 'border-courtborder bg-surface/50'
                }`}
                title={isBusy ? `${conflict}. Please wait for match to finish.` : 'Click to dispatch to an available court'}
              >
                <div className="truncate flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <MatchStageBadge stage={m.stage} stageIdentifier={m.stageIdentifier} size="sm" />
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ready to Play
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-md truncate">
                        <span>⏳</span>
                        <span className="truncate">{conflict}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-ink truncate waiting-team-title">
                    <span 
                      onClick={(e) => { e.stopPropagation(); t1 && onInspectTeam(t1.id); }}
                      className="hover:underline cursor-pointer truncate"
                    >
                      {t1?.name || 'TBD'}
                    </span>
                    <span className="text-ink-muted font-normal">vs</span>
                    <span 
                      onClick={(e) => { e.stopPropagation(); t2 && onInspectTeam(t2.id); }}
                      className="hover:underline cursor-pointer truncate"
                    >
                      {t2?.name || 'TBD'}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-ink-muted font-medium truncate mt-0.5">
                    👤 {getTeamPlayerNames(t1, players)} vs {getTeamPlayerNames(t2, players)}
                  </div>
                </div>

                {isBusy && (
                  <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0 uppercase tracking-wider">
                    In Play
                  </span>
                )}

                {isAdmin && !isBusy && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMatchToSend?.(m);
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-xl bg-brand/10 hover:bg-brand text-brand hover:text-brand-text text-[11px] font-black border border-brand/20 transition flex items-center gap-1"
                  >
                    <span>⚡</span>
                    <span>{vacantCourt ? `Send to ${vacantCourt.name}` : 'Dispatch'}</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

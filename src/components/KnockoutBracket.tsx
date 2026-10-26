import React, { useState } from 'react';
import { Match, Team, Player } from '../types/tournament';
import { getTeamPlayerNames } from '../utils/engine';

interface BracketProps {
  matches: Match[];
  teams: Record<string, Team>;
  players: Record<string, Player>;
  highlightTeamId?: string | null;
  onSelectMatch?: (match: Match) => void;
  onSelectTeam?: (teamId: string) => void;
  isFullScreenModal?: boolean;
}

export const KnockoutBracket: React.FC<BracketProps> = ({
  matches,
  teams,
  players,
  highlightTeamId,
  onSelectMatch,
  onSelectTeam,
  isFullScreenModal = false,
}) => {
  const [internalHighlight, setInternalHighlight] = useState<string | null>(highlightTeamId || null);

  const quarterMatches = matches.filter((m) => m && m.stage === 'quarter');
  const semiMatches = matches.filter((m) => m && m.stage === 'semi');
  const finalMatch = matches.find((m) => m && m.stage === 'final');
  const thirdPlaceMatch = matches.find((m) => m && m.stage === 'third_place');

  const getTeamName = (id: string | null | undefined) =>
    id && teams && teams[id] ? teams[id].name : null;

  const getPlaceholderLabel = (m: Match, slot: 1 | 2) => {
    if (m.stage === 'semi') {
      if (slot === 1) return m.id === 'm_semi_1' ? 'Rank #1 (or Winner Grp A)' : 'Rank #2 (or Winner Grp B)';
      return m.id === 'm_semi_1' ? 'Rank #4 (or 2nd Grp B)' : 'Rank #3 (or 2nd Grp A)';
    }
    if (m.stage === 'final') {
      return slot === 1 ? 'Semifinal 1 Winner' : 'Semifinal 2 Winner';
    }
    if (m.stage === 'third_place') {
      return slot === 1 ? 'Semifinal 1 Runner-up' : 'Semifinal 2 Runner-up';
    }
    return 'TBD';
  };

  const getPlayersLineup = (id: string | null | undefined) => {
    if (!id || !teams || !teams[id]) return null;
    return getTeamPlayerNames(teams[id], players);
  };

  const isHighlighted = (teamId: string | null | undefined) =>
    teamId && (internalHighlight === teamId || highlightTeamId === teamId);

  const getCardStyle = (stage: string, isComplete: boolean) => {
    if (stage === 'final') {
      return isComplete 
        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/40 shadow-amber-500/10' 
        : 'border-amber-500/40 bg-surface dark:bg-slate-900/90 shadow-sm';
    }
    if (stage === 'third_place') {
      return isComplete 
        ? 'border-orange-500 bg-orange-500/10 dark:bg-orange-950/40 shadow-orange-500/10' 
        : 'border-orange-500/40 bg-surface dark:bg-slate-900/90 shadow-sm';
    }
    return isComplete
      ? 'border-purple-500 bg-purple-500/10 dark:bg-purple-950/40 shadow-purple-500/10'
      : 'border-purple-500/40 bg-surface dark:bg-slate-900/90 shadow-sm';
  };

  const renderMatchCard = (m: Match | undefined) => {
    if (!m) return null;

    const t1Name = getTeamName(m.team1Id);
    const t2Name = getTeamName(m.team2Id);
    const t1Placeholder = getPlaceholderLabel(m, 1);
    const t2Placeholder = getPlaceholderLabel(m, 2);

    const t1Active = isHighlighted(m.team1Id);
    const t2Active = isHighlighted(m.team2Id);
    const isFinalCompleted = m.stage === 'final' && m.isComplete;

    const t1Lineup = getPlayersLineup(m.team1Id);
    const t2Lineup = getPlayersLineup(m.team2Id);

    return (
      <div
        key={m.id}
        onClick={() => onSelectMatch?.(m)}
        className={`cursor-pointer rounded-2xl border p-4 transition shadow-sm ${getCardStyle(m.stage, m.isComplete)} ${
          t1Active || t2Active ? 'ring-2 ring-brand scale-[1.02]' : 'hover:border-brand'
        }`}
      >
        <div className="flex justify-between items-center text-xs text-ink-muted mb-2.5">
          <span className="font-bold uppercase tracking-wider text-[11px] font-mono">{m.stageIdentifier}</span>
          {m.isComplete ? (
            <span className="text-[10px] bg-brand/10 text-brand font-black px-2 py-0.5 rounded border border-brand/30">
              COMPLETED
            </span>
          ) : (
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-ink-muted px-2 py-0.5 rounded border border-courtborder">
              PENDING
            </span>
          )}
        </div>

        {/* Team 1 Entry */}
        <div
          onClick={(e) => {
            if (m.team1Id) {
              e.stopPropagation();
              onSelectTeam?.(m.team1Id);
            }
          }}
          onMouseEnter={() => setInternalHighlight(m.team1Id)}
          onMouseLeave={() => setInternalHighlight(null)}
          className={`flex justify-between items-center text-sm sm:text-base p-2.5 rounded-xl transition hover:bg-slate-100/60 dark:hover:bg-slate-800/50 ${
            isFinalCompleted && m.winnerId === m.team1Id
              ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300'
              : m.isComplete && m.winnerId === m.team1Id
              ? 'bg-brand/15 text-brand font-bold'
              : t1Active
              ? 'bg-amber-500/20 text-ink font-bold'
              : t1Name ? 'text-ink' : 'text-ink-muted italic'
          }`}
        >
          <div className="flex flex-col truncate max-w-[210px] sm:max-w-[280px]">
            <div className="flex items-center gap-1.5 truncate">
              {isFinalCompleted && m.winnerId === m.team1Id && <span>👑</span>}
              <span className={`truncate ${t1Name ? 'font-bold hover:underline' : 'text-xs sm:text-sm text-ink-muted font-medium'}`}>
                {t1Name || t1Placeholder}
              </span>
            </div>
            {t1Lineup && (
              <span className={`text-xs sm:text-sm truncate mt-0.5 ${
                isFinalCompleted && m.winnerId === m.team1Id ? 'text-slate-900 font-medium' : 'text-ink-muted'
              }`}>
                👤 {t1Lineup}
              </span>
            )}
          </div>
          <span className="font-mono font-black text-xl sm:text-2xl ml-2 text-ink">{m.score1}</span>
        </div>

        {/* Team 2 Entry */}
        <div
          onClick={(e) => {
            if (m.team2Id) {
              e.stopPropagation();
              onSelectTeam?.(m.team2Id);
            }
          }}
          onMouseEnter={() => setInternalHighlight(m.team2Id)}
          onMouseLeave={() => setInternalHighlight(null)}
          className={`flex justify-between items-center text-sm sm:text-base p-2.5 rounded-xl mt-2 transition hover:bg-slate-100/60 dark:hover:bg-slate-800/50 ${
            isFinalCompleted && m.winnerId === m.team2Id
              ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300'
              : m.isComplete && m.winnerId === m.team2Id
              ? 'bg-brand/15 text-brand font-bold'
              : t2Active
              ? 'bg-amber-500/20 text-ink font-bold'
              : t2Name ? 'text-ink' : 'text-ink-muted italic'
          }`}
        >
          <div className="flex flex-col truncate max-w-[210px] sm:max-w-[280px]">
            <div className="flex items-center gap-1.5 truncate">
              {isFinalCompleted && m.winnerId === m.team2Id && <span>👑</span>}
              <span className={`truncate ${t2Name ? 'font-bold hover:underline' : 'text-xs sm:text-sm text-ink-muted font-medium'}`}>
                {t2Name || t2Placeholder}
              </span>
            </div>
            {t2Lineup && (
              <span className={`text-xs sm:text-sm truncate mt-0.5 ${
                isFinalCompleted && m.winnerId === m.team2Id ? 'text-slate-900 font-medium' : 'text-ink-muted'
              }`}>
                👤 {t2Lineup}
              </span>
            )}
          </div>
          <span className="font-mono font-black text-xl sm:text-2xl ml-2 text-ink">{m.score2}</span>
        </div>
      </div>
    );
  };

  const hasQuarters = quarterMatches.length > 0;
  const hasSemis = semiMatches.length > 0;

  return (
    <div className={`w-full p-4 sm:p-6 rounded-3xl border border-courtborder bg-surface shadow-sm transition-colors duration-200 ${isFullScreenModal ? 'min-h-[75vh]' : ''}`}>
      <div className="text-center mb-6">
        <h3 className="text-sm sm:text-base font-black uppercase tracking-widest text-ink">
          Complete Tournament Master Bracket & Progression
        </h3>
        <p className="text-xs sm:text-sm text-ink-muted mt-1">
          Trace group qualifiers, semifinals, and grand finals.
        </p>
      </div>

      {/* Responsive layout: vertical stack on mobile (flex-col), horizontal progression on larger screens (sm:flex-row) */}
      <div className="flex flex-col sm:flex-row gap-6 py-2 justify-around items-stretch">
        {/* Quarters (if 12+ teams) */}
        {hasQuarters && (
          <div className="flex-1 flex flex-col space-y-3">
            <div className="text-center bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-200 dark:border-indigo-800/50">
              <h4 className="font-black text-xs sm:text-sm uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">Quarterfinals</h4>
            </div>
            <div className="flex flex-col gap-4">
              {quarterMatches.map(qm => renderMatchCard(qm))}
            </div>
          </div>
        )}

        {/* Semifinals */}
        {hasSemis && (
          <div className="flex-1 flex flex-col space-y-3">
            <div className="text-center bg-purple-50 dark:bg-purple-950/40 p-2 rounded-xl border border-purple-200 dark:border-purple-800/50">
              <h4 className="font-black text-xs sm:text-sm uppercase text-purple-700 dark:text-purple-400 tracking-wider">Semifinals</h4>
              <span className="text-[10px] text-ink-muted block">Winners → Final</span>
            </div>
            <div className="flex flex-col gap-6">
              {semiMatches.map(sm => renderMatchCard(sm))}
            </div>
          </div>
        )}

        {/* Finals & 3rd Place Column */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div>
            <div className="text-center mb-3 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800/50">
              <h4 className="font-black text-xs sm:text-sm uppercase text-amber-700 dark:text-amber-400 tracking-wider flex items-center justify-center gap-1">
                <span>👑</span> GRAND FINALE <span>👑</span>
              </h4>
            </div>
            {renderMatchCard(finalMatch)}
          </div>

          {thirdPlaceMatch && (
            <div>
              <div className="text-center mb-3 bg-orange-50 dark:bg-orange-950/40 p-2 rounded-xl border border-orange-200 dark:border-orange-800/50">
                <h4 className="font-black text-xs sm:text-sm uppercase text-orange-700 dark:text-orange-400 tracking-wider flex items-center justify-center gap-1">
                  <span>🥉</span> 3rd Prize/Position
                </h4>
              </div>
              {renderMatchCard(thirdPlaceMatch)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

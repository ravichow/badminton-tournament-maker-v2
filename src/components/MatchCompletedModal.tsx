import React from 'react';
import { Match, Team } from '../types/tournament';
import { MatchStageBadge } from './MatchStageBadge';

interface MatchCompletedModalProps {
  isOpen: boolean;
  match: Match | null;
  winnerTeam: Team | undefined;
  loserTeam: Team | undefined;
  onClose: () => void;
  onNextMatch: () => void;
  onViewStandings: () => void;
}

export const MatchCompletedModal: React.FC<MatchCompletedModalProps> = ({
  isOpen,
  match,
  winnerTeam,
  loserTeam,
  onClose,
  onNextMatch,
  onViewStandings,
}) => {
  if (!isOpen || !match) return null;

  const isWinnerTeam1 = match.winnerId === match.team1Id;
  const winningScore = Math.max(match.score1, match.score2);
  const losingScore = Math.min(match.score1, match.score2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center text-ink space-y-5 animate-scaleUp">
        
        {/* Confetti & Trophy */}
        <div className="flex flex-col items-center">
          <span className="text-5xl animate-bounce">🏆</span>
          <span className="text-xs font-black uppercase tracking-widest text-brand mt-2">
            Match Completed!
          </span>
          <h3 className="text-2xl font-black text-ink-heading mt-1">
            {winnerTeam?.name || 'Winner'} Wins!
          </h3>
        </div>

        {/* Final Score Badge */}
        <div className="p-4 rounded-2xl bg-surface-soft border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
            Final Score
          </div>
          <div className="text-3xl font-black text-ink-heading font-mono flex items-center justify-center gap-3">
            <span className="text-brand">{winningScore}</span>
            <span className="text-ink-muted text-xl">–</span>
            <span>{losingScore}</span>
          </div>
          <div className="text-xs text-ink-muted mt-1.5 font-medium">
            {winnerTeam?.name} def. {loserTeam?.name}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={onNextMatch}
            className="w-full py-3.5 bg-brand hover:bg-brand-hover text-brand-text text-sm font-black rounded-2xl shadow-lg transition transform active:scale-98 flex items-center justify-center gap-2"
          >
            <span>Next Match</span>
            <span>🏸</span>
          </button>

          <button
            type="button"
            onClick={onViewStandings}
            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-ink text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-brand transition"
          >
            View Live Standings 📊
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-ink-muted hover:text-ink pt-1 block mx-auto font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

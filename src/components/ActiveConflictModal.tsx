import React from 'react';
import { TournamentState } from '../types/tournament';

export interface ActiveConflictModalProps {
  isOpen: boolean;
  activeTournament: TournamentState | null;
  onCloseArchiveAndProceed: () => void;
  onDeleteAndProceed: () => void;
  onCancel: () => void;
}

export const ActiveConflictModal: React.FC<ActiveConflictModalProps> = ({
  isOpen,
  activeTournament,
  onCloseArchiveAndProceed,
  onDeleteAndProceed,
  onCancel,
}) => {
  if (!isOpen || !activeTournament) return null;

  const matches = Object.values(activeTournament.matches || {});
  const completedMatches = matches.filter((m) => m && m.isComplete).length;
  const teamCount = Object.keys(activeTournament.teams || {}).length;
  const stageLabel =
    activeTournament.currentStage === 'group'
      ? 'Group Stage'
      : activeTournament.currentStage === 'knockout'
      ? 'Knockout Stage'
      : activeTournament.currentStage;

  const formattedDate = activeTournament.createdAt
    ? new Date(activeTournament.createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Unknown Date';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-surface p-6 text-ink shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto transition-colors duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-courtborder pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-base font-black text-amber-500 dark:text-amber-400">
                Active Tournament in Progress
              </h3>
              <p className="text-xs text-ink-muted">
                Action required before creating a new tournament
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink-muted hover:text-ink flex items-center justify-center text-xs font-bold transition"
            title="Cancel"
          >
            ✕
          </button>
        </div>

        {/* Informative text */}
        <p className="text-xs text-ink-muted leading-relaxed">
          You currently have an active tournament running. Starting a new tournament requires resolving the existing one so your match records and court rotations stay clean.
        </p>

        {/* Existing active tournament card */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold text-sm text-ink-heading truncate">
              🏸 {activeTournament.name}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
              {stageLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span>👥 {teamCount} Teams</span>
            <span>
              🎾 {completedMatches} / {matches.length} Matches Completed
            </span>
            <span>📅 {formattedDate}</span>
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-2.5 pt-1">
          {/* Option 1: Close & Archive */}
          <button
            type="button"
            onClick={onCloseArchiveAndProceed}
            className="w-full text-left p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md active:scale-[0.99] flex items-center justify-between group"
          >
            <div>
              <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                <span>🏁</span>
                <span>Close & Archive Active Tournament</span>
              </div>
              <div className="text-[11px] text-emerald-100/80 font-normal mt-0.5">
                Mark as completed with current scores, then start new tournament
              </div>
            </div>
            <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* Option 2: Delete */}
          <button
            type="button"
            onClick={onDeleteAndProceed}
            className="w-full text-left p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold transition active:scale-[0.99] flex items-center justify-between group"
          >
            <div>
              <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                <span>🗑️</span>
                <span>Permanently Delete Active Tournament</span>
              </div>
              <div className="text-[11px] text-rose-500/80 dark:text-rose-400/80 font-normal mt-0.5">
                Erase this tournament completely from database, then start new tournament
              </div>
            </div>
            <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* Option 3: Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl bg-surface hover:bg-slate-200 dark:hover:bg-slate-800 text-ink-muted hover:text-ink text-xs font-bold border border-courtborder transition text-center"
          >
            Cancel (Keep Active Tournament)
          </button>
        </div>

      </div>
    </div>
  );
};

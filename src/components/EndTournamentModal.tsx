import React, { useState } from 'react';

interface EndTournamentModalProps {
  tournamentName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmEnd: (reason: string, status: 'completed' | 'aborted') => void;
}

export const EndTournamentModal: React.FC<EndTournamentModalProps> = ({
  tournamentName,
  isOpen,
  onClose,
  onConfirmEnd,
}) => {
  const [reasonType, setReasonType] = useState<'completed' | 'time' | 'injury' | 'emergency' | 'custom'>('completed');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalReason = 'Concluded normally upon final match';
    let finalStatus: 'completed' | 'aborted' = 'completed';

    if (reasonType === 'time') {
      finalReason = 'Abruptly concluded due to venue time constraints.';
      finalStatus = 'aborted';
    } else if (reasonType === 'injury') {
      finalReason = 'Called off early due to player injury.';
      finalStatus = 'aborted';
    } else if (reasonType === 'emergency') {
      finalReason = 'Abruptly halted due to venue / court emergency.';
      finalStatus = 'aborted';
    } else if (reasonType === 'custom') {
      finalReason = customReason.trim() || 'Concluded early by organizer.';
      finalStatus = 'aborted';
    }

    onConfirmEnd(finalReason, finalStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-rose-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
            🛑 End / Conclude Current Tournament
          </h3>
          <p className="text-xs text-slate-400 mt-1 truncate">
            {tournamentName}
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Ending the tournament will freeze all scores and finalize standings for players to review historical stats.
        </p>

        <div className="space-y-2 text-xs">
          <label className="font-bold text-slate-300 block">Select Status / Reason:</label>
          
          <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
            <input
              type="radio"
              name="reason"
              checked={reasonType === 'completed'}
              onChange={() => setReasonType('completed')}
              className="text-emerald-500 focus:ring-0"
            />
            <span>🏆 <strong>Official Completion:</strong> Tournament finished normally</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
            <input
              type="radio"
              name="reason"
              checked={reasonType === 'time'}
              onChange={() => setReasonType('time')}
              className="text-rose-500 focus:ring-0"
            />
            <span>⏰ <strong>Time Constraint:</strong> Venue booking ended early</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
            <input
              type="radio"
              name="reason"
              checked={reasonType === 'injury'}
              onChange={() => setReasonType('injury')}
              className="text-rose-500 focus:ring-0"
            />
            <span>🚑 <strong>Player Injury:</strong> Unable to continue remaining games</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
            <input
              type="radio"
              name="reason"
              checked={reasonType === 'custom'}
              onChange={() => setReasonType('custom')}
              className="text-rose-500 focus:ring-0"
            />
            <span>📝 <strong>Custom Reason:</strong> Specify manual explanation</span>
          </label>
        </div>

        {reasonType === 'custom' && (
          <textarea
            placeholder="Explain why the tournament was concluded early..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 h-20 resize-none"
          />
        )}

        <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow"
          >
            Confirm & Conclude
          </button>
        </div>
      </form>
    </div>
  );
};

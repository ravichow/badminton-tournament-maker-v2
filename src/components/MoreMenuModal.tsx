import React from 'react';

interface MoreMenuProps {
  isOpen: boolean;
  isAdmin: boolean;
  isTournamentEnded: boolean;
  onClose: () => void;
  onOpenSetup: () => void;
  onOpenLineups: () => void;
  onReshuffle: () => void;
  onOpenEndTournament: () => void;
  onDeleteTournament: () => void;
  onOpenDelegate: () => void;
  onOpenSpeech: () => void;
  onOpenChangePin: () => void;
  onToggleSpectatorView: () => void;
  onOpenQRCode: () => void;
  onOpenGlance: () => void;
  onOpenDebrief: () => void;
  onOpenHub: () => void;
  onOpenFullTree: () => void;
  onExitAdmin: () => void;
  onGoHome?: () => void;
  onOpenPredefined?: () => void;
  isLargeText?: boolean;
  onToggleLargeText?: () => void;
}

export const MoreMenuModal: React.FC<MoreMenuProps> = ({
  isOpen,
  isAdmin,
  isTournamentEnded,
  onClose,
  onOpenSetup,
  onOpenLineups,
  onReshuffle,
  onOpenEndTournament,
  onDeleteTournament,
  onOpenDelegate,
  onOpenSpeech,
  onOpenChangePin,
  onToggleSpectatorView,
  onOpenQRCode,
  onOpenGlance,
  onOpenDebrief,
  onOpenHub,
  onOpenFullTree,
  onExitAdmin,
  onGoHome,
  onOpenPredefined,
  isLargeText = false,
  onToggleLargeText,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl border border-courtborder bg-surface p-6 text-ink shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto transition-colors duration-200">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base sm:text-lg font-extrabold text-emerald-400">··· More Options & Controls</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Organizer Login Option for non-admins on mobile */}
        {!isAdmin && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Organizer Access</span>
            <button
              onClick={() => { onClose(); onToggleSpectatorView(); }}
              className="w-full p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-sm font-black text-left flex justify-between items-center transition shadow-md"
            >
              <span>🔑 Organizer Login / Unlock</span>
              <span>›</span>
            </button>
          </div>
        )}

        {/* Court Vision / Large Text Accessibility Section */}
        {onToggleLargeText && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Accessibility & Visuals</span>
            <button
              type="button"
              onClick={() => {
                onToggleLargeText();
              }}
              className={`w-full p-3.5 rounded-2xl border text-sm font-black text-left flex justify-between items-center transition shadow-sm ${
                isLargeText
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-black flex items-baseline tracking-tighter text-base shrink-0 select-none">
                  <span className="text-xs leading-none font-bold">a</span>
                  <span className="text-sm leading-none font-black">A</span>
                </span>
                <div>
                  <div className="font-black text-sm">Enlarge Font</div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    Enlarges text and scores for court-side readability
                  </div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-black ${
                isLargeText ? 'bg-emerald-400 text-slate-950 shadow' : 'bg-slate-700 text-slate-300'
              }`}>
                {isLargeText ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tournament Management</span>
            <div className="space-y-2">
              <button
                onClick={() => { onClose(); onOpenSetup(); }}
                className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
              >
                <span>⚙️ Setup & Roster Manager</span>
                <span className="text-slate-400">›</span>
              </button>
              <button
                onClick={() => { onClose(); onOpenLineups(); }}
                className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
              >
                <span>🔄 Edit Lineups & Swaps</span>
                <span className="text-slate-400">›</span>
              </button>
              <button
                onClick={() => { onClose(); onReshuffle(); }}
                className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
              >
                <span>🔀 Reshuffle & Restart Draw</span>
                <span className="text-slate-400">›</span>
              </button>
              {!isTournamentEnded && (
                <button
                  onClick={() => { onClose(); onOpenEndTournament(); }}
                  className="w-full p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/40 text-sm font-bold text-left flex justify-between items-center text-rose-300 transition"
                >
                  <span>⏹️ End / Abort Tournament</span>
                  <span className="text-rose-400">›</span>
                </button>
              )}
              <button
                onClick={() => { onClose(); onDeleteTournament(); }}
                className="w-full p-3.5 rounded-2xl bg-rose-950/60 border border-rose-900 hover:bg-rose-900/60 text-sm font-bold text-left flex justify-between items-center text-rose-400 transition"
              >
                <span>🗑️ Permanently Delete Tournament</span>
                <span className="text-rose-400">›</span>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation & Hub</span>
          <div className="space-y-2">
            {onGoHome && (
              <button
                onClick={() => { onClose(); onGoHome(); }}
                className="w-full p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 hover:bg-emerald-900/40 text-emerald-300 text-sm font-bold text-left flex justify-between items-center transition shadow-sm"
              >
                <span>🏠 Home & Fast Setup Hub</span>
                <span className="text-emerald-400">›</span>
              </button>
            )}
            {onOpenPredefined && (
              <button
                onClick={() => { onClose(); onOpenPredefined(); }}
                className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
              >
                <span>👥 Predefined Teams & Players</span>
                <span className="text-slate-400">›</span>
              </button>
            )}
            <button
              onClick={() => { onClose(); onOpenHub(); }}
              className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
            >
              <span>🏆 Tournaments Hub & Archives</span>
              <span className="text-slate-400">›</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenGlance(); }}
              className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
            >
              <span>📊 Printable Glance Sheet</span>
              <span className="text-slate-400">›</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenFullTree(); }}
              className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
            >
              <span>🌳 Enlarge Bracket Tree</span>
              <span className="text-slate-400">›</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenDebrief(); }}
              className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
            >
              <span>📈 Audit & Debrief Report</span>
              <span className="text-slate-400">›</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenQRCode(); }}
              className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
            >
              <span>📱 Live QR Code</span>
              <span className="text-slate-400">›</span>
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Organizer Tools</span>
            <div className="space-y-2">
              <button
                onClick={() => { onClose(); onOpenDelegate(); }}
                className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
              >
                <span>🔑 Delegate Temporary PIN</span>
                <span className="text-slate-400">›</span>
              </button>
              <button
                onClick={() => { onClose(); onOpenSpeech(); }}
                className="w-full p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-left first-letter:transition"
              >
                <span>🎙️ Opening Ceremony Speech</span>
                <span className="text-slate-400">›</span>
              </button>
              <button
                onClick={() => { onClose(); onOpenChangePin(); }}
                className="w-full p-3.5 rounded-2xl bg-app hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-courtborder text-sm font-bold text-left flex justify-between items-center transition shadow-xs"
              >
                <span>🔒 Change Master PIN</span>
                <span className="text-slate-400">›</span>
              </button>
              <button
                onClick={() => { onClose(); onExitAdmin(); }}
                className="w-full p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-left flex justify-between items-center text-emerald-400 transition"
              >
                <span>🚪 Exit Organizer Mode</span>
                <span className="text-emerald-400">›</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
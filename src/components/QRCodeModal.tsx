import React from 'react';

interface QRCodeModalProps {
  tournamentName: string;
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  tournamentName,
  tournamentId,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentUrl = (() => {
    try {
      const url = new URL(window.location.href);
      if (tournamentId) {
        url.searchParams.set('t', tournamentId);
      }
      return url.toString();
    } catch {
      return window.location.href;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl border border-courtborder bg-surface p-6 text-ink shadow-2xl flex flex-col items-center text-center space-y-4 transition-colors duration-200">
        <div className="w-full flex justify-between items-center border-b border-courtborder pb-3">
          <h3 className="text-base font-black text-brand">📱 Scan Live QR Code</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink-muted hover:text-ink flex items-center justify-center text-xs font-bold transition"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-ink-muted leading-relaxed">
          Spectators can scan this QR code with their phone camera to instantly follow <strong className="text-ink font-bold">{tournamentName}</strong> live on court.
        </p>

        {/* QR Code Container using public API */}
        <div className="bg-white p-4 rounded-2xl shadow-inner border border-courtborder">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`}
            alt="Tournament QR Code"
            className="w-44 h-44 object-contain"
          />
        </div>

        <div className="w-full bg-app p-2.5 rounded-xl border border-courtborder text-[10px] text-ink-muted font-mono break-all select-all font-medium">
          {currentUrl}
        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(currentUrl);
            alert('Tournament link copied to clipboard!');
          }}
          className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-text text-xs font-black shadow transition active:scale-95"
        >
          📋 Copy Link
        </button>
      </div>
    </div>
  );
};

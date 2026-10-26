import React, { useState, useRef, useEffect } from 'react';
import { Team, Player } from '../types/tournament';
import { getTeamPlayerNames } from '../utils/engine';

interface TeamHighlightSelectorProps {
  teams: Record<string, Team>;
  players: Record<string, Player>;
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
}

export const TeamHighlightSelector: React.FC<TeamHighlightSelectorProps> = ({
  teams,
  players,
  selectedTeamId,
  onSelectTeam,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const teamList = Object.values(teams);
  const currentTeam = teams[selectedTeamId];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full md:w-80" ref={dropdownRef}>
      {/* Touch Trigger Button (Min 16px font to prevent Safari iOS auto-zoom shift) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-950 border border-slate-700 hover:border-emerald-500/70 text-left rounded-xl p-3 flex items-center justify-between transition shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <div className="truncate mr-2">
          {currentTeam ? (
            <div>
              <span className="font-bold text-sm sm:text-base text-amber-300 block truncate">
                {currentTeam.name}
              </span>
              <span className="text-xs text-slate-400 block truncate">
                👤 {getTeamPlayerNames(currentTeam, players)}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-sm sm:text-base text-slate-300 font-medium block">
                All Teams (No Highlight)
              </span>
              <span className="text-xs text-slate-500 block">Tap to filter or trace a team</span>
            </div>
          )}
        </div>
        <span className={`text-slate-400 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`}>
          ▼
        </span>
      </button>

      {/* Popover List strictly bound to dropdown container */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-72 flex flex-col backdrop-blur-xl animate-in fade-in duration-150">
          <div className="p-2 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider px-3">
            <span>Select Team to Spotlight</span>
            {selectedTeamId && (
              <button
                type="button"
                onClick={() => {
                  onSelectTeam('');
                  setIsOpen(false);
                }}
                className="text-rose-400 hover:underline font-bold"
              >
                Clear Filter
              </button>
            )}
          </div>

          <div className="overflow-y-auto divide-y divide-slate-800/60 p-1">
            <button
              type="button"
              onClick={() => {
                onSelectTeam('');
                setIsOpen(false);
              }}
              className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs sm:text-sm ${
                !selectedTeamId
                  ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/50'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <span>-- Show All Teams (No Highlight) --</span>
              {!selectedTeamId && <span className="text-emerald-400 font-bold">✓</span>}
            </button>

            {teamList.map((team, idx) => {
              const isSelected = selectedTeamId === team.id;
              const members = getTeamPlayerNames(team, players);

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    onSelectTeam(team.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs sm:text-sm ${
                    isSelected
                      ? 'bg-amber-950/70 text-amber-300 font-bold border border-amber-600/60 ring-1 ring-amber-500'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        #{team.seed || idx + 1}
                      </span>
                      <span className="font-bold truncate">{team.name}</span>
                    </div>
                    {members && (
                      <span className="text-xs text-slate-400 block truncate mt-0.5 pl-6">
                        👤 {members}
                      </span>
                    )}
                  </div>
                  {isSelected && <span className="text-amber-400 font-black text-sm ml-2">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Team, Player } from '../types/tournament';
import { getTeamPlayerNames } from '../utils/engine';

interface TeamOverviewModalProps {
  teams: Record<string, Team>;
  players: Record<string, Player>;
  selectedTeamId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam?: (teamId: string) => void;
}

export const TeamOverviewModal: React.FC<TeamOverviewModalProps> = ({
  teams,
  players,
  selectedTeamId,
  isOpen,
  onClose,
  onSelectTeam,
}) => {
  if (!isOpen) return null;

  const teamList = Object.values(teams);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              🏸 Teams & Lineup Inspector
            </h3>
            <p className="text-xs text-slate-400">
              Total Teams: {teamList.length} • Click any team to spotlight their lineup
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
          >
            ✕ Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {teamList.map((team, idx) => {
            const isHighlighted = selectedTeamId === team.id;
            const p1 = players[team.playerIds[0]];
            const p2 = players[team.playerIds[1]];

            return (
              <div
                key={team.id}
                onClick={() => onSelectTeam?.(team.id)}
                className={`cursor-pointer p-4 rounded-xl border transition shadow-md ${
                  isHighlighted
                    ? 'border-amber-400 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 ring-2 ring-amber-400 scale-[1.01]'
                    : 'border-slate-800 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-2 py-0.5 rounded ${
                      isHighlighted
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      Seed #{team.seed || idx + 1}
                    </span>
                    <h4 className={`text-base font-black ${
                      isHighlighted ? 'text-amber-300' : 'text-slate-100'
                    }`}>
                      {team.name}
                    </h4>
                    {isHighlighted && (
                      <span className="text-[11px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                        SELECTED
                      </span>
                    )}
                  </div>
                  {team.aggregateSkill ? (
                    <span className="text-xs font-mono text-slate-400 font-semibold">
                      Skill: {team.aggregateSkill}★
                    </span>
                  ) : null}
                </div>

                {/* Player 1 & Player 2 Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    isHighlighted ? 'bg-amber-950/40 border-amber-500/40' : 'bg-slate-900/80 border-slate-800'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Player 1</span>
                      <span className="font-bold text-slate-200 text-sm">{p1?.name || 'TBD'}</span>
                    </div>
                    {p1?.skillLevel ? (
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        Tier {p1.skillLevel}★
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">Unrated</span>
                    )}
                  </div>

                  <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    isHighlighted ? 'bg-amber-950/40 border-amber-500/40' : 'bg-slate-900/80 border-slate-800'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Player 2</span>
                      <span className="font-bold text-slate-200 text-sm">{p2?.name || 'TBD'}</span>
                    </div>
                    {p2?.skillLevel ? (
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        Tier {p2.skillLevel}★
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">Unrated</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-slate-800 pt-4 mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

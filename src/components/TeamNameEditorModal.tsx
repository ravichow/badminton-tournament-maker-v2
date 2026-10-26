import React, { useState } from 'react';
import { Team, Player } from '../types/tournament';
import { FUN_TEAM_NAMES, getTeamPlayerNames } from '../utils/engine';

interface TeamEditorProps {
  teams: Record<string, Team>;
  players?: Record<string, Player>;
  isOpen: boolean;
  onClose: () => void;
  onSaveTeams: (updatedTeams: Record<string, Team>) => void;
  onShuffleTeams?: () => void;
}

export const TeamNameEditorModal: React.FC<TeamEditorProps> = ({
  teams,
  players = {},
  isOpen,
  onClose,
  onSaveTeams,
  onShuffleTeams,
}) => {
  const [teamMap, setTeamMap] = useState<Record<string, Team>>({ ...teams });

  if (!isOpen) return null;

  const handleNameChange = (teamId: string, newName: string) => {
    setTeamMap((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        name: newName,
      },
    }));
  };

  const handleApplySuggestion = (teamId: string, suggestion: string) => {
    handleNameChange(teamId, suggestion);
  };

  const handleSave = () => {
    onSaveTeams(teamMap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white max-h-[90vh] flex flex-col shadow-2xl">
        <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-white">Customize Team Names & Lineups</h3>
            <p className="text-xs text-slate-400">Total Teams: {Object.keys(teamMap).length}</p>
          </div>
          {onShuffleTeams && (
            <button
              type="button"
              onClick={() => {
                onShuffleTeams();
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
            >
              🎲 Re-Shuffle Pairs
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {Object.values(teamMap).map((team) => {
            const memberNames = getTeamPlayerNames(team, players);
            return (
              <div key={team.id} className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">Seed #{team.seed}</span>
                    {memberNames && (
                      <span className="text-slate-300 font-semibold text-xs">
                        👤 {memberNames}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">Skill: {team.aggregateSkill}★</span>
                </div>
                <input
                  type="text"
                  value={team.name}
                  onChange={(e) => handleNameChange(team.id, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {FUN_TEAM_NAMES.slice(0, 5).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleApplySuggestion(team.id, sug)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
          >
            Apply Team Names
          </button>
        </div>
      </div>
    </div>
  );
};

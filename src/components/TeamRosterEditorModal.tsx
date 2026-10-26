import React, { useState } from 'react';
import { Team, Player, SkillLevel } from '../types/tournament';
import { FUN_TEAM_NAMES } from '../utils/engine';

interface TeamRosterEditorProps {
  teams: Record<string, Team>;
  players: Record<string, Player>;
  isOpen: boolean;
  onClose: () => void;
  onSaveTeamsAndPlayers: (updatedTeams: Record<string, Team>, updatedPlayers: Record<string, Player>) => void;
  onShuffleTeams?: () => void;
}

export const TeamRosterEditorModal: React.FC<TeamRosterEditorProps> = ({
  teams,
  players,
  isOpen,
  onClose,
  onSaveTeamsAndPlayers,
  onShuffleTeams,
}) => {
  const [teamMap, setTeamMap] = useState<Record<string, Team>>({ ...teams });
  const [playerMap, setPlayerMap] = useState<Record<string, Player>>({ ...players });
  const [newSubName, setNewSubName] = useState('');
  const [newSubSkill, setNewSubSkill] = useState<string>('unrated');
  const [selectedSwapTeam1, setSelectedSwapTeam1] = useState<string>('');
  const [selectedSwapPlayer1, setSelectedSwapPlayer1] = useState<0 | 1>(0);
  const [selectedSwapTeam2, setSelectedSwapTeam2] = useState<string>('');
  const [selectedSwapPlayer2, setSelectedSwapPlayer2] = useState<0 | 1>(0);

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

  const handlePlayerChange = (teamId: string, slotIndex: 0 | 1, newPlayerId: string) => {
    const targetTeam = teamMap[teamId];
    if (!targetTeam) return;

    const currentP1 = slotIndex === 0 ? newPlayerId : targetTeam.playerIds[0];
    const currentP2 = slotIndex === 1 ? newPlayerId : targetTeam.playerIds[1];

    const p1 = playerMap[currentP1];
    const p2 = playerMap[currentP2];
    const newAgg = (p1?.skillLevel || 0) + (p2?.skillLevel || 0);

    setTeamMap((prev) => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        playerIds: [currentP1, currentP2],
        aggregateSkill: newAgg > 0 ? newAgg : undefined,
      },
    }));
  };

  const handleAddEmergencySub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const newId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const skill = newSubSkill === 'unrated' ? undefined : (parseInt(newSubSkill) as SkillLevel);
    const subPlayer: Player = {
      id: newId,
      name: newSubName.trim() + ' (Sub)',
      skillLevel: skill,
    };

    setPlayerMap((prev) => ({
      ...prev,
      [newId]: subPlayer,
    }));

    setNewSubName('');
    alert(`Emergency substitute "${subPlayer.name}" registered! You can now select them in any team below.`);
  };

  const handlePerformSwap = () => {
    if (!selectedSwapTeam1 || !selectedSwapTeam2) {
      alert('Select two different teams to execute a player swap.');
      return;
    }
    if (selectedSwapTeam1 === selectedSwapTeam2) {
      alert('Please pick two different teams.');
      return;
    }

    const t1 = teamMap[selectedSwapTeam1];
    const t2 = teamMap[selectedSwapTeam2];
    if (!t1 || !t2) return;

    const p1Id = t1.playerIds[selectedSwapPlayer1];
    const p2Id = t2.playerIds[selectedSwapPlayer2];

    const newT1PlayerIds: [string, string] = [...t1.playerIds];
    newT1PlayerIds[selectedSwapPlayer1] = p2Id;

    const newT2PlayerIds: [string, string] = [...t2.playerIds];
    newT2PlayerIds[selectedSwapPlayer2] = p1Id;

    setTeamMap((prev) => ({
      ...prev,
      [selectedSwapTeam1]: {
        ...t1,
        playerIds: newT1PlayerIds,
      },
      [selectedSwapTeam2]: {
        ...t2,
        playerIds: newT2PlayerIds,
      },
    }));

    alert(`Swapped ${playerMap[p1Id]?.name} (${t1.name}) with ${playerMap[p2Id]?.name} (${t2.name})!`);
  };

  const handleSave = () => {
    const assignedPlayers = new Set<string>();
    for (const t of Object.values(teamMap)) {
      if (t.playerIds[0] === t.playerIds[1]) {
        alert(`Team "${t.name}" has the same player assigned twice! A doubles pair requires two distinct players.`);
        return;
      }
      if (assignedPlayers.has(t.playerIds[0])) {
        alert(`Player "${playerMap[t.playerIds[0]]?.name}" is assigned to multiple teams.`);
        return;
      }
      assignedPlayers.add(t.playerIds[0]);

      if (assignedPlayers.has(t.playerIds[1])) {
        alert(`Player "${playerMap[t.playerIds[1]]?.name}" is assigned to multiple teams.`);
        return;
      }
      assignedPlayers.add(t.playerIds[1]);
    }

    onSaveTeamsAndPlayers(teamMap, playerMap);
    onClose();
  };

  const allPlayersList = Object.values(playerMap);
  const teamList = Object.values(teamMap);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white max-h-[92vh] flex flex-col shadow-2xl">
        <div className="border-b border-slate-800 pb-3 mb-4 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              🛠️ Team Lineups, Swapping & Substitutions
            </h3>
            <p className="text-xs text-slate-400">
              Customize team names, swap players across pairs, or insert replacement players anytime.
            </p>
          </div>
          {onShuffleTeams && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Re-shuffle all team pairs completely at random?')) {
                  onShuffleTeams();
                  onClose();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
            >
              🎲 Re-Shuffle All Pairs
            </button>
          )}
        </div>

        {/* Quick Swap Between 2 Teams Box */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
            ⚡ Quick Player Swap Tool
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px] block">First Team & Slot:</label>
              <div className="flex gap-1.5">
                <select
                  value={selectedSwapTeam1}
                  onChange={(e) => setSelectedSwapTeam1(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  <option value="">-- Choose Team 1 --</option>
                  {teamList.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select
                  value={selectedSwapPlayer1}
                  onChange={(e) => setSelectedSwapPlayer1(parseInt(e.target.value) as 0 | 1)}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  <option value={0}>Player 1</option>
                  <option value={1}>Player 2</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[11px] block">Second Team & Slot:</label>
              <div className="flex gap-1.5">
                <select
                  value={selectedSwapTeam2}
                  onChange={(e) => setSelectedSwapTeam2(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  <option value="">-- Choose Team 2 --</option>
                  {teamList.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select
                  value={selectedSwapPlayer2}
                  onChange={(e) => setSelectedSwapPlayer2(parseInt(e.target.value) as 0 | 1)}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                >
                  <option value={0}>Player 1</option>
                  <option value={1}>Player 2</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handlePerformSwap}
              disabled={!selectedSwapTeam1 || !selectedSwapTeam2 || selectedSwapTeam1 === selectedSwapTeam2}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg disabled:opacity-50 transition"
            >
              🔄 Swap Selected Players
            </button>
          </div>
        </div>

        {/* Emergency Replacement Player Form */}
        <form onSubmit={handleAddEmergencySub} className="flex flex-wrap gap-2 mb-4 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 items-center">
          <span className="text-xs font-bold text-rose-400 mr-1">🚑 New / Injury Sub:</span>
          <input
            type="text"
            placeholder="Replacement player name..."
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            className="flex-1 min-w-[160px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <select
            value={newSubSkill}
            onChange={(e) => setNewSubSkill(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="unrated">Unrated</option>
            <option value="5">Tier 5 (Advanced)</option>
            <option value="4">Tier 4 (Upper)</option>
            <option value="3">Tier 3 (Intermediate)</option>
            <option value="2">Tier 2 (Lower)</option>
            <option value="1">Tier 1 (Beginner)</option>
          </select>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow"
          >
            + Register Sub
          </button>
        </form>

        {/* Team By Team Lineup List */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {teamList.map((team, idx) => (
            <div key={team.id} className="bg-slate-800/85 border border-slate-700 p-4 rounded-xl space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                    Seed #{team.seed || idx + 1}
                  </span>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => handleNameChange(team.id, e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 min-w-[200px]"
                  />
                </div>
              </div>

              {/* Player 1 and Player 2 Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                    Player 1:
                  </span>
                  <select
                    value={team.playerIds[0]}
                    onChange={(e) => handlePlayerChange(team.id, 0, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {allPlayersList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.skillLevel ? `(Tier ${p.skillLevel}★)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                    Player 2:
                  </span>
                  <select
                    value={team.playerIds[1]}
                    onChange={(e) => handlePlayerChange(team.id, 1, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {allPlayersList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.skillLevel ? `(Tier ${p.skillLevel}★)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow"
          >
            Confirm & Save Lineups
          </button>
        </div>
      </div>
    </div>
  );
};

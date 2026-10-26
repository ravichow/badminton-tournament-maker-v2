const EXTENDED_NAMES = [
  'Alex', 'Priya', 'Kiran', 'Deepak', 'Rahul', 'Vikram',
  'Ananya', 'Sneha', 'Rohit', 'Suresh', 'Manoj', 'Arjun',
  'Divya', 'Siddharth', 'Nikhil', 'Varun', 'Tarun', 'Pooja',
  'Kavya', 'Aditya', 'Rohan', 'Pranav', 'Meera', 'Ritu',
  'Gautam', 'Shreya', 'Karthik', 'Harish', 'Sameer', 'Tanvi'
];
import React, { useState } from 'react';
import { Player, Team, ScoringRules } from '../types/tournament';
import { MASTER_FREQUENT_PLAYERS, getTodayFormattedWithTime, shortenLegacyTournamentName } from '../initialData';
import { pairPlayersIntoTeams, FUN_TEAM_NAMES } from '../utils/engine';

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTournament: (
    teams: Team[],
    allPlayers: Player[],
    tournamentName: string,
    pointsToWin: 15 | 21,
    format: 'balanced' | 'round-robin' | 'knockout'
  ) => void;
  existingTournamentName?: string;
}

export const QuickSetupModal: React.FC<QuickSetupModalProps> = ({
  isOpen,
  onClose,
  onStartTournament,
  existingTournamentName,
}) => {
  // 1. Tournament Name
  const [tournamentName, setTournamentName] = useState(() => 
    shortenLegacyTournamentName(existingTournamentName) || getTodayFormattedWithTime()
  );

  // 2. Player Pool (Preloaded + Guests)
  const [playerPool, setPlayerPool] = useState<Player[]>(() => [...MASTER_FREQUENT_PLAYERS]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => 
    MASTER_FREQUENT_PLAYERS.slice(0, 8).map(p => p.id)
  );
  const [guestName, setGuestName] = useState('');

  // 3. Team Count & Structure (4 to 10 teams)
  const [teamCount, setTeamCount] = useState<number>(4);
  const [customTeams, setCustomTeams] = useState<{ id: string; name: string; p1: string; p2: string }[]>([
    { id: 'team_1', name: 'Team A', p1: 'p1', p2: 'p2' },
    { id: 'team_2', name: 'Team B', p1: 'p3', p2: 'p4' },
    { id: 'team_3', name: 'Team C', p1: 'p5', p2: 'p6' },
    { id: 'team_4', name: 'Team D', p1: 'p7', p2: 'p8' },
  ]);

  // 4. Match Settings
  const [pointsToWin, setPointsToWin] = useState<15 | 21>(15);
  const [tournamentMode, setTournamentMode] = useState<'balanced' | 'round-robin' | 'knockout'>('balanced');

  if (!isOpen) return null;

  // Toggle player selection
  const togglePlayer = (id: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // Add guest player
  const handleAddGuest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = guestName.trim();
    if (!clean) return;
    const newGuest: Player = {
      id: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: clean,
      skillLevel: 3,
    };
    setPlayerPool(prev => [...prev, newGuest]);
    setSelectedPlayerIds(prev => [...prev, newGuest.id]);
    setGuestName('');
  };

  // Ensure playerPool has at least neededCount players
  const ensurePlayerCapacity = (neededPlayers: number, currentPool: Player[], currentSelected: string[]): { pool: Player[]; selected: string[] } => {
    const poolCopy = [...currentPool];
    const selectedCopy = [...currentSelected];
    let extIndex = 0;

    while (selectedCopy.length < neededPlayers) {
      const existingName = EXTENDED_NAMES[extIndex % EXTENDED_NAMES.length];
      const suffix = Math.floor(extIndex / EXTENDED_NAMES.length) > 0 ? ` ${Math.floor(extIndex / EXTENDED_NAMES.length) + 1}` : '';
      const playerName = `${existingName}${suffix}`;
      const newPlayer: Player = {
        id: `p_auto_${poolCopy.length + 1}`,
        name: playerName,
        skillLevel: 3,
      };
      poolCopy.push(newPlayer);
      selectedCopy.push(newPlayer.id);
      extIndex++;
    }
    return { pool: poolCopy, selected: selectedCopy };
  };

  // Set team count directly with automatic player pool scaling
  const setTeamsCountDirect = (targetCount: number) => {
    const count = Math.min(16, Math.max(2, targetCount));
    const neededPlayers = count * 2;
    
    let currentPool = playerPool;
    let currentSelected = selectedPlayerIds;

    if (currentSelected.length < neededPlayers) {
      const ensured = ensurePlayerCapacity(neededPlayers, playerPool, selectedPlayerIds);
      currentPool = ensured.pool;
      currentSelected = ensured.selected;
      setPlayerPool(currentPool);
      setSelectedPlayerIds(currentSelected);
    }

    setTeamCount(count);

    setCustomTeams(prev => {
      const updated: { id: string; name: string; p1: string; p2: string }[] = [];
      for (let i = 0; i < count; i++) {
        const char = String.fromCharCode(65 + i);
        const name = prev[i]?.name || FUN_TEAM_NAMES[i] || `Team ${char}`;
        const p1 = prev[i]?.p1 || currentSelected[i * 2] || '';
        const p2 = prev[i]?.p2 || currentSelected[i * 2 + 1] || '';
        updated.push({
          id: `team_${i + 1}`,
          name,
          p1,
          p2,
        });
      }
      return updated;
    });
  };

  // Change team count (from 2 to 16)
  const handleTeamCountChange = (delta: number) => {
    setTeamsCountDirect(teamCount + delta);
  };

  // Auto-pair active selected players
  const handleAutoPair = (mode: 'anti-stack' | 'random') => {
    const active = playerPool.filter(p => selectedPlayerIds.includes(p.id));
    if (active.length < 4 || active.length % 2 !== 0) {
      alert(`Doubles requires an even number of players (selected: ${active.length}). Please select 1 more or 1 fewer player.`);
      return;
    }
    const paired = pairPlayersIntoTeams(active, mode);
    const newTeams = paired.map((t, idx) => ({
      id: t.id,
      name: t.name || `Team ${String.fromCharCode(65 + idx)}`,
      p1: t.playerIds[0],
      p2: t.playerIds[1],
    }));
    setTeamCount(newTeams.length);
    setCustomTeams(newTeams);
  };

  // Update a team's player or name
  const updateTeam = (index: number, field: 'name' | 'p1' | 'p2', val: string) => {
    setCustomTeams(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Start Tournament Validation & Launch
  const handleStart = () => {
    // Validate each team has two players
    for (let i = 0; i < customTeams.length; i++) {
      const t = customTeams[i];
      if (!t.p1 || !t.p2) {
        alert(`Please select both Player 1 and Player 2 for ${t.name || `Team ${i + 1}`}.`);
        return;
      }
      if (t.p1 === t.p2) {
        alert(`In ${t.name}, Player 1 and Player 2 cannot be the same person!`);
        return;
      }
    }

    const finalTeams: Team[] = customTeams.map((t, idx) => ({
      id: t.id,
      name: t.name.trim() || `Team ${String.fromCharCode(65 + idx)}`,
      playerIds: [t.p1, t.p2] as [string, string],
      seed: idx + 1,
    }));

    // Collect all players participating
    const participatingPlayers = playerPool.filter(p => 
      finalTeams.some(t => t.playerIds.includes(p.id))
    );

    onStartTournament(
      finalTeams,
      participatingPlayers,
      tournamentName.trim() || getTodayFormattedWithTime(),
      pointsToWin,
      tournamentMode
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-5 sm:p-6 my-auto space-y-6 text-ink max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-brand">
              🏸 60-Second Setup
            </span>
            <h2 className="text-2xl font-black tracking-tight text-ink-heading mt-0.5">
              Create Tournament
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-ink-muted hover:text-ink flex items-center justify-center font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* 1. Tournament Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center justify-between">
            <span>Tournament Name</span>
            <button
              type="button"
              onClick={() => setTournamentName(getTodayFormattedWithTime())}
              className="text-[11px] text-brand hover:underline font-bold flex items-center gap-1"
            >
              <span>🎲 Auto-suggest Name</span>
            </button>
          </label>
          <input
            type="text"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="e.g. Friday Smash Night"
          />
        </div>

        {/* 2. Preloaded Players & Guests */}
        <div className="space-y-2.5 bg-surface-soft p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-heading">
              1. Players Pool ({selectedPlayerIds.length} Selected)
            </span>
            <span className="text-[11px] text-ink-muted font-medium">tap to check/uncheck</span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {playerPool.map(player => {
              const isSelected = selectedPlayerIds.includes(player.id);
              return (
                <button
                  type="button"
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand text-brand-text shadow-sm scale-102'
                      : 'bg-surface text-ink-muted border border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span>{isSelected ? '✓' : '+'}</span>
                  <span>{player.name}</span>
                </button>
              );
            })}
          </div>

          {/* Add Guest Player Form */}
          <form onSubmit={handleAddGuest} className="flex gap-2 pt-1">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Add guest player name..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={!guestName.trim()}
              className="px-3.5 py-1.5 bg-brand text-brand-text text-xs font-black rounded-xl disabled:opacity-50 transition"
            >
              + Add
            </button>
          </form>
        </div>

        {/* 3. Form Doubles Teams */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-heading">
              2. Teams ({teamCount} Doubles Teams)
            </span>
            
            {/* Team Counter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleTeamCountChange(-1)}
                disabled={teamCount <= 2}
                className="w-6 h-6 rounded-lg bg-surface text-ink font-black text-sm disabled:opacity-40 flex items-center justify-center shadow-xs"
                title="Decrease teams"
              >
                –
              </button>
              <span className="text-xs font-black px-2 text-ink">{teamCount}</span>
              <button
                type="button"
                onClick={() => handleTeamCountChange(1)}
                disabled={teamCount >= 16}
                className="w-6 h-6 rounded-lg bg-surface text-ink font-black text-sm disabled:opacity-40 flex items-center justify-center shadow-xs"
                title="Increase teams"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Team Presets (including 4, 8, 13 teams) */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-ink-muted self-center mr-1 font-semibold">Presets:</span>
            {[4, 6, 8, 10, 12, 13, 15, 16].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setTeamsCountDirect(cnt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  teamCount === cnt
                    ? 'bg-brand text-brand-text shadow-sm'
                    : 'bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-ink border border-slate-200 dark:border-slate-800'
                }`}
              >
                {cnt} Teams
              </button>
            ))}
          </div>

          {/* Auto-Pair Shortcut Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAutoPair('anti-stack')}
              className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 text-ink text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand transition"
            >
              ⚖️ Auto-Balance Skills
            </button>
            <button
              type="button"
              onClick={() => handleAutoPair('random')}
              className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 text-ink text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand transition"
            >
              🎲 Random Shuffle
            </button>
          </div>

          {/* Teams List (Cards with dropdowns) */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {customTeams.map((team, idx) => (
              <div 
                key={team.id || idx}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand text-brand-text font-black text-xs flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => updateTeam(idx, 'name', e.target.value)}
                    className="flex-1 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 text-xs font-black text-ink pb-0.5 focus:outline-none focus:border-brand"
                    placeholder={`Team ${String.fromCharCode(65 + idx)}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-ink-muted block font-semibold mb-0.5">Player 1</label>
                    <select
                      value={team.p1}
                      onChange={(e) => updateTeam(idx, 'p1', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="">Select Player...</option>
                      {playerPool.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-ink-muted block font-semibold mb-0.5">Player 2</label>
                    <select
                      value={team.p2}
                      onChange={(e) => updateTeam(idx, 'p2', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-surface border border-slate-300 dark:border-slate-700 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="">Select Player...</option>
                      {playerPool.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Match Rules */}
        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-heading block">
            3. Match Rules
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-ink-muted font-medium block mb-1">Game Length</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPointsToWin(15)}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                    pointsToWin === 15 ? 'bg-brand text-brand-text shadow-sm' : 'text-ink-muted'
                  }`}
                >
                  15 Pts
                </button>
                <button
                  type="button"
                  onClick={() => setPointsToWin(21)}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                    pointsToWin === 21 ? 'bg-brand text-brand-text shadow-sm' : 'text-ink-muted'
                  }`}
                >
                  21 Pts
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-ink-muted font-medium block mb-1">Courts Available</span>
              <div className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-ink rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                🏸 2 Dedicated Courts
              </div>
            </div>
          </div>
        </div>

        {/* 5. Start CTA Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-3.5 bg-brand hover:bg-brand-hover text-brand-text text-sm font-black rounded-2xl shadow-lg transition transform active:scale-98 flex items-center justify-center gap-2"
          >
            <span>Start Tournament</span>
            <span>🚀</span>
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Player, SkillLevel } from '../types/tournament';
import { MASTER_FREQUENT_PLAYERS, getTodayFormattedWithTime } from '../initialData';

interface RosterManagerProps {
  currentPlayers: Record<string, Player>;
  currentTournamentName?: string;
  currentPoints?: 15 | 21;
  isOpen: boolean;
  onClose: () => void;
  onGenerateTournament: (
    selectedPlayers: Player[], 
    pairingMode: 'anti-stack' | 'random',
    tournamentName: string,
    pointsToWin: 15 | 21
  ) => void;
}

export const RosterManagerModal: React.FC<RosterManagerProps> = ({
  currentPlayers,
  currentTournamentName,
  currentPoints = 15,
  isOpen,
  onClose,
  onGenerateTournament,
}) => {
  const [allPool, setAllPool] = useState<Player[]>(() => {
    const existing = Object.values(currentPlayers);
    const combined = [...existing];
    MASTER_FREQUENT_PLAYERS.forEach(p => {
      if (!combined.some(c => c.name.toLowerCase() === p.name.toLowerCase())) {
        combined.push(p);
      }
    });
    return combined;
  });

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const keys = Object.keys(currentPlayers);
    if (keys.length > 0) return keys;
    return MASTER_FREQUENT_PLAYERS.slice(0, 8).map(p => p.id);
  });

  const [pairingMode, setPairingMode] = useState<'anti-stack' | 'random'>('random');
  const [tournamentName, setTournamentName] = useState<string>(
    () => currentTournamentName || getTodayFormattedWithTime()
  );
  const [pointsToWin, setPointsToWin] = useState<15 | 21>(currentPoints);

  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState<string>('unrated');

  if (!isOpen) return null;

  const togglePlayerSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectCount = (count: number) => {
    let pool = [...allPool];
    if (pool.length < count) {
      const extNames = [
        'Alex', 'Priya', 'Kiran', 'Deepak', 'Rahul', 'Vikram',
        'Ananya', 'Sneha', 'Rohit', 'Suresh', 'Manoj', 'Arjun',
        'Divya', 'Siddharth', 'Nikhil', 'Varun', 'Tarun', 'Pooja',
        'Kavya', 'Aditya', 'Rohan', 'Pranav', 'Meera', 'Ritu'
      ];
      let extIdx = 0;
      while (pool.length < count) {
        const name = extNames[extIdx % extNames.length];
        const suffix = Math.floor(extIdx / extNames.length) > 0 ? ` ${Math.floor(extIdx / extNames.length) + 1}` : '';
        pool.push({
          id: `p_auto_${Date.now()}_${pool.length + 1}`,
          name: `${name}${suffix}`,
          skillLevel: 3,
        });
        extIdx++;
      }
      setAllPool(pool);
    }
    const picked = pool.slice(0, count).map(p => p.id);
    setSelectedIds(picked);
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const skill = newSkill === 'unrated' ? undefined : (parseInt(newSkill) as SkillLevel);
    const newP: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newName.trim(),
      skillLevel: skill,
    };
    setAllPool([newP, ...allPool]);
    setSelectedIds([newP.id, ...selectedIds]);
    setNewName('');
    setNewSkill('unrated');
  };

  const handleUpdatePlayerRating = (id: string, skillStr: string) => {
    const skill = skillStr === 'unrated' ? undefined : (parseInt(skillStr) as SkillLevel);
    setAllPool(prev => prev.map(p => p.id === id ? { ...p, skillLevel: skill } : p));
  };

  const handleRemoveFromPool = (id: string) => {
    setAllPool(allPool.filter(p => p.id !== id));
    setSelectedIds(selectedIds.filter(i => i !== id));
  };

  const handleSelectAll = () => {
    setSelectedIds(allPool.map(p => p.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  const handleGenerate = () => {
    const count = selectedIds.length;
    if (count < 4) {
      alert('You need at least 4 players (2 doubles teams) to create a tournament.');
      return;
    }
    if (count % 2 !== 0) {
      alert(`Selected count is ${count}. Doubles requires an EVEN number of players (e.g. 6, 8, 10, 12). Please select or uncheck 1 player.`);
      return;
    }

    const selectedPlayers = allPool.filter(p => selectedIds.includes(p.id));
    const finalName = tournamentName.trim() || getTodayFormattedWithTime();

    onGenerateTournament(selectedPlayers, pairingMode, finalName, pointsToWin);
    onClose();
  };

  const selectedCount = selectedIds.length;
  const isEven = selectedCount >= 4 && selectedCount % 2 === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white max-h-[94vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-800 pb-3 mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              ➕ Create / Setup Tournament
            </h3>
            <p className="text-xs text-slate-400">
              Configure tournament name, points rule, and select players
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Tournament Name & Points Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            {/* Tournament Name Input */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Tournament Name (Editable):
              </label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. FriendlyTournament1_1014_2152"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Default includes date & time so same-day tournaments never overwrite.
              </span>
            </div>

            {/* Points to Win Selector (15 vs 21) */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Scoring Rule (Points per Game):
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setPointsToWin(15)}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition border flex flex-col items-center justify-center ${
                    pointsToWin === 15
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm">15 Points</span>
                  <span className="text-[10px] opacity-80 font-normal">Deuce 14-14 (Cap 30)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPointsToWin(21)}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition border flex flex-col items-center justify-center ${
                    pointsToWin === 21
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm">21 Points</span>
                  <span className="text-[10px] opacity-80 font-normal">Deuce 20-20 (Cap 30)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Pick Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <span className="text-xs text-slate-400 font-semibold">
              Active Selection: <strong className="text-emerald-400 font-bold">{selectedCount}</strong> Players ({selectedCount / 2} Pairs)
            </span>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-slate-400 mr-1 self-center">Quick Pick:</span>
              {[
                { num: 6, label: '6 (3 Teams)' },
                { num: 8, label: '8 (4 Teams)' },
                { num: 12, label: '12 (6 Teams)' },
                { num: 16, label: '16 (8 Teams)' },
                { num: 26, label: '26 (13 Teams)' },
              ].map(({ num, label }) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSelectCount(num)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-emerald-300 transition hover:border-emerald-500"
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300"
              >
                All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-rose-300"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Add New Player Bar */}
          <form onSubmit={handleAddPlayer} className="flex flex-wrap gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
            <input
              type="text"
              placeholder="Add new player name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-[180px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <select
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="unrated">Unrated (Default)</option>
              <option value="5">Tier 5 (Advanced)</option>
              <option value="4">Tier 4 (Upper)</option>
              <option value="3">Tier 3 (Intermediate)</option>
              <option value="2">Tier 2 (Lower)</option>
              <option value="1">Tier 1 (Beginner)</option>
            </select>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold"
            >
              + Add Player
            </button>
          </form>

          {/* Pairing Matchmaking Method */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs">
            <span className="font-bold text-slate-300">Matchmaking Method:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPairingMode('random')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  pairingMode === 'random'
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                🎲 Random Shuffle (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setPairingMode('anti-stack')}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  pairingMode === 'anti-stack'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                ⚖️ Anti-Stacking (Tier-Based)
              </button>
            </div>
          </div>

          {/* Player Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {allPool.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between p-3 rounded-2xl border transition ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer truncate mr-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePlayerSelect(p.id)}
                        className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-xs font-bold truncate text-slate-100">{p.name}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromPool(p.id)}
                      className="text-slate-500 hover:text-rose-400 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-400">Rating:</span>
                    <select
                      value={p.skillLevel ? p.skillLevel.toString() : 'unrated'}
                      onChange={(e) => handleUpdatePlayerRating(p.id, e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-emerald-400 focus:outline-none"
                    >
                      <option value="unrated">Unrated</option>
                      <option value="5">Tier 5★</option>
                      <option value="4">Tier 4★</option>
                      <option value="3">Tier 3★</option>
                      <option value="2">Tier 2★</option>
                      <option value="1">Tier 1★</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap justify-between items-center border-t border-slate-800 pt-4 mt-3 gap-3">
          <div className="text-xs">
            {selectedCount < 4 ? (
              <span className="text-amber-400 font-semibold">⚠️ Select at least 4 players (2 doubles pairs).</span>
            ) : !isEven ? (
              <span className="text-rose-400 font-semibold">⚠️ Selected count ({selectedCount}) is odd. Pick 1 more or uncheck 1.</span>
            ) : (
              <span className="text-emerald-400 font-bold">
                ✓ {selectedCount} players ({selectedCount / 2} pairs) • {pointsToWin} Pts Game
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!isEven}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition shadow-lg ${
                isEven
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              🚀 Create Tournament ({pointsToWin} Pts)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

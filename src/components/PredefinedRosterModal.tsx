import React, { useState } from 'react';
import { Player, PredefinedRoster, PredefinedTeam } from '../types/tournament';
import { FUN_TEAM_NAMES } from '../utils/engine';
import { getInitialPredefinedRoster } from '../initialData';

interface PredefinedRosterModalProps {
  isOpen: boolean;
  roster: PredefinedRoster;
  isAdmin: boolean;
  onClose: () => void;
  onSaveRoster: (updatedRoster: PredefinedRoster) => Promise<void> | void;
  onOpenAuth?: () => void;
}

export const PredefinedRosterModal: React.FC<PredefinedRosterModalProps> = ({
  isOpen,
  roster,
  isAdmin,
  onClose,
  onSaveRoster,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');
  const [teams, setTeams] = useState<PredefinedTeam[]>(() => [...roster.teams]);
  const [players, setPlayers] = useState<Player[]>(() => [...roster.players]);
  
  // New player form state
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerSkill, setNewPlayerSkill] = useState<number>(3);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  // Add a new player to the pool
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onOpenAuth?.();
      return;
    }
    const clean = newPlayerName.trim();
    if (!clean) return;
    const newP: Player = {
      id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: clean,
      skillLevel: newPlayerSkill,
    };
    setPlayers(prev => [...prev, newP]);
    setNewPlayerName('');
  };

  // Remove a player from the pool
  const handleRemovePlayer = (id: string) => {
    if (!isAdmin) {
      onOpenAuth?.();
      return;
    }
    if (players.length <= 4) {
      alert('You need at least 4 players to form badminton doubles matches.');
      return;
    }
    setPlayers(prev => prev.filter(p => p.id !== id));
    // Clear player from any teams they are in
    setTeams(prev => prev.map(t => ({
      ...t,
      playerIds: [
        t.playerIds[0] === id ? (players.find(p => p.id !== id)?.id || '') : t.playerIds[0],
        t.playerIds[1] === id ? (players.find(p => p.id !== id && p.id !== t.playerIds[0])?.id || '') : t.playerIds[1],
      ] as [string, string],
    })));
  };

  // Update team name
  const handleUpdateTeamName = (teamId: string, newName: string) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, name: newName } : t));
  };

  // Update team player slot
  const handleUpdateTeamPlayer = (teamId: string, slotIndex: 0 | 1, playerId: string) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;
      const newPIds = [...t.playerIds] as [string, string];
      newPIds[slotIndex] = playerId;
      return { ...t, playerIds: newPIds };
    }));
  };

  // Add a new team
  const handleAddTeam = () => {
    if (!isAdmin) {
      onOpenAuth?.();
      return;
    }
    const nextIdx = teams.length;
    const char = String.fromCharCode(65 + nextIdx);
    const funName = FUN_TEAM_NAMES[nextIdx % FUN_TEAM_NAMES.length] || `Team ${char}`;
    
    // Pick first two players not yet heavily used or defaults
    const usedPlayerIds = new Set(teams.flatMap(t => t.playerIds));
    const available = players.filter(p => !usedPlayerIds.has(p.id));
    const p1 = available[0]?.id || players[0]?.id || 'p1';
    const p2 = available[1]?.id || players[1]?.id || 'p2';

    const newTeam: PredefinedTeam = {
      id: `team_${Date.now()}_${nextIdx + 1}`,
      name: `Team ${char} (${funName})`,
      playerIds: [p1, p2],
      seed: nextIdx + 1,
    };
    setTeams(prev => [...prev, newTeam]);
  };

  // Remove a team
  const handleRemoveTeam = (teamId: string) => {
    if (!isAdmin) {
      onOpenAuth?.();
      return;
    }
    if (teams.length <= 2) {
      alert('You need at least 2 teams for a tournament.');
      return;
    }
    setTeams(prev => prev.filter(t => t.id !== teamId));
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    if (!isAdmin) {
      onOpenAuth?.();
      return;
    }
    if (!confirm('Reset all predefined teams and players to default factory roster? Any custom edits will be replaced.')) {
      return;
    }
    const defaults = getInitialPredefinedRoster();
    setPlayers(defaults.players);
    setTeams(defaults.teams);
  };

  // Save changes
  const handleSave = async () => {
    if (!isAdmin) {
      onOpenAuth?.();
      return;
    }
    // Validate each team has two distinct players
    for (const t of teams) {
      if (!t.playerIds[0] || !t.playerIds[1]) {
        alert(`Please select both Player 1 and Player 2 for "${t.name}".`);
        return;
      }
      if (t.playerIds[0] === t.playerIds[1]) {
        alert(`In "${t.name}", Player 1 and Player 2 cannot be the same person!`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const updated: PredefinedRoster = {
        players,
        teams,
        updatedAt: Date.now(),
      };
      await onSaveRoster(updated);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (e) {
      console.error(e);
      alert('Failed to save to cloud database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-surface border border-courtborder w-full max-w-2xl rounded-3xl shadow-2xl p-5 sm:p-6 my-auto text-ink flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-courtborder shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏸</span>
              <h2 className="text-lg sm:text-xl font-black text-ink tracking-tight">
                Manage Predefined Teams & Players
              </h2>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Saved in Cloud DB — automatically synced across all your browsers and devices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-ink flex items-center justify-center text-xs font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Organizer Lock Banner */}
        {!isAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 my-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <span className="text-base">🔒</span>
              <span>Spectator Read-Only: Organizer unlock required to edit players, modify pairings, or sync changes.</span>
            </div>
            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow transition active:scale-95 shrink-0 flex items-center gap-1"
              >
                <span>🔑</span>
                <span>Organizer Login</span>
              </button>
            )}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 my-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'teams'
                ? 'bg-brand text-brand-text shadow-sm'
                : 'bg-app hover:bg-surface text-ink-muted hover:text-ink border border-courtborder'
            }`}
          >
            <span>🏸</span>
            <span>Predefined Teams ({teams.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('players')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'players'
                ? 'bg-brand text-brand-text shadow-sm'
                : 'bg-app hover:bg-surface text-ink-muted hover:text-ink border border-courtborder'
            }`}
          >
            <span>👥</span>
            <span>Player Pool ({players.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {activeTab === 'teams' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                  Saved Doubles Teams ({teams.length})
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleAddTeam}
                    className="px-3 py-1 bg-brand/10 hover:bg-brand text-brand hover:text-brand-text text-xs font-bold rounded-xl border border-brand/20 transition flex items-center gap-1 active:scale-95"
                  >
                    <span>+</span>
                    <span>Add Team</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {teams.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl border border-courtborder bg-app space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-brand/20 text-brand text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => handleUpdateTeamName(t.id, e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-lg bg-surface border border-courtborder text-xs font-black text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                          placeholder="Team Name"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTeam(t.id)}
                        disabled={teams.length <= 2}
                        className="text-xs text-rose-500 hover:text-rose-600 disabled:opacity-30 p-1 font-bold"
                        title="Delete Team"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Players Selector Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-ink-muted block mb-0.5">Player 1</label>
                        <select
                          value={t.playerIds[0]}
                          onChange={(e) => handleUpdateTeamPlayer(t.id, 0, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-courtborder text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          {players.map(p => (
                            <option key={p.id} value={p.id} disabled={p.id === t.playerIds[1]}>
                              {p.name} {p.id === t.playerIds[1] ? '(Already Player 2)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-ink-muted block mb-0.5">Player 2</label>
                        <select
                          value={t.playerIds[1]}
                          onChange={(e) => handleUpdateTeamPlayer(t.id, 1, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-courtborder text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          {players.map(p => (
                            <option key={p.id} value={p.id} disabled={p.id === t.playerIds[0]}>
                              {p.name} {p.id === t.playerIds[0] ? '(Already Player 1)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add New Player Form */}
              <form onSubmit={handleAddPlayer} className="p-3.5 rounded-2xl border border-courtborder bg-app space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ink-heading block">
                  Add New Player to Pool
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Enter player name (e.g. Anand)..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-surface border border-courtborder text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <select
                    value={newPlayerSkill}
                    onChange={(e) => setNewPlayerSkill(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-xl bg-surface border border-courtborder text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-brand shrink-0"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ Advanced</option>
                    <option value={4}>⭐⭐⭐⭐ High</option>
                    <option value={3}>⭐⭐⭐ Intermediate</option>
                    <option value={2}>⭐⭐ Beginner+</option>
                    <option value={1}>⭐ Novice</option>
                  </select>
                  <button
                    type="submit"
                    disabled={!newPlayerName.trim()}
                    className="px-3.5 py-1.5 bg-brand text-brand-text text-xs font-black rounded-xl shadow disabled:opacity-40 transition active:scale-95 shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </form>

              {/* Player Pool List */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted block">
                  All Players ({players.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {players.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-app border border-courtborder"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-ink text-xs font-bold flex items-center justify-center shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-bold text-ink block truncate">{p.name}</span>
                          <span className="text-[10px] text-ink-muted">Skill: {p.skillLevel ? '★'.repeat(p.skillLevel) : 'Unrated'}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(p.id)}
                          className="text-xs text-rose-500 hover:text-rose-600 p-1 font-bold"
                          title="Remove Player"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-courtborder pt-3 mt-4 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {isAdmin ? (
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[11px] font-bold text-ink-muted hover:text-rose-500 transition py-1"
            >
              ↺ Reset Defaults
            </button>
          ) : (
            <span className="text-[11px] font-medium text-ink-muted italic">
              🔒 Read-Only Spectator View
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-ink border border-courtborder transition"
            >
              {isAdmin ? 'Cancel' : 'Close'}
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg transition active:scale-95 flex items-center gap-1.5 ${
                  saveSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand hover:bg-brand-hover text-brand-text'
                }`}
              >
                {isSaving ? (
                  <span>⏳ Saving to Cloud DB...</span>
                ) : saveSuccess ? (
                  <span>✓ Saved to Cloud Database!</span>
                ) : (
                  <span>💾 Save to Cloud DB</span>
                )}
              </button>
            ) : (
              onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition active:scale-95 flex items-center gap-1"
                >
                  <span>🔑</span>
                  <span>Unlock to Edit</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

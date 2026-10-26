import React, { useState } from 'react';
import { PredefinedRoster, TournamentState, PredefinedTeam } from '../types/tournament';
import { getTodayFormattedWithTime } from '../initialData';

interface LandingPageViewProps {
  roster: PredefinedRoster;
  tournaments: TournamentState[];
  isDarkMode: boolean;
  isAdmin: boolean;
  onToggleTheme: () => void;
  onOpenAuth: () => void;
  onExitAdmin: () => void;
  onLaunchPredefinedTournament: (
    selectedTeams: PredefinedTeam[],
    tournamentName: string,
    pointsToWin: 15 | 21
  ) => void;
  onOpenQuickSetup: () => void;
  onOpenPredefinedManager: () => void;
  onSelectTournament: (id: string) => void;
  onDeleteTournament: (id: string) => void;
  onOpenHub?: () => void;
  hasCloudDb: boolean;
  isLargeText?: boolean;
  onToggleLargeText?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  roster,
  tournaments,
  isDarkMode,
  isAdmin,
  onToggleTheme,
  onOpenAuth,
  onExitAdmin,
  onLaunchPredefinedTournament,
  onOpenQuickSetup,
  onOpenPredefinedManager,
  onSelectTournament,
  onDeleteTournament,
  onOpenHub,
  hasCloudDb,
  isLargeText = false,
  onToggleLargeText,
}) => {
  const [selectedTeamCount, setSelectedTeamCount] = useState<number>(() => Math.min(4, roster.teams.length));
  const [pointsToWin, setPointsToWin] = useState<15 | 21>(15);
  const [tournamentName, setTournamentName] = useState<string>(() => getTodayFormattedWithTime());
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [isRecentOpen, setIsRecentOpen] = useState<boolean>(false);

  const activePredefinedTeams = roster.teams.length >= selectedTeamCount
    ? roster.teams.slice(0, selectedTeamCount)
    : [
        ...roster.teams,
        ...Array.from({ length: selectedTeamCount - roster.teams.length }).map((_, i) => {
          const tIdx = roster.teams.length + i;
          return {
            id: `team_${tIdx + 1}`,
            name: `Team ${String.fromCharCode(65 + tIdx)} (Wildcard ${tIdx + 1})`,
            playerIds: [
              roster.players[tIdx * 2]?.id || `p_${tIdx * 2 + 1}`,
              roster.players[tIdx * 2 + 1]?.id || `p_${tIdx * 2 + 2}`
            ] as [string, string],
            seed: tIdx + 1
          };
        })
      ];
  const playersMap = Object.fromEntries(roster.players.map(p => [p.id, p]));

  const handleLaunch = () => {
    if (!isAdmin) {
      onOpenAuth();
      return;
    }
    if (activePredefinedTeams.length < 2) {
      alert('Please select at least 2 teams to launch a tournament.');
      return;
    }
    onLaunchPredefinedTournament(activePredefinedTeams, tournamentName.trim() || getTodayFormattedWithTime(), pointsToWin);
  };

  return (
    <div className={`min-h-screen bg-app text-ink flex flex-col font-sans transition-colors duration-200 ${isLargeText ? "court-vision-active" : ""}`}>

      {/* Top Header: Badminton Court Green */}
      <header className="border-b border-[#0b5440] dark:border-[#083b2d] bg-[#0d6e52] dark:bg-[#094735] text-white sticky top-0 z-40 transition-colors duration-200 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce duration-1000">🏸</span>
            <div>
              <span className="text-sm sm:text-base font-black tracking-tight text-white block">
                Badminton Tournament Maker
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Cloud Status */}
            <div 
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition ${
                hasCloudDb
                  ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
                  : 'bg-amber-400/20 text-amber-200 border-amber-400/30'
              }`}
              title={hasCloudDb ? 'Connected to Cloudflare D1 Database' : 'Offline / Local storage'}
            >
              <span className={`w-2 h-2 rounded-full ${hasCloudDb ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{hasCloudDb ? 'Cloudflare D1 Synced' : 'Local Storage'}</span>
            </div>

            {/* Organizer Login */}
            {isAdmin ? (
              <button
                type="button"
                onClick={onExitAdmin}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white border border-white/25 transition shadow-xs"
              >
                <span>👑</span>
                <span className="hidden sm:inline">Organizer Active</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white border border-white/25 transition shadow-xs"
              >
                <span>🔑</span>
                <span className="hidden sm:inline">Organizer Login</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold transition shadow-xs flex items-center gap-1 shrink-0"
              title={isDarkMode ? 'Switch to Warm Forest (Light)' : 'Switch to Midnight Athletic (Dark)'}
            >
              <span>{isDarkMode ? '☀️' : '🌙'}</span>
              <span className="hidden md:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>

            {/* Enlarge Font Toggle on Landing Page */}
            {onToggleLargeText && (
              <button
                type="button"
                onClick={onToggleLargeText}
                className={`px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl border text-xs font-black transition shadow-xs flex items-center gap-1 shrink-0 active:scale-95 ${
                  isLargeText
                    ? 'bg-white text-[#0d6e52] border-white shadow-sm ring-2 ring-white/50'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
                }`}
                title="Enlarge font size for mobile and court-side readability"
              >
                <span className="font-extrabold flex items-baseline tracking-tighter shrink-0 select-none px-0.5">
                  <span className="text-[10px] leading-none font-bold">a</span>
                  <span className="text-xs leading-none font-black">A</span>
                </span>
                {isLargeText && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-7">
        
        {/* LAUNCH TOURNAMENT */}

        <div className="bg-surface border-2 border-brand/40 rounded-3xl p-5 sm:p-7 shadow-md space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-courtborder pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-pulse">🏸</span>
                <h2 className="text-lg sm:text-2xl font-black text-ink-heading tracking-tight">
                  Game On! Start Tournament
                </h2>
              </div>
              <p className="text-xs text-ink-muted mt-0.5 font-medium">
                Pick your teams, choose points, and hit the court!
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenPredefinedManager}
              className="px-3 py-1.5 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-brand text-xs font-bold rounded-xl border border-courtborder transition shadow-xs flex items-center gap-1.5"
            >
              <span>✏️</span>
              <span>Edit Predefined Teams</span>
            </button>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Team Count & Points */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">
                  1. How Many Teams are Playing Today?
                </label>
                <div className="flex flex-wrap gap-2">
                  {[4, 6, 8, 10, 12, 13, 15].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSelectedTeamCount(count)}
                      className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                        selectedTeamCount === count
                          ? 'bg-brand text-brand-text shadow-md scale-102 ring-2 ring-brand/40'
                          : 'bg-app hover:bg-surface text-ink border border-courtborder'
                      }`}
                    >
                      <span>🏸</span>
                      <span>{count} Teams</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">
                  2. Points Per Game
                </label>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPointsToWin(15)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition text-left border ${
                      pointsToWin === 15
                        ? 'bg-brand/10 border-brand text-brand ring-1 ring-brand'
                        : 'bg-app border-courtborder text-ink-muted hover:text-ink'
                    }`}
                  >
                    <span className="font-black text-sm block">15 Points</span>
                    <span className="text-[11px] block mt-0.5">Fast-paced, great for social court time</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPointsToWin(21)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition text-left border ${
                      pointsToWin === 21
                        ? 'bg-brand/10 border-brand text-brand ring-1 ring-brand'
                        : 'bg-app border-courtborder text-ink-muted hover:text-ink'
                    }`}
                  >
                    <span className="font-black text-sm block">21 Points</span>
                    <span className="text-[11px] block mt-0.5">Standard BWF regulation length</span>
                  </button>
                </div>
              </div>

              {/* Tournament Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    3. Tournament Name
                  </label>
                  <button
                    type="button"
                    onClick={() => setTournamentName(getTodayFormattedWithTime())}
                    className="text-[11px] text-brand hover:underline font-bold"
                  >
                    🎲 Re-suggest Name
                  </button>
                </div>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-app border border-courtborder text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="e.g. Tournament_1016"
                />
              </div>
            </div>

            {/* Right: Participating Teams Preview & Launch CTA */}
            <div className="flex flex-col justify-between bg-app p-4 rounded-2xl border border-courtborder space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-ink-heading">
                    Active Teams Preview ({activePredefinedTeams.length})
                  </span>
                  <span className="text-[11px] font-bold text-brand">
                    {activePredefinedTeams.length * 2} Players
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {activePredefinedTeams.map((t, idx) => {
                    const p1 = playersMap[t.playerIds[0]];
                    const p2 = playersMap[t.playerIds[1]];
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-surface border border-courtborder text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-ink truncate">{t.name}</span>
                        </div>
                        <span className="text-[11px] text-ink-muted font-medium truncate ml-2">
                          👤 {p1?.name || 'P1'} & {p2?.name || 'P2'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Big Launch Button */}
              <div>
                <button
                  type="button"
                  onClick={handleLaunch}
                  className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm shadow-xl transition transform active:scale-98 flex items-center justify-center gap-2 ${
                    isAdmin
                      ? 'bg-brand hover:bg-brand-hover text-brand-text shadow-brand/20'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  <span className="text-base">{isAdmin ? '🚀' : '🔑'}</span>
                  <span>
                    {isAdmin
                      ? `Start Tournament (${activePredefinedTeams.length} Teams)`
                      : `Unlock Organizer to Start (${activePredefinedTeams.length} Teams)`}
                  </span>
                </button>
                {isAdmin ? (
                  <p className="text-[10.5px] text-center text-ink-muted mt-2 font-medium">
                    Automatically seeds round-robin pool, schedules Court 1 & 2, and starts live scorekeeping.
                  </p>
                ) : (
                  <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 mt-2 font-bold flex items-center justify-center gap-1">
                    <span>🔒</span>
                    <span>Spectator Mode: Organizer PIN required to launch new tournaments.</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: OR CUSTOM SETUP WIZARD */}
        <div className="bg-surface border border-courtborder rounded-3xl p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎯</span>
              <h3 className="text-base font-extrabold text-ink">Custom Tournament Setup Wizard</h3>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Want custom player pairings, guest additions, anti-stack skill balancing, or an odd number of teams (e.g. 13 teams)? Use the 60-second wizard.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenQuickSetup}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-black text-ink border border-courtborder transition shadow-xs flex items-center gap-1.5"
          >
            <span>⚙️</span>
            <span>Open Custom Wizard</span>
          </button>
        </div>

        {/* SECTION 3: PREDEFINED TEAMS & PLAYERS CARD */}
        <div className="bg-surface border border-courtborder rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-courtborder pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <h3 className="text-base font-extrabold text-ink">Predefined Teams & Master Roster</h3>
              </div>
              <p className="text-xs text-ink-muted">
                These teams persist in the Cloud Database and will be ready every time you open the app.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenPredefinedManager}
              className="px-3.5 py-1.5 bg-brand/10 hover:bg-brand text-brand hover:text-brand-text text-xs font-bold rounded-xl border border-brand/20 transition flex items-center gap-1.5"
            >
              <span>✏️</span>
              <span>Manage Teams & Players</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {roster.teams.map((t, idx) => {
              const p1 = playersMap[t.playerIds[0]];
              const p2 = playersMap[t.playerIds[1]];
              return (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-app border border-courtborder flex flex-col justify-between hover:border-brand/40 transition group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand">
                        Seed #{idx + 1}
                      </span>
                      <span className="text-[10px] text-ink-muted font-mono">Doubles</span>
                    </div>
                    <div className="font-extrabold text-xs text-ink truncate group-hover:text-brand transition">
                      {t.name}
                    </div>
                  </div>

                  <div className="text-[11px] text-ink-muted mt-2 pt-2 border-t border-courtborder/60 truncate font-medium">
                    👤 {p1?.name || 'TBD'} & {p2?.name || 'TBD'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: RECENT TOURNAMENTS (COLLAPSIBLE TO DECLUTTER PAGE) */}
        <div className="bg-surface border border-courtborder rounded-3xl p-4 sm:p-5 shadow-xs transition">
          <div 
            onClick={() => setIsRecentOpen(!isRecentOpen)}
            className="flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🏆</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-ink group-hover:text-brand transition">
                    Recent Tournaments ({tournaments.length})
                  </h3>
                  <span className="text-[11px] font-bold text-ink-muted bg-app px-2 py-0.5 rounded-full border border-courtborder">
                    {isRecentOpen ? '▲ Hide' : '▼ View'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {tournaments.length > 0 && onOpenHub && (
                <button
                  type="button"
                  onClick={onOpenHub}
                  className="px-2.5 py-1 rounded-xl bg-app hover:bg-brand hover:text-brand-text text-ink text-xs font-black border border-courtborder shadow-xs transition flex items-center gap-1 active:scale-95"
                >
                  <span>📁</span>
                  <span>Hub</span>
                  <span>›</span>
                </button>
              )}
            </div>
          </div>

          {isRecentOpen && (
            <div className="mt-4 pt-4 border-t border-courtborder space-y-3">
              {tournaments.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-muted italic">
                  No previous tournaments recorded yet. Launch your first tournament above!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tournaments.slice(0, 4).map((t) => {
                    const teamCount = Object.keys(t.teams || {}).length;
                    const matches = Object.values(t.matches || {});
                    const completedCount = matches.filter(m => m && m.isComplete).length;
                    const isComplete = t.currentStage === 'completed';
                    const isLive = !isComplete && completedCount > 0;

                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl bg-app border border-courtborder flex flex-col justify-between space-y-3 hover:border-brand/40 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isLive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-alert text-white">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  Active
                                </span>
                              ) : isComplete ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  Completed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-ink-muted">
                                  {t.currentStage === 'upcoming' ? 'Upcoming' : 'Draft'}
                                </span>
                              )}
                              <span className="text-[11px] text-ink-muted font-mono">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-sm text-ink-heading truncate">{t.name}</h4>
                            <span className="text-xs text-ink-muted block mt-0.5">
                              🏸 {teamCount} Teams • {completedCount}/{matches.length} Matches • Stage: {t.currentStage}
                            </span>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete tournament "${t.name}"?`)) {
                                  onDeleteTournament(t.id);
                                }
                              }}
                              className="text-xs text-ink-muted hover:text-rose-500 p-1 transition"
                              title="Delete Tournament"
                            >
                              🗑️
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectTournament(t.id)}
                          className="w-full py-2 rounded-xl bg-surface hover:bg-brand hover:text-brand-text text-ink text-xs font-black border border-courtborder transition shadow-xs flex items-center justify-center gap-1 active:scale-95"
                        >
                          <span>▶ Open Tournament</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {tournaments.length > 4 && onOpenHub && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={onOpenHub}
                    className="px-4 py-2 rounded-xl bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-ink border border-courtborder shadow-xs transition"
                  >
                    📂 View & Clean All {tournaments.length} Tournaments in Hub →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

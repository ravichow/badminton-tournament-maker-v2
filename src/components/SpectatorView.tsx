import React, { useState } from 'react';
import { TournamentState } from '../types/tournament';
import { calculateGroupStandings, getTeamPlayerNames } from '../utils/engine';
import { KnockoutBracket } from './KnockoutBracket';
import { TournamentGlanceView } from './TournamentGlanceView';
import { downloadOneGlanceSnapshot, exportElementAsPdf } from '../utils/exportVisuals';
import { TeamOverviewModal } from './TeamOverviewModal';
import { TeamHighlightSelector } from './TeamHighlightSelector';
import { CourtCard } from './CourtCard';
import { WaitingMatchesCard } from './WaitingMatchesCard';

interface SpectatorProps {
  state: TournamentState;
  activeTab: 'matches' | 'teams' | 'standings' | 'bracket';
  onTabChange: (tab: 'matches' | 'teams' | 'standings' | 'bracket') => void;
  onOpenMore: () => void;
  isLargeText?: boolean;
  onToggleLargeText?: () => void;
}

export const SpectatorView: React.FC<SpectatorProps> = ({
  state,
  activeTab,
  onTabChange,
  onOpenMore,
  isLargeText = false,
  onToggleLargeText,
}) => {
  const [filterTeamId, setFilterTeamId] = useState<string>('');
  const [showTreeModal, setShowTreeModal] = useState<boolean>(false);
  const [showGlanceView, setShowGlanceView] = useState<boolean>(false);
  const [inspectedTeamId, setInspectedTeamId] = useState<string | null>(null);
  const [showTeamOverviewModal, setShowTeamOverviewModal] = useState<boolean>(false);

  const isTournamentEnded = state.currentStage === 'completed' || state.currentStage === 'aborted';

  const handleOpenTeamInspector = (teamId: string) => {
    setInspectedTeamId(teamId);
    setShowTeamOverviewModal(true);
  };

  const waitingMatches = Object.values(state.matches || {}).filter(
    (m) => m && !m.isComplete && !m.courtId && m.team1Id && m.team2Id
  );

  return (
    <div className="space-y-6">
      {/* Top Segmented Tab Controls matching mockup */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex p-1.5 rounded-2xl bg-surface border border-courtborder shadow-xs">
          <button
            type="button"
            onClick={() => onTabChange('matches')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'matches'
                ? 'bg-brand text-brand-text shadow-md font-black'
                : 'text-ink-muted hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>📋</span>
            <span>Matches</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('teams')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'teams'
                ? 'bg-brand text-brand-text shadow-md font-black'
                : 'text-ink-muted hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>👥</span>
            <span>Teams</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('standings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'standings'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span>🏆</span>
            <span>Standings</span>
          </button>
        </div>


      </div>

      {/* TAB 1: MATCHES VIEW */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          {/* Completed Tournament Redirection Banner */}
          {isTournamentEnded && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border-2 border-amber-400/40 text-center shadow-lg space-y-2.5">
              <span className="text-3xl block">🏆</span>
              <h4 className="text-base sm:text-lg font-black text-ink">
                Tournament Concluded! All Matches Completed
              </h4>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                The GRAND FINALE and 3rd Prize/Position matches have concluded. See the podium champions and full standings.
              </p>
              <button
                type="button"
                onClick={() => onTabChange('standings')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition transform active:scale-95"
              >
                <span>🏆 View Final Standings & Podium</span>
              </button>
            </div>
          )}

          {/* Group Stage Information Banner */}
          {state.currentStage === 'group' && !isTournamentEnded && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-brand/5 border border-brand/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-brand">🏸 Group Stage</span>
                <span className="text-xs text-ink-muted font-medium">• Round-Robin League Matches</span>
              </div>
              <span className="text-[11px] text-ink-muted font-semibold">Top teams qualify for Knockout Playoff</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink-muted">Courts</h3>
              {onToggleLargeText && (
                <button
                  type="button"
                  onClick={onToggleLargeText}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black border transition ${
                    isLargeText
                      ? 'bg-brand text-brand-text border-brand shadow-xs'
                      : 'bg-surface text-ink-muted hover:text-ink border-courtborder'
                  }`}
                  title="Toggle Enlarge Font: Larger scores and text for court-side reading"
                >
                  <span className="font-extrabold flex items-baseline tracking-tighter shrink-0 select-none px-0.5">
                    <span className="text-[9px] leading-none font-bold">a</span>
                    <span className="text-[11px] leading-none font-black">A</span>
                  </span>
                  {isLargeText && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.values(state.courts || {}).map((court) => {
              const currentMatch = court.currentMatchId ? state.matches[court.currentMatchId] : null;

              return (
                <CourtCard
                  key={court.id}
                  court={court}
                  currentMatch={currentMatch}
                  teams={state.teams}
                  players={state.players}
                  isAdmin={false}
                  isTournamentEnded={isTournamentEnded}
                  onEnterScore={() => {}}
                  onOpenDispatch={() => {}}
                  onInspectTeam={(tId) => handleOpenTeamInspector(tId)}
                  courts={state.courts}
                  allMatches={state.matches}
                  waitingMatches={waitingMatches}
                />
              );
            })}

            {/* Waiting Matches Card */}
            <WaitingMatchesCard
              matches={waitingMatches}
              courts={state.courts}
              allMatches={state.matches}
              teams={state.teams}
              players={state.players}
              isAdmin={false}
              onInspectTeam={(tId) => handleOpenTeamInspector(tId)}
            />
          </div>
        </div>
      )}

      {/* TAB 2: TEAMS VIEW */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
            Teams & Players ({Object.keys(state.teams || {}).length} Pairs)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {Object.values(state.teams || {}).map((team, idx) => {
              const p1 = state.players[team.playerIds[0]];
              const p2 = state.players[team.playerIds[1]];

              return (
                <div
                  key={team.id}
                  onClick={() => handleOpenTeamInspector(team.id)}
                  className="p-4 rounded-3xl border border-courtborder bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition shadow-sm space-y-2.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                      Seed #{team.seed || idx + 1}
                    </span>
                    {team.aggregateSkill ? (
                      <span className="text-[11px] font-mono text-ink-muted font-bold">
                        Skill: {team.aggregateSkill}★
                      </span>
                    ) : null}
                  </div>

                  <h4 className="text-base font-extrabold text-ink truncate">{team.name}</h4>

                  <div className="pt-2 border-t border-courtborder space-y-1 text-xs">
                    <div className="flex items-center justify-between text-ink">
                      <span>👤 {p1?.name || 'TBD'}</span>
                      <span className="text-ink-muted text-[10px]">{p1?.skillLevel ? `Tier ${p1.skillLevel}★` : 'Unrated'}</span>
                    </div>
                    <div className="flex items-center justify-between text-ink">
                      <span>👤 {p2?.name || 'TBD'}</span>
                      <span className="text-ink-muted text-[10px]">{p2?.skillLevel ? `Tier ${p2.skillLevel}★` : 'Unrated'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* TAB 4: PLAYOFF BRACKET */}
      {activeTab === 'bracket' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink-muted">Playoff Progression Tree</h3>
            <button
              type="button"
              onClick={() => setShowTreeModal(true)}
              className="text-xs text-brand hover:underline font-bold"
            >
              Enlarge Tree ⛶
            </button>
          </div>
          <KnockoutBracket
            matches={Object.values(state.matches || {}).filter(m => m && m.stage !== 'group')}
            teams={state.teams}
            players={state.players}
            highlightTeamId={filterTeamId}
            onSelectTeam={(tId) => handleOpenTeamInspector(tId)}
          />
        </div>
      )}

      {/* TAB 3: STANDINGS & KNOCKOUT BRACKET */}
      {activeTab === 'standings' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Group Standings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(state.groups || {}).map((grp) => {
                const groupMatches = grp.matchIds.map(id => state.matches?.[id]).filter(Boolean);
                const standings = calculateGroupStandings(grp.teamIds, groupMatches);

                return (
                  <div key={grp.id} className="bg-surface border border-courtborder rounded-3xl p-5 shadow-sm overflow-hidden transition-colors duration-200">
                    <h4 className="text-sm font-black text-ink mb-3 flex items-center justify-between">
                      <span>{grp.name}</span>
                      <span className="text-[10px] text-ink-muted uppercase font-mono">Top Qualify for Playoff</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-courtborder text-ink-muted uppercase text-[10px]">
                            <th className="pb-2">Team</th>
                            <th className="pb-2 text-center">MP</th>
                            <th className="pb-2 text-center">W</th>
                            <th className="pb-2 text-center">L</th>
                            <th className="pb-2 text-center">PF</th>
                            <th className="pb-2 text-center">PA</th>
                            <th className="pb-2 text-right">PD</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-courtborder font-mono">
                          {standings.map((s, idx) => {
                            const team = state.teams?.[s.teamId];
                            const members = getTeamPlayerNames(team, state.players);

                            return (
                              <tr
                                key={s.teamId}
                                onClick={() => team && handleOpenTeamInspector(team.id)}
                                className="cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition"
                              >
                                <td className="py-2.5 font-sans font-medium text-ink">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-mono w-3.5 ${idx < 2 ? 'text-brand font-bold' : 'text-ink-muted'}`}>
                                      {idx + 1}.
                                    </span>
                                    <span className="font-bold truncate max-w-[130px] hover:underline">
                                      {team?.name}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-ink-muted block truncate max-w-[180px] pl-5">
                                    👤 {members}
                                  </span>
                                </td>
                                <td className="py-2.5 text-center text-ink-muted">{s.played}</td>
                                <td className="py-2.5 text-center font-bold text-brand">{s.won}</td>
                                <td className="py-2.5 text-center text-rose-500 font-bold">{s.lost}</td>
                                <td className="py-2.5 text-center text-ink-muted">{s.pointsFor}</td>
                                <td className="py-2.5 text-center text-ink-muted">{s.pointsAgainst}</td>
                                <td className={`py-2.5 text-right font-bold ${s.pointDifferential >= 0 ? 'text-brand' : 'text-rose-500'}`}>
                                  {s.pointDifferential > 0 ? `+${s.pointDifferential}` : s.pointDifferential}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Playoff Progression Tree</h3>
              <button
                type="button"
                onClick={() => setShowTreeModal(true)}
                className="text-xs text-purple-400 hover:underline font-bold"
              >
                Enlarge Tree ⛶
              </button>
            </div>
            <KnockoutBracket
              matches={Object.values(state.matches || {}).filter(m => m && m.stage !== 'group')}
              teams={state.teams}
              players={state.players}
              highlightTeamId={filterTeamId}
              onSelectTeam={(tId) => handleOpenTeamInspector(tId)}
            />
          </div>
        </div>
      )}

      {/* Team Lineup Inspector Modal */}
      <TeamOverviewModal
        teams={state.teams}
        players={state.players}
        selectedTeamId={inspectedTeamId}
        isOpen={showTeamOverviewModal}
        onClose={() => setShowTeamOverviewModal(false)}
        onSelectTeam={(tId) => setInspectedTeamId(tId)}
      />

      {/* Full Tree Modal */}
      {showTreeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-5xl rounded-3xl border border-courtborder bg-surface p-6 flex flex-col max-h-[95vh] overflow-y-auto text-ink">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h4 className="text-base font-extrabold text-white">🌳 Playoff Bracket Tree</h4>
              <button
                onClick={() => setShowTreeModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Close Tree
              </button>
            </div>
            <KnockoutBracket
              matches={Object.values(state.matches || {}).filter(m => m && m.stage !== 'group')}
              teams={state.teams}
              players={state.players}
              highlightTeamId={filterTeamId}
              onSelectTeam={(tId) => handleOpenTeamInspector(tId)}
              isFullScreenModal={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

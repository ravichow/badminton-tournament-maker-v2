import React, { useState } from 'react';
import { TournamentState, Match, IncidentTag, Player, Team, Court } from '../types/tournament';
import { ScoreModal } from './ScoreModal';
import { exportElementAsPdf, downloadOneGlanceSnapshot } from '../utils/exportVisuals';
import { generateTournamentDebrief, OPENING_BRIEFING_SCRIPT } from '../utils/debrief';
import { calculateGroupStandings, pairPlayersIntoTeams, buildDynamicTournamentStructure, getTeamPlayerNames, getMatchCourtConflict } from '../utils/engine';
import { RosterManagerModal } from './RosterManagerModal';
import { TeamRosterEditorModal } from './TeamRosterEditorModal';
import { TournamentGlanceView } from './TournamentGlanceView';
import { KnockoutBracket } from './KnockoutBracket';
import { TeamOverviewModal } from './TeamOverviewModal';
import { EndTournamentModal } from './EndTournamentModal';
import { TournamentsHubModal } from './TournamentsHubModal';
import { MoreMenuModal } from './MoreMenuModal';
import { SelectMatchModal } from './SelectMatchModal';
import { CourtCard } from './CourtCard';
import { WaitingMatchesCard } from './WaitingMatchesCard';
import { MatchCompletedModal } from './MatchCompletedModal';

interface AdminProps {
  state: TournamentState;
  onUpdateState: (newState: TournamentState) => void;
  onExitAdmin: () => void;
  onResetPin: (newPin: string) => void;
  onDeleteTournament: (tournamentId: string) => void;
  onSwitchTournament: (tournamentId: string) => void;
  onCreateUpcoming: (name: string, date: string) => void;
  activeTab: 'matches' | 'teams' | 'standings' | 'bracket';
  onTabChange: (tab: 'matches' | 'teams' | 'standings' | 'bracket') => void;
  onOpenQuickSetup?: () => void;
  onOpenQRCode?: () => void;
  isLargeText?: boolean;
  onToggleLargeText?: () => void;
}

export const AdminDashboard: React.FC<AdminProps> = ({
  state,
  onUpdateState,
  onExitAdmin,
  onResetPin,
  onDeleteTournament,
  onSwitchTournament,
  onCreateUpcoming,
  activeTab,
  onTabChange,
  onOpenQuickSetup,
  onOpenQRCode,
  isLargeText = false,
  onToggleLargeText,
}) => {
  // Modal states
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [celebratedMatch, setCelebratedMatch] = useState<{ match: Match; winner?: Team; loser?: Team } | null>(null);
  const [dispatchCourt, setDispatchCourt] = useState<Court | null>(null);
  const [showMoreModal, setShowMoreModal] = useState<boolean>(false);
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);
  const [showLineupsModal, setShowLineupsModal] = useState<boolean>(false);
  const [showTreeModal, setShowTreeModal] = useState<boolean>(false);
  const [showGlanceView, setShowGlanceView] = useState<boolean>(false);
  const [inspectedTeamId, setInspectedTeamId] = useState<string | null>(null);
  const [showTeamOverviewModal, setShowTeamOverviewModal] = useState<boolean>(false);
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [showHubModal, setShowHubModal] = useState<boolean>(false);
  const [showDebriefModal, setShowDebriefModal] = useState<boolean>(false);
  const [showSpeechModal, setShowSpeechModal] = useState<boolean>(false);
  const [showPinResetModal, setShowPinResetModal] = useState<boolean>(false);
  const [newOrganizerPin, setNewOrganizerPin] = useState<string>('');
  const [showDelegationModal, setShowDelegationModal] = useState<boolean>(false);
  const [delegationPin, setDelegationPin] = useState<string>('');
  const [delegatedPlayer, setDelegatedPlayer] = useState<string>('');

  const isTournamentEnded = state.currentStage === 'completed' || state.currentStage === 'aborted';

  // Waiting matches (matches that have both teams ready, not completed, and not currently on court)
  const waitingMatches = Object.values(state.matches || {}).filter(
    (m) => m && !m.isComplete && !m.courtId && m.team1Id && m.team2Id
  );

  const handleOpenTeamInspector = (teamId: string) => {
    setInspectedTeamId(teamId);
    setShowTeamOverviewModal(true);
  };

  const handleScoreSubmit = (
    matchId: string,
    s1: number,
    s2: number,
    rating: number,
    notes: string,
    incidents: IncidentTag[]
  ) => {
    const targetMatch = state.matches[matchId];
    if (!targetMatch) return;

    const winnerId = s1 > s2 ? targetMatch.team1Id : targetMatch.team2Id;
    const loserId = s1 > s2 ? targetMatch.team2Id : targetMatch.team1Id;

    const updatedMatch: Match = {
      ...targetMatch,
      score1: s1,
      score2: s2,
      isComplete: true,
      winnerId,
      loserId,
      startTime: targetMatch.startTime || (Date.now() - 15 * 60 * 1000),
      endTime: Date.now(),
      review: {
        rating: rating as any,
        notes,
        incidents,
        submittedAt: Date.now(),
      },
    };

    const newMatches = { ...state.matches, [matchId]: updatedMatch };

    // Advance winner to target match (e.g. final)
    if (updatedMatch.nextMatchId && winnerId) {
      const nextMatch = newMatches[updatedMatch.nextMatchId];
      if (nextMatch) {
        const clonedNext = { ...nextMatch };
        if (!clonedNext.team1Id) clonedNext.team1Id = winnerId;
        else if (!clonedNext.team2Id) clonedNext.team2Id = winnerId;
        newMatches[updatedMatch.nextMatchId] = clonedNext;
      }
    }

    // Advance loser to 3rd-place playoff
    if (updatedMatch.loserNextMatchId && loserId) {
      const loserMatch = newMatches[updatedMatch.loserNextMatchId];
      if (loserMatch) {
        const clonedLoser = { ...loserMatch };
        if (!clonedLoser.team1Id) clonedLoser.team1Id = loserId;
        else if (!clonedLoser.team2Id) clonedLoser.team2Id = loserId;
        newMatches[updatedMatch.loserNextMatchId] = clonedLoser;
      }
    }

    // Free court
    const newCourts = { ...state.courts };
    for (const cKey of Object.keys(newCourts)) {
      if (newCourts[cKey].currentMatchId === matchId) {
        newCourts[cKey].currentMatchId = null;
      }
    }

    // AUTOMATIC KNOCKOUT POPULATION: Check if all group stage matches are now completed
    let newStage = state.currentStage;
    const allGroupMatches = Object.values(newMatches).filter(m => m && m.stage === 'group');
    const allGroupsFinished = allGroupMatches.length > 0 && allGroupMatches.every(m => m.isComplete);

    if (allGroupsFinished) {
      newStage = 'knockout';
      const grpAll = state.groups['grp_all'];
      const grpA = state.groups['grp_a'];
      const grpB = state.groups['grp_b'];

      if (grpAll) {
        const standings = calculateGroupStandings(
          grpAll.teamIds,
          grpAll.matchIds.map(id => newMatches[id]).filter(Boolean)
        );

        if (standings.length >= 4 && newMatches['m_semi_1'] && newMatches['m_semi_2']) {
          // Auto-seed 4-team Semifinals: Rank 1 vs 4, Rank 2 vs 3
          if (!newMatches['m_semi_1'].team1Id) {
            newMatches['m_semi_1'] = {
              ...newMatches['m_semi_1'],
              team1Id: standings[0].teamId,
              team2Id: standings[3].teamId,
            };
          }
          if (!newMatches['m_semi_2'].team1Id) {
            newMatches['m_semi_2'] = {
              ...newMatches['m_semi_2'],
              team1Id: standings[1].teamId,
              team2Id: standings[2].teamId,
            };
          }
        } else if (standings.length >= 2 && newMatches['m_final']) {
          if (!newMatches['m_final'].team1Id) {
            newMatches['m_final'] = {
              ...newMatches['m_final'],
              team1Id: standings[0].teamId,
              team2Id: standings[1].teamId,
            };
          }
          if (standings.length >= 4 && newMatches['m_third_place'] && !newMatches['m_third_place'].team1Id) {
            newMatches['m_third_place'] = {
              ...newMatches['m_third_place'],
              team1Id: standings[2].teamId,
              team2Id: standings[3].teamId,
            };
          }
        }
      } else if (grpA && grpB) {
        const stdA = calculateGroupStandings(
          grpA.teamIds,
          grpA.matchIds.map(id => newMatches[id]).filter(Boolean)
        );
        const stdB = calculateGroupStandings(
          grpB.teamIds,
          grpB.matchIds.map(id => newMatches[id]).filter(Boolean)
        );

        if (stdA.length >= 2 && stdB.length >= 2) {
          if (newMatches['m_semi_1'] && !newMatches['m_semi_1'].team1Id) {
            newMatches['m_semi_1'] = {
              ...newMatches['m_semi_1'],
              team1Id: stdA[0].teamId,
              team2Id: stdB[1].teamId,
            };
          }
          if (newMatches['m_semi_2'] && !newMatches['m_semi_2'].team1Id) {
            newMatches['m_semi_2'] = {
              ...newMatches['m_semi_2'],
              team1Id: stdB[0].teamId,
              team2Id: stdA[1].teamId,
            };
          }
        }
      }
    }

    // AUTOMATIC TOURNAMENT COMPLETION CHECK
    const allMatchesList = Object.values(newMatches);
    const finalMatch = newMatches['m_final'];
    const thirdMatch = newMatches['m_third_place'];
    const isFinalDone = finalMatch ? Boolean(finalMatch.isComplete) : false;
    const isThirdDone = thirdMatch ? Boolean(thirdMatch.isComplete) : true;
    const allAssignedMatchesComplete = allMatchesList.length > 0 &&
      allMatchesList.filter(m => m.team1Id && m.team2Id).every(m => m.isComplete);

    const isTournamentOver = (isFinalDone && isThirdDone) || (allGroupsFinished && allAssignedMatchesComplete && finalMatch?.isComplete);

    let endedAt = state.endedAt;
    if (isTournamentOver) {
      newStage = 'completed';
      endedAt = Date.now();
      // Auto-redirect to standings page so user immediately sees final podium and rankings
      onTabChange('standings');
    }

    onUpdateState({
      ...state,
      currentStage: newStage,
      matches: newMatches,
      courts: newCourts,
      endedAt,
    });
  };

  const handleAssignCourt = (matchId: string, courtId: string) => {
    const candidateMatch = state.matches[matchId];
    const conflict = getMatchCourtConflict(candidateMatch, state.courts, state.matches, state.teams, state.players, courtId);
    if (conflict) {
      alert(`Cannot send match to court:\n${conflict}. Please wait for their match to finish.`);
      return;
    }

    const newCourts = { ...state.courts };
    const newMatches = { ...state.matches };

    if (newCourts[courtId].currentMatchId) {
      const prevMatchId = newCourts[courtId].currentMatchId!;
      newMatches[prevMatchId] = { ...newMatches[prevMatchId], courtId: null };
    }

    newCourts[courtId].currentMatchId = matchId;
    newMatches[matchId] = {
      ...newMatches[matchId],
      courtId,
      startTime: Date.now(),
    };

    onUpdateState({
      ...state,
      courts: newCourts,
      matches: newMatches,
    });
  };

  const handleAdvanceToKnockouts = () => {
    const grpA = state.groups['grp_a'];
    const grpB = state.groups['grp_b'];
    const grpAll = state.groups['grp_all'];
    const newMatches = { ...state.matches };

    if (grpAll) {
      const allMatches = grpAll.matchIds.map(id => state.matches[id]).filter(Boolean);
      const standings = calculateGroupStandings(grpAll.teamIds, allMatches);

      if (standings.length >= 4 && newMatches['m_semi_1'] && newMatches['m_semi_2']) {
        newMatches['m_semi_1'] = {
          ...newMatches['m_semi_1'],
          team1Id: standings[0].teamId,
          team2Id: standings[3].teamId,
        };
        newMatches['m_semi_2'] = {
          ...newMatches['m_semi_2'],
          team1Id: standings[1].teamId,
          team2Id: standings[2].teamId,
        };
      } else if (standings.length >= 2) {
        newMatches['m_final'] = {
          ...(newMatches['m_final'] || {}),
          id: 'm_final',
          stage: 'final',
          stageIdentifier: 'GRAND FINALE',
          courtId: null,
          team1Id: standings[0].teamId,
          team2Id: standings[1].teamId,
        };
        if (standings.length >= 4 && newMatches['m_third_place']) {
          newMatches['m_third_place'] = {
            ...newMatches['m_third_place'],
            stageIdentifier: '3rd Prize/Position',
            team1Id: standings[2].teamId,
            team2Id: standings[3].teamId,
          };
        }
      }

      onUpdateState({
        ...state,
        currentStage: 'knockout',
        matches: newMatches,
      });

      alert(`Knockout Stage generated! Top 2 teams advanced to the Championship Final.`);
      return;
    }

    if (grpA && grpB) {
      const matchesA = grpA.matchIds.map(id => state.matches[id]).filter(Boolean);
      const matchesB = grpB.matchIds.map(id => state.matches[id]).filter(Boolean);

      const stdA = calculateGroupStandings(grpA.teamIds, matchesA);
      const stdB = calculateGroupStandings(grpB.teamIds, matchesB);

      if (stdA.length < 2 || stdB.length < 2) {
        alert('Both Group A and Group B require at least 2 teams to seed playoffs.');
        return;
      }

      if (newMatches['m_semi_1']) {
        newMatches['m_semi_1'] = {
          ...newMatches['m_semi_1'],
          team1Id: stdA[0].teamId,
          team2Id: stdB[1].teamId,
        };
      }

      if (newMatches['m_semi_2']) {
        newMatches['m_semi_2'] = {
          ...newMatches['m_semi_2'],
          team1Id: stdB[0].teamId,
          team2Id: stdA[1].teamId,
        };
      }

      onUpdateState({
        ...state,
        currentStage: 'knockout',
        matches: newMatches,
      });

      alert('Knockout Stage generated! Semifinalists seeded from Group standings.');
    }
  };

  const handleGenerateCustomTournament = (
    selectedPlayers: Player[], 
    mode: 'anti-stack' | 'random',
    customName?: string,
    pointsToWin: 15 | 21 = 15
  ) => {
    const playersMap: Record<string, Player> = {};
    selectedPlayers.forEach(p => { playersMap[p.id] = p; });

    const newTeams = pairPlayersIntoTeams(selectedPlayers, mode);
    const teamsMap: Record<string, Team> = {};
    newTeams.forEach(t => { teamsMap[t.id] = t; });

    const { groups, matches } = buildDynamicTournamentStructure(newTeams);
    const firstGroupMatch = Object.values(matches).find(m => m.stage === 'group');

    onUpdateState({
      ...state,
      name: customName || state.name,
      rules: {
        ...state.rules,
        pointsToWin,
        deuceLead: 2,
        hardCap: 30,
      },
      currentStage: 'group',
      endReason: null,
      endedAt: null,
      players: playersMap,
      teams: teamsMap,
      groups,
      matches,
      courts: {
        ...state.courts,
        c1: { ...state.courts.c1, currentMatchId: firstGroupMatch?.id || null },
        c2: { ...state.courts.c2, currentMatchId: null },
      }
    });

    alert(`Tournament "${customName || state.name}" created with ${selectedPlayers.length} players! Rules: ${pointsToWin} points per game.`);
  };

  const handleShuffleCurrentTeams = () => {
    const currentList = Object.values(state.players);
    if (currentList.length < 4) {
      alert('Need at least 4 players to shuffle and generate a tournament.');
      return;
    }
    handleGenerateCustomTournament(currentList, 'random');
  };

  const handleConfirmEndTournament = (reason: string, status: 'completed' | 'aborted') => {
    onUpdateState({
      ...state,
      currentStage: status,
      endReason: reason,
      endedAt: Date.now(),
    });
  };

  const handleResetPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrganizerPin.length < 4) {
      alert('Organizer PIN must be at least 4 digits.');
      return;
    }
    onResetPin(newOrganizerPin);
    setShowPinResetModal(false);
    setNewOrganizerPin('');
    alert('Master PIN updated!');
  };

  const debrief = generateTournamentDebrief(state);

  return (
    <div className="space-y-6">
      {/* Top Segmented Tabs matching mockup: [ 📋 Matches ] [ 👥 Teams ] [ 🏆 Standings ] */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex p-1.5 rounded-2xl bg-surface border border-courtborder shadow-xs w-full sm:w-auto justify-around sm:justify-start">
          <button
            type="button"
            onClick={() => onTabChange('matches')}
            className={`flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 ${
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
            className={`flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 ${
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
            className={`flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 ${
              activeTab === 'standings'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-ink-muted hover:text-ink hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>🏆</span>
            <span>Standings</span>
          </button>
        </div>


      </div>

      {/* TAB 1: MATCHES VIEW (Default - Clean 2-Court Grid + Waiting Matches Card) */}
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

          {/* Section Title */}
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
            {state.currentStage === 'group' && !isTournamentEnded && (
              <button
                type="button"
                onClick={handleAdvanceToKnockouts}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>⚡ Seed Knockout Playoff</span>
              </button>
            )}
          </div>

          {/* 3-Column Grid on Desktop / Tablet (Court 1, Court 2, Waiting Matches) */}
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
                  isAdmin={true}
                  isTournamentEnded={isTournamentEnded}
                  onEnterScore={(m) => setSelectedMatch(m)}
                  onOpenDispatch={(c) => setDispatchCourt(c)}
                  onInspectTeam={(tId) => handleOpenTeamInspector(tId)}
                  courts={state.courts}
                  allMatches={state.matches}
                  waitingMatches={waitingMatches}
                  onQuickDispatch={handleAssignCourt}
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
              isAdmin={true}
              onSelectMatchToSend={(m) => {
                // Find first available court or prompt
                const freeCourt = Object.values(state.courts).find(c => !c.currentMatchId);
                if (freeCourt) {
                  handleAssignCourt(m.id, freeCourt.id);
                } else {
                  setDispatchCourt(Object.values(state.courts)[0]);
                }
              }}
              onInspectTeam={(tId) => handleOpenTeamInspector(tId)}
            />
          </div>
        </div>
      )}

      {/* TAB 2: TEAMS VIEW */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink-muted">
              Teams & Players ({Object.keys(state.teams || {}).length} Pairs)
            </h3>
            <div className="flex items-center gap-2">
              {onOpenQuickSetup && (
                <button
                  type="button"
                  onClick={onOpenQuickSetup}
                  className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-brand-text text-xs font-black shadow transition active:scale-95 flex items-center gap-1"
                >
                  <span>⚡</span>
                  <span>Quick Setup</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLineupsModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-ink text-xs font-bold border border-courtborder shadow transition"
              >
                🔄 Edit Lineups
              </button>
            </div>
          </div>

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
            onSelectMatch={(m) => setSelectedMatch(m)}
            onSelectTeam={(tId) => handleOpenTeamInspector(tId)}
          />
        </div>
      )}

      {/* TAB 3: STANDINGS & KNOCKOUT BRACKET */}
      {activeTab === 'standings' && (
        <div className="space-y-8">
          {/* Group Standings */}
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

          {/* Knockout Bracket Section */}
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
              onSelectMatch={(m) => setSelectedMatch(m)}
              onSelectTeam={(tId) => handleOpenTeamInspector(tId)}
            />
          </div>
        </div>
      )}

      {/* Select Match to Send to Court Modal */}
      {dispatchCourt && (
        <SelectMatchModal
          courtName={dispatchCourt.name}
          courtId={dispatchCourt.id}
          isOpen={!!dispatchCourt}
          matches={waitingMatches}
          courts={state.courts}
          allMatches={state.matches}
          teams={state.teams}
          players={state.players}
          onClose={() => setDispatchCourt(null)}
          onDispatch={handleAssignCourt}
        />
      )}

      {/* More Options Modal (Clean Progressive Disclosure) */}
      <MoreMenuModal
        isOpen={showMoreModal}
        isAdmin={true}
        isTournamentEnded={isTournamentEnded}
        onClose={() => setShowMoreModal(false)}
        onOpenSetup={() => setShowRosterModal(true)}
        onOpenLineups={() => setShowLineupsModal(true)}
        onReshuffle={() => {
          if (confirm('Re-shuffle all active players into new pairs and restart the tournament draw?')) {
            handleShuffleCurrentTeams();
          }
        }}
        onOpenEndTournament={() => setShowEndModal(true)}
        onDeleteTournament={() => onDeleteTournament(state.id)}
        onOpenDelegate={() => setShowDelegationModal(true)}
        onOpenSpeech={() => setShowSpeechModal(true)}
        onOpenChangePin={() => setShowPinResetModal(true)}
        onToggleSpectatorView={onExitAdmin}
        onOpenQRCode={() => {
          if (onOpenQRCode) {
            onOpenQRCode();
          } else {
            const btn = document.getElementById('btn-header-qr');
            btn?.click();
          }
        }}
        onOpenGlance={() => setShowGlanceView(true)}
        onOpenDebrief={() => setShowDebriefModal(true)}
        onOpenHub={() => setShowHubModal(true)}
        onOpenFullTree={() => setShowTreeModal(true)}
        onExitAdmin={onExitAdmin}
        isLargeText={isLargeText}
        onToggleLargeText={onToggleLargeText}
      />


      {/* Match Completed Celebration Modal */}
      {celebratedMatch && (
        <MatchCompletedModal
          isOpen={!!celebratedMatch}
          match={celebratedMatch.match}
          winnerTeam={celebratedMatch.winner}
          loserTeam={celebratedMatch.loser}
          onClose={() => setCelebratedMatch(null)}
          onNextMatch={() => {
            setCelebratedMatch(null);
            onTabChange('matches');
          }}
          onViewStandings={() => {
            setCelebratedMatch(null);
            onTabChange('standings');
          }}
        />
      )}

      {/* Score Entry Modal */}
      {selectedMatch && (
        <ScoreModal
          match={selectedMatch}
          team1={selectedMatch.team1Id ? state.teams[selectedMatch.team1Id] : undefined}
          team2={selectedMatch.team2Id ? state.teams[selectedMatch.team2Id] : undefined}
          players={state.players}
          rules={state.rules}
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onSubmit={handleScoreSubmit}
        />
      )}

      {/* Tournament Setup & Roster Modal */}
      <RosterManagerModal
        currentPlayers={state.players}
        currentTournamentName={state.name}
        currentPoints={(state.rules?.pointsToWin as 15 | 21) || 15}
        isOpen={showRosterModal}
        onClose={() => setShowRosterModal(false)}
        onGenerateTournament={handleGenerateCustomTournament}
      />

      {/* Team Roster & Lineups Editor Modal */}
      <TeamRosterEditorModal
        teams={state.teams}
        players={state.players}
        isOpen={showLineupsModal}
        onClose={() => setShowLineupsModal(false)}
        onSaveTeamsAndPlayers={(t, p) => onUpdateState({ ...state, teams: t, players: p })}
        onShuffleTeams={handleShuffleCurrentTeams}
      />

      {/* Team Lineup Inspector Modal */}
      <TeamOverviewModal
        teams={state.teams}
        players={state.players}
        selectedTeamId={inspectedTeamId}
        isOpen={showTeamOverviewModal}
        onClose={() => setShowTeamOverviewModal(false)}
        onSelectTeam={(tId) => setInspectedTeamId(tId)}
      />

      {/* End / Call Off Tournament Modal */}
      <EndTournamentModal
        tournamentName={state.name}
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onConfirmEnd={handleConfirmEndTournament}
      />

      {/* Tournaments Hub & Scouting Modal */}
      <TournamentsHubModal
        currentTournament={state}
        isOpen={showHubModal}
        isAdmin={true}
        onClose={() => setShowHubModal(false)}
        onSelectTournament={onSwitchTournament}
        onDeleteCurrentTournament={onDeleteTournament}
        onCreateUpcoming={onCreateUpcoming}
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
              onSelectMatch={(m) => { setSelectedMatch(m); setShowTreeModal(false); }}
              onSelectTeam={(tId) => handleOpenTeamInspector(tId)}
              isFullScreenModal={true}
            />
          </div>
        </div>
      )}

      {/* Single-Page Summary Modal */}
      {showGlanceView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl rounded-3xl border border-courtborder bg-surface p-6 max-h-[95vh] overflow-y-auto space-y-4 text-ink">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="text-base font-extrabold text-cyan-400">Single-Screen Tournament Glance</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadOneGlanceSnapshot('tournament-glance-sheet', state.name)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold"
                >
                  Download PNG
                </button>
                <button
                  onClick={() => exportElementAsPdf('tournament-glance-sheet', `${state.name}_Glance`)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => setShowGlanceView(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <TournamentGlanceView state={state} />
          </div>
        </div>
      )}

      {/* Opening Speech Modal */}
      {showSpeechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-courtborder bg-surface p-6 max-h-[85vh] overflow-y-auto text-ink">
            <h4 className="text-base font-extrabold text-emerald-400 mb-2">Organizer's Opening Speech</h4>
            <div className="bg-slate-950 p-4 rounded-2xl text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed border border-slate-800 mb-4">
              {OPENING_BRIEFING_SCRIPT
                .replace('{POINTS_TO_WIN}', state.rules.pointsToWin.toString())
                .replace('{DEUCE_TRIGGER}', (state.rules.pointsToWin - 1).toString())
                .replace('{DEUCE_TRIGGER}', (state.rules.pointsToWin - 1).toString())
                .replace('{HARD_CAP}', state.rules.hardCap.toString())
              }
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    OPENING_BRIEFING_SCRIPT
                      .replace('{POINTS_TO_WIN}', state.rules.pointsToWin.toString())
                      .replace('{DEUCE_TRIGGER}', (state.rules.pointsToWin - 1).toString())
                      .replace('{DEUCE_TRIGGER}', (state.rules.pointsToWin - 1).toString())
                      .replace('{HARD_CAP}', state.rules.hardCap.toString())
                  );
                  alert('Opening Speech copied!');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs text-emerald-400 border border-emerald-700"
              >
                Copy Speech
              </button>
              <button
                onClick={() => setShowSpeechModal(false)}
                className="px-5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debrief Report Modal */}
      {showDebriefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-courtborder bg-surface p-6 max-h-[85vh] overflow-y-auto text-ink">
            <h4 className="text-base font-extrabold text-white mb-1">Tournament Audit & Debrief</h4>
            <div className="grid grid-cols-2 gap-3 text-xs my-4">
              <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase">Total Completed</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{debrief.totalMatchesPlayed}</span>
              </div>
              <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase">Avg Match Time</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{debrief.averageMatchDurationMinutes}m</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowDebriefModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {showPinResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <form onSubmit={handleResetPinSubmit} className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h4 className="text-base font-extrabold text-white mb-2">Change Master PIN</h4>
            <p className="text-xs text-slate-400 mb-4">
              Current PIN: <code className="text-emerald-400">{state.adminPin}</code>
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="Enter new 4+ digit PIN..."
              value={newOrganizerPin}
              onChange={(e) => setNewOrganizerPin(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white font-mono text-center mb-4 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPinResetModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"
              >
                Update PIN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delegate PIN Modal */}
      {showDelegationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h4 className="text-base font-bold text-white mb-2">Temporary Organizer Handover</h4>
            <p className="text-xs text-slate-400 mb-4">
              Delegate admin rights for 60 minutes while you are playing your match on court.
            </p>
            <label className="text-xs text-slate-400 font-semibold uppercase">Temporary 4-Digit PIN</label>
            <input
              type="text"
              maxLength={4}
              value={delegationPin}
              onChange={(e) => setDelegationPin(e.target.value)}
              placeholder="e.g. 4821"
              className="w-full mt-1 mb-4 rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDelegationModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateState({
                    ...state,
                    delegation: {
                      activePin: delegationPin,
                      delegatedPlayerId: delegatedPlayer || null,
                      expiresAt: Date.now() + 60 * 60 * 1000,
                    },
                  });
                  setShowDelegationModal(false);
                  alert(`Temporary PIN ${delegationPin} active for 60 mins!`);
                }}
                disabled={delegationPin.length !== 4}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-50"
              >
                Activate PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

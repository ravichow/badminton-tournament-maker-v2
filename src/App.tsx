import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { TournamentState, Match, Player, Team, Court, PredefinedRoster, PredefinedTeam } from './types/tournament';
import { LandingPageView } from './components/LandingPageView';
import { PredefinedRosterModal } from './components/PredefinedRosterModal';
import { loadPredefinedRosterFromStorage, savePredefinedRosterToStorage } from './initialData';
import { fetchPredefinedRoster, syncPredefinedRoster, subscribePredefinedRoster, fetchAllTournaments, isD1Configured } from './services/api';
import { buildDefaultTournament, getTodaySlug, sanitizeTournamentState, markTournamentNumberUsed, getTodayFormattedWithTime } from './initialData';
import { AdminDashboard } from './components/AdminDashboard';
import { SpectatorView } from './components/SpectatorView';
import { syncTournamentState, subscribeTournament, deleteTournamentFromD1 } from './services/api';
import { QRCodeModal } from './components/QRCodeModal';
import { TournamentsHubModal } from './components/TournamentsHubModal';
import { MoreMenuModal } from './components/MoreMenuModal';
import { BottomNav } from './components/BottomNav';
import { QuickSetupModal } from './components/QuickSetupModal';
import { TournamentGlanceView } from './components/TournamentGlanceView';
import { KnockoutBracket } from './components/KnockoutBracket';
import { RosterManagerModal } from './components/RosterManagerModal';
import { TeamRosterEditorModal } from './components/TeamRosterEditorModal';
import { EndTournamentModal } from './components/EndTournamentModal';
import { ActiveConflictModal } from './components/ActiveConflictModal';
import { exportElementAsPdf, downloadOneGlanceSnapshot } from './utils/exportVisuals';
import { generateTournamentDebrief, OPENING_BRIEFING_SCRIPT } from './utils/debrief';
import { pairPlayersIntoTeams, buildDynamicTournamentStructure } from './utils/engine';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-rose-800 p-6 rounded-3xl max-w-md shadow-2xl space-y-4">
            <span className="text-4xl">🏸</span>
            <h2 className="text-lg font-black text-rose-400">Application Notice</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              An unexpected display issue occurred. Click below to refresh your view cleanly.
            </p>
            {this.state.error && (
              <p className="text-[11px] text-rose-300 font-mono bg-slate-950 p-2 rounded-xl text-left overflow-auto max-h-24">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow transition active:scale-95"
            >
              Refresh View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const TournamentApp: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTournamentId = urlParams.get('t') || '';
  const [currentView, setCurrentView] = useState<'home' | 'tournament'>(() => {
    return initialTournamentId ? 'tournament' : 'home';
  });
  const [currentId, setCurrentId] = useState<string>(initialTournamentId);

  const [predefinedRoster, setPredefinedRoster] = useState<PredefinedRoster>(() => {
    return loadPredefinedRosterFromStorage();
  });
  const [showPredefinedModal, setShowPredefinedModal] = useState<boolean>(false);
  const [archivedTournaments, setArchivedTournaments] = useState<TournamentState[]>([]);
  const [activeConflict, setActiveConflict] = useState<{
    activeTournament: TournamentState;
    onProceed: () => void;
  } | null>(null);


  const [state, setState] = useState<TournamentState>(() => {
    if (initialTournamentId) {
      const slug = initialTournamentId.replace('tournament-', '');
      const saved = localStorage.getItem(`smashops_state_${initialTournamentId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return sanitizeTournamentState(parsed, slug);
        } catch (e) {}
      }
      return sanitizeTournamentState(null, slug);
    }
    // No tournament requested (Home view) - initialize in-memory template without writing to DB
    const template = buildDefaultTournament(8, 'template');
    return {
      ...template,
      id: '',
      currentStage: 'upcoming',
    };
  });

  // Dark / Light theme state with smooth persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('smashops_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    localStorage.setItem('smashops_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('smashops_is_admin') === 'true';
  });

  // Court Vision / Large Text state with local persistence
  const [isLargeText, setIsLargeText] = useState<boolean>(() => {
    return localStorage.getItem('btm_court_vision_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('btm_court_vision_mode', String(isLargeText));
    if (isLargeText) {
      document.documentElement.classList.add('court-vision-active');
      document.body.classList.add('court-vision-active');
      document.documentElement.style.fontSize = window.innerWidth <= 640 ? '20.5px' : '20px';
    } else {
      document.documentElement.classList.remove('court-vision-active');
      document.body.classList.remove('court-vision-active');
      document.documentElement.style.fontSize = '';
    }
  }, [isLargeText]);

  const handleToggleLargeText = () => {
    setIsLargeText((prev) => !prev);
  };

  // Default spectator view to 'standings'; organizer to 'matches'
  const [showQuickSetup, setShowQuickSetup] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'teams' | 'standings' | 'bracket'>(() => {
    const adminSaved = sessionStorage.getItem('smashops_is_admin') === 'true';
    return adminSaved ? 'matches' : 'standings';
  });

  const updateAdminStatus = (status: boolean) => {
    setIsAdmin(status);
    if (status) {
      sessionStorage.setItem('smashops_is_admin', 'true');
      setActiveTab('matches');
    } else {
      sessionStorage.removeItem('smashops_is_admin');
      setActiveTab('standings');
    }
  };

  const [pinInput, setPinInput] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [showHubModal, setShowHubModal] = useState<boolean>(false);
  const [showMoreModal, setShowMoreModal] = useState<boolean>(false);
  const [showGlanceModal, setShowGlanceModal] = useState<boolean>(false);
  const [showFullTreeModal, setShowFullTreeModal] = useState<boolean>(false);
  const [showDebriefModal, setShowDebriefModal] = useState<boolean>(false);
  const [showSpeechModal, setShowSpeechModal] = useState<boolean>(false);
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);
  const [showLineupsModal, setShowLineupsModal] = useState<boolean>(false);
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [newMasterPin, setNewMasterPin] = useState<string>('');
  const [showDelegateModal, setShowDelegateModal] = useState<boolean>(false);
  const [delegationPin, setDelegationPin] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>('');

  const handleAdminUpdateState = (newState: TournamentState) => {
    setState(newState);
    if (newState.id && currentView === 'tournament') {
      localStorage.setItem(`smashops_state_${newState.id}`, JSON.stringify(newState));
      if (isAdmin) {
        syncTournamentState(newState.id, newState).catch(() => {});
      }
    }
  };

  const handleSaveTournamentName = (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== state.name) {
      handleAdminUpdateState({ ...state, name: trimmed });
    }
    setIsEditingName(false);
  };

  useEffect(() => {
    fetchPredefinedRoster().then((remote) => {
      if (remote && Array.isArray(remote.teams) && Array.isArray(remote.players)) {
        setPredefinedRoster(remote);
        savePredefinedRosterToStorage(remote);
      }
    }).catch(console.error);

    const unsubscribe = subscribePredefinedRoster((remote) => {
      if (remote && Array.isArray(remote.teams) && Array.isArray(remote.players)) {
        setPredefinedRoster(remote);
        savePredefinedRosterToStorage(remote);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const refreshTournaments = () => {
    fetchAllTournaments().then((list) => {
      setArchivedTournaments(list);
    }).catch(console.error);
  };

  useEffect(() => {
    refreshTournaments();
  }, [currentId, currentView]);

  useEffect(() => {
    if (currentView !== 'tournament' || !currentId) return;

    const unsubscribe = subscribeTournament(currentId, (remoteData) => {
      if (remoteData && typeof remoteData === 'object') {
        const slug = currentId.replace('tournament-', '');
        const cleanState = sanitizeTournamentState(remoteData, slug);
        setState(cleanState);
        localStorage.setItem(`smashops_state_${currentId}`, JSON.stringify(cleanState));
      } else if (remoteData === null) {
        // Tournament does not exist in cloud database (or was deleted)
        // Clean local storage and return home - NEVER re-create a deleted tournament!
        localStorage.removeItem(`smashops_state_${currentId}`);
        handleGoHome();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentId, currentView]);

  const handleSavePredefinedRoster = async (updatedRoster: PredefinedRoster) => {
    setPredefinedRoster(updatedRoster);
    savePredefinedRosterToStorage(updatedRoster);
    try {
      await syncPredefinedRoster(updatedRoster);
    } catch (err) {
      console.error('Failed to sync predefined roster to Cloudflare D1:', err);
    }
  };

  const findActiveTournament = (): TournamentState | null => {
    // 1. Check current state if active
    if (state.id && (state.currentStage === 'group' || state.currentStage === 'knockout')) {
      return state;
    }
    // 2. Check archived tournaments
    const activeFromList = archivedTournaments.find(
      (t) => t.id && (t.currentStage === 'group' || t.currentStage === 'knockout')
    );
    return activeFromList || null;
  };

  const requestTournamentCreation = (createFn: () => void) => {
    const active = findActiveTournament();
    if (active) {
      setActiveConflict({
        activeTournament: active,
        onProceed: () => {
          // Re-evaluate in case multiple active tournaments existed
          requestTournamentCreation(createFn);
        },
      });
    } else {
      createFn();
    }
  };

  const handleCloseActiveAndProceed = async () => {
    if (!activeConflict) return;
    const { activeTournament, onProceed } = activeConflict;

    const closedTournament: TournamentState = {
      ...activeTournament,
      currentStage: 'completed',
      endedAt: Date.now(),
      endReason: 'Closed to start new tournament',
    };

    localStorage.setItem(`smashops_state_${closedTournament.id}`, JSON.stringify(closedTournament));
    if (isAdmin) {
      try {
        await syncTournamentState(closedTournament.id, closedTournament);
      } catch (e) {
        console.error(e);
      }
    }

    setArchivedTournaments((prev) =>
      prev.map((t) => (t.id === closedTournament.id ? closedTournament : t))
    );

    if (state.id === closedTournament.id) {
      setState(closedTournament);
    }

    setActiveConflict(null);
    onProceed();
  };

  const handleDeleteActiveAndProceed = async () => {
    if (!activeConflict) return;
    const { activeTournament, onProceed } = activeConflict;

    try {
      await deleteTournamentFromD1(activeTournament.id);
    } catch (e) {
      console.error(e);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`smashops_state_${activeTournament.id}`);
      } catch (e) {}
    }

    setArchivedTournaments((prev) =>
      prev.filter((t) => t.id !== activeTournament.id)
    );

    if (state.id === activeTournament.id) {
      const template = buildDefaultTournament(8, 'template');
      setState({
        ...template,
        id: '',
        currentStage: 'upcoming',
      });
    }

    setActiveConflict(null);
    onProceed();
  };

  const handleCancelActiveConflict = () => {
    setActiveConflict(null);
  };

  const handleLaunchWithPredefinedTeams = (
    selectedTeams: PredefinedTeam[],
    tournamentName: string,
    pointsToWin: 15 | 21
  ) => {
    requestTournamentCreation(() => {
      const teams: Team[] = selectedTeams.map((pt, idx) => ({
        id: pt.id || `team_${idx + 1}`,
        name: pt.name,
        playerIds: pt.playerIds,
        seed: pt.seed ?? idx + 1,
      }));

      const playersMapById = new Map<string, Player>(
        predefinedRoster.players.map((p) => [p.id, p])
      );

      const relevantPlayers: Player[] = [];
      teams.forEach((t) => {
        t.playerIds.forEach((pid) => {
          const found = playersMapById.get(pid);
          if (found && !relevantPlayers.some((p) => p.id === pid)) {
            relevantPlayers.push(found);
          }
        });
      });

      executeStartQuickTournament(teams, relevantPlayers, tournamentName, pointsToWin, 'balanced');
    });
  };

  const handleStartQuickTournament = (
    newTeams: Team[],
    allPlayers: Player[],
    tournamentName: string,
    pointsToWin: 15 | 21,
    format: 'balanced' | 'round-robin' | 'knockout'
  ) => {
    requestTournamentCreation(() => {
      executeStartQuickTournament(newTeams, allPlayers, tournamentName, pointsToWin, format);
    });
  };

  const executeStartQuickTournament = (
    newTeams: Team[],
    allPlayers: Player[],
    tournamentName: string,
    pointsToWin: 15 | 21,
    _format: 'balanced' | 'round-robin' | 'knockout'
  ) => {
    const playersMap: Record<string, Player> = {};
    allPlayers.forEach((p) => { playersMap[p.id] = p; });

    const teamsMap: Record<string, Team> = {};
    newTeams.forEach((t) => { teamsMap[t.id] = t; });

    const { groups, matches } = buildDynamicTournamentStructure(newTeams);
    const firstGroupMatch = Object.values(matches).find((m) => m.stage === 'group');
    if (firstGroupMatch) {
      firstGroupMatch.courtId = 'c1';
      firstGroupMatch.startTime = Date.now();
    }

    const newTournamentId = "tournament-" + Date.now().toString(36);
    const newTournament: TournamentState = {
      ...buildDefaultTournament(newTeams.length, newTournamentId.replace('tournament-', '')),
      id: newTournamentId,
      name: tournamentName,
      currentStage: 'group',
      endReason: null,
      endedAt: null,
      createdAt: Date.now(),
      players: playersMap,
      teams: teamsMap,
      groups,
      matches,
      rules: {
        pointsToWin,
        deuceLead: 2,
        hardCap: 30,
      },
      courts: {
        c1: { id: 'c1', name: 'Court 1', currentMatchId: firstGroupMatch?.id || null, isActive: true },
        c2: { id: 'c2', name: 'Court 2', currentMatchId: null, isActive: true },
      },
    };

    markTournamentNumberUsed();
    setState(newTournament);
    setCurrentId(newTournamentId);
    setShowQuickSetup(false);
    setActiveTab('matches');
    updateAdminStatus(true);
    setCurrentView('tournament');
    const url = new URL(window.location.href);
    url.searchParams.set('t', newTournamentId);
    window.history.pushState({}, '', url.toString());

    localStorage.setItem(`smashops_state_${newTournamentId}`, JSON.stringify(newTournament));
    syncTournamentState(newTournamentId, newTournament).catch(() => {});
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const isMasterPin = pinInput === state.adminPin;
    const isDelegatedPin = 
      state.delegation && 
      state.delegation.activePin === pinInput && 
      Date.now() < state.delegation.expiresAt;

    if (isMasterPin || isDelegatedPin) {
      updateAdminStatus(true);
      setShowAuthModal(false);
      setPinInput('');
    } else {
      setAuthError('Invalid PIN code or expired delegation.');
    }
  };

  const handleResetPin = (newPin: string) => {
    handleAdminUpdateState({
      ...state,
      adminPin: newPin,
    });
  };

  const handleSwitchTournament = (newTournamentId: string) => {
    setCurrentId(newTournamentId);
    const url = new URL(window.location.href);
    url.searchParams.set('t', newTournamentId);
    window.history.pushState({}, '', url.toString());

    const slug = newTournamentId.replace('tournament-', '');
    const saved = localStorage.getItem(`smashops_state_${newTournamentId}`);
    if (saved) {
      try {
        setState(sanitizeTournamentState(JSON.parse(saved), slug));
        setCurrentView('tournament');
        return;
      } catch (e) {}
    }
    setState(sanitizeTournamentState(null, slug));
    setCurrentView('tournament');
  };

  const handleDeleteTournament = async (tournamentId: string, skipConfirm = false) => {
    const target = archivedTournaments.find(t => t.id === tournamentId) || (state.id === tournamentId ? state : null);
    const targetName = target?.name || tournamentId;

    if (!skipConfirm) {
      if (!confirm(`Are you sure you want to permanently delete tournament "${targetName}"?\n\nAll recorded matches, scores, and standings will be erased.`)) {
        return;
      }
    }

    await deleteTournamentFromD1(tournamentId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`smashops_state_${tournamentId}`);
      } catch (e) {}
    }

    setArchivedTournaments((prev) => prev.filter((t) => t.id !== tournamentId));

    if (state.id === tournamentId || currentId === tournamentId) {
      handleGoHome();
    } else {
      refreshTournaments();
    }
  };

  const handleCreateUpcomingTournament = (name: string, date: string) => {
    const slug = date.replace(/-/g, '');
    const upcomingId = `tournament-${slug}`;
    const newUpcoming: TournamentState = {
      ...buildDefaultTournament(8, slug),
      id: upcomingId,
      name,
      currentStage: 'upcoming',
      scheduledDate: date,
      createdAt: new Date(date).getTime() || Date.now(),
    };

    localStorage.setItem(`smashops_state_${upcomingId}`, JSON.stringify(newUpcoming));
    if (isAdmin) {
      syncTournamentState(upcomingId, newUpcoming).catch(() => {});
    }
    alert(`Upcoming tournament "${name}" scheduled for ${date}!`);
  };

  const handleCreateCustomTournament = (
    selectedPlayers: Player[],
    mode: 'anti-stack' | 'random',
    customName?: string,
    pointsToWin: 15 | 21 = 15
  ) => {
    requestTournamentCreation(() => {
      executeCreateCustomTournament(selectedPlayers, mode, customName, pointsToWin);
    });
  };

  const executeCreateCustomTournament = (
    selectedPlayers: Player[],
    mode: 'anti-stack' | 'random',
    customName?: string,
    pointsToWin: 15 | 21 = 15
  ) => {
    const playersMap: Record<string, Player> = {};
    selectedPlayers.forEach((p) => { playersMap[p.id] = p; });

    const newTeams = pairPlayersIntoTeams(selectedPlayers, mode);
    const teamsMap: Record<string, Team> = {};
    newTeams.forEach((t) => { teamsMap[t.id] = t; });

    const { groups, matches } = buildDynamicTournamentStructure(newTeams);
    const firstGroupMatch = Object.values(matches).find((m) => m.stage === 'group');
    if (firstGroupMatch) {
      firstGroupMatch.courtId = 'c1';
      firstGroupMatch.startTime = Date.now();
    }

    const newTournamentId = "tournament-" + Date.now().toString(36);
    const finalName = customName?.trim() || getTodayFormattedWithTime();

    const newTournament: TournamentState = {
      ...buildDefaultTournament(newTeams.length, newTournamentId.replace('tournament-', '')),
      id: newTournamentId,
      name: finalName,
      currentStage: 'group',
      endReason: null,
      endedAt: null,
      createdAt: Date.now(),
      players: playersMap,
      teams: teamsMap,
      groups,
      matches,
      rules: {
        pointsToWin,
        deuceLead: 2,
        hardCap: 30,
      },
      courts: {
        c1: { id: 'c1', name: 'Court 1', currentMatchId: firstGroupMatch?.id || null, isActive: true },
        c2: { id: 'c2', name: 'Court 2', currentMatchId: null, isActive: true },
      },
    };

    markTournamentNumberUsed();
    setState(newTournament);
    setCurrentId(newTournamentId);
    setCurrentView('tournament');
    updateAdminStatus(true);
    setActiveTab('matches');

    const url = new URL(window.location.href);
    url.searchParams.set('t', newTournamentId);
    window.history.pushState({}, '', url.toString());

    localStorage.setItem(`smashops_state_${newTournamentId}`, JSON.stringify(newTournament));
    syncTournamentState(newTournamentId, newTournament).catch(() => {});

    alert(`Tournament "${finalName}" created with ${selectedPlayers.length} players! Rules: ${pointsToWin} points per game.`);
  };

  const handleGenerateCustomTournament = (selectedPlayers: Player[], mode: 'anti-stack' | 'random') => {
    const playersMap: Record<string, Player> = {};
    selectedPlayers.forEach(p => { playersMap[p.id] = p; });

    const newTeams = pairPlayersIntoTeams(selectedPlayers, mode);
    const teamsMap: Record<string, Team> = {};
    newTeams.forEach(t => { teamsMap[t.id] = t; });

    const { groups, matches } = buildDynamicTournamentStructure(newTeams);
    const firstGroupMatch = Object.values(matches).find(m => m.stage === 'group');

    handleAdminUpdateState({
      ...state,
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
  };

  const handleShuffleCurrentTeams = () => {
    const currentList = Object.values(state.players || {});
    if (currentList.length < 4) {
      alert('Need at least 4 players to shuffle and generate a tournament.');
      return;
    }
    handleGenerateCustomTournament(currentList, 'random');
  };

  const handleConfirmEndTournament = (reason: string, status: 'completed' | 'aborted') => {
    handleAdminUpdateState({
      ...state,
      currentStage: status,
      endReason: reason,
      endedAt: Date.now(),
    });
  };

  const numTeams = Object.keys(state.teams || {}).length;
  const numPlayers = Object.keys(state.players || {}).length;
  const stageName = state.currentStage === 'group' ? 'Group Stage' : state.currentStage === 'knockout' ? 'Knockout Stage' : state.currentStage === 'completed' ? 'Completed' : 'Aborted';
  const createdDateStr = new Date(state.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const debrief = generateTournamentDebrief(state);

  // Auto-redirect to Standings & Podium when tournament finishes
  useEffect(() => {
    if (state.currentStage === 'completed' && activeTab === 'matches') {
      setActiveTab('standings');
    }
  }, [state.currentStage]);

  const handleGoHome = () => {
    const template = buildDefaultTournament(8, 'template');
    setState({
      ...template,
      id: '',
      currentStage: 'upcoming',
    });
    setCurrentView('home');
    setCurrentId('');
    const url = new URL(window.location.href);
    url.searchParams.delete('t');
    window.history.pushState({}, '', url.toString());
    refreshTournaments();
  };

  if (currentView === 'home') {
    return (
      <div className={`min-h-screen bg-app text-ink font-sans transition-colors duration-200 selection:bg-brand selection:text-brand-text ${isLargeText ? "court-vision-active" : ""}`}>


        <LandingPageView
          roster={predefinedRoster}
          tournaments={archivedTournaments}
          isDarkMode={isDarkMode}
          isAdmin={isAdmin}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          isLargeText={isLargeText}
          onToggleLargeText={handleToggleLargeText}
          onOpenAuth={() => setShowAuthModal(true)}
          onExitAdmin={() => updateAdminStatus(false)}
          onLaunchPredefinedTournament={handleLaunchWithPredefinedTeams}
          onOpenQuickSetup={() => setShowQuickSetup(true)}
          onOpenPredefinedManager={() => setShowPredefinedModal(true)}
          onSelectTournament={handleSwitchTournament}
          onDeleteTournament={(id) => handleDeleteTournament(id, true)}
          onOpenHub={() => setShowHubModal(true)}
          hasCloudDb={isD1Configured()}
        />

        <ActiveConflictModal
          isOpen={Boolean(activeConflict)}
          activeTournament={activeConflict?.activeTournament || null}
          onCloseArchiveAndProceed={handleCloseActiveAndProceed}
          onDeleteAndProceed={handleDeleteActiveAndProceed}
          onCancel={handleCancelActiveConflict}
        />

        <QuickSetupModal
          isOpen={showQuickSetup}
          onClose={() => setShowQuickSetup(false)}
          onStartTournament={handleStartQuickTournament}
          existingTournamentName={state.name}
        />

        <PredefinedRosterModal
          isOpen={showPredefinedModal}
          roster={predefinedRoster}
          isAdmin={isAdmin}
          onClose={() => setShowPredefinedModal(false)}
          onSaveRoster={handleSavePredefinedRoster}
          onOpenAuth={() => setShowAuthModal(true)}
        />

        <TournamentsHubModal
          currentTournament={state}
          isOpen={showHubModal}
          isAdmin={isAdmin}
          onClose={() => setShowHubModal(false)}
          onSelectTournament={handleSwitchTournament}
          onDeleteCurrentTournament={(id) => handleDeleteTournament(id, true)}
          onCreateUpcoming={handleCreateUpcomingTournament}
        />

        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <form onSubmit={handleAuthSubmit} className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <h4 className="text-base font-extrabold text-white mb-1">Organizer Unlock</h4>
              <p className="text-xs text-slate-400 mb-4">
                Enter master PIN (default: <code className="text-emerald-400 font-bold">{state.adminPin}</code>) or delegated 4-digit PIN.
              </p>

              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN..."
                className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-3 text-white font-mono mb-2 focus:outline-none focus:border-emerald-500 text-center tracking-widest text-xl font-bold"
                autoFocus
              />

              {authError && <p className="text-xs text-rose-400 mb-3">{authError}</p>}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowAuthModal(false); setAuthError(''); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-app text-ink flex flex-col font-sans pb-24 sm:pb-8 transition-colors duration-200 selection:bg-brand selection:text-brand-text ${isLargeText ? "court-vision-active" : ""}`}>
      {/* Top Header Bar: Badminton Court Green */}
      <header className="border-b border-[#0b5440] dark:border-[#083b2d] bg-[#0d6e52] dark:bg-[#094735] text-white sticky top-0 z-40 transition-colors duration-200 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div 
            onClick={handleGoHome}
            className="flex items-center gap-2 cursor-pointer group shrink min-w-0"
            title="Click to go to Home"
          >
            <span className="text-2xl group-hover:scale-110 transition shrink-0">🏸</span>
            <span className="text-base font-black tracking-tight text-white group-hover:text-emerald-200 transition truncate hidden sm:inline">
              Badminton Tournament Manager
            </span>
            <span className="text-sm font-black tracking-tight text-white group-hover:text-emerald-200 transition sm:hidden">
              BTM
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Home / Hub Button */}
            <button
              type="button"
              onClick={handleGoHome}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold shadow-xs transition active:scale-95 shrink-0"
              title="Return to Home & Hub"
            >
              <span>🏠</span>
              <span>Home</span>
            </button>

            {/* Quick Setup Button */}
            <button
              type="button"
              onClick={() => setShowQuickSetup(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-xs transition active:scale-95 shrink-0"
              title="Fast Tournament Wizard"
            >
              <span>⚡</span>
              <span>Quick Setup</span>
            </button>

            {/* Organizer / Spectator Toggle */}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => updateAdminStatus(false)}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white border border-white/25 transition shadow-xs shrink-0"
                title="Switch to Spectator View"
              >
                <span>👁️</span>
                <span>Spectator</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white border border-white/25 transition shadow-xs shrink-0"
                title="Organizer Login"
              >
                <span>🔑</span>
                <span>Organizer</span>
              </button>
            )}

            {/* Spectator QR Code Button */}
            <button
              id="btn-header-qr"
              type="button"
              onClick={() => setShowQRModal(true)}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 shadow-xs transition shrink-0"
              title="Open Spectator QR Code"
            >
              <span>📱</span>
              <span>QR Code</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold transition shadow-xs flex items-center gap-1 shrink-0"
              title={isDarkMode ? 'Switch to Warm Forest (Light)' : 'Switch to Midnight Athletic (Dark)'}
            >
              <span>{isDarkMode ? '☀️' : '🌙'}</span>
              <span className="hidden md:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>

            {/* Enlarge Font Toggle Button (Compact aA Enlarge) */}
            <button
              type="button"
              onClick={handleToggleLargeText}
              className={`px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl border text-xs font-black transition shadow-xs flex items-center gap-1 shrink-0 active:scale-95 ${
                isLargeText
                  ? 'bg-white text-[#0d6e52] border-white shadow-sm ring-2 ring-white/50'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
              }`}
              title={isLargeText ? 'Enlarge Font is ON: Tap to reset' : 'Enlarge Font: Tap to increase text size'}
              aria-label="Toggle Enlarge Font"
            >
              <span className="font-extrabold flex items-baseline tracking-tighter shrink-0 select-none px-0.5">
                <span className="text-[10px] leading-none font-bold">a</span>
                <span className="text-xs leading-none font-black">A</span>
              </span>
              {isLargeText && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
            </button>

            {/* More Options Button */}
            <button
              id="btn-header-more"
              type="button"
              onClick={() => setShowMoreModal(true)}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-black transition shadow-xs flex items-center gap-1 shrink-0 active:scale-95"
              title="More Menu"
              aria-label="More Menu"
            >
              <span className="font-mono text-sm leading-none font-bold">···</span>
              <span className="hidden md:inline font-sans">More</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Tournament Title Banner in Body */}
        <div className="bg-surface border border-courtborder rounded-3xl p-4 sm:p-5 shadow-sm transition-colors duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="w-full sm:flex-1 min-w-0 text-left">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs uppercase font-black px-2.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 font-mono tracking-wide">
                {stageName}
              </span>
              <span className="text-xs text-ink-muted font-medium">📅 {createdDateStr}</span>
            </div>

            {isEditingName ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveTournamentName(editedName);
                }}
                className="flex items-center gap-2 mt-1.5 max-w-full"
              >
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  autoFocus
                  maxLength={60}
                  placeholder="Enter tournament name..."
                  className="flex-1 min-w-0 px-3.5 py-2 rounded-xl border-2 border-brand bg-surface text-ink text-base sm:text-xl font-black focus:outline-none focus:ring-2 focus:ring-brand/30 shadow-inner"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-brand-text text-xs font-black shadow transition shrink-0 flex items-center gap-1 active:scale-95"
                  title="Save Name"
                >
                  <span>✓</span>
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-ink text-xs font-bold border border-courtborder transition shrink-0 active:scale-95"
                  title="Cancel"
                >
                  ✕
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 group mt-0.5 max-w-full">
                <h2
                  onClick={() => {
                    if (isAdmin) {
                      setIsEditingName(true);
                      setEditedName(state.name);
                    }
                  }}
                  className={`text-lg sm:text-2xl font-black text-ink tracking-tight break-words max-w-full ${
                    isAdmin ? 'cursor-pointer hover:text-brand transition' : ''
                  }`}
                  title={isAdmin ? 'Click to rename tournament' : undefined}
                >
                  {state.name}
                </h2>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(true);
                      setEditedName(state.name);
                    }}
                    className="p-1.5 rounded-xl text-ink-muted hover:text-brand hover:bg-brand/10 transition shrink-0 opacity-70 group-hover:opacity-100"
                    title="Edit tournament name"
                    aria-label="Edit tournament name"
                  >
                    <span className="text-sm">✏️</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Interactive Quick-Setup Pill: Click Players to edit roster, click Teams to edit lineups */}
          <div className="flex items-center gap-1 text-xs font-bold bg-app p-1 rounded-2xl border border-courtborder self-start sm:self-auto shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  setShowRosterModal(true);
                } else {
                  setShowAuthModal(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-surface text-ink hover:text-brand hover:shadow-xs transition group cursor-pointer"
              title={isAdmin ? 'Click to edit player pool, ratings, and guests' : 'Organizer unlock to edit players'}
            >
              <span className="text-sm group-hover:scale-110 transition-transform">👥</span>
              <span className="font-extrabold">{numPlayers} Players</span>
              {isAdmin && <span className="text-[10px] text-ink-muted group-hover:text-brand font-black ml-0.5">✏️</span>}
            </button>

            <span className="text-ink-muted select-none font-bold">•</span>

            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  setShowLineupsModal(true);
                } else {
                  setShowAuthModal(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-surface text-ink hover:text-brand hover:shadow-xs transition group cursor-pointer"
              title={isAdmin ? 'Click to edit team names, rosters, and swap players' : 'Organizer unlock to edit teams'}
            >
              <span className="text-sm group-hover:scale-110 transition-transform">🏸</span>
              <span className="font-extrabold">{numTeams} Teams</span>
              {isAdmin && <span className="text-[10px] text-ink-muted group-hover:text-brand font-black ml-0.5">✏️</span>}
            </button>
          </div>
        </div>

        {isAdmin ? (
          <AdminDashboard
            state={state}
            onUpdateState={handleAdminUpdateState}
            onExitAdmin={() => updateAdminStatus(false)}
            onResetPin={handleResetPin}
            onDeleteTournament={handleDeleteTournament}
            onSwitchTournament={handleSwitchTournament}
            onCreateUpcoming={handleCreateUpcomingTournament}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenQuickSetup={() => setShowQuickSetup(true)}
            onOpenQRCode={() => setShowQRModal(true)}
            isLargeText={isLargeText}
            onToggleLargeText={handleToggleLargeText}
          />
        ) : (
          <SpectatorView
            state={state}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenMore={() => setShowMoreModal(true)}
            isLargeText={isLargeText}
            onToggleLargeText={handleToggleLargeText}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation (5-Tab Fast Access) */}
      <div className="sm:hidden">
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === "settings") {
              setShowMoreModal(true);
            } else {
              setActiveTab(tab);
            }
          }}
          activeMatchCount={Object.values(state.courts || {}).filter((c) => Boolean(c.currentMatchId)).length}
        />
      </div>

      {/* Modals */}

      <QuickSetupModal
        isOpen={showQuickSetup}
        onClose={() => setShowQuickSetup(false)}
        onStartTournament={handleStartQuickTournament}
        existingTournamentName={state.name}
      />

      <QRCodeModal
        tournamentName={state.name}
        tournamentId={state.id}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />

      <TournamentsHubModal
        currentTournament={state}
        isOpen={showHubModal}
        isAdmin={isAdmin}
        onClose={() => setShowHubModal(false)}
        onSelectTournament={handleSwitchTournament}
        onDeleteCurrentTournament={(id) => handleDeleteTournament(id, true)}
        onCreateUpcoming={handleCreateUpcomingTournament}
      />

      {showGlanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-700 bg-slate-900 p-6 max-h-[95vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="text-base font-extrabold text-cyan-400">Printable Glance Sheet & Report</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadOneGlanceSnapshot('tournament-glance-sheet', state.name)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold"
                >
                  Download PNG
                </button>
                <button
                  onClick={() => exportElementAsPdf('tournament-glance-sheet', `${state.name}_Glance`)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => setShowGlanceModal(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <TournamentGlanceView state={state} />
          </div>
        </div>
      )}

      {showFullTreeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-700 bg-slate-900 p-6 flex flex-col max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h4 className="text-base font-extrabold text-white">🌳 Playoff Bracket Tree</h4>
              <button
                onClick={() => setShowFullTreeModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Close Tree
              </button>
            </div>
            <KnockoutBracket
              matches={Object.values(state.matches || {}).filter(m => m && m.stage !== 'group')}
              teams={state.teams || {}}
              players={state.players || {}}
              isFullScreenModal={true}
            />
          </div>
        </div>
      )}

      {showDebriefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 max-h-[85vh] overflow-y-auto">
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

      {showSpeechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 max-h-[85vh] overflow-y-auto">
            <h4 className="text-base font-extrabold text-emerald-400 mb-2">Organizer's Opening Speech</h4>
            <div className="bg-slate-950 p-4 rounded-2xl text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed border border-slate-800 mb-4">
              {OPENING_BRIEFING_SCRIPT
                .replace('{POINTS_TO_WIN}', (state.rules?.pointsToWin || 15).toString())
                .replace('{DEUCE_TRIGGER}', ((state.rules?.pointsToWin || 15) - 1).toString())
                .replace('{DEUCE_TRIGGER}', ((state.rules?.pointsToWin || 15) - 1).toString())
                .replace('{HARD_CAP}', (state.rules?.hardCap || 30).toString())
              }
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    OPENING_BRIEFING_SCRIPT
                      .replace('{POINTS_TO_WIN}', (state.rules?.pointsToWin || 15).toString())
                      .replace('{DEUCE_TRIGGER}', ((state.rules?.pointsToWin || 15) - 1).toString())
                      .replace('{DEUCE_TRIGGER}', ((state.rules?.pointsToWin || 15) - 1).toString())
                      .replace('{HARD_CAP}', (state.rules?.hardCap || 30).toString())
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

      <RosterManagerModal
        currentPlayers={state.players || {}}
        currentTournamentName={state.name}
        currentPoints={(state.rules?.pointsToWin as 15 | 21) || 15}
        isOpen={showRosterModal}
        onClose={() => setShowRosterModal(false)}
        onGenerateTournament={handleCreateCustomTournament}
      />

      <TeamRosterEditorModal
        teams={state.teams || {}}
        players={state.players || {}}
        isOpen={showLineupsModal}
        onClose={() => setShowLineupsModal(false)}
        onSaveTeamsAndPlayers={(t, p) => handleAdminUpdateState({ ...state, teams: t, players: p })}
        onShuffleTeams={handleShuffleCurrentTeams}
      />

      <EndTournamentModal
        tournamentName={state.name}
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onConfirmEnd={handleConfirmEndTournament}
      />

      {showChangePinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (newMasterPin.length < 4) {
              alert('Organizer PIN must be at least 4 digits.');
              return;
            }
            handleResetPin(newMasterPin);
            setShowChangePinModal(false);
            setNewMasterPin('');
            alert('Organizer PIN successfully updated!');
          }} className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h4 className="text-base font-extrabold text-white mb-2">Change Master PIN</h4>
            <p className="text-xs text-slate-400 mb-4">
              Current PIN: <code className="text-emerald-400">{state.adminPin}</code>
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="Enter new 4+ digit PIN..."
              value={newMasterPin}
              onChange={(e) => setNewMasterPin(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white font-mono text-center mb-4 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowChangePinModal(false)}
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

      {showDelegateModal && (
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
                onClick={() => setShowDelegateModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAdminUpdateState({
                    ...state,
                    delegation: {
                      activePin: delegationPin,
                      delegatedPlayerId: null,
                      expiresAt: Date.now() + 60 * 60 * 1000,
                    },
                  });
                  setShowDelegateModal(false);
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

      <MoreMenuModal
        isOpen={showMoreModal}
        isAdmin={isAdmin}
        isTournamentEnded={state.currentStage === 'completed' || state.currentStage === 'aborted'}
        onClose={() => setShowMoreModal(false)}
        onOpenSetup={() => setShowRosterModal(true)}
        onOpenLineups={() => setShowLineupsModal(true)}
        onReshuffle={() => {
          if (confirm('Re-shuffle all active players into new pairs and restart the tournament draw?')) {
            handleShuffleCurrentTeams();
          }
        }}
        onOpenEndTournament={() => setShowEndModal(true)}
        onDeleteTournament={() => handleDeleteTournament(state.id)}
        onOpenDelegate={() => setShowDelegateModal(true)}
        onOpenSpeech={() => setShowSpeechModal(true)}
        onOpenChangePin={() => setShowChangePinModal(true)}
        onToggleSpectatorView={() => {
          if (isAdmin) {
            updateAdminStatus(false);
          } else {
            setShowAuthModal(true);
          }
        }}
        onOpenQRCode={() => setShowQRModal(true)}
        onOpenGlance={() => setShowGlanceModal(true)}
        onOpenDebrief={() => setShowDebriefModal(true)}
        onOpenHub={() => setShowHubModal(true)}
        onOpenFullTree={() => setShowFullTreeModal(true)}
        onExitAdmin={() => updateAdminStatus(false)}
        onGoHome={handleGoHome}
        onOpenPredefined={() => setShowPredefinedModal(true)}
        isLargeText={isLargeText}
        onToggleLargeText={handleToggleLargeText}
      />

      <PredefinedRosterModal
        isOpen={showPredefinedModal}
        roster={predefinedRoster}
        isAdmin={isAdmin}
        onClose={() => setShowPredefinedModal(false)}
        onSaveRoster={handleSavePredefinedRoster}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <form onSubmit={handleAuthSubmit} className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h4 className="text-base font-extrabold text-white mb-1">Organizer Unlock</h4>
            <p className="text-xs text-slate-400 mb-4">
              Enter master PIN (default: <code className="text-emerald-400 font-bold">{state.adminPin}</code>) or delegated 4-digit PIN.
            </p>

            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN..."
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-3 text-white font-mono mb-2 focus:outline-none focus:border-emerald-500 text-center tracking-widest text-xl font-bold"
              autoFocus
            />

            {authError && <p className="text-xs text-rose-400 mb-3">{authError}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setShowAuthModal(false); setAuthError(''); }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}

      <ActiveConflictModal
        isOpen={Boolean(activeConflict)}
        activeTournament={activeConflict?.activeTournament || null}
        onCloseArchiveAndProceed={handleCloseActiveAndProceed}
        onDeleteAndProceed={handleDeleteActiveAndProceed}
        onCancel={handleCancelActiveConflict}
      />
    </div>
  );
};

export const App: React.FC = () => (
  <ErrorBoundary>
    <TournamentApp />
  </ErrorBoundary>
);

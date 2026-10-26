import { TournamentState, Player, PredefinedRoster, PredefinedTeam } from './types/tournament';
import { pairPlayersIntoTeams, buildDynamicTournamentStructure } from './utils/engine';

export const DEFAULT_PREDEFINED_PLAYERS: Player[] = [
  { id: 'p1', name: 'Ravi', skillLevel: 4 },
  { id: 'p2', name: 'Viswa', skillLevel: 4 },
  { id: 'p3', name: 'Srinivas Angara', skillLevel: 4 },
  { id: 'p4', name: 'Bhaskar', skillLevel: 3 },
  { id: 'p5', name: 'Jaya', skillLevel: 3 },
  { id: 'p6', name: 'Azhar', skillLevel: 4 },
  { id: 'p7', name: 'Santosh', skillLevel: 3 },
  { id: 'p8', name: 'Vijai', skillLevel: 3 },
  { id: 'p9', name: 'Abhishek', skillLevel: 4 },
  { id: 'p10', name: 'Anand', skillLevel: 3 },
  { id: 'p11', name: 'Kiran', skillLevel: 3 },
  { id: 'p12', name: 'Deepak', skillLevel: 3 },
  { id: 'p13', name: 'Rahul', skillLevel: 3 },
  { id: 'p14', name: 'Vikram', skillLevel: 3 },
  { id: 'p15', name: 'Rohit', skillLevel: 3 },
  { id: 'p16', name: 'Suresh', skillLevel: 3 },
  { id: 'p17', name: 'Manoj', skillLevel: 3 },
  { id: 'p18', name: 'Pradeep', skillLevel: 3 },
  { id: 'p19', name: 'Sunil', skillLevel: 3 },
  { id: 'p20', name: 'Arun', skillLevel: 3 },
  { id: 'p21', name: 'Naveen', skillLevel: 3 },
  { id: 'p22', name: 'Ganesh', skillLevel: 3 },
  { id: 'p23', name: 'Dinesh', skillLevel: 3 },
  { id: 'p24', name: 'Karthik', skillLevel: 3 },
  { id: 'p25', name: 'Venkat', skillLevel: 3 },
  { id: 'p26', name: 'Chaitanya', skillLevel: 3 },
  { id: 'p27', name: 'Satish', skillLevel: 3 },
  { id: 'p28', name: 'Rajesh', skillLevel: 3 },
  { id: 'p29', name: 'Harish', skillLevel: 3 },
  { id: 'p30', name: 'Praveen', skillLevel: 3 },
];

export const DEFAULT_PREDEFINED_TEAMS: PredefinedTeam[] = [
  { id: 'team_1', name: 'Team A (Shuttle Warriors)', playerIds: ['p1', 'p2'], seed: 1 },
  { id: 'team_2', name: 'Team B (Net Smashers)', playerIds: ['p3', 'p4'], seed: 2 },
  { id: 'team_3', name: 'Team C (Drop Shot Divas)', playerIds: ['p5', 'p6'], seed: 3 },
  { id: 'team_4', name: 'Team D (Smash Bandits)', playerIds: ['p7', 'p8'], seed: 4 },
  { id: 'team_5', name: 'Team E (Racquet Rebels)', playerIds: ['p9', 'p10'], seed: 5 },
  { id: 'team_6', name: 'Team F (The Birdie Hunters)', playerIds: ['p11', 'p12'], seed: 6 },
  { id: 'team_7', name: 'Team G (Court Vipers)', playerIds: ['p13', 'p14'], seed: 7 },
  { id: 'team_8', name: 'Team H (Apex Smashers)', playerIds: ['p15', 'p16'], seed: 8 },
  { id: 'team_9', name: 'Team I (Lightning Strikes)', playerIds: ['p17', 'p18'], seed: 9 },
  { id: 'team_10', name: 'Team J (Smash Masters)', playerIds: ['p19', 'p20'], seed: 10 },
  { id: 'team_11', name: 'Team K (Feather Flight)', playerIds: ['p21', 'p22'], seed: 11 },
  { id: 'team_12', name: 'Team L (Net Dominators)', playerIds: ['p23', 'p24'], seed: 12 },
  { id: 'team_13', name: 'Team M (Rapid Rally)', playerIds: ['p25', 'p26'], seed: 13 },
  { id: 'team_14', name: 'Team N (Spin Strikers)', playerIds: ['p27', 'p28'], seed: 14 },
  { id: 'team_15', name: 'Team O (Championship Aces)', playerIds: ['p29', 'p30'], seed: 15 },
];






export function getInitialPredefinedRoster(): PredefinedRoster {
  return {
    players: [...DEFAULT_PREDEFINED_PLAYERS],
    teams: [...DEFAULT_PREDEFINED_TEAMS],
    updatedAt: Date.now(),
  };
}

export function loadPredefinedRosterFromStorage(): PredefinedRoster {
  if (typeof window === 'undefined') return getInitialPredefinedRoster();
  try {
    const raw = localStorage.getItem('badminton_predefined_roster');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.players) && Array.isArray(parsed.teams) && parsed.teams.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return getInitialPredefinedRoster();
}

export function savePredefinedRosterToStorage(roster: PredefinedRoster): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('badminton_predefined_roster', JSON.stringify(roster));
  } catch {}
}

export const MASTER_FREQUENT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Ravi' },
  { id: 'p2', name: 'Viswa' },
  { id: 'p3', name: 'Srinivas Angara' },
  { id: 'p4', name: 'Bhaskar' },
  { id: 'p5', name: 'Jaya' },
  { id: 'p6', name: 'Azhar' },
  { id: 'p7', name: 'Santosh' },
  { id: 'p8', name: 'Vijai' },
  { id: 'p9', name: 'Abhishek' },
];

export function getTodaySlug(): string {
  return getTodaySlugWithTime();
}

export function getNextTournamentNumber(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const seq = localStorage.getItem('badminton_tournament_seq');
    if (seq) {
      const parsed = parseInt(seq, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const hubStored = localStorage.getItem('badminton_tournaments_index');
    if (hubStored) {
      const list = JSON.parse(hubStored);
      if (Array.isArray(list) && list.length > 0) {
        return list.length + 1;
      }
    }
  } catch {}
  return 1;
}

export function markTournamentNumberUsed(n?: number): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getNextTournamentNumber();
    const used = n !== undefined ? n : current;
    if (used >= current) {
      localStorage.setItem('badminton_tournament_seq', String(used + 1));
    }
  } catch {}
}

export function shortenLegacyTournamentName(name?: string): string {
  if (!name) return getTodayFormattedWithTime();
  if (name.startsWith('FriendlyBadmintonTournament_')) {
    const suffix = name.replace('FriendlyBadmintonTournament_', '');
    const parts = suffix.replace(/[:-]/g, '').split('_');
    const n = getNextTournamentNumber();
    if (parts.length >= 2) {
      const datePart = parts[0]; // e.g. 20261014
      const timePart = parts[1]; // e.g. 2152
      const md = datePart.length === 8 ? datePart.slice(4) : datePart;
      return `FriendlyTournament${n}_${md}_${timePart}`;
    }
    return `FriendlyTournament${n}_${suffix.replace(/[^a-zA-Z0-9]/g, '')}`;
  }
  return name;
}

export function getTodayFormatted(): string {
  return getTodayFormattedWithTime();
}

export function getTodayFormattedWithTime(customSeq?: number): string {
  const seq = customSeq !== undefined ? customSeq : getNextTournamentNumber();
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `FriendlyTournament${seq}_${m}${d}_${hh}${mm}`;
}

export function getTodaySlugWithTime(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}-${hh}${mm}`;
}

export function sanitizeTournamentState(raw: any, fallbackSlug?: string): TournamentState {
  const slug = fallbackSlug || getTodaySlugWithTime();
  const fallback = buildDefaultTournament(8, slug);

  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const toDict = (val: any) => {
    if (!val) return {};
    if (Array.isArray(val)) {
      const obj: Record<string, any> = {};
      val.forEach((item, idx) => {
        if (item) {
          const key = item.id || String(idx);
          obj[key] = item;
        }
      });
      return obj;
    }
    return typeof val === 'object' ? val : {};
  };

  const players = toDict(raw.players);
  const teams = toDict(raw.teams);
  const groups = toDict(raw.groups);
  const courts = toDict(raw.courts);
  const matches = toDict(raw.matches);

  const finalPlayers = Object.keys(players).length > 0 ? players : fallback.players;
  const finalTeams = Object.keys(teams).length > 0 ? teams : fallback.teams;
  const finalCourts = Object.keys(courts).length > 0 ? courts : fallback.courts;
  const finalMatches = Object.keys(matches).length > 0 ? matches : fallback.matches;
  const finalGroups = Object.keys(groups).length > 0 ? groups : fallback.groups;

  return {
    id: raw.id || `tournament-${slug}`,
    name: shortenLegacyTournamentName(raw.name) || getTodayFormattedWithTime(),
    adminPin: raw.adminPin || '1234',
    rules: {
      pointsToWin: (raw.rules?.pointsToWin === 21) ? 21 : 15,
      deuceLead: raw.rules?.deuceLead || 2,
      hardCap: raw.rules?.hardCap || 30,
    },
    isLocked: Boolean(raw.isLocked),
    currentStage: raw.currentStage || 'group',
    endReason: raw.endReason || null,
    endedAt: raw.endedAt || null,
    scheduledDate: raw.scheduledDate || null,
    players: finalPlayers,
    teams: finalTeams,
    groups: finalGroups,
    courts: finalCourts,
    matches: finalMatches,
    delegation: raw.delegation || null,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    projectedDurationMinutes: raw.projectedDurationMinutes || 120,
  };
}

export function buildDefaultTournament(
  selectedPlayersCount: number = 8, 
  customDateSlug?: string,
  customName?: string,
  customPoints: 15 | 21 = 15
): TournamentState {
  const dateSlug = customDateSlug || getTodaySlugWithTime();
  const defaultName = customName || getTodayFormattedWithTime();
  
  const count = Math.min(selectedPlayersCount, MASTER_FREQUENT_PLAYERS.length);
  const evenCount = count % 2 === 0 ? count : count - 1;
  const chosenPlayers = MASTER_FREQUENT_PLAYERS.slice(0, evenCount);

  const playersMap: Record<string, Player> = {};
  MASTER_FREQUENT_PLAYERS.forEach(p => { playersMap[p.id] = p; });

  const teamsList = pairPlayersIntoTeams(chosenPlayers, 'random');
  const teamsMap: Record<string, any> = {};
  teamsList.forEach(t => { teamsMap[t.id] = t; });

  const { groups, matches } = buildDynamicTournamentStructure(teamsList);
  const initialMatchA = Object.values(matches).find(m => m.stage === 'group') || Object.values(matches)[0];
  if (initialMatchA) {
    initialMatchA.courtId = 'c1';
    initialMatchA.startTime = Date.now();
  }

  return {
    id: `tournament-${dateSlug}`,
    name: defaultName,
    adminPin: '1234',
    rules: {
      pointsToWin: customPoints,
      deuceLead: 2,
      hardCap: 30,
    },
    isLocked: false,
    currentStage: 'group',
    endReason: null,     
    endedAt: null,       
    scheduledDate: null,
    players: playersMap,
    teams: teamsMap,
    groups,
    courts: {
      c1: { id: 'c1', name: 'Court 1 (Arena)', currentMatchId: initialMatchA?.id || null, isActive: true },
      c2: { id: 'c2', name: 'Court 2 (North)', currentMatchId: null, isActive: true },
    },
    matches,
    delegation: null,
    createdAt: Date.now(),
    projectedDurationMinutes: 120,
  };
}

export function getLocalTournaments(): TournamentState[] {
  if (typeof window === 'undefined') return [];
  const result: TournamentState[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('smashops_state_')) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (parsed && parsed.id) {
              result.push(parsed);
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
  return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function pruneOldTournaments(keepCount = 3): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalTournaments();
    if (list.length > keepCount) {
      const toDelete = list.slice(keepCount);
      toDelete.forEach(t => {
        localStorage.removeItem(`smashops_state_${t.id}`);
      });
    }
  } catch (e) {}
}

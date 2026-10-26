export type TournamentStage = 'upcoming' | 'group' | 'knockout' | 'completed' | 'aborted';

export type IncidentTag = 
  | 'Injury Delay' 
  | 'Shuttle Quality' 
  | 'Court Glitch' 
  | 'Disputed Call' 
  | 'Equipment Issue';

export interface ScoringRules {
  pointsToWin: number;
  deuceLead: number;
  hardCap: number;
}
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface Player {
  id: string;
  name: string;
  skillLevel?: number; // 1 to 5 stars
  avatarUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  playerIds: [string, string];
  aggregateSkill?: number;
  seed?: number;
}

export interface MatchReview {
  rating: 1 | 2 | 3 | 4 | 5;
  notes: string;
  incidents: IncidentTag[];
  submittedAt: number;
}

export interface Match {
  id: string;
  stage: 'group' | 'quarter' | 'semi' | 'third_place' | 'final';
  stageIdentifier: string;
  courtId: string | null;
  team1Id: string | null;
  team2Id: string | null;
  score1: number;
  score2: number;
  isComplete: boolean;
  winnerId: string | null;
  loserId: string | null;
  startTime: number | null;
  endTime: number | null;
  nextMatchId?: string;
  loserNextMatchId?: string;
  review?: MatchReview;
}

export interface Group {
  id: string;
  name: string;
  teamIds: string[];
  matchIds: string[];
}

export interface Court {
  id: string;
  name: string;
  currentMatchId: string | null;
  isActive: boolean;
}

export interface GroupStanding {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
}

export interface TournamentDelegation {
  activePin: string;
  delegatedPlayerId: string | null;
  expiresAt: number;
}

export interface TournamentState {
  id: string;
  name: string;
  adminPin: string;
  rules: ScoringRules;
  isLocked: boolean;
  currentStage: TournamentStage;
  endReason: string | null;
  endedAt: number | null;     
  scheduledDate?: string | null | undefined;
  players: Record<string, Player>;
  teams: Record<string, Team>;
  groups: Record<string, Group>;
  courts: Record<string, Court>;
  matches: Record<string, Match>;
  delegation?: TournamentDelegation | null;
  createdAt: number;
  projectedDurationMinutes: number;
}

export interface PredefinedTeam {
  id: string;
  name: string;
  playerIds: [string, string];
  seed?: number;
}

export interface PredefinedRoster {
  players: Player[];
  teams: PredefinedTeam[];
  updatedAt?: number;
}

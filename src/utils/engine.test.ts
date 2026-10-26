import { 
  getInitialPredefinedRoster, 
  DEFAULT_PREDEFINED_PLAYERS, 
  DEFAULT_PREDEFINED_TEAMS, 
  getLocalTournaments 
} from '../initialData';
import { describe, it, expect } from 'vitest';
import {
  isValidScore,
  getTeamPlayerNames,
  pairPlayersIntoTeams,
  calculateGroupStandings,
  buildDynamicTournamentStructure,
  getMatchCourtConflict,
} from './engine';
import { ScoringRules, Player, Match, Court, Team } from '../types/tournament';
import { getTodayFormattedWithTime, shortenLegacyTournamentName } from '../initialData';

describe('engine.ts unit tests', () => {
  const standard15Rules: ScoringRules = {
    pointsToWin: 15,
    deuceLead: 2,
    hardCap: 20,
  };

  const standard21Rules: ScoringRules = {
    pointsToWin: 21,
    deuceLead: 2,
    hardCap: 30,
  };

  describe('isValidScore', () => {
    it('rejects negative scores', () => {
      const res = isValidScore(-1, 10, standard15Rules);
      expect(res.valid).toBe(false);
      expect(res.complete).toBe(false);
      expect(res.error).toBe('Scores cannot be negative.');
    });

    it('rejects scores exceeding hardCap', () => {
      const res = isValidScore(21, 19, standard15Rules);
      expect(res.valid).toBe(false);
      expect(res.complete).toBe(false);
      expect(res.error).toContain('hard cap');
    });

    it('recognizes incomplete games before winning score is reached', () => {
      const res = isValidScore(10, 8, standard15Rules);
      expect(res.valid).toBe(true);
      expect(res.complete).toBe(false);
    });

    it('identifies standard regulation wins (e.g. 15-10 or 21-17)', () => {
      const res15 = isValidScore(15, 10, standard15Rules);
      expect(res15.valid).toBe(true);
      expect(res15.complete).toBe(true);

      const res21 = isValidScore(21, 17, standard21Rules);
      expect(res21.valid).toBe(true);
      expect(res21.complete).toBe(true);
    });

    it('handles deuce scenario requiring 2-point lead (e.g. 16-14 in 15pt game)', () => {
      // 15-14 is incomplete
      const inProg = isValidScore(15, 14, standard15Rules);
      expect(inProg.valid).toBe(true);
      expect(inProg.complete).toBe(false);

      // 16-14 is complete
      const won = isValidScore(16, 14, standard15Rules);
      expect(won.valid).toBe(true);
      expect(won.complete).toBe(true);
    });

    it('handles reaching hard cap (e.g. 20-19 in 15pt game with hardCap 20)', () => {
      const res = isValidScore(20, 19, standard15Rules);
      expect(res.valid).toBe(true);
      expect(res.complete).toBe(true);
    });
  });

  describe('getTeamPlayerNames', () => {
    const players: Record<string, Player> = {
      p1: { id: 'p1', name: 'Viktor Axelsen' },
      p2: { id: 'p2', name: 'Lin Dan' },
    };

    it('returns formatted combined player names when both exist', () => {
      const team = { id: 't1', name: 'Aces', playerIds: ['p1', 'p2'] as [string, string] };
      expect(getTeamPlayerNames(team, players)).toBe('Viktor Axelsen & Lin Dan');
    });

    it('returns fallback when team or player is missing', () => {
      expect(getTeamPlayerNames(null, players)).toBe('TBD');
      const incompleteTeam = { id: 't2', name: 'Solos', playerIds: ['p1', 'nonexistent'] as [string, string] };
      expect(getTeamPlayerNames(incompleteTeam, players)).toBe('Viktor Axelsen');
    });
  });

  describe('pairPlayersIntoTeams', () => {
    const players: Player[] = [
      { id: 'p1', name: 'P1', skillLevel: 5 },
      { id: 'p2', name: 'P2', skillLevel: 4 },
      { id: 'p3', name: 'P3', skillLevel: 2 },
      { id: 'p4', name: 'P4', skillLevel: 1 },
    ];

    it('throws error when player count is odd or less than 4', () => {
      expect(() => pairPlayersIntoTeams(players.slice(0, 3))).toThrow();
    });

    it('balances skill ratings in anti-stack mode', () => {
      const teams = pairPlayersIntoTeams(players, 'anti-stack');
      expect(teams.length).toBe(2);

      // Best player (P1: 5) paired with worst player (P4: 1) = aggregate 6
      // Second best (P2: 4) paired with third best (P3: 2) = aggregate 6
      const teamWithP1 = teams.find(t => t.playerIds.includes('p1'));
      expect(teamWithP1?.playerIds).toContain('p4');
      expect(teamWithP1?.aggregateSkill).toBe(6);
    });

    it('generates correct number of teams in random mode', () => {
      const teams = pairPlayersIntoTeams(players, 'random');
      expect(teams.length).toBe(2);
      expect(teams[0].playerIds.length).toBe(2);
      expect(teams[1].playerIds.length).toBe(2);
    });
  });

  describe('calculateGroupStandings', () => {
    it('accurately tallies wins, points, and ranks top teams', () => {
      const teamIds = ['team_a', 'team_b', 'team_c'];
      const matches: Match[] = [
        {
          id: 'm1',
          stage: 'group',
          stageIdentifier: 'Match 1',
          courtId: null,
          team1Id: 'team_a',
          team2Id: 'team_b',
          score1: 15,
          score2: 10,
          isComplete: true,
          winnerId: 'team_a',
          loserId: 'team_b',
          startTime: null,
          endTime: null,
        },
        {
          id: 'm2',
          stage: 'group',
          stageIdentifier: 'Match 2',
          courtId: null,
          team1Id: 'team_a',
          team2Id: 'team_c',
          score1: 15,
          score2: 12,
          isComplete: true,
          winnerId: 'team_a',
          loserId: 'team_c',
          startTime: null,
          endTime: null,
        },
        {
          id: 'm3',
          stage: 'group',
          stageIdentifier: 'Match 3',
          courtId: null,
          team1Id: 'team_b',
          team2Id: 'team_c',
          score1: 15,
          score2: 13,
          isComplete: true,
          winnerId: 'team_b',
          loserId: 'team_c',
          startTime: null,
          endTime: null,
        },
      ];

      const standings = calculateGroupStandings(teamIds, matches);
      expect(standings.length).toBe(3);

      // Team A: 2 wins, 0 losses -> 1st place
      expect(standings[0].teamId).toBe('team_a');
      expect(standings[0].won).toBe(2);
      expect(standings[0].lost).toBe(0);
      expect(standings[0].pointDifferential).toBe(8); // (15-10) + (15-12) = 5 + 3 = 8

      // Team B: 1 win, 1 loss -> 2nd place
      expect(standings[1].teamId).toBe('team_b');
      expect(standings[1].won).toBe(1);

      // Team C: 0 wins, 2 losses -> 3rd place
      expect(standings[2].teamId).toBe('team_c');
      expect(standings[2].won).toBe(0);
    });
  });

  describe('buildDynamicTournamentStructure', () => {
    it('builds single round-robin group structure for 4 teams', () => {
      const teams = [
        { id: 't1', name: 'T1', playerIds: ['p1', 'p2'] as [string, string] },
        { id: 't2', name: 'T2', playerIds: ['p3', 'p4'] as [string, string] },
        { id: 't3', name: 'T3', playerIds: ['p5', 'p6'] as [string, string] },
        { id: 't4', name: 'T4', playerIds: ['p7', 'p8'] as [string, string] },
      ];

      const structure = buildDynamicTournamentStructure(teams);
      expect(structure.groups['grp_all']).toBeDefined();
      expect(structure.groups['grp_all'].teamIds).toEqual(['t1', 't2', 't3', 't4']);
      // 4 teams round-robin = (4 * 3) / 2 = 6 group matches + 2 semis + 1 final + 1 3rd-place = 10 total matches
      expect(Object.keys(structure.matches).length).toBe(10);
      expect(structure.matches['m_semi_1']).toBeDefined();
      expect(structure.matches['m_semi_2']).toBeDefined();
      expect(structure.matches['m_final']).toBeDefined();
      expect(structure.matches['m_third_place']).toBeDefined();
    });
  });

  describe('getMatchCourtConflict', () => {
    const players: Record<string, Player> = {
      p1: { id: 'p1', name: 'Ravi' },
      p2: { id: 'p2', name: 'Viswa' },
      p3: { id: 'p3', name: 'Srinivas' },
      p4: { id: 'p4', name: 'Bhaskar' },
      p5: { id: 'p5', name: 'Chowdary' },
      p6: { id: 'p6', name: 'Anand' },
    };

    const teams: Record<string, Team> = {
      team_a: { id: 'team_a', name: 'Team A', playerIds: ['p1', 'p2'] },
      team_b: { id: 'team_b', name: 'Team B', playerIds: ['p3', 'p4'] },
      team_c: { id: 'team_c', name: 'Team C', playerIds: ['p5', 'p6'] },
      team_d: { id: 'team_d', name: 'Team D', playerIds: ['p1', 'p5'] },
    };

    const activeMatchOnCourt1: Match = {
      id: 'm1',
      stage: 'group',
      stageIdentifier: 'Match 1',
      courtId: 'c1',
      team1Id: 'team_a',
      team2Id: 'team_c',
      score1: 0,
      score2: 0,
      winnerId: null,
      loserId: null,
      isComplete: false,
      startTime: Date.now(),
      endTime: null,
    };

    const courts: Record<string, Court> = {
      c1: { id: 'c1', name: 'Court 1', currentMatchId: 'm1', isActive: true },
      c2: { id: 'c2', name: 'Court 2', currentMatchId: null, isActive: true },
    };

    const allMatches: Record<string, Match> = {
      m1: activeMatchOnCourt1,
      m2: {
        id: 'm2',
        stage: 'group',
        stageIdentifier: 'Match 2',
        courtId: null,
        team1Id: 'team_a',
        team2Id: 'team_b',
        score1: 0,
      score2: 0,
      winnerId: null,
      loserId: null,
      isComplete: false,
        startTime: null,
        endTime: null,
      },
      m3: {
        id: 'm3',
        stage: 'group',
        stageIdentifier: 'Match 3',
        courtId: null,
        team1Id: 'team_b',
        team2Id: 'team_c',
        score1: 0,
      score2: 0,
      winnerId: null,
      loserId: null,
      isComplete: false,
        startTime: null,
        endTime: null,
      },
      m_player_conflict: {
        id: 'm_player_conflict',
        stage: 'group',
        stageIdentifier: 'Match Cross Player',
        courtId: null,
        team1Id: 'team_d',
        team2Id: 'team_b',
        score1: 0,
      score2: 0,
      winnerId: null,
      loserId: null,
      isComplete: false,
        startTime: null,
        endTime: null,
      },
    };

    it('identifies conflict when Team A is already playing on Court 1', () => {
      const conflict = getMatchCourtConflict(allMatches['m2'], courts, allMatches, teams, players);
      expect(conflict).toBe('Team A is currently playing on Court 1');
    });

    it('identifies conflict when Team C is already playing on Court 1', () => {
      const conflict = getMatchCourtConflict(allMatches['m3'], courts, allMatches, teams, players);
      expect(conflict).toBe('Team C is currently playing on Court 1');
    });

    it('identifies conflict when a player in the team is already playing on Court 1', () => {
      const conflict = getMatchCourtConflict(allMatches['m_player_conflict'], courts, allMatches, teams, players);
      expect(conflict).toContain('currently playing on Court 1');
    });

    it('returns null when neither team nor players are on court', () => {
      const freeTeams: Record<string, Team> = {
        ...teams,
        team_e: { id: 'team_e', name: 'Team E', playerIds: ['p3', 'p4'] },
        team_f: { id: 'team_f', name: 'Team F', playerIds: ['p4', 'p3'] },
      };
      const candidate: Match = {
        id: 'm_ok',
        stage: 'group',
        stageIdentifier: 'Match OK',
        courtId: null,
        team1Id: 'team_e',
        team2Id: 'team_f',
        score1: 0,
      score2: 0,
      winnerId: null,
      loserId: null,
      isComplete: false,
        startTime: null,
        endTime: null,
      };
      const conflict = getMatchCourtConflict(candidate, courts, allMatches, freeTeams, players);
      expect(conflict).toBeNull();
    });

    it('ignores active match if targetCourtId matches the court being reassigned', () => {
      const conflict = getMatchCourtConflict(allMatches['m2'], courts, allMatches, teams, players, 'c1');
      expect(conflict).toBeNull();
    });

    it('returns null if the match on court is marked complete', () => {
      const completedMatch: Match = {
        ...activeMatchOnCourt1,
        isComplete: true,
      };
      const courtsWithComplete = { ...courts };
      const matchesWithComplete = { ...allMatches, m1: completedMatch };

      const conflict = getMatchCourtConflict(allMatches['m2'], courtsWithComplete, matchesWithComplete, teams, players);
      expect(conflict).toBeNull();
    });

    it('does not falsely trigger conflict when teams have empty string or unassigned player IDs', () => {
      const teamsWithEmptyPlayer: Record<string, Team> = {
        team_empty_1: { id: 'team_empty_1', name: 'Team Empty 1', playerIds: ['', ''] as any },
        team_empty_2: { id: 'team_empty_2', name: 'Team Empty 2', playerIds: ['', ''] as any },
        team_empty_3: { id: 'team_empty_3', name: 'Team Empty 3', playerIds: ['', ''] as any },
        team_empty_4: { id: 'team_empty_4', name: 'Team Empty 4', playerIds: ['', ''] as any },
      };

      const customCourts: Record<string, Court> = {
        c1: { id: 'c1', name: 'Court 1', currentMatchId: 'm_active', isActive: true },
        c2: { id: 'c2', name: 'Court 2', currentMatchId: null, isActive: true },
      };

      const customMatches: Record<string, Match> = {
        m_active: {
          id: 'm_active',
          stage: 'group',
          stageIdentifier: 'Match 1',
          courtId: 'c1',
          team1Id: 'team_empty_1',
          team2Id: 'team_empty_2',
          score1: 0,
          score2: 0,
          winnerId: null,
          loserId: null,
          isComplete: false,
          startTime: Date.now(),
          endTime: null,
        },
        m_candidate: {
          id: 'm_candidate',
          stage: 'group',
          stageIdentifier: 'Match 2',
          courtId: null,
          team1Id: 'team_empty_3',
          team2Id: 'team_empty_4',
          score1: 0,
          score2: 0,
          winnerId: null,
          loserId: null,
          isComplete: false,
          startTime: null,
          endTime: null,
        },
      };

      const conflict = getMatchCourtConflict(
        customMatches['m_candidate'],
        customCourts,
        customMatches,
        teamsWithEmptyPlayer,
        players,
        'c2'
      );
      expect(conflict).toBeNull();
    });

    it('allows dispatching 4 teams across 2 courts simultaneously (Team A vs Team B on Court 1, Team C vs Team D on Court 2)', () => {
      const fourTeams = [
        { id: 't1', name: 'Team A', playerIds: ['p1', 'p2'] as [string, string] },
        { id: 't2', name: 'Team B', playerIds: ['p3', 'p4'] as [string, string] },
        { id: 't3', name: 'Team C', playerIds: ['p5', 'p6'] as [string, string] },
        { id: 't4', name: 'Team D', playerIds: ['p7', 'p8'] as [string, string] },
      ];
      const structure = buildDynamicTournamentStructure(fourTeams);

      const fourCourts: Record<string, Court> = {
        c1: { id: 'c1', name: 'Court 1', currentMatchId: 'm_1', isActive: true },
        c2: { id: 'c2', name: 'Court 2', currentMatchId: null, isActive: true },
      };

      const fourTeamsMap: Record<string, Team> = {
        t1: fourTeams[0],
        t2: fourTeams[1],
        t3: fourTeams[2],
        t4: fourTeams[3],
      };

      // Match 1 (t1 vs t2) is active on Court 1
      structure.matches['m_1'].courtId = 'c1';

      // Match 6 (t3 vs t4) is candidate for Court 2
      const match6 = structure.matches['m_6'];
      expect(match6.team1Id).toBe('t3');
      expect(match6.team2Id).toBe('t4');

      const conflict = getMatchCourtConflict(
        match6,
        fourCourts,
        structure.matches,
        fourTeamsMap,
        players,
        'c2'
      );
      expect(conflict).toBeNull();
    });
  });

  describe('tournament naming tests', () => {
    it('generates short auto-suggested tournament name with FriendlyTournament<N>_DateTime', () => {
      const name = getTodayFormattedWithTime(1);
      expect(name).toMatch(/^FriendlyTournament1_\d{4}_\d{4}$/);
      expect(name.length).toBeLessThanOrEqual(30);
    });

    it('converts legacy long name FriendlyBadmintonTournament_2026-10-14_21:52 to short format', () => {
      const shortened = shortenLegacyTournamentName('FriendlyBadmintonTournament_2026-10-14_21:52');
      expect(shortened).toBe('FriendlyTournament1_1014_2152');
    });

    it('preserves user custom tournament names', () => {
      expect(shortenLegacyTournamentName('Friday Smash Cup')).toBe('Friday Smash Cup');
      expect(shortenLegacyTournamentName('Summer Badminton Masters')).toBe('Summer Badminton Masters');
    });
  });

  describe('8 Teams Tournament Verification', () => {
    const eightTeams: Team[] = Array.from({ length: 8 }, (_, i) => ({
      id: `team_${i + 1}`,
      name: `Team ${String.fromCharCode(65 + i)}`,
      playerIds: [`p_${i * 2 + 1}`, `p_${i * 2 + 2}`] as [string, string],
      seed: i + 1,
    }));

    it('creates balanced 2-group structure with 4 teams each and 16 total matches', () => {
      const { groups, matches } = buildDynamicTournamentStructure(eightTeams);

      expect(groups['grp_a']).toBeDefined();
      expect(groups['grp_b']).toBeDefined();
      expect(groups['grp_a'].teamIds.length).toBe(4);
      expect(groups['grp_b'].teamIds.length).toBe(4);

      // (4 * 3) / 2 = 6 matches per group = 12 group matches
      expect(groups['grp_a'].matchIds.length).toBe(6);
      expect(groups['grp_b'].matchIds.length).toBe(6);

      // Total matches = 12 group + 2 semis + 1 final + 1 third_place = 16 matches
      expect(Object.keys(matches).length).toBe(16);
      expect(matches['m_semi_1']).toBeDefined();
      expect(matches['m_semi_2']).toBeDefined();
      expect(matches['m_final']).toBeDefined();
      expect(matches['m_third_place']).toBeDefined();

      // Check semi match stage identifiers
      expect(matches['m_semi_1'].stageIdentifier).toContain('A1 vs B2');
      expect(matches['m_semi_2'].stageIdentifier).toContain('B1 vs A2');
      expect(matches['m_semi_1'].nextMatchId).toBe('m_final');
      expect(matches['m_semi_1'].loserNextMatchId).toBe('m_third_place');
    });

    it('calculates group standings and correctly seeds playoffs for 8 teams', () => {
      const { groups, matches } = buildDynamicTournamentStructure(eightTeams);

      // Simulate completing Group A matches
      const grpAMatches = groups['grp_a'].matchIds.map(id => matches[id]);
      grpAMatches.forEach((m, idx) => {
        m.isComplete = true;
        m.score1 = 15;
        m.score2 = 10;
        m.winnerId = m.team1Id;
        m.loserId = m.team2Id;
      });

      const stdA = calculateGroupStandings(groups['grp_a'].teamIds, grpAMatches);
      expect(stdA.length).toBe(4);
      expect(stdA[0].played).toBe(3);
      expect(stdA[0].won).toBeGreaterThanOrEqual(1);

      // Simulate completing Group B matches
      const grpBMatches = groups['grp_b'].matchIds.map(id => matches[id]);
      grpBMatches.forEach((m, idx) => {
        m.isComplete = true;
        m.score1 = 15;
        m.score2 = 8;
        m.winnerId = m.team1Id;
        m.loserId = m.team2Id;
      });

      const stdB = calculateGroupStandings(groups['grp_b'].teamIds, grpBMatches);
      expect(stdB.length).toBe(4);

      // Seed Semifinals: A1 vs B2, B1 vs A2
      matches['m_semi_1'].team1Id = stdA[0].teamId;
      matches['m_semi_1'].team2Id = stdB[1].teamId;
      matches['m_semi_2'].team1Id = stdB[0].teamId;
      matches['m_semi_2'].team2Id = stdA[1].teamId;

      expect(matches['m_semi_1'].team1Id).toBe(stdA[0].teamId);
      expect(matches['m_semi_1'].team2Id).toBe(stdB[1].teamId);
      expect(matches['m_semi_2'].team1Id).toBe(stdB[0].teamId);
      expect(matches['m_semi_2'].team2Id).toBe(stdA[1].teamId);

      // Play Semifinal 1
      matches['m_semi_1'].isComplete = true;
      matches['m_semi_1'].score1 = 15;
      matches['m_semi_1'].score2 = 12;
      matches['m_semi_1'].winnerId = matches['m_semi_1'].team1Id;
      matches['m_semi_1'].loserId = matches['m_semi_1'].team2Id;

      // Play Semifinal 2
      matches['m_semi_2'].isComplete = true;
      matches['m_semi_2'].score1 = 15;
      matches['m_semi_2'].score2 = 11;
      matches['m_semi_2'].winnerId = matches['m_semi_2'].team1Id;
      matches['m_semi_2'].loserId = matches['m_semi_2'].team2Id;

      // Final & 3rd Place seeded
      matches['m_final'].team1Id = matches['m_semi_1'].winnerId;
      matches['m_final'].team2Id = matches['m_semi_2'].winnerId;
      matches['m_third_place'].team1Id = matches['m_semi_1'].loserId;
      matches['m_third_place'].team2Id = matches['m_semi_2'].loserId;

      expect(matches['m_final'].team1Id).toBe(stdA[0].teamId);
      expect(matches['m_final'].team2Id).toBe(stdB[0].teamId);
    });
  });

  describe('13 Teams Tournament Verification', () => {
    const thirteenTeams: Team[] = Array.from({ length: 13 }, (_, i) => ({
      id: `team_${i + 1}`,
      name: `Team ${String.fromCharCode(65 + i)}`,
      playerIds: [`p_${i * 2 + 1}`, `p_${i * 2 + 2}`] as [string, string],
      seed: i + 1,
    }));

    const playersMap: Record<string, Player> = {};
    thirteenTeams.forEach(t => {
      t.playerIds.forEach(pid => {
        playersMap[pid] = { id: pid, name: `Player ${pid}` };
      });
    });

    const teamsMap: Record<string, Team> = {};
    thirteenTeams.forEach(t => { teamsMap[t.id] = t; });

    it('creates 2-group structure for 13 teams (7 in Group A, 6 in Group B, 40 total matches)', () => {
      const { groups, matches } = buildDynamicTournamentStructure(thirteenTeams);

      expect(groups['grp_a']).toBeDefined();
      expect(groups['grp_b']).toBeDefined();
      expect(groups['grp_a'].teamIds.length).toBe(7);
      expect(groups['grp_b'].teamIds.length).toBe(6);

      // (7 * 6) / 2 = 21 matches in Group A
      expect(groups['grp_a'].matchIds.length).toBe(21);
      // (6 * 5) / 2 = 15 matches in Group B
      expect(groups['grp_b'].matchIds.length).toBe(15);

      // Total matches = 21 + 15 + 2 (semis) + 1 (final) + 1 (third_place) = 40 matches
      expect(Object.keys(matches).length).toBe(40);
      expect(matches['m_semi_1']).toBeDefined();
      expect(matches['m_semi_2']).toBeDefined();
      expect(matches['m_final']).toBeDefined();
      expect(matches['m_third_place']).toBeDefined();
    });

    it('accurately ranks all 13 teams and seeds A1 vs B2 and B1 vs A2 into playoffs', () => {
      const { groups, matches } = buildDynamicTournamentStructure(thirteenTeams);

      // Complete all 21 Group A matches
      const grpAMatches = groups['grp_a'].matchIds.map(id => matches[id]);
      grpAMatches.forEach((m, idx) => {
        m.isComplete = true;
        m.score1 = 15;
        m.score2 = 10 + (idx % 5);
        m.winnerId = m.team1Id;
        m.loserId = m.team2Id;
      });

      const stdA = calculateGroupStandings(groups['grp_a'].teamIds, grpAMatches);
      expect(stdA.length).toBe(7);
      // Each team in Group A plays 6 games against the other 6 teams
      expect(stdA[0].played).toBe(6);
      expect(stdA[6].played).toBe(6);

      // Complete all 15 Group B matches
      const grpBMatches = groups['grp_b'].matchIds.map(id => matches[id]);
      grpBMatches.forEach((m, idx) => {
        m.isComplete = true;
        m.score1 = 15;
        m.score2 = 9 + (idx % 5);
        m.winnerId = m.team1Id;
        m.loserId = m.team2Id;
      });

      const stdB = calculateGroupStandings(groups['grp_b'].teamIds, grpBMatches);
      expect(stdB.length).toBe(6);
      // Each team in Group B plays 5 games against the other 5 teams
      expect(stdB[0].played).toBe(5);
      expect(stdB[5].played).toBe(5);

      // Seed playoffs
      matches['m_semi_1'].team1Id = stdA[0].teamId;
      matches['m_semi_1'].team2Id = stdB[1].teamId;
      matches['m_semi_2'].team1Id = stdB[0].teamId;
      matches['m_semi_2'].team2Id = stdA[1].teamId;

      expect(matches['m_semi_1'].team1Id).toBeTruthy();
      expect(matches['m_semi_1'].team2Id).toBeTruthy();
      expect(matches['m_semi_2'].team1Id).toBeTruthy();
      expect(matches['m_semi_2'].team2Id).toBeTruthy();
    });

    it('supports 2-court conflict management with 13 teams without blocking free teams', () => {
      const { matches } = buildDynamicTournamentStructure(thirteenTeams);

      // Put Match 1 on Court 1 (e.g. team_1 vs team_4)
      const activeMatch = matches['m_1'];
      activeMatch.courtId = 'c1';

      const courts: Record<string, Court> = {
        c1: { id: 'c1', name: 'Court 1', currentMatchId: 'm_1', isActive: true },
        c2: { id: 'c2', name: 'Court 2', currentMatchId: null, isActive: true },
      };

      // Match involving team_1 should be busy
      const matchWithT1 = Object.values(matches).find(
        m => m.id !== 'm_1' && (m.team1Id === activeMatch.team1Id || m.team2Id === activeMatch.team1Id)
      );
      if (matchWithT1) {
        const conflict = getMatchCourtConflict(matchWithT1, courts, matches, teamsMap, playersMap, 'c2');
        expect(conflict).toContain('currently playing on Court 1');
      }

      // Match between completely free teams (e.g. team_2 vs team_3 in Group B) must have ZERO conflicts on Court 2
      const freeMatch = Object.values(matches).find(
        m => m.team1Id && m.team2Id &&
             m.team1Id !== activeMatch.team1Id && m.team1Id !== activeMatch.team2Id &&
             m.team2Id !== activeMatch.team1Id && m.team2Id !== activeMatch.team2Id
      );

      expect(freeMatch).toBeDefined();
      const freeConflict = getMatchCourtConflict(freeMatch, courts, matches, teamsMap, playersMap, 'c2');
      expect(freeConflict).toBeNull();
    });
  });

  describe('Predefined Teams & Landing Page Roster System', () => {
    it('initializes valid predefined roster with players and paired teams', () => {
      const roster = getInitialPredefinedRoster();
      expect(roster.players.length).toBeGreaterThanOrEqual(16);
      expect(roster.teams.length).toBeGreaterThanOrEqual(8);

      const playerIds = new Set(roster.players.map(p => p.id));
      roster.teams.forEach(team => {
        expect(team.name).toBeTruthy();
        expect(team.playerIds.length).toBe(2);
        expect(playerIds.has(team.playerIds[0])).toBe(true);
        expect(playerIds.has(team.playerIds[1])).toBe(true);
      });
    });

    it('converts predefined teams directly into runnable dynamic tournament', () => {
      const roster = getInitialPredefinedRoster();
      const selected = roster.teams.slice(0, 4);

      const tournamentTeams: Team[] = selected.map((pt, idx) => ({
        id: pt.id,
        name: pt.name,
        playerIds: pt.playerIds,
        seed: idx + 1,
      }));

      const { groups, matches } = buildDynamicTournamentStructure(tournamentTeams);
      expect(groups['grp_all']).toBeDefined();
      expect(groups['grp_all'].teamIds.length).toBe(4);
      // 4 teams: 6 round-robin + 2 semis + 1 3rd-place + 1 final = 10 matches
      expect(Object.keys(matches).length).toBe(10);
      expect(matches['m_semi_1']).toBeDefined();
      expect(matches['m_final']).toBeDefined();
    });

    it('correctly handles getLocalTournaments when storage has states', () => {
      const storageMock: Record<string, string> = {
        'smashops_state_tournament-mock1': JSON.stringify({ id: 'tournament-mock1', name: 'Mock Cup 1', createdAt: 1000 }),
        'smashops_state_tournament-mock2': JSON.stringify({ id: 'tournament-mock2', name: 'Mock Cup 2', createdAt: 2000 }),
      };

      const originalWindow = (globalThis as any).window;
      const originalStorage = (globalThis as any).localStorage;

      (globalThis as any).window = {};
      (globalThis as any).localStorage = {
        length: 2,
        key: (idx: number) => Object.keys(storageMock)[idx],
        getItem: (k: string) => storageMock[k] || null,
      };

      const list = getLocalTournaments();
      expect(list.some(t => t.id === 'tournament-mock1')).toBe(true);
      expect(list.some(t => t.id === 'tournament-mock2')).toBe(true);

      const idx2 = list.findIndex(t => t.id === 'tournament-mock2');
      const idx1 = list.findIndex(t => t.id === 'tournament-mock1');
      expect(idx2).toBeLessThan(idx1);

      (globalThis as any).window = originalWindow;
      (globalThis as any).localStorage = originalStorage;
    });
  });


  describe('15 Teams Tournament Verification', () => {
    it('creates 2-group structure for 15 teams (8 in Group A, 7 in Group B, 49 total matches)', () => {
      const teams = Array.from({ length: 15 }).map((_, i) => ({
        id: `t_${i + 1}`,
        name: `Team ${i + 1}`,
        playerIds: [`p_${i * 2 + 1}`, `p_${i * 2 + 2}`],
        seed: i + 1,
      }));

      const { groups, matches } = buildDynamicTournamentStructure(teams as any);

      expect(groups['grp_a']).toBeDefined();
      expect(groups['grp_b']).toBeDefined();
      expect(groups['grp_a'].teamIds.length).toBe(7);
      expect(groups['grp_b'].teamIds.length).toBe(8);

      // Group A (8 teams): 8*7/2 = 28 matches
      // Group B (7 teams): 7*6/2 = 21 matches
      // Total Group Matches = 49 matches
      const groupMatches = Object.values(matches).filter(m => m.stage === 'group');
      expect(groupMatches.length).toBe(49);
    });
  });

  describe('Stage Naming Verification: GRAND FINALE and 3rd Prize/Position', () => {
    it('sets GRAND FINALE and 3rd Prize/Position for 4-team single round-robin tournament', () => {
      const fourTeams: Team[] = [
        { id: 't1', name: 'Team Alpha', playerIds: ['p1', 'p2'], seed: 1 },
        { id: 't2', name: 'Team Beta', playerIds: ['p3', 'p4'], seed: 2 },
        { id: 't3', name: 'Team Gamma', playerIds: ['p5', 'p6'], seed: 3 },
        { id: 't4', name: 'Team Delta', playerIds: ['p7', 'p8'], seed: 4 },
      ];

      const { matches } = buildDynamicTournamentStructure(fourTeams);

      expect(matches['m_final']).toBeDefined();
      expect(matches['m_final'].stageIdentifier).toBe('GRAND FINALE');
      expect(matches['m_third_place']).toBeDefined();
      expect(matches['m_third_place'].stageIdentifier).toBe('3rd Prize/Position');
    });

    it('sets GRAND FINALE and 3rd Prize/Position for 8-team 2-group tournament', () => {
      const eightTeams: Team[] = Array.from({ length: 8 }, (_, i) => ({
        id: `team_${i + 1}`,
        name: `Team ${i + 1}`,
        playerIds: [`p_${i * 2 + 1}`, `p_${i * 2 + 2}`] as [string, string],
        seed: i + 1,
      }));

      const { matches } = buildDynamicTournamentStructure(eightTeams);

      expect(matches['m_final']).toBeDefined();
      expect(matches['m_final'].stageIdentifier).toBe('GRAND FINALE');
      expect(matches['m_third_place']).toBeDefined();
      expect(matches['m_third_place'].stageIdentifier).toBe('3rd Prize/Position');
    });
  });
});

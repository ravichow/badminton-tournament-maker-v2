import { Player, Team, GroupStanding, Match, ScoringRules, Group, Court } from '../types/tournament';

export const FUN_TEAM_NAMES = [
  'Shuttle Warriors',
  'Net Smashers',
  'Drop Shot Divas',
  'Smash Bandits',
  'Racquet Rebels',
  'The Birdie Hunters',
  'Feather Storm',
  'Court Vipers',
  'Apex Smashers',
  'Double Trouble',
  'Sonic Shuttlers',
  'Spin Masters',
  'Thunder Shuttles',
  'Vortex Volley',
  'Drive Kings',
  'Backhand Bandits',
  'Aerial Aces',
  'Falcon Smashers',
  'Badminton Ninjas',
  'Rally Rockets',
  'Smash Gladiators',
  'Precision Aces',
  'Whirlwind Pair',
  'Flight Masters',
  'Gravity Breakers',
  'Rapid Racquets',
  'Blaze Shuttlers',
  'Crosscourt Vipers',
  'Golden Feathers',
  'Prime Shuttlers',
  'Shadow Slayers',
  'Matchpoint Masters'
];

export function getTeamPlayerNames(team: Team | undefined | null, players: Record<string, Player>): string {
  if (!team || !team.playerIds) return 'TBD';
  const p1 = players[team.playerIds[0]];
  const p2 = players[team.playerIds[1]];
  if (p1 && p2) return `${p1.name} & ${p2.name}`;
  if (p1) return p1.name;
  if (p2) return p2.name;
  return 'TBD';
}

export function isValidScore(
  s1: number,
  s2: number,
  rules: ScoringRules
): { valid: boolean; complete: boolean; error?: string } {
  if (s1 < 0 || s2 < 0) {
    return { valid: false, complete: false, error: 'Scores cannot be negative.' };
  }

  const { pointsToWin, deuceLead, hardCap } = rules;
  const maxScore = Math.max(s1, s2);
  const minScore = Math.min(s1, s2);
  const diff = maxScore - minScore;

  if (maxScore > hardCap) {
    return { valid: false, complete: false, error: `Score cannot exceed hard cap of ${hardCap}.` };
  }

  // If someone reached hard cap, game is complete
  if (maxScore === hardCap) {
    if (minScore >= hardCap - deuceLead && diff >= 1) {
      return { valid: true, complete: true };
    }
    return { valid: false, complete: false, error: `Invalid score at hard cap ${hardCap}.` };
  }

  // Before reaching deuce territory (e.g. below 14-14 for 15-point game, or below 20-20 for 21-point game)
  const deuceTrigger = pointsToWin - 1;
  
  if (maxScore < pointsToWin) {
    // Game not yet won
    return { valid: true, complete: false };
  }

  // If maxScore >= pointsToWin:
  // Normal win condition: winner reaches `pointsToWin` and has at least `deuceLead` (2 points) advantage (e.g. 15-13, 15-12, 21-19)
  if (minScore <= deuceTrigger - 1) {
    if (maxScore === pointsToWin && diff >= deuceLead) {
      return { valid: true, complete: true };
    }
    if (maxScore > pointsToWin) {
      return { valid: false, complete: false, error: `Winning score before deuce must be exactly ${pointsToWin} with at least a ${deuceLead}-point lead.` };
    }
    return { valid: true, complete: false };
  }

  // Deuce territory (e.g., 14-14, 15-15, etc. for 15-point game)
  // Play continues until lead is 2 points or hardCap is reached
  if (diff === deuceLead) {
    return { valid: true, complete: true };
  }
  if (diff > deuceLead) {
    return { valid: false, complete: false, error: `During deuce, a team needs exactly a ${deuceLead}-point lead to win.` };
  }

  return { valid: true, complete: false };
}

export function pairPlayersIntoTeams(players: Player[], mode: 'anti-stack' | 'random' = 'random'): Team[] {
  if (players.length < 4 || players.length % 2 !== 0) {
    throw new Error('Doubles requires an even number of players (at least 4).');
  }

  const teams: Team[] = [];
  let namePool = [...FUN_TEAM_NAMES].sort(() => Math.random() - 0.5);

  const hasRatings = players.some(p => p.skillLevel !== undefined);

  if (mode === 'anti-stack' && hasRatings) {
    const sorted = [...players].sort((a, b) => (b.skillLevel || 3) - (a.skillLevel || 3));
    let left = 0;
    let right = sorted.length - 1;
    let idx = 0;

    while (left < right) {
      const p1 = sorted[left];
      const p2 = sorted[right];
      const aggSkill = (p1?.skillLevel || 0) + (p2?.skillLevel || 0);
      const teamName = namePool[idx] || `${p1.name} & ${p2.name}`;

      teams.push({
        id: `team_${p1.id}_${p2.id}`,
        name: teamName,
        playerIds: [p1.id, p2.id],
        aggregateSkill: aggSkill > 0 ? aggSkill : undefined,
      });

      idx++;
      left++;
      right--;
    }
    teams.sort((a, b) => (b.aggregateSkill || 0) - (a.aggregateSkill || 0));
  } else {
    // Random shuffle
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i += 2) {
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];
      const aggSkill = (p1?.skillLevel || 0) + (p2?.skillLevel || 0);
      const teamName = namePool[i / 2] || `${p1.name} & ${p2.name}`;
      teams.push({
        id: `team_${p1.id}_${p2.id}`,
        name: teamName,
        playerIds: [p1.id, p2.id],
        aggregateSkill: aggSkill > 0 ? aggSkill : undefined,
      });
    }
  }

  return teams.map((team, idx) => ({ ...team, seed: idx + 1 }));
}

export function buildDynamicTournamentStructure(teams: Team[]) {
  const numTeams = teams.length;
  const groups: Record<string, Group> = {};
  const matches: Record<string, Match> = {};
  let matchCounter = 1;

  if (numTeams <= 4) {
    const teamIds = teams.map((t) => t.id);
    const grpMatchIds: string[] = [];

    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const mid = `m_${matchCounter++}`;
        grpMatchIds.push(mid);
        matches[mid] = {
          id: mid,
          stage: 'group',
          stageIdentifier: `Round-Robin - Match ${grpMatchIds.length}`,
          courtId: null,
          team1Id: teamIds[i],
          team2Id: teamIds[j],
          score1: 0,
          score2: 0,
          isComplete: false,
          winnerId: null,
          loserId: null,
          startTime: null,
          endTime: null,
        };
      }
    }

    groups['grp_all'] = {
      id: 'grp_all',
      name: 'Round-Robin Qualifying Pool',
      teamIds,
      matchIds: grpMatchIds,
    };

    if (numTeams === 4) {
      const semi1Id = 'm_semi_1';
      const semi2Id = 'm_semi_2';
      const finalId = 'm_final';
      const thirdId = 'm_third_place';

      matches[semi1Id] = {
        id: semi1Id,
        stage: 'semi',
        stageIdentifier: 'Semifinal 1 (Rank 1 vs 4)',
        courtId: null,
        team1Id: null,
        team2Id: null,
        score1: 0,
        score2: 0,
        isComplete: false,
        winnerId: null,
        loserId: null,
        startTime: null,
        endTime: null,
        nextMatchId: finalId,
        loserNextMatchId: thirdId,
      };

      matches[semi2Id] = {
        id: semi2Id,
        stage: 'semi',
        stageIdentifier: 'Semifinal 2 (Rank 2 vs 3)',
        courtId: null,
        team1Id: null,
        team2Id: null,
        score1: 0,
        score2: 0,
        isComplete: false,
        winnerId: null,
        loserId: null,
        startTime: null,
        endTime: null,
        nextMatchId: finalId,
        loserNextMatchId: thirdId,
      };

      matches[finalId] = {
        id: finalId,
        stage: 'final',
        stageIdentifier: 'GRAND FINALE',
        courtId: null,
        team1Id: null,
        team2Id: null,
        score1: 0,
        score2: 0,
        isComplete: false,
        winnerId: null,
        loserId: null,
        startTime: null,
        endTime: null,
      };

      matches[thirdId] = {
        id: thirdId,
        stage: 'third_place',
        stageIdentifier: '3rd Prize/Position',
        courtId: null,
        team1Id: null,
        team2Id: null,
        score1: 0,
        score2: 0,
        isComplete: false,
        winnerId: null,
        loserId: null,
        startTime: null,
        endTime: null,
      };
    } else {
      const finalId = 'm_final';
      matches[finalId] = {
        id: finalId,
        stage: 'final',
        stageIdentifier: 'GRAND FINALE',
        courtId: null,
        team1Id: null,
        team2Id: null,
        score1: 0,
        score2: 0,
        isComplete: false,
        winnerId: null,
        loserId: null,
        startTime: null,
        endTime: null,
      };
    }
  } else {
    const grpATeamIds: string[] = [];
    const grpBTeamIds: string[] = [];

    teams.forEach((t, i) => {
      if (Math.floor(i / 2) % 2 === 0) {
        if (i % 2 === 0) grpATeamIds.push(t.id);
        else grpBTeamIds.push(t.id);
      } else {
        if (i % 2 === 0) grpBTeamIds.push(t.id);
        else grpATeamIds.push(t.id);
      }
    });

    const createGroupMatches = (teamIds: string[], groupName: string) => {
      const matchIds: string[] = [];
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          const mid = `m_${matchCounter++}`;
          matchIds.push(mid);
          matches[mid] = {
            id: mid,
            stage: 'group',
            stageIdentifier: `${groupName} - Match ${matchIds.length}`,
            courtId: null,
            team1Id: teamIds[i],
            team2Id: teamIds[j],
            score1: 0,
            score2: 0,
            isComplete: false,
            winnerId: null,
            loserId: null,
            startTime: null,
            endTime: null,
          };
        }
      }
      return matchIds;
    };

    const gAmatchIds = createGroupMatches(grpATeamIds, 'Group A');
    const gBmatchIds = createGroupMatches(grpBTeamIds, 'Group B');

    groups['grp_a'] = {
      id: 'grp_a',
      name: 'Group A',
      teamIds: grpATeamIds,
      matchIds: gAmatchIds,
    };

    groups['grp_b'] = {
      id: 'grp_b',
      name: 'Group B',
      teamIds: grpBTeamIds,
      matchIds: gBmatchIds,
    };

    const finalId = 'm_final';
    matches[finalId] = {
      id: finalId,
      stage: 'final',
      stageIdentifier: 'GRAND FINALE',
      courtId: null,
      team1Id: null,
      team2Id: null,
      score1: 0,
      score2: 0,
      isComplete: false,
      winnerId: null,
      loserId: null,
      startTime: null,
      endTime: null,
    };

    const thirdId = 'm_third_place';
    matches[thirdId] = {
      id: thirdId,
      stage: 'third_place',
      stageIdentifier: '3rd Prize/Position',
      courtId: null,
      team1Id: null,
      team2Id: null,
      score1: 0,
      score2: 0,
      isComplete: false,
      winnerId: null,
      loserId: null,
      startTime: null,
      endTime: null,
    };

    const semi1Id = 'm_semi_1';
    matches[semi1Id] = {
      id: semi1Id,
      stage: 'semi',
      stageIdentifier: 'Semifinal 1 (A1 vs B2)',
      courtId: null,
      team1Id: null,
      team2Id: null,
      score1: 0,
      score2: 0,
      isComplete: false,
      winnerId: null,
      loserId: null,
      startTime: null,
      endTime: null,
      nextMatchId: finalId,
      loserNextMatchId: thirdId,
    };

    const semi2Id = 'm_semi_2';
    matches[semi2Id] = {
      id: semi2Id,
      stage: 'semi',
      stageIdentifier: 'Semifinal 2 (B1 vs A2)',
      courtId: null,
      team1Id: null,
      team2Id: null,
      score1: 0,
      score2: 0,
      isComplete: false,
      winnerId: null,
      loserId: null,
      startTime: null,
      endTime: null,
      nextMatchId: finalId,
      loserNextMatchId: thirdId,
    };
  }

  return { groups, matches };
}

export function calculateGroupStandings(
  teamIds: string[],
  matches: Match[]
): GroupStanding[] {
  const standingsMap: Record<string, GroupStanding> = {};

  for (const tid of teamIds) {
    standingsMap[tid] = {
      teamId: tid,
      played: 0,
      won: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
    };
  }

  for (const match of matches) {
    if (!match || !match.isComplete || !match.team1Id || !match.team2Id) continue;
    if (!standingsMap[match.team1Id] || !standingsMap[match.team2Id]) continue;

    const s1 = match.score1;
    const s2 = match.score2;
    const t1 = standingsMap[match.team1Id];
    const t2 = standingsMap[match.team2Id];

    t1.played += 1;
    t2.played += 1;
    t1.pointsFor += s1;
    t1.pointsAgainst += s2;
    t2.pointsFor += s2;
    t2.pointsAgainst += s1;

    if (match.winnerId === match.team1Id) {
      t1.won += 1;
      t2.lost += 1;
    } else if (match.winnerId === match.team2Id) {
      t2.won += 1;
      t1.lost += 1;
    }
  }

  const result = Object.values(standingsMap).map((s) => ({
    ...s,
    pointDifferential: s.pointsFor - s.pointsAgainst,
  }));

  return result.sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    if (a.pointsAgainst !== b.pointsAgainst) return a.pointsAgainst - b.pointsAgainst;
    if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;

    const h2h = matches.find(
      (m) =>
        m &&
        m.isComplete &&
        ((m.team1Id === a.teamId && m.team2Id === b.teamId) ||
          (m.team1Id === b.teamId && m.team2Id === a.teamId))
    );

    if (h2h && h2h.winnerId) {
      return h2h.winnerId === a.teamId ? -1 : 1;
    }

    return 0;
  });
}


export function sortWaitingMatchesByRestTime(
  waitingMatches: Match[], 
  allMatches: Record<string, Match>
): Match[] {
  // Compute each team's last played end time across all completed matches
  const teamLastPlayTime: Record<string, number> = {};

  Object.values(allMatches).forEach(m => {
    if (m && m.isComplete && m.endTime) {
      if (m.team1Id) {
        teamLastPlayTime[m.team1Id] = Math.max(teamLastPlayTime[m.team1Id] || 0, m.endTime);
      }
      if (m.team2Id) {
        teamLastPlayTime[m.team2Id] = Math.max(teamLastPlayTime[m.team2Id] || 0, m.endTime);
      }
    }
  });

  const now = Date.now();

  // Sort waiting matches so that teams who rested the LONGEST (smallest lastPlayTime or oldest end time) go first
  return [...waitingMatches].sort((a, b) => {
    const aT1Time = a.team1Id ? (teamLastPlayTime[a.team1Id] || 0) : 0;
    const aT2Time = a.team2Id ? (teamLastPlayTime[a.team2Id] || 0) : 0;
    const aLastPlay = Math.max(aT1Time, aT2Time);

    const bT1Time = b.team1Id ? (teamLastPlayTime[b.team1Id] || 0) : 0;
    const bT2Time = b.team2Id ? (teamLastPlayTime[b.team2Id] || 0) : 0;
    const bLastPlay = Math.max(bT1Time, bT2Time);

    // If a team hasn't played yet (0), prioritize them. Otherwise, older end time (smaller number) gets priority.
    if (aLastPlay !== bLastPlay) {
      return aLastPlay - bLastPlay;
    }
    return 0;
  });
}


/**
 * Checks if a candidate match cannot be dispatched to a court because
 * one of its teams or players is currently actively playing on another court.
 *
 * @param candidateMatch The match considered for dispatch
 * @param courts All tournament courts
 * @param allMatches All tournament matches
 * @param teams All tournament teams
 * @param players All tournament players
 * @param targetCourtId Optional court being targeted (matches currently on this court will be replaced, so they do not conflict)
 * @returns Human-readable conflict reason if busy, or null if ready to play.
 */
export function getMatchCourtConflict(
  candidateMatch: Match | null | undefined,
  courts: Record<string, Court>,
  allMatches: Record<string, Match>,
  teams: Record<string, Team>,
  players: Record<string, Player>,
  targetCourtId?: string
): string | null {
  if (!candidateMatch || !candidateMatch.team1Id || !candidateMatch.team2Id) {
    return null;
  }

  const t1 = teams[candidateMatch.team1Id];
  const t2 = teams[candidateMatch.team2Id];

  // Strictly filter to valid, non-empty player IDs to avoid empty-string false-positives
  const candidatePlayerIds = new Set<string>(
    [...(t1?.playerIds || []), ...(t2?.playerIds || [])].filter(
      (p): p is string => typeof p === 'string' && p.trim().length > 0
    )
  );

  for (const court of Object.values(courts || {})) {
    // If targetCourtId is passed and matches this court, ignore (as this court is being assigned/replaced)
    if (targetCourtId && court.id === targetCourtId) {
      continue;
    }

    if (court.currentMatchId) {
      const activeMatch = allMatches[court.currentMatchId];
      // Only consider active, non-completed matches that are not the candidate itself
      if (activeMatch && !activeMatch.isComplete && activeMatch.id !== candidateMatch.id) {
        // 1. Team 1 conflict
        if (candidateMatch.team1Id === activeMatch.team1Id || candidateMatch.team1Id === activeMatch.team2Id) {
          return `${t1?.name || "Team 1"} is currently playing on ${court.name}`;
        }

        // 2. Team 2 conflict
        if (candidateMatch.team2Id === activeMatch.team1Id || candidateMatch.team2Id === activeMatch.team2Id) {
          return `${t2?.name || "Team 2"} is currently playing on ${court.name}`;
        }

        // 3. Individual Player conflict (strictly non-empty player IDs)
        const activeT1 = activeMatch.team1Id ? teams[activeMatch.team1Id] : null;
        const activeT2 = activeMatch.team2Id ? teams[activeMatch.team2Id] : null;
        const activePlayerIds = [
          ...(activeT1?.playerIds || []),
          ...(activeT2?.playerIds || []),
        ].filter((p): p is string => typeof p === 'string' && p.trim().length > 0);

        for (const pId of activePlayerIds) {
          if (candidatePlayerIds.has(pId)) {
            const player = players[pId];
            return `${player?.name || "A player"} is currently playing on ${court.name}`;
          }
        }
      }
    }
  }

  return null;
}

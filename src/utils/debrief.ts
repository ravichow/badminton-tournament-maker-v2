import { TournamentState, IncidentTag } from '../types/tournament';

export const OPENING_BRIEFING_SCRIPT = `
### 🏸 Tournament Opening Speech & Rules Briefing

"Welcome players and spectators to today's tournament! 

Before court matches go live, please take note of our format:

1. **Scoring & Deuce Rules:** 
   - Games are played to **{POINTS_TO_WIN} points**.
   - If you reach deuce ({DEUCE_TRIGGER}-{DEUCE_TRIGGER}), play continues until a side leads by **2 points**, up to a sudden-death hard cap of **{HARD_CAP} points** (30-29 is game).
   
2. **Conduct & Pace-of-Play:**
   - 90-second warm-up once called to court.
   - Faults, line calls, and service heights are self-officiated on the honor code. If disputed, immediately replay rally.
   
3. **PWA Live Tracking:**
   - Follow live court tickers, live standings, and the playoff tree on your phone.
   
4. **Organizer Delegation:**
   - If the organizers are on court playing, tournament administration shifts to delegated court marshals via temporary 4-digit PINs.

Play fair, smash hard, and have fun!"
`;

export interface DebriefReport {
  totalMatchesPlayed: number;
  totalRunTimeMinutes: number;
  projectedDurationMinutes: number;
  runtimeVarianceMinutes: number;
  averageMatchDurationMinutes: number;
  averageRating: number;
  incidentsBreakdown: Record<IncidentTag, number>;
  lowRatedMatches: Array<{
    matchId: string;
    stageIdentifier: string;
    rating: number;
    notes: string;
    incidents: IncidentTag[];
  }>;
}

export function generateTournamentDebrief(state: TournamentState): DebriefReport {
  const allMatches = Object.values(state.matches || {});
  const completedMatches = allMatches.filter((m) => m && m.isComplete && m.startTime && m.endTime);

  const firstMatchStart = completedMatches.length > 0 
    ? Math.min(...completedMatches.map((m) => m.startTime || Date.now())) 
    : Date.now();
  const lastMatchEnd = completedMatches.length > 0 
    ? Math.max(...completedMatches.map((m) => m.endTime || Date.now())) 
    : Date.now();
  
  const totalRunTimeMs = completedMatches.length > 0 ? (lastMatchEnd - firstMatchStart) : 0;
  const totalRunTimeMinutes = Math.round(totalRunTimeMs / 60000);

  const totalMatchDurationMs = completedMatches.reduce(
    (acc, m) => acc + ((m.endTime || 0) - (m.startTime || 0)), 
    0
  );
  const averageMatchDurationMinutes = completedMatches.length > 0 
    ? Math.round(totalMatchDurationMs / completedMatches.length / 60000) 
    : 0;

  const incidentCounter: Record<IncidentTag, number> = {
    'Injury Delay': 0,
    'Shuttle Quality': 0,
    'Court Glitch': 0,
    'Disputed Call': 0,
    'Equipment Issue': 0
  };

  let totalStars = 0;
  let reviewsCount = 0;
  const lowRatedMatches: DebriefReport['lowRatedMatches'] = [];

  for (const m of completedMatches) {
    if (m && m.review) {
      const starRating = typeof m.review.rating === 'number' ? m.review.rating : 5;
      totalStars += starRating;
      reviewsCount++;

      const safeIncidents = Array.isArray(m.review.incidents) ? m.review.incidents : [];
      for (const incident of safeIncidents) {
        if (incidentCounter[incident] !== undefined) {
          incidentCounter[incident]++;
        }
      }

      if (starRating <= 2) {
        lowRatedMatches.push({
          matchId: m.id,
          stageIdentifier: m.stageIdentifier || 'Match',
          rating: starRating,
          notes: m.review.notes || '',
          incidents: safeIncidents
        });
      }
    }
  }

  return {
    totalMatchesPlayed: completedMatches.length,
    totalRunTimeMinutes,
    projectedDurationMinutes: state.projectedDurationMinutes || 120,
    runtimeVarianceMinutes: totalRunTimeMinutes - (state.projectedDurationMinutes || 120),
    averageMatchDurationMinutes,
    averageRating: reviewsCount > 0 ? parseFloat((totalStars / reviewsCount).toFixed(1)) : 5.0,
    incidentsBreakdown: incidentCounter,
    lowRatedMatches,
  };
}

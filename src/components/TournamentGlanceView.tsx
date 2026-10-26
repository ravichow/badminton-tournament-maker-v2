import React from 'react';
import { TournamentState } from '../types/tournament';
import { calculateGroupStandings, getTeamPlayerNames } from '../utils/engine';

interface GlanceProps {
  state: TournamentState;
}

export const TournamentGlanceView: React.FC<GlanceProps> = ({ state }) => {
  const matchesList = Object.values(state.matches || {});
  const groupMatches = matchesList.filter(m => m && m.stage === 'group');
  const quarterMatches = matchesList.filter(m => m && m.stage === 'quarter');
  const semiMatches = matchesList.filter(m => m && m.stage === 'semi');
  const finalMatch = matchesList.find(m => m && m.stage === 'final');
  const thirdMatch = matchesList.find(m => m && m.stage === 'third_place');

  const championTeam = finalMatch?.isComplete && finalMatch.winnerId ? state.teams[finalMatch.winnerId] : null;
  const runnerUpTeam = finalMatch?.isComplete && finalMatch.loserId ? state.teams[finalMatch.loserId] : null;
  const thirdPlaceTeam = thirdMatch?.isComplete && thirdMatch.winnerId ? state.teams[thirdMatch.winnerId] : null;

  return (
    <div id="tournament-glance-sheet" className="w-full bg-slate-950 text-slate-100 p-6 rounded-3xl border border-slate-800 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 text-center">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          🏸 {state.name}
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">
          Official Printable Glance Sheet & Tournament Report
        </p>
      </div>

      {/* Podium Champions Banner */}
      {championTeam && (
        <div className="grid grid-cols-3 gap-3 text-center p-4 bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 rounded-2xl border border-amber-500/50 shadow-xl">
          <div className="p-2">
            <span className="text-xl">🥈</span>
            <span className="text-[11px] block uppercase font-bold text-slate-400">2nd Place</span>
            <span className="text-sm font-bold text-slate-200 block truncate">{runnerUpTeam?.name || 'TBD'}</span>
            <span className="text-[11px] text-slate-400 block truncate">({getTeamPlayerNames(runnerUpTeam, state.players)})</span>
          </div>
          <div className="p-2 border-x border-amber-500/30 bg-amber-500/10 rounded-xl">
            <span className="text-3xl">👑</span>
            <span className="text-xs block uppercase font-black text-amber-400">CHAMPIONS</span>
            <span className="text-base font-black text-amber-300 block truncate">{championTeam.name}</span>
            <span className="text-xs text-amber-400/90 font-semibold block truncate">({getTeamPlayerNames(championTeam, state.players)})</span>
          </div>
          <div className="p-2">
            <span className="text-xl">🥉</span>
            <span className="text-[11px] block uppercase font-bold text-orange-400">3rd Place</span>
            <span className="text-sm font-bold text-slate-200 block truncate">{thirdPlaceTeam?.name || 'TBD'}</span>
            <span className="text-[11px] text-slate-400 block truncate">({getTeamPlayerNames(thirdPlaceTeam, state.players)})</span>
          </div>
        </div>
      )}

      {/* Group Stages Standings & Results */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
          Group Round-Robin Standings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(state.groups || {}).map((grp) => {
            const gMatches = grp.matchIds.map((id) => state.matches[id]).filter(Boolean);
            const standings = calculateGroupStandings(grp.teamIds, gMatches);

            return (
              <div key={grp.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-md">
                <span className="text-xs font-bold text-white block mb-2">{grp.name}</span>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                      <th className="pb-1.5">Team & Lineup</th>
                      <th className="pb-1.5 text-center">W</th>
                      <th className="pb-1.5 text-center">L</th>
                      <th className="pb-1.5 text-center">PF</th>
                      <th className="pb-1.5 text-center">PA</th>
                      <th className="pb-1.5 text-right">PD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {standings.map((s, idx) => {
                      const team = state.teams[s.teamId];
                      const members = getTeamPlayerNames(team, state.players);

                      return (
                        <tr key={s.teamId}>
                          <td className="py-2 font-sans font-medium text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] ${idx < 2 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                                {idx + 1}.
                              </span>
                              <span className="font-bold text-slate-100 truncate max-w-[130px]">{team?.name}</span>
                            </div>
                            {members && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[170px] pl-3.5">
                                {members}
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-center font-bold text-emerald-400">{s.won}</td>
                          <td className="py-2 text-center text-rose-400">{s.lost}</td>
                          <td className="py-2 text-center text-slate-400">{s.pointsFor}</td>
                          <td className="py-2 text-center text-slate-400">{s.pointsAgainst}</td>
                          <td className={`py-2 text-right font-bold ${s.pointDifferential >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {s.pointDifferential > 0 ? `+${s.pointDifferential}` : s.pointDifferential}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Playoff Stage Tree (Quarters, Semis, Finals, 3rd place) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3">
          Complete Playoff Progression Tree
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Quarters (if any) */}
          {quarterMatches.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">Quarterfinals</span>
              {quarterMatches.map(qm => (
                <div key={qm.id} className="bg-slate-900 border border-purple-500/30 p-3 rounded-xl text-xs">
                  <span className="text-[10px] text-slate-400 block mb-1">{qm.stageIdentifier}</span>
                  <div className="flex justify-between py-0.5">
                    <span className={qm.winnerId === qm.team1Id ? 'font-bold text-emerald-400 truncate' : 'truncate'}>
                      {state.teams[qm.team1Id!]?.name || 'TBD'}
                    </span>
                    <span className="font-mono font-bold ml-2">{qm.score1}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-t border-slate-800">
                    <span className={qm.winnerId === qm.team2Id ? 'font-bold text-emerald-400 truncate' : 'truncate'}>
                      {state.teams[qm.team2Id!]?.name || 'TBD'}
                    </span>
                    <span className="font-mono font-bold ml-2">{qm.score2}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Semifinals */}
          {semiMatches.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">Semifinals</span>
              {semiMatches.map(sm => (
                <div key={sm.id} className="bg-slate-900 border border-purple-500/40 p-3 rounded-xl text-xs">
                  <span className="text-[10px] text-slate-400 block mb-1">{sm.stageIdentifier}</span>
                  <div className="flex justify-between py-0.5">
                    <span className={sm.winnerId === sm.team1Id ? 'font-bold text-emerald-400 truncate' : 'truncate'}>
                      {state.teams[sm.team1Id!]?.name || 'TBD'}
                    </span>
                    <span className="font-mono font-bold ml-2">{sm.score1}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-t border-slate-800">
                    <span className={sm.winnerId === sm.team2Id ? 'font-bold text-emerald-400 truncate' : 'truncate'}>
                      {state.teams[sm.team2Id!]?.name || 'TBD'}
                    </span>
                    <span className="font-mono font-bold ml-2">{sm.score2}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GRAND FINALE */}
          {finalMatch && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">GRAND FINALE</span>
              <div className="bg-slate-900 border-2 border-amber-500 p-3 rounded-xl shadow-lg text-xs">
                <span className="text-[10px] text-amber-400 font-bold block mb-1">👑 {finalMatch.stageIdentifier}</span>
                <div className="flex justify-between py-0.5">
                  <span className={finalMatch.winnerId === finalMatch.team1Id ? 'font-black text-amber-300 truncate' : 'truncate'}>
                    {state.teams[finalMatch.team1Id!]?.name || 'TBD'}
                  </span>
                  <span className="font-mono font-black text-amber-400 ml-2">{finalMatch.score1}</span>
                </div>
                <div className="flex justify-between py-0.5 border-t border-slate-800">
                  <span className={finalMatch.winnerId === finalMatch.team2Id ? 'font-black text-amber-300 truncate' : 'truncate'}>
                    {state.teams[finalMatch.team2Id!]?.name || 'TBD'}
                  </span>
                  <span className="font-mono font-black text-amber-400 ml-2">{finalMatch.score2}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {thirdMatch && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block">3rd Prize/Position</span>
              <div className="bg-slate-900 border border-orange-500/60 p-3 rounded-xl text-xs">
                <span className="text-[10px] text-orange-400 font-bold block mb-1">🥉 {thirdMatch.stageIdentifier}</span>
                <div className="flex justify-between py-0.5">
                  <span className={thirdMatch.winnerId === thirdMatch.team1Id ? 'font-bold text-orange-300 truncate' : 'truncate'}>
                    {state.teams[thirdMatch.team1Id!]?.name || 'TBD'}
                  </span>
                  <span className="font-mono font-bold ml-2">{thirdMatch.score1}</span>
                </div>
                <div className="flex justify-between py-0.5 border-t border-slate-800">
                  <span className={thirdMatch.winnerId === thirdMatch.team2Id ? 'font-bold text-orange-300 truncate' : 'truncate'}>
                    {state.teams[thirdMatch.team2Id!]?.name || 'TBD'}
                  </span>
                  <span className="font-mono font-bold ml-2">{thirdMatch.score2}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

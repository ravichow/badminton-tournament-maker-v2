import React, { useState, useEffect } from 'react';
import { Match, ScoringRules, IncidentTag, Team, Player } from '../types/tournament';
import { isValidScore, getTeamPlayerNames } from '../utils/engine';
import { MatchStageBadge } from './MatchStageBadge';

interface ScoreModalProps {
  match: Match;
  team1: Team | undefined;
  team2: Team | undefined;
  players: Record<string, Player>;
  rules: ScoringRules;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (matchId: string, s1: number, s2: number, rating: number, notes: string, incidents: IncidentTag[]) => void;
  onLiveScoreChange?: (matchId: string, s1: number, s2: number) => void;
}

const ALL_INCIDENTS: IncidentTag[] = [
  'Injury Delay', 
  'Shuttle Quality', 
  'Court Glitch', 
  'Disputed Call', 
  'Equipment Issue'
];

export const ScoreModal: React.FC<ScoreModalProps> = ({
  match,
  team1,
  team2,
  players,
  rules,
  isOpen,
  onClose,
  onSubmit,
  onLiveScoreChange,
}) => {
  const [s1, setS1] = useState<number>(match.score1 || 0);
  const [s2, setS2] = useState<number>(match.score2 || 0);
  const [history, setHistory] = useState<{ s1: number; s2: number }[]>([]);
  const [servingTeam, setServingTeam] = useState<1 | 2>(1);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(match.review?.rating || 5);
  const [notes, setNotes] = useState<string>(match.review?.notes || '');
  const [selectedIncidents, setSelectedIncidents] = useState<IncidentTag[]>(match.review?.incidents || []);

  useEffect(() => {
    setS1(match.score1 || 0);
    setS2(match.score2 || 0);
    setHistory([]);
  }, [match.id, match.score1, match.score2]);

  // Propagate intermediate live scores to Cloudflare D1 / localStorage
  useEffect(() => {
    if (onLiveScoreChange) {
      onLiveScoreChange(match.id, s1, s2);
    }
  }, [s1, s2, match.id]);

  if (!isOpen) return null;

  const team1Name = team1?.name || 'Team 1';
  const team2Name = team2?.name || 'Team 2';
  const team1Members = getTeamPlayerNames(team1, players);
  const team2Members = getTeamPlayerNames(team2, players);

  const validation = isValidScore(s1, s2, rules);

  const addPoint = (team: 1 | 2) => {
    setHistory(prev => [...prev, { s1, s2 }]);
    if (team === 1) {
      setS1(prev => Math.min(rules.hardCap, prev + 1));
      setServingTeam(1);
    } else {
      setS2(prev => Math.min(rules.hardCap, prev + 1));
      setServingTeam(2);
    }
  };

  const removePoint = (team: 1 | 2) => {
    setHistory(prev => [...prev, { s1, s2 }]);
    if (team === 1) {
      setS1(prev => Math.max(0, prev - 1));
    } else {
      setS2(prev => Math.max(0, prev - 1));
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, prev.length - 1));
    setS1(last.s1);
    setS2(last.s2);
  };

  const handleFinish = () => {
    if (!validation.valid || !validation.complete) {
      alert(validation.error || `Match is not complete. Requires reaching ${rules.pointsToWin} pts with a ${rules.deuceLead}-pt lead (or cap of ${rules.hardCap}).`);
      return;
    }
    onSubmit(match.id, s1, s2, rating, notes, selectedIncidents);
    onClose();
  };

  const toggleIncident = (tag: IncidentTag) => {
    setSelectedIncidents(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-4 sm:p-6 text-ink space-y-5 my-auto max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand">
                🏸 Live Scorekeeper
              </span>
              <MatchStageBadge stage={match.stage} stageIdentifier={match.stageIdentifier} size="sm" />
            </div>
            <h3 className="text-xs font-bold text-ink-muted">
              Game to {rules.pointsToWin} (Lead {rules.deuceLead}, Cap {rules.hardCap || 30})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-ink-muted hover:text-ink flex items-center justify-center font-bold text-base"
          >
            ✕
          </button>
        </div>

        {/* 1-TAP QUICK SCORE PRESETS */}
        <div className="bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-courtborder space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted">
            <span className="flex items-center gap-1">
              <span>⚡</span>
              <span>1-Tap Direct Score:</span>
            </span>
            <span className="text-[10px] text-brand font-medium">Click score numbers below to type directly</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(rules.pointsToWin === 21
              ? [
                  [21, 15], [21, 17], [21, 19], [22, 20],
                  [15, 21], [17, 21], [19, 21], [20, 22]
                ]
              : [
                  [15, 10], [15, 12], [15, 13], [16, 14],
                  [10, 15], [12, 15], [13, 15], [14, 16]
                ]
            ).map(([pts1, pts2], idx) => {
              const isSelected = s1 === pts1 && s2 === pts2;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setHistory(prev => [...prev, { s1, s2, server: servingTeam }]);
                    setS1(pts1);
                    setS2(pts2);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-black rounded-xl border transition ${
                    isSelected
                      ? 'bg-brand text-brand-text border-brand shadow-sm scale-105'
                      : 'bg-surface text-ink hover:border-brand border-courtborder hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                  title={`Directly set score to ${pts1} - ${pts2}`}
                >
                  {pts1} - {pts2}
                </button>
              );
            })}
          </div>
        </div>

        {/* GIANT SCOREBOARD DISPLAY */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 relative">
          
          {/* Team 1 Side */}
          <div className={`p-4 rounded-3xl border text-center transition-all ${
            servingTeam === 1 
              ? 'border-brand bg-surface-soft shadow-md' 
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60'
          }`}>
            <div className="flex items-center justify-center gap-1.5 min-h-6">
              {servingTeam === 1 && (
                <span className="text-xs font-bold text-brand animate-bounce">🏸 Serve</span>
              )}
            </div>
            <h4 className="text-lg sm:text-xl font-black truncate text-ink-heading mt-0.5">
              {team1Name}
            </h4>
            <p className="text-xs sm:text-sm text-ink-muted font-semibold truncate mb-2">
              {team1Members}
            </p>

            {/* Giant Score 1 (Editable: Click & Type Directly) */}
            <div className="relative group my-1">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                max={rules.hardCap || 30}
                value={s1}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setS1(isNaN(val) ? 0 : Math.max(0, Math.min(rules.hardCap || 30, val)));
                }}
                className="w-full text-center text-7xl sm:text-8xl font-black text-ink-heading tracking-tight py-1 font-mono bg-transparent border-b-2 border-transparent hover:border-brand/40 focus:border-brand focus:outline-none focus:bg-slate-100/50 dark:focus:bg-slate-800/50 rounded-xl transition cursor-text"
                title="Tap or click to type score directly"
              />
              <span className="text-[10px] text-ink-muted block opacity-60 group-hover:opacity-100 transition">
                ✏️ Click to type
              </span>
            </div>

            {/* Big Touch Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => addPoint(1)}
                className="flex-1 py-4 bg-brand hover:bg-brand-hover text-brand-text text-2xl font-black rounded-2xl shadow-md transition transform active:scale-95"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => removePoint(1)}
                disabled={s1 === 0}
                className="w-12 py-4 bg-slate-200 dark:bg-slate-800 text-ink text-xl font-black rounded-2xl disabled:opacity-40 transition transform active:scale-95"
              >
                –1
              </button>
            </div>
          </div>

          {/* Team 2 Side */}
          <div className={`p-4 rounded-3xl border text-center transition-all ${
            servingTeam === 2 
              ? 'border-brand bg-surface-soft shadow-md' 
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60'
          }`}>
            <div className="flex items-center justify-center gap-1.5 min-h-6">
              {servingTeam === 2 && (
                <span className="text-xs font-bold text-brand animate-bounce">🏸 Serve</span>
              )}
            </div>
            <h4 className="text-lg sm:text-xl font-black truncate text-ink-heading mt-0.5">
              {team2Name}
            </h4>
            <p className="text-xs sm:text-sm text-ink-muted font-semibold truncate mb-2">
              {team2Members}
            </p>

            {/* Giant Score 2 (Editable: Click & Type Directly) */}
            <div className="relative group my-1">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                max={rules.hardCap || 30}
                value={s2}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setS2(isNaN(val) ? 0 : Math.max(0, Math.min(rules.hardCap || 30, val)));
                }}
                className="w-full text-center text-7xl sm:text-8xl font-black text-ink-heading tracking-tight py-1 font-mono bg-transparent border-b-2 border-transparent hover:border-brand/40 focus:border-brand focus:outline-none focus:bg-slate-100/50 dark:focus:bg-slate-800/50 rounded-xl transition cursor-text"
                title="Tap or click to type score directly"
              />
              <span className="text-[10px] text-ink-muted block opacity-60 group-hover:opacity-100 transition">
                ✏️ Click to type
              </span>
            </div>

            {/* Big Touch Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => addPoint(2)}
                className="flex-1 py-4 bg-brand hover:bg-brand-hover text-brand-text text-2xl font-black rounded-2xl shadow-md transition transform active:scale-95"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => removePoint(2)}
                disabled={s2 === 0}
                className="w-12 py-4 bg-slate-200 dark:bg-slate-800 text-ink text-xl font-black rounded-2xl disabled:opacity-40 transition transform active:scale-95"
              >
                –1
              </button>
            </div>
          </div>

        </div>

        {/* Server Shuttle Switcher & Status Note */}
        <div className="flex items-center justify-between text-xs px-2 text-ink-muted">
          <button
            type="button"
            onClick={() => setServingTeam(prev => (prev === 1 ? 2 : 1))}
            className="font-bold text-brand hover:underline flex items-center gap-1.5"
          >
            <span>🔄 Switch Serve to {servingTeam === 1 ? team2Name : team1Name}</span>
          </button>
          
          {validation.complete ? (
            <span className="font-extrabold text-brand bg-surface-soft px-2.5 py-0.5 rounded-full border border-brand/30 animate-pulse">
              🎉 Match Won!
            </span>
          ) : (
            <span>Playing to {rules.pointsToWin} (Lead 2)</span>
          )}
        </div>

        {/* Bottom Actions: Undo & Finish Game */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-ink text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
          >
            <span>↩</span>
            <span>Undo Point</span>
          </button>

          <button
            type="button"
            onClick={handleFinish}
            className={`flex-2 py-3.5 text-sm font-black rounded-2xl shadow-lg transition transform active:scale-98 flex items-center justify-center gap-2 ${
              validation.complete 
                ? 'bg-brand hover:bg-brand-hover text-brand-text animate-bounce' 
                : 'bg-slate-200 dark:bg-slate-800 text-ink-muted hover:text-ink'
            }`}
          >
            <span>✓ Finish Game</span>
          </button>
        </div>

        {/* Match Debrief & Review Drawer (Collapsible) */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowReview(prev => !prev)}
            className="text-xs font-bold text-ink-muted hover:text-ink flex items-center justify-between w-full"
          >
            <span>{showReview ? '▼ Hide Match Notes & Incidents' : '▶ Add Match Notes / Incidents (Optional)'}</span>
            <span className="text-[10px] text-brand">Optional</span>
          </button>

          {showReview && (
            <div className="space-y-3 mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">Match Quality (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`w-8 h-8 rounded-xl font-bold ${
                        rating >= star ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-ink-muted'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">Incidents / Delays</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_INCIDENTS.map((tag) => {
                    const isSel = selectedIncidents.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleIncident(tag)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                          isSel 
                            ? 'bg-amber-500 text-slate-950 border-amber-600' 
                            : 'bg-surface text-ink-muted border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink-muted block mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Great rallies, close deuce finish"
                  className="w-full px-3 py-1.5 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 text-ink text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

import React from 'react';
import { Match } from '../types/tournament';

interface MatchStageBadgeProps {
  stage: Match['stage'];
  stageIdentifier?: string;
  size?: 'sm' | 'md';
}

export const MatchStageBadge: React.FC<MatchStageBadgeProps> = ({
  stage,
  stageIdentifier,
  size = 'sm',
}) => {
  let label = stageIdentifier || '';
  let colorClass = '';
  let icon = '🏸';

  // Check if this is the Grand Finale or 3rd Prize/Position
  const isFinal = stage === 'final' || /final|grand/i.test(label);
  const isThird = stage === 'third_place' || /3rd|third|bronze/i.test(label);

  if (isFinal) {
    icon = '👑';
    label = 'GRAND FINALE';
    // Prestigious bright gold background with dark high-contrast text and border
    colorClass = 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md ring-1 ring-amber-400/40';
  } else if (isThird) {
    icon = '🥉';
    label = '3rd Prize/Position';
    // Distinct vibrant bronze/burnt-orange background with crisp white text
    colorClass = 'bg-orange-600 text-white border-orange-400 font-black shadow-sm';
  } else {
    switch (stage) {
      case 'semi':
        icon = '⚡';
        label = label || 'Semifinal';
        colorClass = 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/40 font-bold';
        break;
      case 'quarter':
        icon = '⚔️';
        label = label || 'Quarterfinal';
        colorClass = 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/40 font-bold';
        break;
      case 'group':
      default:
        icon = '🏸';
        label = label || 'Round-Robin';
        colorClass = 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 font-bold';
        break;
    }
  }

  const sizeClass = size === 'md' ? 'text-xs px-2.5 py-1 font-black' : 'text-[10.5px] px-2 py-0.5 font-bold';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border uppercase tracking-wider font-mono shrink-0 shadow-xs whitespace-nowrap ${sizeClass} ${colorClass}`}
    >
      <span>{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
};

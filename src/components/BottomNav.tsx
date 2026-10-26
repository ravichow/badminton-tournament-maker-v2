import React from 'react';

export type NavTab = 'matches' | 'teams' | 'standings' | 'bracket' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeMatchCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  activeMatchCount = 0,
}) => {
  const tabs: { id: NavTab; label: string; icon: string }[] = [
    { id: 'matches', label: 'Matches', icon: '🏸' },
    { id: 'teams', label: 'Teams', icon: '👥' },
    { id: 'standings', label: 'Standings', icon: '🏆' },
    { id: 'bracket', label: 'Bracket', icon: '🌿' },
    { id: 'settings', label: 'More', icon: '☰' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 safe-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-150 relative ${
                isActive
                  ? 'text-brand font-bold scale-105'
                  : 'text-ink-muted hover:text-ink font-medium'
              }`}
            >
              <div className="relative">
                <span className="text-xl leading-none">{tab.icon}</span>
                {tab.id === 'matches' && activeMatchCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 bg-alert text-white text-[10px] font-black rounded-full animate-pulse shadow-sm">
                    {activeMatchCount}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 tracking-tight ${isActive ? 'text-brand' : 'text-ink-muted'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-brand rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

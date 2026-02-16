import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Target, BarChart2 } from 'lucide-react';

const MatchSelector = ({ isAudience = false }) => {
    const { maxMatch, selectedMatch, switchMatch } = useTournament();

    // Dynamically generate matches based on maxMatch from context
    const matches = [];

    // Only show OVERALL if not in audience mode
    if (!isAudience) {
        matches.push({ id: null, label: 'OVERALL', icon: BarChart2 });
    }

    // Add matches based on maxMatch from database
    for (let i = 1; i <= Math.max(maxMatch, 1); i++) {
        matches.push({ id: i, label: `MATCH ${i}`, icon: Target });
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5 p-1 border-b border-cyber-border/30 pb-4 md:pb-0 md:border-0">
            {matches.map((match) => {
                const Icon = match.icon;
                const isActive = selectedMatch === match.id;

                return (
                    <button
                        key={match.label}
                        onClick={() => switchMatch(match.id)}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-sm font-oswald text-[11px] tracking-[0.2em] transition-all duration-300 uppercase
                            ${isActive
                                ? 'bg-cyber-pink/20 text-white shadow-[0_0_15px_rgba(255,41,117,0.2)] border-cyber-pink ring-1 ring-cyber-pink/50'
                                : 'text-cyber-muted hover:text-white hover:bg-cyber-charcoal border-white/5'}
                            border
                        `}
                    >
                        <Icon className={`w-3 h-3 ${isActive ? 'animate-pulse text-cyber-pink' : ''}`} />
                        <span>{match.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default MatchSelector;

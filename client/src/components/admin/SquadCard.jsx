import { useState, useEffect } from 'react';
import ScoreEntryRow from './ScoreEntryRow';
import { Users, Crosshair, Map } from 'lucide-react';

const SquadCard = ({ squad, roomNumber, onUpdateKills, onUpdatePlacement, onDeletePlayer }) => {
    const [placement, setPlacement] = useState(squad.roundPlacement || '');

    useEffect(() => {
        setPlacement(squad.roundPlacement || '');
    }, [squad.roundPlacement]);

    const handlePlacementChange = (value) => {
        setPlacement(value);
    };

    const handlePlacementBlur = () => {
        // Only update if changed
        if (placement !== squad.roundPlacement) {
            onUpdatePlacement(squad._id, placement);
        }
    };

    const totalKills = squad.players.reduce((sum, p) => sum + (p.total || 0), 0);

    return (
        <div className="bg-cyber-card border border-white/5 rounded-none overflow-hidden mb-6 shadow-xl relative group hover:border-cyber-red/30 transition-all duration-300">
            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-4 h-4 bg-cyber-red/20 transform rotate-45 translate-x-1/2 -translate-y-1/2 group-hover:bg-cyber-red transition-colors"></div>
            </div>

            {/* Header */}
            <div className="bg-gradient-to-r from-cyber-black to-cyber-charcoal p-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyber-red opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex items-center gap-4 z-10">
                    <div className="bg-cyber-black px-3 py-1 text-xs font-mono font-bold text-cyber-red border border-cyber-red/30 uppercase tracking-widest skew-x-[-10deg]">
                        <span className="skew-x-[10deg] block">SECTOR {roomNumber}</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-oswald font-bold text-white tracking-wide leading-none">{squad.squadName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Users className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-500 text-xs font-mono uppercase">SQD-{squad._id.substring(20)} // {squad.players.length} OPERATIVES</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 z-10">
                    {/* Placement Input */}
                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                            RANKING
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="12"
                                placeholder="-"
                                value={placement}
                                onChange={(e) => handlePlacementChange(e.target.value)}
                                onBlur={handlePlacementBlur}
                                className="w-16 bg-cyber-black border border-white/10 px-2 py-2 text-center font-oswald font-bold text-white text-xl focus:border-cyber-neon focus:outline-none focus:shadow-[0_0_10px_rgba(0,240,255,0.3)] transition-all clip-path-slant"
                            />
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyber-neon/50 pointer-events-none"></div>
                        </div>
                    </div>

                    {/* Total Kills Display */}
                    <div className="text-right">
                        <div className="text-3xl font-oswald font-bold text-cyber-neon leading-none text-shadow-neon">{totalKills}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono flex items-center justify-end gap-1">
                            <Crosshair className="w-3 h-3" />
                            CONFIRMED KILLS
                        </div>
                    </div>
                </div>
            </div>

            {/* Players Table */}
            <div className="overflow-x-auto bg-cyber-black/20">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 text-gray-400 text-xs font-mono uppercase tracking-wider border-b border-white/5">
                            <th className="p-3 text-center w-12">SEL</th>
                            <th className="p-3 text-center w-12">#</th>
                            <th className="p-3 font-bold text-white">OPERATIVE</th>
                            <th className="p-3 hidden md:table-cell">CODENAME</th>
                            <th className="p-3 hidden lg:table-cell">ID TAG</th>
                            <th className="p-3 text-center w-20"><Map className="w-3 h-3 mx-auto mb-1" />M1</th>
                            <th className="p-3 text-center w-20"><Map className="w-3 h-3 mx-auto mb-1" />M2</th>
                            <th className="p-3 text-center w-20"><Map className="w-3 h-3 mx-auto mb-1" />M3</th>
                            <th className="p-3 text-center w-16 text-cyber-neon font-bold">TOT</th>
                            <th className="p-3 text-center w-12">ACT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {squad.players.map((player, index) => (
                            <ScoreEntryRow
                                key={player._id || index} // Use index fallback if _id missing
                                player={player}
                                rank={index + 1} // Just visual rank within squad
                                onUpdateKills={onUpdateKills}
                                onDelete={onDeletePlayer}
                                isSelected={false}
                                onToggleSelect={() => { }}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {squad.players.length === 0 && (
                <div className="p-8 text-center text-gray-600 font-mono text-sm bg-black/20 italic">
                    // SYSTEM WARNING: NO OPERATIVES ASSIGNED
                </div>
            )}
        </div>
    );
};

export default SquadCard;

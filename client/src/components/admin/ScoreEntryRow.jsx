import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

const ScoreEntryRow = ({ player, rank, onUpdateKills, onDelete, isSelected, onToggleSelect }) => {
    // Local state for inputs to ensure smooth typing
    const [kills, setKills] = useState({
        map1: player.map1 || 0,
        map2: player.map2 || 0,
        map3: player.map3 || 0
    });

    // Update local state when prop changes (e.g. from socket update)
    useEffect(() => {
        setKills({
            map1: player.map1 || 0,
            map2: player.map2 || 0,
            map3: player.map3 || 0
        });
    }, [player.map1, player.map2, player.map3]);

    const handleChange = (map, value) => {
        const val = parseInt(value) || 0;
        setKills(prev => ({ ...prev, [map]: val }));
    };

    const handleBlur = (map) => {
        if (kills[map] !== player[map]) {
            onUpdateKills(player.ffId, map, kills[map]);
        }
    };

    const total = (parseInt(kills.map1) || 0) + (parseInt(kills.map2) || 0) + (parseInt(kills.map3) || 0);

    const isTop3 = rank <= 3;

    return (
        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
            <td className="p-3 text-center">
                <input
                    type="checkbox"
                    className="appearance-none w-4 h-4 border border-gray-600 rounded bg-gray-800 checked:bg-cyber-neon checked:border-cyber-neon focus:ring-1 focus:ring-cyber-neon transition-all cursor-pointer"
                    checked={isSelected}
                    onChange={(e) => onToggleSelect(player._id, e.target.checked)}
                />
            </td>
            <td className="p-3 text-center">
                <div className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-xs mx-auto ${isTop3 ? 'text-cyber-yellow' : 'text-gray-600'
                    }`}>
                    {rank}
                </div>
            </td>
            <td className="p-3">
                <div className="font-bold text-white font-oswald tracking-wide text-sm">{player.playerName}</div>
            </td>
            <td className="p-3 text-gray-400 text-xs font-mono tracking-wider hidden md:table-cell uppercase">{player.ffName || '-'}</td>
            <td className="p-3 text-gray-600 text-[10px] font-mono hidden lg:table-cell">{player.ffId}</td>

            {/* Map Inputs */}
            {['map1', 'map2', 'map3'].map((map) => (
                <td key={map} className="p-1 text-center">
                    <input
                        type="number"
                        min="0"
                        className="w-12 bg-black/40 border border-white/10 text-center font-bold text-white text-sm py-1 focus:border-cyber-neon focus:bg-cyber-neon/10 focus:outline-none transition-all font-mono"
                        value={kills[map]}
                        onChange={(e) => handleChange(map, e.target.value)}
                        onBlur={() => handleBlur(map)}
                    />
                </td>
            ))}

            <td className="p-3 text-center border-l border-white/5 bg-white/2">
                <span className="text-lg font-bold font-oswald text-cyber-neon text-shadow-neon">{total}</span>
            </td>
            <td className="p-3 text-center">
                <button
                    onClick={() => onDelete(player._id)}
                    className="text-gray-600 hover:text-cyber-red transition-colors w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title="Remove Operative"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
};

export default ScoreEntryRow;

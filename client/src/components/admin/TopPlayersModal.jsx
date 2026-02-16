import { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Trophy, CheckCircle } from 'lucide-react';

const TopPlayersModal = ({ isOpen, onClose, players, selectedIds, onSave }) => {
    const [localSelected, setLocalSelected] = useState([]);
    const [countMode, setCountMode] = useState('custom');

    useEffect(() => {
        if (isOpen) {
            setLocalSelected([...selectedIds]);
        }
    }, [isOpen, selectedIds]);

    const handleModeChange = (mode) => {
        setCountMode(mode);
        if (mode !== 'custom') {
            // Auto-select top N players based on total kills
            const sorted = [...players].sort((a, b) => (b.total || 0) - (a.total || 0));
            const count = parseInt(mode);
            setLocalSelected(sorted.slice(0, count).map(p => p._id));
        }
    };

    const togglePlayer = (id) => {
        if (countMode !== 'custom') setCountMode('custom');

        setLocalSelected(prev => {
            if (prev.includes(id)) {
                return prev.filter(pid => pid !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSave = () => {
        onSave(localSelected);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="TOP OPERATIVE SELECTION"
            size="md"
        >
            <div className="space-y-6">
                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex gap-2 w-full md:w-auto">
                        <select
                            value={countMode}
                            onChange={(e) => handleModeChange(e.target.value)}
                            className="bg-cyber-black h-[42px] border border-cyber-neon/30 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyber-neon font-oswald tracking-wide font-bold uppercase transition-all flex-grow"
                        >
                            <option value="3">Top 3 (Auto)</option>
                            <option value="5">Top 5 (Auto)</option>
                            <option value="10">Top 10 (Auto)</option>
                            <option value="custom">Custom Roster</option>
                        </select>
                    </div>

                    <div className="text-cyber-neon font-mono text-xs border border-cyber-neon/30 px-3 py-2 rounded bg-cyber-neon/10 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        {localSelected.length} SELECTED
                    </div>
                </div>

                {/* Player List */}
                <div className="border border-white/10 rounded-lg max-h-96 overflow-y-auto custom-scrollbar bg-black/20">
                    {players
                        .sort((a, b) => (b.total || 0) - (a.total || 0))
                        .map((player, index) => {
                            const isSelected = localSelected.includes(player._id);
                            return (
                                <label
                                    key={player._id}
                                    className={`flex items-center justify-between p-3 border-b border-white/5 cursor-pointer transition-all duration-200 group ${isSelected
                                            ? 'bg-cyber-neon/10 border-l-4 border-l-cyber-neon'
                                            : 'hover:bg-white/5 border-l-4 border-l-transparent'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => togglePlayer(player._id)}
                                                className="appearance-none w-5 h-5 rounded border border-gray-600 bg-gray-800 checked:bg-cyber-neon checked:border-cyber-neon transition-all cursor-pointer"
                                            />
                                            {isSelected && <CheckCircle className="w-3 h-3 text-black absolute top-1 left-1 pointer-events-none" />}
                                        </div>

                                        <span className={`font-mono w-8 text-sm ${index < 3 ? 'text-cyber-yellow' : 'text-gray-500'}`}>
                                            #{String(index + 1).padStart(2, '0')}
                                        </span>

                                        <div className="flex flex-col">
                                            <div className={`font-bold font-oswald uppercase tracking-wide transition-colors ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                                {player.playerName}
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono tracking-widest">
                                                {player.ffName || 'UNKNOWN'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-cyber-red font-bold font-oswald text-lg leading-none">
                                            {player.total || 0}
                                        </div>
                                        <div className="text-[9px] text-gray-600 uppercase tracking-widest font-mono">KILLS</div>
                                    </div>
                                </label>
                            )
                        })}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button variant="ghost" onClick={onClose} size="sm">
                        CANCEL
                    </Button>
                    <Button variant="primary" onClick={handleSave} size="sm" icon="check">
                        CONFIRM SELECTION
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default TopPlayersModal;

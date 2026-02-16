import { useState } from 'react';
import { Search, User, IdCard, Edit3, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { deletePlayer, updatePlayer } from '../../services/playerService';

const PlayerList = ({ players, onUpdate }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editForm, setEditForm] = useState({ playerName: '', ffName: '', ffId: '' });

    // Filter players based on search
    const filteredPlayers = players.filter(player =>
        player.playerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.ffName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.ffId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this player?')) {
            try {
                await deletePlayer(id);
                onUpdate();
            } catch (error) {
                console.error('Delete failed:', error);
            }
        }
    };

    const handleEdit = (player) => {
        setEditingPlayer(player);
        setEditForm({
            playerName: player.playerName || '',
            ffName: player.ffName || '',
            ffId: player.ffId || '',
        });
    };

    const handleSaveEdit = async () => {
        try {
            await updatePlayer(editingPlayer._id, editForm);
            setEditingPlayer(null);
            onUpdate();
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Search Box - Cyberpunk Styled */}
            <div className="relative group">
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyber-red/50 to-transparent"></div>
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyber-muted group-focus-within:text-cyber-red transition-colors z-20">
                    <Search className="w-4 h-4" />
                </div>
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, uid or handle..."
                    className="pl-12"
                    sanitize={false}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[10px] font-mono text-cyber-muted uppercase tracking-widest hidden md:block">
                    {filteredPlayers.length} matches
                </div>
            </div>

            {/* Players List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredPlayers.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">👥</div>
                        <p className="text-gray-400">
                            {searchQuery ? 'No players found' : 'No players registered yet'}
                        </p>
                    </div>
                ) : (
                    filteredPlayers.map((player) => (
                        <Card
                            key={player._id}
                            className="p-4 hover:border-gaming-blue transition-all"
                            hover
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="text-white font-bold text-lg mb-1">
                                        {player.ffName}
                                    </div>
                                    <div className="text-gray-400 text-sm space-x-4">
                                        <span className="text-gaming-blue">@</span>{player.playerName}
                                        <span className="ml-4">🆔 {player.ffId}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(player)}
                                        className="w-10 h-10 rounded-lg border border-gray-700 hover:border-gaming-blue hover:bg-gray-800 transition-all flex items-center justify-center"
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(player._id)}
                                        className="w-10 h-10 rounded-lg border border-gray-700 hover:border-red-500 hover:bg-gray-800 transition-all flex items-center justify-center"
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={!!editingPlayer}
                onClose={() => setEditingPlayer(null)}
                title="Edit Player"
                size="md"
            >
                <div className="space-y-4">
                    <Input
                        label="Username"
                        value={editForm.playerName}
                        onChange={(value) => setEditForm({ ...editForm, playerName: value })}
                        required
                    />
                    <Input
                        label="Free Fire Name"
                        value={editForm.ffName}
                        onChange={(value) => setEditForm({ ...editForm, ffName: value })}
                        required
                    />
                    <Input
                        label="Free Fire ID"
                        value={editForm.ffId}
                        onChange={(value) => setEditForm({ ...editForm, ffId: value })}
                        required
                    />

                    <div className="flex gap-3 mt-6">
                        <Button variant="primary" onClick={handleSaveEdit} className="flex-1">
                            Save Changes
                        </Button>
                        <Button variant="secondary" onClick={() => setEditingPlayer(null)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PlayerList;

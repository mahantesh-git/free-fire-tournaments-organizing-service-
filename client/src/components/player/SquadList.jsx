import React, { useState } from 'react';
import Card from '../common/Card';
import Modal from '../common/Modal';
import api from '../../services/api';
import Toast from '../common/Toast';
import { Trash2, Users, User, Shield, Info, Search } from 'lucide-react';
import Input from '../common/Input';

const SquadList = ({ squads, onUpdate, tournamentId }) => {
    const [selectedSquad, setSelectedSquad] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleDelete = async (squadId) => {
        if (!window.confirm('Are you sure you want to delete this squad? This action cannot be undone.')) return;

        setLoading(true);
        try {
            const res = await api.delete(`/api/kills/deleteSquad/${squadId}`);
            if (res.data.success) {
                Toast.success('Squad deleted successfully');
                onUpdate();
            }
        } catch (error) {
            console.error('Failed to delete squad:', error);
            Toast.error('Failed to delete squad');
        } finally {
            setLoading(false);
        }
    };

    // Filter squads based on search
    const filteredSquads = squads.filter(squad =>
        squad.squadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        squad.players.some(player =>
            player.playerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            player.ffName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            player.ffId?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

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
                    placeholder="Search by squad or player details..."
                    className="pl-12"
                    sanitize={false}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[10px] font-mono text-cyber-muted uppercase tracking-widest hidden md:block">
                    {filteredSquads.length} matches
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSquads.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-cyber-charcoal/30 border border-dashed border-cyber-border">
                        <Users className="w-12 h-12 text-cyber-muted mx-auto mb-4 opacity-20" />
                        <p className="text-cyber-muted font-oswald uppercase tracking-wider">
                            {searchQuery ? 'No squads found matching your search' : 'No squads registered yet'}
                        </p>
                    </div>
                ) : (
                    filteredSquads.map((squad) => (
                        <div key={squad._id} className="card-cyber p-4 group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-oswald font-bold text-white uppercase flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-cyber-red" />
                                        {squad.squadName}
                                    </h3>
                                    <p className="text-[10px] text-cyber-muted font-mono uppercase">ID: {squad._id.slice(-8)}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(squad._id)}
                                    className="p-2 text-cyber-muted hover:text-cyber-red transition-colors"
                                    title="Delete Squad"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {(squad.players || []).map((player, idx) => (
                                    <div key={idx} className="bg-cyber-black/50 p-2 border border-cyber-border/50 text-[11px]">
                                        <div className="text-cyber-red font-bold truncate">{player.ffName || 'N/A'}</div>
                                        <div className="text-cyber-muted truncate">{player.playerName || 'N/A'}</div>
                                        <div className="text-[9px] text-cyber-muted font-mono">{player.ffId || 'N/A'}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Hover accent */}
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyber-red transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                        </div>
                    ))
                )}
            </div>

            {/* Pagination or Footer info */}
            <div className="flex justify-between items-center text-[10px] text-cyber-muted font-oswald uppercase tracking-widest pt-4">
                <span>Total Squads: {squads.length}</span>
                <span>Total Players: {squads.length * 4}</span>
            </div>
        </div>
    );
};

export default SquadList;

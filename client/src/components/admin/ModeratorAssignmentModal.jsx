import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { ChevronRight, ChevronDown, Check, Users, Trophy, Shield, RefreshCw, AlertTriangle } from 'lucide-react';

const ModeratorAssignmentModal = ({ isOpen, onClose, moderator, onUpdate }) => {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTournament, setExpandedTournament] = useState(null);
    const [roomData, setRoomData] = useState({}); // { tournamentId: [rooms] }
    const [selectedSquads, setSelectedSquads] = useState([]);
    const [selectedRooms, setSelectedRooms] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && moderator) {
            fetchTournaments();
            setSelectedSquads(moderator.assignedSquads?.map(s => s._id || s) || []);
            setSelectedRooms(moderator.assignedRooms?.map(r => r._id || r) || []);
        }
    }, [isOpen, moderator]);

    const fetchTournaments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/tournaments');
            if (res.data.success) {
                setTournaments(res.data.tournaments);
            }
        } catch (error) {
            toast.error('Failed to load tournaments', { id: 'assign-fetch-tournaments-error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchRooms = async (tournamentId) => {
        if (roomData[tournamentId]) return;
        try {
            const res = await api.get(`/api/rooms/tournament/${tournamentId}`);
            if (res.data.success) {
                setRoomData(prev => ({ ...prev, [tournamentId]: res.data.rooms }));
            }
        } catch (error) {
            toast.error('Failed to load rooms', { id: 'assign-fetch-rooms-error' });
        }
    };

    const toggleTournament = (id) => {
        if (expandedTournament === id) {
            setExpandedTournament(null);
        } else {
            setExpandedTournament(id);
            fetchRooms(id);
        }
    };

    const toggleSquadSelection = (squadId) => {
        setSelectedSquads(prev =>
            prev.includes(squadId)
                ? prev.filter(id => id !== squadId)
                : [...prev, squadId]
        );
    };

    const toggleRoomSelection = (roomId, squads) => {
        const isRoomSelected = selectedRooms.includes(roomId);
        const squadIds = squads.map(s => s._id);

        if (isRoomSelected) {
            // Unselect room and all its squads
            setSelectedRooms(prev => prev.filter(id => id !== roomId));
            setSelectedSquads(prev => prev.filter(id => !squadIds.includes(id)));
        } else {
            // Select room and all its squads
            setSelectedRooms(prev => [...prev, roomId]);
            setSelectedSquads(prev => [...new Set([...prev, ...squadIds])]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put(`/api/moderators/${moderator._id}/assign`, {
                squadIds: selectedSquads,
                roomIds: selectedRooms
            });

            if (res.data.success) {
                toast.success('Assignments updated successfully', { id: 'assign-success' });
                onUpdate();
                onClose();
            }
        } catch (error) {
            toast.error('Failed to update assignments', { id: 'assign-error' });
        } finally {
            setSaving(false);
        }
    };

    if (!moderator) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Manage Assignments: ${moderator.name}`}
            size="lg"
        >
            <div className="space-y-6 font-inter">
                <div className="bg-cyber-card p-4 border-l-4 border-cyber-neon bg-cyber-charcoal">
                    <p className="text-sm text-cyber-muted">
                        Assign rooms or specific squads to this moderator. Selecting a room will automatically grant access to all squads within it.
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-10">
                        <RefreshCw className="w-8 h-8 text-cyber-neon animate-spin mx-auto mb-3" />
                        <div className="text-cyber-muted text-xs font-oswald uppercase tracking-widest">Loading Tournaments...</div>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div>
                            <h3 className="text-xs font-bold text-cyber-muted uppercase tracking-widest mb-3 flex items-center gap-2 font-oswald border-b border-cyber-border pb-2">
                                <Trophy className="w-4 h-4 text-cyber-red" /> 1. Select Tournament
                            </h3>
                            <div className="space-y-3">
                                {tournaments.map((t) => (
                                    <div key={t._id} className={`border transition-all duration-300 ${expandedTournament === t._id ? 'border-cyber-neon bg-cyber-charcoal shadow-[0_0_15px_rgba(0,240,255,0.1)]' : 'border-cyber-border bg-cyber-black'}`}>
                                        <div
                                            className="flex items-center justify-between p-4 cursor-pointer group"
                                            onClick={() => toggleTournament(t._id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                {expandedTournament === t._id ? <ChevronDown className="w-5 h-5 text-cyber-neon" /> : <ChevronRight className="w-5 h-5 text-cyber-muted group-hover:text-white transition-colors" />}
                                                <div>
                                                    <span className="font-bold text-white font-oswald uppercase tracking-wide text-lg block">{t.name}</span>
                                                    <span className="text-[10px] text-cyber-muted font-mono uppercase">{new Date(t.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <span className="text-xs px-2 py-0.5 bg-cyber-black text-cyber-neon border border-cyber-neon/30 uppercase font-bold tracking-wider font-oswald clip-path-slant">{t.mode}</span>
                                        </div>

                                        {expandedTournament === t._id && (
                                            <div className="p-4 bg-black/20 space-y-6 border-t border-cyber-border relative">
                                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
                                                <div className="relative z-10">
                                                    <h4 className="text-[10px] font-bold text-cyber-muted uppercase tracking-widest mb-4 flex items-center gap-2 font-oswald">
                                                        <Shield className="w-3 h-3 text-cyber-purple" /> 2. Configure Rooms & Squads
                                                    </h4>
                                                    {!roomData[t._id] ? (
                                                        <div className="text-center py-4 text-cyber-muted italic flex items-center justify-center gap-2">
                                                            <RefreshCw className="w-4 h-4 animate-spin" /> Retrieving Room Data...
                                                        </div>
                                                    ) : roomData[t._id].length === 0 ? (
                                                        <div className="text-center py-4 text-cyber-muted border border-dashed border-cyber-border bg-cyber-black/50">
                                                            <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                                            <span className="text-xs uppercase font-bold">No rooms initialized</span>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {roomData[t._id].map((room) => (
                                                                <div key={room._id} className="space-y-3 bg-cyber-black border border-cyber-border p-4 hover:border-cyber-muted/50 transition-colors">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-10 h-10 bg-cyber-charcoal border border-cyber-border flex items-center justify-center font-black text-cyber-neon text-lg font-oswald shadow-inner">
                                                                                #{room.roomNumber}
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-bold text-white font-oswald uppercase tracking-wide">{room.name}</div>
                                                                                <div className="text-[10px] text-cyber-muted uppercase font-mono tracking-wider">Room Delegate</div>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => toggleRoomSelection(room._id, room.squads || [])}
                                                                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all clip-path-slant ${selectedRooms.includes(room._id)
                                                                                ? 'bg-cyber-neon text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                                                                                : 'bg-cyber-charcoal text-cyber-muted hover:text-white border border-cyber-border hover:border-white'
                                                                                }`}
                                                                        >
                                                                            {selectedRooms.includes(room._id) ? <Check className="w-3 h-3" /> : null}
                                                                            {selectedRooms.includes(room._id) ? 'Room Assigned' : 'Assign Entire Room'}
                                                                        </button>
                                                                    </div>

                                                                    {/* Individual Squad Selection */}
                                                                    <div className="pl-14">
                                                                        <div className="text-[9px] text-cyber-muted uppercase tracking-widest mb-2 font-bold opacity-70">Individual Squad Access</div>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                            {room.squads?.map((squad) => (
                                                                                <div
                                                                                    key={squad._id}
                                                                                    onClick={() => toggleSquadSelection(squad._id)}
                                                                                    className={`p-2 border cursor-pointer transition-all flex items-center justify-between group ${selectedSquads.includes(squad._id)
                                                                                        ? 'bg-cyber-purple/10 border-cyber-purple text-cyber-purple shadow-[0_0_10px_rgba(139,92,246,0.1)]'
                                                                                        : 'bg-cyber-charcoal border-cyber-border text-cyber-muted hover:border-cyber-muted hover:text-white'
                                                                                        }`}
                                                                                >
                                                                                    <span className="text-[11px] font-bold font-oswald uppercase truncate pr-2 tracking-wide">{squad.squadName}</span>
                                                                                    {selectedSquads.includes(squad._id) && <Check className="w-3 h-3 flex-shrink-0" />}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-cyber-border">
                    <div className="text-xs text-cyber-muted font-mono uppercase tracking-wider">
                        Selected: <span className="text-cyber-neon font-bold text-sm">{selectedRooms.length}</span> Rooms, <span className="text-cyber-purple font-bold text-sm">{selectedSquads.length}</span> Squads
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-cyber-muted hover:text-white transition-colors font-oswald font-bold uppercase tracking-widest text-xs border-b-2 border-transparent hover:border-cyber-red"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-cyber-primary px-8 py-2 clip-path-slant text-sm"
                        >
                            {saving ? 'SAVING...' : 'CONFIRM ASSIGNMENTS'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ModeratorAssignmentModal;

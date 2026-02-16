import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Settings, Trophy, Users } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const OrganizerDashboard = () => {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        mode: 'SQUAD',
        maxPlayersPerRoom: 48,
        rankingSort: 'POINTS',
        killPoints: 1
    });

    const navigate = useNavigate();

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            const res = await api.get('/api/tournaments');
            if (res.data.success) {
                setTournaments(res.data.tournaments);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching tournaments:', error);
            toast.error('Failed to load tournaments', { id: 'fetch-tournaments-error' });
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                settings: {
                    rankingSort: formData.rankingSort,
                    killPoints: Number(formData.killPoints) || 1
                }
            };
            await api.post('/api/tournaments', payload);
            setShowModal(false);
            setFormData({ name: '', mode: 'SQUAD', maxPlayersPerRoom: 48, rankingSort: 'POINTS', killPoints: 1 });
            toast.success('Tournament created successfully!', { id: 'create-tournament-success' });
            fetchTournaments();
        } catch (error) {
            toast.error('Failed: ' + (error.response?.data?.error || error.message), { id: 'create-tournament-error' });
        }
    };

    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter">
            {/* Cyberpunk Header */}
            <header className="bg-cyber-charcoal border-b-2 border-cyber-red px-6 py-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center space-x-3">
                    <Trophy className="text-cyber-red w-8 h-8" />
                    <h1 className="text-2xl font-oswald font-bold tracking-wider text-white uppercase">Organizer Dashboard</h1>
                </div>
                <button
                    onClick={() => {
                        localStorage.removeItem('token');
                        navigate('/organizer/login');
                    }}
                    className="flex items-center space-x-2 text-cyber-muted hover:text-cyber-red transition-colors text-sm font-oswald uppercase tracking-wider"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                </button>
            </header>

            <main className="p-6 max-w-7xl mx-auto">
                {/* Action Bar */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-4xl font-oswald font-black uppercase tracking-wider text-white">My Tournaments</h2>
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/organizer/moderators')}
                            className="bg-cyber-card text-white px-6 py-3 font-oswald uppercase tracking-wider hover:bg-cyber-charcoal transition-all border border-cyber-border flex items-center space-x-2 shadow-lg"
                        >
                            <Users className="w-4 h-4 text-cyber-pink" />
                            <span>Moderators</span>
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-cyber-primary flex items-center space-x-2"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Create Tournament</span>
                        </button>
                    </div>
                </div>

                {/* Tournament Grid */}
                {loading ? (
                    <div className="text-center py-20 text-cyber-muted animate-pulse font-oswald uppercase tracking-wider">Loading tournaments...</div>
                ) : (
                    <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tournaments.map(t => (
                                <div key={t._id} className="card-cyber p-6 group relative overflow-hidden">
                                    {/* Corner Accents */}
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-red opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyber-red opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyber-red opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-red opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-xl font-oswald font-bold uppercase tracking-wide group-hover:text-cyber-red transition-colors truncate">{t.name}</h3>
                                            <span className={`px-2 py-1 text-[10px] font-oswald font-bold uppercase tracking-wider ${t.status === 'ONGOING' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                t.status === 'COMPLETED' ? 'bg-cyber-muted/20 text-cyber-muted border border-cyber-muted/30' :
                                                    'bg-cyber-pink/20 text-cyber-pink border border-cyber-pink/30'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-sm text-cyber-muted mb-6">
                                            <div className="flex items-center space-x-2">
                                                <Users className="w-4 h-4 text-cyber-red" />
                                                <span>Mode: <span className="text-white font-bold">{t.mode}</span></span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Settings className="w-4 h-4 text-cyber-red" />
                                                <span>Max Rooms: <span className="text-white font-bold">{t.totalRooms || 0}</span></span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => navigate(`/organizer/tournament/${t._id}/rooms`)}
                                                className="bg-cyber-red hover:bg-cyber-red/90 text-white py-2 font-oswald uppercase text-xs tracking-wider font-bold transition-all text-center shadow-lg shadow-cyber-red/20"
                                            >
                                                Manage
                                            </button>
                                            <button
                                                onClick={() => navigate(`/organizer/tournament/${t._id}`)}
                                                className="bg-cyber-charcoal hover:bg-cyber-border text-white py-2 font-oswald uppercase text-xs tracking-wider font-bold transition-all text-center border border-cyber-border"
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {tournaments.length === 0 && (
                                <div className="col-span-full text-center py-20 bg-cyber-card/30 border-2 border-dashed border-cyber-border">
                                    <Trophy className="w-16 h-16 text-cyber-red mx-auto mb-4 opacity-50" />
                                    <p className="text-cyber-muted text-lg mb-4 font-oswald uppercase tracking-wider">No tournaments found.</p>
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="text-cyber-red hover:text-cyber-pink font-oswald uppercase tracking-wider font-bold transition-colors"
                                    >
                                        Create your first tournament
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Create Modal - Cyberpunk Style */}
            {showModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-cyber w-full max-w-md border-2 border-cyber-red shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-6 border-b-2 border-cyber-red bg-cyber-charcoal">
                            <h3 className="text-2xl font-oswald font-bold text-white uppercase tracking-wider">Create New Tournament</h3>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4 bg-cyber-card">
                            <div>
                                <label className="block text-xs text-cyber-muted mb-2 font-oswald uppercase tracking-wider">Tournament Name</label>
                                <input
                                    type="text"
                                    className="input-cyber w-full"
                                    placeholder="e.g. Weekly Scrims #1"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-cyber-muted mb-2 font-oswald uppercase tracking-wider">Game Mode</label>
                                    <select
                                        className="input-cyber w-full"
                                        value={formData.mode}
                                        onChange={e => setFormData({ ...formData, mode: e.target.value })}
                                    >
                                        <option value="SQUAD">Squad (4 Players)</option>
                                        <option value="SOLO">Solo (1 Player)</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs text-cyber-muted mb-2 font-oswald uppercase tracking-wider">Sort By</label>
                                        <select
                                            className="input-cyber w-full text-xs"
                                            value={formData.rankingSort}
                                            onChange={e => setFormData({ ...formData, rankingSort: e.target.value })}
                                        >
                                            <option value="POINTS">Points</option>
                                            <option value="KILLS">Kills</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-cyber-muted mb-2 font-oswald uppercase tracking-wider">Kill Pts</label>
                                        <input
                                            type="number"
                                            className="input-cyber w-full text-xs"
                                            value={formData.killPoints}
                                            onChange={e => setFormData({ ...formData, killPoints: e.target.value })}
                                            min="0"
                                            step="0.5"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-cyber-muted mb-2 font-oswald uppercase tracking-wider">Max Players Per Room</label>
                                <input
                                    type="number"
                                    className="input-cyber w-full"
                                    value={formData.maxPlayersPerRoom}
                                    onChange={e => setFormData({ ...formData, maxPlayersPerRoom: parseInt(e.target.value) })}
                                    min="1"
                                    max="100"
                                />
                                <p className="text-xs text-cyber-muted mt-1">Default 48 for standard lobbies</p>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-cyber-ghost"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-cyber-primary"
                                >
                                    Create Tournament
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizerDashboard;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2, ChevronDown, ChevronUp, Copy, Users, Play, Shield } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const RoomManager = () => {
    const { tournamentId } = useParams();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [expandedRoom, setExpandedRoom] = useState(null);
    const [totalSquads, setTotalSquads] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (showHistory) {
            fetchHistory();
        }
    }, [showHistory]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await api.get(`/api/squadGame/tournamentHistory/${tournamentId}`);
            if (res.data.success) {
                setHistory(res.data.history);
            }
        } catch (error) {
            toast.error('Failed to load history');
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, [tournamentId]);

    const fetchRooms = async () => {
        try {
            const res = await api.get(`/api/rooms/tournament/${tournamentId}`);
            if (res.data.success) {
                setRooms(res.data.rooms);
            }

            // Fetch total squads to detect unassigned ones
            const squadRes = await api.get('/api/squads');
            if (squadRes.data.success) {
                setTotalSquads(squadRes.data.squads.length);
            }

            setLoading(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load rooms', { id: 'fetch-rooms-error' });
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await api.post('/api/rooms/generate', { tournamentId });
            toast.success(res.data.message, { id: 'generate-rooms-success' });
            fetchRooms();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to generate rooms', { id: 'generate-rooms-error' });
        } finally {
            setGenerating(false);
        }
    };

    const handleArchive = async () => {
        if (!confirm('Are you sure you want to Finalize & Archive? This will:\n1. Check if all matches are completed.\n2. clear active rooms.\n3. Move everything to history.')) return;

        setGenerating(true);
        try {
            const res = await api.post('/api/rooms/archive', { tournamentId });
            toast.success(res.data.message, { id: 'archive-success' });
            fetchRooms(); // Should be empty now
            setRooms([]); // Optimistic clear
            fetchHistory(); // Refresh history
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to archive rooms', { id: 'archive-error', duration: 5000 });
        } finally {
            setGenerating(false);
        }
    };

    const toggleExpand = (roomId) => {
        if (expandedRoom === roomId) {
            setExpandedRoom(null);
        } else {
            setExpandedRoom(roomId);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard', { id: 'copy-token-toast' });
    };

    return (
        <div className="min-h-screen bg-cyber-black text-white p-6 font-inter">
            <button
                onClick={() => navigate('/organizer/dashboard')}
                className="flex items-center text-cyber-muted hover:text-white mb-6 transition-colors font-oswald uppercase tracking-wider text-sm"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </button>

            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-oswald font-black flex items-center gap-2 uppercase tracking-wider">
                        <span className="text-cyber-red">Room</span> Allocation
                    </h1>
                    <div className="h-1 w-24 bg-cyber-red mt-2 mb-2"></div>
                    <p className="text-cyber-muted mt-1 font-medium font-oswald uppercase tracking-wide text-xs">Manage automated room assignments and credentials</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="flex items-center gap-2 px-6 py-3 rounded-none bg-transparent text-cyber-muted border border-cyber-muted hover:bg-cyber-muted hover:text-white transition-all active:scale-95 font-oswald font-bold uppercase tracking-wider text-xs shadow-lg"
                    >
                        <Shield className="w-4 h-4" />
                        {showHistory ? 'Hide History' : 'Match History'}
                    </button>

                    {/* 
                    <button
                        onClick={handleArchive}
                        disabled={generating || rooms.length === 0}
                        className="flex items-center gap-2 px-6 py-3 rounded-none bg-transparent text-cyber-red border border-cyber-red hover:bg-cyber-red hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95 font-oswald font-bold uppercase tracking-wider text-xs shadow-lg shadow-cyber-red/10"
                    >
                        <Trash2 className="w-4 h-4" />
                        Finalize & Archive
                    </button> 
                    */}

                    <button
                        onClick={handleGenerate}
                        disabled={generating || rooms.length > 0}
                        title={rooms.length > 0 ? "Rooms already generated. Archive them to start over." : "Generate new random rooms"}
                        className={`btn-cyber-primary flex items-center gap-2 px-6 py-3 rounded-none text-xs ${(generating || rooms.length > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                        {generating ? 'Processing...' : (rooms.length > 0 ? 'Rooms Generated' : 'Auto-Generate Rooms')}
                    </button>
                </div>
            </header>

            {/* Unassigned Squads Warning */}
            {!loading && totalSquads > 0 && (
                <div className="mb-8 bg-cyber-card border-l-4 border-cyber-pink p-6 flex items-center justify-between gap-4 animate-fade-in shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-cyber-pink/10 to-transparent pointer-events-none"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="bg-cyber-pink/10 p-3 rounded-none border border-cyber-pink/30 text-cyber-pink">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-oswald font-bold text-white text-lg uppercase tracking-wider">Squad Mismatch Detected</h4>
                            <p className="text-sm text-cyber-muted font-inter">
                                You have <span className="text-cyber-pink font-bold">{totalSquads}</span> registered squads,
                                but only <span className="text-cyber-pink font-bold">{rooms.reduce((acc, r) => acc + (r.squads?.length || 0), 0)}</span> are assigned to rooms.
                            </p>
                        </div>
                    </div>
                    {totalSquads > rooms.reduce((acc, r) => acc + (r.squads?.length || 0), 0) && (
                        <div className="hidden md:block text-xs text-cyber-pink font-oswald uppercase tracking-widest animate-pulse border-b border-cyber-pink pb-1">
                            Action Required: Auto-Generate Rooms
                        </div>
                    )}
                </div>
            )}

            {showHistory && (
                <div className="mb-8 bg-cyber-card border border-cyber-border p-6 animate-fade-in">
                    <h3 className="text-xl font-oswald font-bold text-white uppercase tracking-wider mb-4 border-b border-cyber-border pb-2">Match History</h3>

                    {loadingHistory ? (
                        <div className="text-center py-8 text-cyber-muted animate-pulse">Loading history...</div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-cyber-muted">No match history found.</div>
                    ) : (
                        <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-cyber-muted text-xs font-oswald uppercase tracking-wider border-b border-cyber-border">
                                            <th className="p-3">Time</th>
                                            <th className="p-3">Match #</th>
                                            <th className="p-3">Participant</th>
                                            <th className="p-3">Rank</th>
                                            <th className="p-3">Kills</th>
                                            <th className="p-3 text-right">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-mono">
                                        {history.map((game, idx) => {
                                            const isWinner = game.squadPlacement === 1;
                                            const isEliminated = !game.players?.some(p => p.survived) && !isWinner;
                                            // A heuristic for elimination: if not winner and nobody survived (assuming 'survived' flag is accurate)
                                            // or simple rank check? Let's use placement.

                                            return (
                                                <tr key={game._id || idx} className="border-b border-cyber-border/50 hover:bg-cyber-charcoal/30 transition-colors">
                                                    <td className="p-3 text-gray-400 text-xs">{new Date(game.createdAt).toLocaleTimeString()}</td>
                                                    <td className="p-3 text-cyber-red font-bold">#{game.matchNumber}</td>
                                                    <td className="p-3">
                                                        <div className="font-bold text-white">{game.squadName}</div>
                                                        <div className="text-[10px] text-cyber-muted flex gap-2">
                                                            {game.isDisqualified && <span className="text-red-500 font-bold">DISQUALIFIED</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        {isWinner ? (
                                                            <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 flex items-center w-fit gap-1">
                                                                👑 #1
                                                            </span>
                                                        ) : (
                                                            <span className={`px-2 py-0.5 text-xs font-bold ${game.squadPlacement ? 'text-cyber-muted' : 'text-gray-600'}`}>
                                                                #{game.squadPlacement || '-'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-gray-300">{game.totalKills}</td>
                                                    <td className="p-3 text-right text-emerald-400 font-bold">{game.squadPoints}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-cyber-muted animate-pulse font-oswald uppercase tracking-wider">Loading room data...</div>
            ) : (
                <div className="grid grid-cols-1 gap-6 max-w-6xl mx-auto">
                    {rooms.map((room, index) => (
                        <div key={room._id} className="card-cyber relative group">
                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyber-red opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyber-red opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* Room Header / Summary */}
                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 bg-cyber-card/90 backdrop-blur-sm">
                                <div className="flex items-center gap-6">
                                    <div className="bg-cyber-charcoal w-16 h-16 border border-cyber-border flex items-center justify-center font-oswald font-bold text-3xl text-cyber-red shadow-inner">
                                        #{room.roomNumber}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-oswald font-bold text-white uppercase tracking-wider mb-2">{room.name}</h3>
                                        <div className="flex items-center gap-3 text-xs text-cyber-muted font-oswald w-full">
                                            <span className={`px-2 py-1 uppercase tracking-wider font-bold border ${room.status === 'READY' ? 'bg-emerald-900/20 text-emerald-500 border-emerald-500/30' : 'bg-amber-900/20 text-amber-500 border-amber-500/30'
                                                }`}>
                                                {room.status}
                                            </span>
                                            <span className="flex items-center gap-1 uppercase tracking-wider font-bold">
                                                <Users className="w-3 h-3 text-cyber-red" />
                                                <span className="text-white">{room.currentCapacity}</span> / {room.maxCapacity} Plymouths
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0 sm:gap-4 bg-cyber-black border border-cyber-border">
                                    <div className="p-3 px-5 border-b sm:border-b-0 sm:border-r border-cyber-border flex-1">
                                        <p className="text-[10px] text-cyber-muted uppercase tracking-[0.2em] mb-1 font-bold">Room ID</p>
                                        <div
                                            className="font-mono text-emerald-400 font-bold cursor-pointer hover:text-emerald-300 transition-colors flex items-center gap-2 group/copy"
                                            onClick={() => copyToClipboard(room.credentials?.roomId)}
                                        >
                                            {room.credentials?.roomId || '---'}
                                            <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                    <div className="p-3 px-5 flex-1">
                                        <p className="text-[10px] text-cyber-muted uppercase tracking-[0.2em] mb-1 font-bold">Password</p>
                                        <div
                                            className="font-mono text-cyber-pink font-bold cursor-pointer hover:text-cyber-red transition-colors flex items-center gap-2 group/copy"
                                            onClick={() => copyToClipboard(room.credentials?.password)}
                                        >
                                            {room.credentials?.password || '---'}
                                            <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/organizer/room-match/${room._id}`);
                                        }}
                                        className="btn-cyber-secondary px-4 py-2 text-xs flex items-center gap-2 shadow-none hover:shadow-lg hover:shadow-cyber-pink/20"
                                        title="Manage Match"
                                    >
                                        <Play className="w-4 h-4" />
                                        Launch Match
                                    </button>

                                    <button
                                        onClick={() => toggleExpand(room._id)}
                                        className="p-2.5 bg-cyber-charcoal border border-cyber-border hover:border-cyber-red text-cyber-muted hover:text-white transition-all active:scale-95"
                                    >
                                        {expandedRoom === room._id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedRoom === room._id && (
                                <div className="bg-cyber-black/50 border-t border-cyber-border p-6 animate-fade-in relative">
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

                                    <h4 className="text-sm font-oswald font-bold text-cyber-muted mb-4 uppercase tracking-widest flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-cyber-red" />
                                        Participants ({room.mode === 'SQUAD' ? `${room.squads?.length || 0} Squads` : `${room.players?.length || 0} Players`})
                                    </h4>

                                    {room.mode === 'SQUAD' && room.squads?.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {room.squads.map((squad, i) => (
                                                <div key={i} className="bg-cyber-charcoal/50 p-4 border border-cyber-border hover:border-cyber-pink/50 transition-colors group/squad">
                                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-cyber-border group-hover/squad:border-cyber-pink/30 transition-colors">
                                                        <span className="font-oswald font-bold text-white uppercase tracking-wide truncate pr-2">{squad.squadName}</span>
                                                        <span className="text-[10px] bg-cyber-black text-cyber-muted px-2 py-0.5 border border-cyber-border font-mono font-bold">
                                                            {squad.players?.length || 0}/4
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {squad.players?.map((player, j) => (
                                                            <div key={j} className="flex justify-between items-center text-xs">
                                                                <span className="text-cyber-muted group-hover/squad:text-gray-300 transition-colors">{player.ffName}</span>
                                                                <span className="font-mono text-[10px] text-gray-600 group-hover/squad:text-gray-500">{player.ffId}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : room.mode === 'SOLO' && room.players?.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {room.players.map((player, i) => (
                                                <div key={i} className="bg-cyber-charcoal p-2 border border-cyber-border text-sm truncate text-cyber-muted font-mono hover:text-white hover:border-cyber-red transition-colors cursor-default">
                                                    {player.ffName || player.playerName || 'Unknown'}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 border-2 border-dashed border-cyber-border bg-cyber-black/30">
                                            <p className="text-cyber-muted font-oswald uppercase tracking-wider text-sm">No participants assigned yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {
                        rooms.length === 0 && (
                            <div className="text-center py-24 bg-cyber-card/30 border-2 border-dashed border-cyber-border">
                                <RefreshCw className="w-16 h-16 text-cyber-muted mx-auto mb-6 opacity-20" />
                                <h3 className="text-2xl font-oswald font-bold text-white uppercase tracking-widest mb-2">No rooms generated</h3>
                                <p className="text-cyber-muted text-sm font-inter max-w-md mx-auto">
                                    Click "Auto-Generate Rooms" to shuffle participants and create lobbies for this tournament.
                                </p>
                            </div>
                        )
                    }
                </div >
            )}
        </div >
    );
};

export default RoomManager;

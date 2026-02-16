import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Users, Trophy, RefreshCw, Save, Plus, Minus, Shield, Crosshair, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import socketService from '../../services/socketService';
import { toast } from 'react-hot-toast';

const ModeratorPanel = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [moderator, setModerator] = useState(null);
    const [gameStates, setGameStates] = useState([]);
    const [assignedRooms, setAssignedRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSquad, setExpandedSquad] = useState(null);
    const [matchNumber, setMatchNumber] = useState(parseInt(searchParams.get('match')) || 1);
    const [tournament, setTournament] = useState(null);

    const roomId = searchParams.get('room');

    const fetchAssignedSquads = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const res = await api.get('/api/moderators/my-squads');

            if (res.data.success) {
                const freshRooms = res.data.rooms || [];
                const explicitRooms = res.data.assignedRooms || [];
                setAssignedRooms(freshRooms); // Total list for UI selection

                // Update local moderator state with fresh data from DB
                setModerator(prev => ({
                    ...prev,
                    assignedSquads: res.data.squads,
                    assignedRooms: explicitRooms // Store only explicit assignments
                }));

                // AUTO-SELECT ROOM: If no roomId in URL but rooms are available
                if (!roomId && freshRooms.length > 0) {
                    navigate(`/moderator/panel?room=${freshRooms[0]._id}&match=${matchNumber}`, { replace: true });
                    return; // Re-fetch will trigger due to [roomId] dependency
                }

                if (roomId) {
                    try {
                        const roomRes = await api.get(`/api/squadGame/roomMatchState/${roomId}?matchNumber=${matchNumber}`);
                        if (roomRes.data.success) {
                            const { gameStates: fetchedGameStates, room, tournament: fetchedTournament } = roomRes.data;
                            if (fetchedTournament) setTournament(fetchedTournament);

                            const hasFullRoomAccess = res.data.assignedRooms.some(r => r._id === roomId);
                            const assignedSquadIds = res.data.squads.map(s => s._id);

                            if (fetchedGameStates.length > 0) {
                                const filtered = fetchedGameStates.filter(gs =>
                                    hasFullRoomAccess || assignedSquadIds.includes(gs.squadId._id)
                                );
                                setGameStates(filtered);
                            } else if (room && room.squads) {
                                const visibleSquads = room.squads.filter(s =>
                                    hasFullRoomAccess || assignedSquadIds.includes(s._id)
                                );

                                const virtualStates = visibleSquads.map(s => ({
                                    _id: `pending-${s._id}`,
                                    squadId: s,
                                    squadName: s.squadName,
                                    players: s.players.map(p => ({ ...p, kills: 0 })),
                                    totalKills: 0,
                                    isPending: true
                                }));
                                setGameStates(virtualStates);
                            }
                        }
                    } catch (roomErr) {
                        if (roomErr.response?.status === 404) {
                            console.warn("Room no longer exists, clearing selection.");
                            navigate('/moderator/panel', { replace: true });
                        } else {
                            throw roomErr; // Re-throw for global handler
                        }
                    }
                } else {
                    setGameStates([]);
                }
            }
            if (!isSilent) setLoading(false);
        } catch (error) {
            console.error(error);
            if (!isSilent) {
                toast.error('Failed to load assigned squads', { id: 'moderator-fetch-squads-error' });
                setLoading(false);
            }
        }
    }, [roomId, matchNumber, navigate]);

    const sortedGameStates = useMemo(() => {
        if (!gameStates || gameStates.length === 0) return [];
        const rankingSort = tournament?.settings?.rankingSort || 'POINTS';

        return [...gameStates].sort((a, b) => {
            // 1. DQ at bottom
            if (a.isDisqualified && !b.isDisqualified) return 1;
            if (!a.isDisqualified && b.isDisqualified) return -1;

            if (rankingSort === 'KILLS') {
                return (b.totalKills || 0) - (a.totalKills || 0);
            } else {
                // POINTS default
                if ((b.squadPoints || 0) !== (a.squadPoints || 0)) {
                    return (b.squadPoints || 0) - (a.squadPoints || 0);
                }
                return (b.totalKills || 0) - (a.totalKills || 0);
            }
        });
    }, [gameStates, tournament]);

    useEffect(() => {
        // Check if moderator is logged in
        const storedModerator = localStorage.getItem('moderator');
        if (!storedModerator) {
            toast.error('Please login first', { id: 'moderator-login-error' });
            navigate('/moderator/login');
            return;
        }

        setModerator(JSON.parse(storedModerator));
        fetchAssignedSquads();
    }, [roomId, matchNumber, fetchAssignedSquads, navigate]);

    // Update matchNumber state if URL changes
    useEffect(() => {
        const mCount = parseInt(searchParams.get('match')) || 1;
        setMatchNumber(mCount);
    }, [searchParams]);

    // Setup Socket Listeners for Real-time Sync
    useEffect(() => {
        const socket = socketService.connect();
        const tenantSlug = localStorage.getItem('tenantSlug');

        if (tenantSlug) {
            console.log(`📡 [ModeratorPanel] Emitting join_tenant: ${tenantSlug}`);
            socketService.emit('join_tenant', tenantSlug);
        }

        const handleJoinedTenant = (data) => {
            console.log('✅ [ModeratorPanel] Room subscription confirmed:', data);
        };

        const handleSquadUpdate = (payload) => {
            console.log('📢 [ModeratorPanel] Real-time sync received:', payload);

            if (payload.type === 'killUpdate') {
                const { gameStateId, data: killData } = payload;

                setGameStates(prev => prev.map(gs => {
                    if (gs._id.toString() === gameStateId.toString()) {
                        const updatedPlayers = gs.players.map(p =>
                            p.ffId.toString() === killData.ffId.toString()
                                ? {
                                    ...p,
                                    kills: killData.kills,
                                    killPoints: killData.killPoints ?? p.killPoints,
                                    placementPoints: killData.placementPoints ?? p.placementPoints
                                }
                                : p
                        );

                        return {
                            ...gs,
                            players: updatedPlayers,
                            totalKills: killData.totalKills,
                            squadPoints: killData.squadPoints
                        };
                    }
                    return gs;
                }));
            } else if (payload.type === 'playerStatsUpdate') {
                const { gameStateId, data: playerData } = payload;
                setGameStates(prev => prev.map(gs => {
                    if (gs._id.toString() === gameStateId.toString()) {
                        return {
                            ...gs,
                            players: gs.players.map(p =>
                                p.ffId.toString() === playerData.ffId.toString()
                                    ? { ...p, isEliminated: playerData.isEliminated, kills: playerData.kills }
                                    : p
                            )
                        };
                    }
                    return gs;
                }));
            } else if (payload.type === 'matchComplete') {
                console.log('🏆 [ModeratorPanel] Match Complete Update:', payload);
                setGameStates(prev => prev.map(gs => {
                    // Check by ID or SquadID match
                    if (gs._id === payload.gameStateId || (gs.squadId && gs.squadId._id === payload.squadId)) {
                        return {
                            ...gs,
                            isCompleted: true,
                            squadPlacement: payload.data.rank,
                            squadPoints: payload.data.points
                        };
                    }
                    return gs;
                }));
            } else if (payload.type === 'disqualified') {
                console.log('🔄 [ModeratorPanel] Disqualification update. Refreshing...');
                fetchAssignedSquads(true);
            }
        };

        socketService.on('joined_tenant', handleJoinedTenant);
        socketService.on('squadUpdate', handleSquadUpdate);

        return () => {
            socketService.off('joined_tenant', handleJoinedTenant);
            socketService.off('squadUpdate', handleSquadUpdate);
        };
    }, [roomId, fetchAssignedSquads]);


    const handleUpdateKills = async (gameStateId, ffId, kills) => {
        // Prevent interaction with pending (unstarted) matches
        if (gameStateId.toString().startsWith('pending-')) {
            return toast.error('Wait for the Organizer to start the match!', { id: 'pending-match-toast' });
        }

        // --- OPTIMISTIC UPDATE ---
        setGameStates(prev => prev.map(gs => {
            if (gs._id === gameStateId) {
                const updatedPlayers = gs.players.map(p =>
                    p.ffId === ffId ? { ...p, kills: parseInt(kills) || 0 } : p
                );
                return {
                    ...gs,
                    players: updatedPlayers,
                    totalKills: updatedPlayers.reduce((sum, p) => sum + (p.kills || 0), 0)
                };
            }
            return gs;
        }));

        try {
            const res = await api.put(`/api/squadGame/updateKills/${gameStateId}`, {
                ffId,
                kills: parseInt(kills) || 0
            });

            if (res.data.success) {
                const updatedGS = res.data.gameState;
                setGameStates(prev => prev.map(gs =>
                    gs._id === gameStateId ? updatedGS : gs
                ));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update kills');
            // Rollback is implicitly handled by the next sync or manual refresh if needed,
            // but for a better UX, we could re-fetch here if it fails critically.
            fetchAssignedSquads(true);
        }
    };

    const handleTogglePlayerElimination = async (gameStateId, ffId, isEliminated) => {
        // Prevent interaction with pending (unstarted) matches
        if (gameStateId.toString().startsWith('pending-')) {
            return toast.error('Match has not started yet. Deploy squads first!', { id: 'pending-match-elim-toast' });
        }

        // Find the squad in our state to check if this is the last player
        const squad = gameStates.find(gs => gs._id === gameStateId);
        if (squad && isEliminated) {
            const alivePlayers = squad.players.filter(p => !p.isEliminated && p.ffId !== ffId);
            if (alivePlayers.length === 0) {
                if (!confirm(`This will eliminate the entire squad "${squad.squadName}". Continue?`)) {
                    return;
                }
            }
        }

        // --- OPTIMISTIC UPDATE ---
        setGameStates(prev => prev.map(gs => {
            if (gs._id === gameStateId) {
                return {
                    ...gs,
                    players: gs.players.map(p =>
                        p.ffId === ffId ? { ...p, isEliminated } : p
                    )
                };
            }
            return gs;
        }));

        try {
            const res = await api.put(`/api/squadGame/togglePlayerElimination/${gameStateId}`, {
                ffId,
                isEliminated
            });

            if (res.data.success) {
                const refreshedGS = res.data.gameState;
                // If it auto-finalized, we updated different fields like squadPlacement
                if (res.data.autoCompleted) {
                    setGameStates(prev => prev.map(gs =>
                        gs._id === gameStateId ? refreshedGS : gs
                    ));
                    toast.success(`Squad Finalized! Rank: ${refreshedGS.squadPlacement}`, { icon: '🎯', duration: 4000 });
                } else {
                    // The optimistic update already handled the player elimination status.
                    // We can re-sync with the server's state if there are other changes,
                    // or just confirm the optimistic update.
                    setGameStates(prev => prev.map(gs =>
                        gs._id === gameStateId ? refreshedGS : gs
                    ));
                    toast.success(isEliminated ? 'Player eliminated' : 'Player restored');
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/api/moderators/logout');
            localStorage.removeItem('moderator');
            toast.success('Logged out successfully');
            navigate('/moderator/login');
        } catch (error) {
            console.error(error);
            localStorage.removeItem('moderator');
            navigate('/moderator/login');
        }
    };

    const handleDisqualify = async (gameStateId, squadName) => {
        const reason = prompt(`Reason for disqualifying "${squadName}":`, "False play / Rule violation");
        if (reason === null) return; // Cancelled

        try {
            const res = await api.put(`/api/squadGame/disqualify/${gameStateId}`, { reason });
            if (res.data.success) {
                toast.success(`${squadName} disqualified`, { id: 'dq-success' });
                fetchAssignedSquads();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to disqualify', { id: 'dq-error' });
        }
    };

    const handleCompleteMatch = async (gameStateId, squadName, isLast = false) => {
        if (!confirm(`${isLast ? 'Mark as Winner' : 'Eliminate'} "${squadName}"? Rank will be assigned automatically.`)) return;

        try {
            const res = await api.put(`/api/squadGame/completeMatch/${gameStateId}`);
            if (res.data.success) {
                toast.success(`${squadName} ${isLast ? 'is the Winner!' : 'eliminated!'} Rank: ${res.data.gameState.squadPlacement}`, { id: 'mod-eliminate-success' });
                fetchAssignedSquads();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to complete elimination', { id: 'mod-eliminate-error' });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cyber-black flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-cyber-neon animate-spin mx-auto mb-4" />
                    <p className="text-gray-400 font-mono">ESTABLISHING UPLINK...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cyber-black text-white p-4 md:p-6 font-inter overflow-x-hidden selection:bg-cyber-red selection:text-white relative">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(0,240,255,0.05),transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-5"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto pb-32">
                {/* Header */}
                <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                    <div>
                        <h1 className="text-3xl font-oswald font-bold flex items-center gap-2 text-white">
                            <span className="text-cyber-neon">///</span> MODERATION CONSOLE
                        </h1>
                        {moderator && (
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                                <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">
                                    OPERATIVE: <span className="text-cyber-neon font-bold">{moderator.name}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-cyber-black hover:bg-cyber-red/10 border border-white/10 hover:border-cyber-red text-gray-400 hover:text-cyber-red transition-colors skew-x-[-10deg] group"
                    >
                        <LogOut className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                        <span className="font-oswald font-bold tracking-wider skew-x-[10deg]">DISCONNECT</span>
                    </button>
                </header>

                {/* Assigned Scope */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Rooms */}
                    <div className="p-5 bg-cyber-card border border-white/5 shadow-lg relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-cyber-purple/5 rounded-full blur-2xl group-hover:bg-cyber-purple/10 transition-colors"></div>
                        <h3 className="text-xs font-bold text-gray-500 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Trophy className="w-3 h-3" /> ASSIGNED SECTORS
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {assignedRooms.length > 0 ? assignedRooms.map(room => (
                                <button
                                    key={room._id}
                                    onClick={() => navigate(`/moderator/panel?room=${room._id}&match=${matchNumber}`)}
                                    className={`px-4 py-2 text-sm font-oswald font-bold tracking-wider transition-all border skew-x-[-10deg] ${roomId === room._id
                                        ? 'bg-cyber-purple text-white border-white shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                                        : 'bg-black/40 text-gray-400 border-white/10 hover:border-cyber-purple/50 hover:text-white'
                                        }`}
                                >
                                    <span className="skew-x-[10deg] block">
                                        ROOM {room.roomNumber}
                                        {(moderator?.assignedRooms || []).some(r => r._id === room._id) && (
                                            <span className="ml-1 text-[10px] opacity-70 align-top">*</span>
                                        )}
                                    </span>
                                </button>
                            )) : (
                                <span className="text-xs text-gray-500 font-mono italic">NO SECTORS ASSIGNED</span>
                            )}
                        </div>
                    </div>

                    {/* Match Number & Direct Squads */}
                    <div className="p-5 bg-cyber-card border border-white/5 shadow-lg relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-cyber-neon/5 rounded-full blur-2xl group-hover:bg-cyber-neon/10 transition-colors"></div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-gray-500 font-mono uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-3 h-3" /> MATCH SEQUENCE
                            </h3>
                            <div className="bg-black/50 px-3 py-1 border border-white/10 flex items-center gap-2 skew-x-[-10deg]">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider skew-x-[10deg]">MATCH:</span>
                                <select
                                    value={matchNumber}
                                    onChange={(e) => navigate(`/moderator/panel?room=${roomId}&match=${e.target.value}`)}
                                    className="bg-transparent text-cyber-neon border-none focus:ring-0 text-sm font-bold p-0 pr-1 cursor-pointer font-oswald skew-x-[10deg]"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    {[1, 2, 3, 4, 5, 6].map(num => (
                                        <option key={num} value={num}>#{num}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {moderator && moderator.assignedSquads && moderator.assignedSquads.length > 0 ? (
                                moderator.assignedSquads.map(squad => (
                                    <span key={squad._id} className="px-3 py-1 bg-cyber-neon/10 text-cyber-neon border border-cyber-neon/30 text-xs font-mono font-bold uppercase tracking-wider">
                                        {squad.squadName}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-gray-500 font-mono italic">NO SQUADS ASSIGNED</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Game States */}
                {gameStates.length === 0 ? (
                    <div className="text-center py-20 bg-black/20 border-2 border-dashed border-gray-800 rounded-none relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-5 mask-image-gradient-to-b"></div>
                        <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                        <h3 className="text-xl font-oswald font-bold text-gray-500 mb-2">NO ACTIVE SIGNALS</h3>
                        <p className="text-gray-600 font-mono text-sm">
                            {roomId ? 'WAITING FOR MATCH INITIALIZATION...' : 'SELECT A SECTOR TO BEGIN MONITORING.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {sortedGameStates.map((gs, index) => {
                            const isWinner = index === 0 && (gs.isCompleted || sortedGameStates[0].totalKills > 0);
                            return (
                                <div key={gs._id} className={`relative bg-cyber-card border transition-all duration-300 group ${gs.isDisqualified ? 'border-cyber-red/50 shadow-[0_0_15px_rgba(255,59,59,0.2)]' : 'border-white/5 hover:border-cyber-neon/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)]'}`}>
                                    <div
                                        className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-4 relative z-10"
                                        onClick={() => setExpandedSquad(expandedSquad === gs._id ? null : gs._id)}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-1 self-stretch ${gs.isPending ? 'bg-gray-600' :
                                                gs.isDisqualified ? 'bg-cyber-red' :
                                                    gs.isCompleted ? (isWinner ? 'bg-yellow-500 shadow-[0_0_10px_#eab308]' : 'bg-gray-500') :
                                                        'bg-cyber-neon shadow-[0_0_10px_#00f0ff]'
                                                }`}></div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-oswald font-bold text-2xl text-white tracking-wide uppercase">
                                                        {gs.squadName || gs.squadId?.squadName || 'UNKNOWN'}
                                                    </h3>
                                                    {gs.isPending && (
                                                        <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] font-mono font-bold uppercase tracking-wider border border-gray-600">
                                                            PENDING
                                                        </span>
                                                    )}
                                                    {gs.isDisqualified && (
                                                        <span className="px-2 py-0.5 bg-cyber-red/20 text-cyber-red text-[10px] font-mono font-bold border border-cyber-red/50 uppercase tracking-widest flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" /> DISQUALIFIED
                                                        </span>
                                                    )}
                                                    {gs.isCompleted && !gs.isDisqualified && (
                                                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border uppercase tracking-widest flex items-center gap-1 ${isWinner
                                                            ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                                                            : 'bg-gray-800 text-gray-400 border-gray-600'
                                                            }`}>
                                                            {isWinner ? <Trophy className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                                            {isWinner ? 'WINNER' : `ELIMINATED #${gs.squadPlacement || '-'}`}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-gray-400 font-mono mt-1">
                                                    <span>MATCH_SEQ: #{gs.matchNumber || '-'}</span>
                                                    <span className="flex items-center gap-1 text-cyber-neon">
                                                        <Crosshair className="w-3 h-3" />
                                                        KILLS: {gs.players.reduce((a, b) => a + (b.kills || 0), 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 justify-end">
                                            {!gs.isCompleted && !gs.isDisqualified && !gs.isPending && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCompleteMatch(gs._id, gs.squadName || gs.squadId?.squadName || 'Unknown Squad', false);
                                                        }}
                                                        className="px-4 py-2 text-xs font-bold border skew-x-[-10deg] transition-all uppercase tracking-wide bg-cyber-yellow/10 text-cyber-yellow border-cyber-yellow/30 hover:bg-cyber-yellow hover:text-black font-oswald"
                                                        title="ELIMINATE SQUAD (AUTO-RANK)"
                                                    >
                                                        <span className="skew-x-[10deg] block">ELIMINATE</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDisqualify(gs._id, gs.squadName || gs.squadId?.squadName || 'Unknown Squad');
                                                        }}
                                                        className="px-4 py-2 text-xs font-bold bg-cyber-red/10 text-cyber-red border border-cyber-red/30 hover:bg-cyber-red hover:text-white skew-x-[-10deg] transition-all uppercase tracking-wide font-oswald"
                                                    >
                                                        <span className="skew-x-[10deg] block">DISQUALIFY</span>
                                                    </button>
                                                </>
                                            )}
                                            <div className={`text-gray-500 transition-transform duration-300 ${expandedSquad === gs._id ? 'rotate-180' : ''}`}>
                                                ▼
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Player List */}
                                    <div className={`overflow-hidden transition-all duration-300 ${expandedSquad === gs._id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="p-5 bg-black/40 border-t border-white/5 mx-1 mb-1">
                                            <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-4 font-bold border-b border-white/5 pb-2">
                                                {gs.isPending ? 'WAITING FOR DEPLOYMENT' : 'OPERATIVE STATUS'}
                                            </h4>
                                            <div className="grid gap-3">
                                                {gs.players.map((player) => (
                                                    <div key={player.ffId} className="flex flex-col md:flex-row md:items-center gap-4 bg-cyber-card p-3 border border-white/5 hover:border-white/20 transition-colors group/player">

                                                        {/* 1. Player Info */}
                                                        <div className="flex-1 min-w-0 flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${player.isEliminated ? 'bg-cyber-red' : 'bg-cyber-neon shadow-[0_0_5px_#00f0ff]'}`}></div>
                                                            <div>
                                                                <div className={`font-bold font-oswald text-lg uppercase tracking-wide truncate ${player.isEliminated ? 'text-gray-500 line-through decoration-cyber-red decoration-2' : 'text-white'}`}>
                                                                    {player.playerName}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 font-mono tracking-wider truncate">{player.ffName || 'UNKNOWN'}</div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 justify-between md:justify-end">
                                                            <div className="text-right px-4 border-r border-white/10 hidden md:block">
                                                                <div className={`text-lg font-bold font-oswald ${player.isEliminated ? 'text-gray-600' : 'text-white'}`}>
                                                                    {((player.killPoints || 0) + (player.placementPoints || 0)).toFixed(1)}
                                                                </div>
                                                                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">POINTS</div>
                                                            </div>

                                                            {/* Elimination Toggle */}
                                                            <button
                                                                onClick={() => handleTogglePlayerElimination(gs._id, player.ffId, !player.isEliminated)}
                                                                disabled={gs.isCompleted || gs.isDisqualified}
                                                                className={`px-3 py-1 text-[10px] font-bold border skew-x-[-10deg] transition-all uppercase tracking-wider font-mono ${player.isEliminated
                                                                    ? 'bg-cyber-red/20 text-cyber-red border-cyber-red/50 hover:bg-cyber-red hover:text-white'
                                                                    : 'bg-black/40 text-gray-400 border-gray-700 hover:border-cyber-red hover:text-cyber-red'
                                                                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                                                            >
                                                                <span className="skew-x-[10deg] block">{player.isEliminated ? 'K.I.A' : 'KILL'}</span>
                                                            </button>

                                                            {/* 3. Kill Counter */}
                                                            <div className={`flex items-center gap-1 bg-black/60 p-1 border ${player.isEliminated ? 'border-cyber-red/30 opacity-50' : 'border-white/10'} clip-path-slant-sm`}>
                                                                <button
                                                                    onClick={() => {
                                                                        const newVal = Math.max(0, (player.kills || 0) - 1);
                                                                        handleUpdateKills(gs._id, player.ffId, newVal);
                                                                    }}
                                                                    disabled={gs.isCompleted || gs.isPending || gs.isDisqualified || player.isEliminated || (player.kills || 0) <= 0}
                                                                    className="p-1 px-2 hover:bg-cyber-red/20 text-gray-400 hover:text-cyber-red transition-all disabled:opacity-30"
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>

                                                                <span className="w-8 text-center font-bold text-xl font-oswald text-cyber-neon tabular-nums">
                                                                    {player.kills || 0}
                                                                </span>

                                                                <button
                                                                    onClick={() => {
                                                                        const newVal = (player.kills || 0) + 1;
                                                                        handleUpdateKills(gs._id, player.ffId, newVal);
                                                                    }}
                                                                    disabled={gs.isCompleted || gs.isPending || gs.isDisqualified || player.isEliminated}
                                                                    className="p-1 px-2 hover:bg-cyber-neon/20 text-gray-400 hover:text-cyber-neon transition-all disabled:opacity-30"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {gs.isDisqualified && (
                                                <div className="mt-4 p-4 bg-cyber-red/10 border border-cyber-red/30 flex items-center justify-center gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-cyber-red" />
                                                    <p className="text-cyber-red text-sm font-bold uppercase tracking-widest font-mono">
                                                        DISQUALIFIED: {gs.disqualificationReason}
                                                    </p>
                                                </div>
                                            )}

                                            {gs.isCompleted && !gs.isDisqualified && (
                                                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 flex items-center justify-center gap-3">
                                                    <Trophy className="w-5 h-5 text-green-500" />
                                                    <p className="text-green-500 text-sm font-bold uppercase tracking-widest font-mono">MATCH COMPLETED // RANK: {index + 1}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            );
                        })}
                    </div>
                )}

                {/* Refresh Button */}
                <div className="fixed bottom-6 right-6 z-50">
                    <button
                        onClick={fetchAssignedSquads}
                        className="p-4 bg-cyber-purple text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:bg-cyber-purple/90 transition-all active:scale-90 border-2 border-white hover:border-cyber-purple rounded-full group"
                        title="SYNC DATA"
                    >
                        <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700" />
                    </button>
                </div>
            </div>
        </div >
    );
};

export default ModeratorPanel;

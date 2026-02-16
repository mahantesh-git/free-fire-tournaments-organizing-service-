import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trophy, RefreshCw, Play, Shield, CheckCircle, ChevronDown, Plus, Minus, Sword, AlertTriangle, Clock, Pause, Square, RotateCcw } from 'lucide-react';
import api from '../../services/api';
import socketService from '../../services/socketService';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

const RoomMatchControl = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState(null);
    const [tournament, setTournament] = useState(null);
    const [matchNumber, setMatchNumber] = useState(1);
    const [gameStates, setGameStates] = useState([]);
    const [moderators, setModerators] = useState([]);
    const [assignedModId, setAssignedModId] = useState('');
    const [processing, setProcessing] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [expandedSquad, setExpandedSquad] = useState(null);

    // Timer State
    const [timer, setTimer] = useState({ status: 'IDLE', duration: 300, remaining: 300, endsAt: null });
    const [timerInput, setTimerInput] = useState(5);

    const fetchInitialData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const modsRes = await api.get('/api/moderators/list');
            if (modsRes.data.success) setModerators(modsRes.data.moderators.filter(m => m.isActive));

            const stateRes = await api.get(`/api/squadGame/roomMatchState/${roomId}?matchNumber=${matchNumber}`);
            if (stateRes.data.success) {
                setGameStates(stateRes.data.gameStates);
                if (stateRes.data.room) {
                    setRoom(stateRes.data.room);
                    setAssignedModId(stateRes.data.room.moderatorId || '');
                }
                if (stateRes.data.tournament) {
                    setTournament(stateRes.data.tournament);
                }
            }
            if (!isSilent) setLoading(false);
        } catch (error) {
            console.error(error);
            if (!isSilent) {
                toast.error('Failed to load match data');
                setLoading(false);
            }
        }
    }, [roomId, matchNumber]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    useEffect(() => {
        const socket = socketService.connect();
        const tenantSlug = localStorage.getItem('tenantSlug');
        if (tenantSlug) socketService.emit('join_tenant', tenantSlug);

        const handleSquadUpdate = (data) => {
            if (data.type === 'killUpdate') {
                const { gameStateId, data: killData } = data;
                setGameStates(prev => prev.map(gs => {
                    if (gs._id.toString() === gameStateId.toString()) {
                        const updatedPlayers = gs.players.map(p =>
                            p.ffId.toString() === killData.ffId.toString()
                                ? { ...p, kills: killData.kills, killPoints: killData.killPoints ?? p.killPoints, placementPoints: killData.placementPoints ?? p.placementPoints }
                                : p
                        );
                        return { ...gs, players: updatedPlayers, totalKills: killData.totalKills, squadPoints: killData.squadPoints };
                    }
                    return gs;
                }));
            } else if (data.type === 'playerStatsUpdate') {
                const { gameStateId, data: playerData } = data;
                setGameStates(prev => prev.map(gs => {
                    if (gs._id.toString() === gameStateId.toString()) {
                        const updatedPlayers = gs.players.map(p =>
                            p.ffId.toString() === playerData.ffId.toString()
                                ? { ...p, isEliminated: playerData.isEliminated, kills: playerData.kills }
                                : p
                        );
                        return { ...gs, players: updatedPlayers };
                    }
                    return gs;
                }));
            } else if (data.type === 'matchComplete' || data.type === 'statsUpdate' || data.type === 'disqualified') {
                fetchInitialData(true); // Silent refresh
            }
        };

        socketService.on('squadUpdate', handleSquadUpdate);

        // Timer Socket Listener
        const handleTimerUpdate = (data) => {
            setTimer(data);
        };
        socketService.on('timerUpdate', handleTimerUpdate);

        return () => {
            socketService.off('squadUpdate', handleSquadUpdate);
            socketService.off('timerUpdate', handleTimerUpdate);
        };
    }, [roomId, fetchInitialData]);
    const fetchRoomAndState = () => fetchInitialData();

    // --- TIMER HANDLERS ---
    const handleTimerAction = async (action, duration = null) => {
        try {
            const payload = { action };
            if (duration) payload.duration = duration;
            await api.put('/api/gamestate/timer', payload);
            // State update will happen via socket or optimistic if needed, but socket is fast enough
        } catch (error) {
            toast.error('Timer action failed');
        }
    };

    // Format seconds to MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate display time based on status
    const getDisplayTime = () => {
        if (timer.status === 'RUNNING' && timer.endsAt) {
            const ends = new Date(timer.endsAt).getTime();
            const now = Date.now();
            const diff = Math.max(0, Math.ceil((ends - now) / 1000));
            return formatTime(diff);
        }
        return formatTime(timer.remaining || 0);
    };

    // Auto-update display for running timer (local tick)
    const [displayTime, setDisplayTime] = useState('00:00');

    useEffect(() => {
        if (timer.status === 'RUNNING') {
            const interval = setInterval(() => {
                setDisplayTime(getDisplayTime());
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setDisplayTime(formatTime(timer.remaining || 0));
        }
    }, [timer]);

    // --- HANDLERS (Same logic) ---
    const handleAssignModerator = async (modId) => {
        setAssigning(true);
        try {
            const res = await api.put(`/api/rooms/${roomId}/moderator`, { moderatorId: modId });
            if (res.data.success) { setAssignedModId(modId); toast.success('Moderator assigned'); }
        } catch (error) { toast.error('Failed to assign moderator'); } finally { setAssigning(false); }
    };

    const handleStartMatch = async () => {
        if (!confirm(`Start Match ${matchNumber}?`)) return;
        setProcessing(true);
        try {
            const res = await api.post('/api/squadGame/startRoomMatch', { roomId, matchNumber });
            if (res.data.success) { toast.success(res.data.message); setGameStates(res.data.gameStates); }
        } catch (error) { toast.error(error.response?.data?.message || 'Failed to start match'); } finally { setProcessing(false); }
    };

    const handleUpdateKills = async (gameStateId, ffId, kills) => {
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
            const res = await api.put(`/api/squadGame/updateKills/${gameStateId}`, { ffId, kills: parseInt(kills) || 0 });
            if (res.data.success) {
                setGameStates(prev => prev.map(gs => gs._id === gameStateId ? res.data.gameState : gs));
            }
        } catch (error) {
            toast.error('Failed to update kills');
            fetchInitialData(true); // Rollback via silent sync
        }
    };

    const handleTogglePlayerElimination = async (gameStateId, ffId, isEliminated) => {
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
            const res = await api.put(`/api/squadGame/togglePlayerElimination/${gameStateId}`, { ffId, isEliminated });
            if (res.data.success) {
                setGameStates(prev => prev.map(gs => gs._id === gameStateId ? res.data.gameState : gs));
                toast.success(isEliminated ? 'Player eliminated' : 'Player restored');
            }
        } catch (error) {
            toast.error('Action failed');
            fetchInitialData(true); // Rollback via silent sync
        }
    };

    const handleCompleteMatch = async (gameStateId, squadName, isLast = false) => {
        if (!confirm(`${isLast ? 'Mark as Winner' : 'Eliminate'} "${squadName}"?`)) return;
        try {
            // Explicitly send placement: 1 if marking as winner
            const payload = isLast ? { placement: 1 } : {};
            const res = await api.put(`/api/squadGame/completeMatch/${gameStateId}`, payload);
            if (res.data.success) { toast.success(`${squadName} ${isLast ? 'Winner!' : 'Eliminated'}`); fetchInitialData(true); }
        } catch (error) { toast.error('Failed to complete elimination'); }
    };

    const handleDisqualify = async (gameStateId, squadName) => {
        const reason = prompt(`Reason for disqualifying "${squadName}":`, "Rule violation");
        if (!reason) return;
        try {
            const res = await api.put(`/api/squadGame/disqualify/${gameStateId}`, { reason });
            if (res.data.success) { toast.success(`${squadName} disqualified`); fetchInitialData(true); }
        } catch (error) { toast.error('Failed to disqualify'); }
    };

    const handleRevokeDisqualify = async (gameStateId, squadName) => {
        if (!confirm(`Revoke disqualification for "${squadName}"?`)) return;
        try {
            const res = await api.put(`/api/squadGame/revoke-disqualify/${gameStateId}`);
            if (res.data.success) { toast.success(`DQ Revoked for ${squadName}`); fetchInitialData(true); }
        } catch (error) { toast.error('Failed to revoke DQ'); }
    };

    const sortedGameStates = useMemo(() => {
        if (!gameStates || gameStates.length === 0) return [];
        const rankingSort = tournament?.settings?.rankingSort || 'POINTS';

        return [...gameStates].sort((a, b) => {
            // 1. DQ at bottom
            if (a.isDisqualified && !b.isDisqualified) return 1;
            if (!a.isDisqualified && b.isDisqualified) return -1;

            // 2. Stable Sort by Squad Name (Alphabetical)
            // This prevents the list from jumping around during live scoring updates
            return (a.squadName || '').localeCompare(b.squadName || '');
        });
    }, [gameStates]);

    // Derived
    const isSolo = room?.mode === 'SOLO';

    return (
        <div className="min-h-screen bg-cyber-black text-white p-4 md:p-6 font-inter overflow-x-hidden selection:bg-cyber-red selection:text-white">
            {/* Background Details */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyber-red/5 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyber-purple/5 rounded-full blur-[128px]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* --- HEADER CONTROLS --- */}
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border/30 pb-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Button variant="outline" size="sm" onClick={() => navigate('/organizer/dashboard')} className="border-cyber-border/50 text-cyber-muted hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>

                            {/* Timer Control Panel (Compact) */}
                            <div className="flex items-center gap-2 bg-cyber-charcoal/50 border border-cyber-border/30 rounded-md p-1 px-3">
                                <Clock className="w-4 h-4 text-cyber-blue" />
                                <span className={`font-mono font-bold text-lg ${timer.status === 'RUNNING' ? 'text-cyber-yellow animate-pulse' : 'text-white'}`}>
                                    {displayTime}
                                </span>

                                <div className="h-6 w-px bg-white/10 mx-2"></div>

                                {timer.status === 'IDLE' ? (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-black/30 rounded px-1">
                                            <input
                                                type="number"
                                                className="w-8 bg-transparent text-center font-mono text-sm border-none focus:ring-0 p-0"
                                                value={timerInput}
                                                onChange={(e) => setTimerInput(Math.max(1, parseInt(e.target.value) || 0))}
                                            />
                                            <span className="text-[10px] text-cyber-muted">MIN</span>
                                        </div>
                                        <button
                                            onClick={() => handleTimerAction('set', timerInput * 60)}
                                            className="text-[10px] bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30 px-2 py-1 rounded"
                                        >
                                            SET
                                        </button>
                                        <button
                                            onClick={() => handleTimerAction('start')}
                                            disabled={timer.duration === 0}
                                            className="p-1 hover:bg-success-500/20 text-success-500 rounded disabled:opacity-50"
                                        >
                                            <Play className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        {timer.status === 'RUNNING' ? (
                                            <button onClick={() => handleTimerAction('pause')} className="p-1 hover:bg-cyber-yellow/20 text-cyber-yellow rounded">
                                                <Pause className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button onClick={() => handleTimerAction('resume')} className="p-1 hover:bg-success-500/20 text-success-500 rounded">
                                                <Play className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => handleTimerAction('reset')} className="p-1 hover:bg-cyber-red/20 text-cyber-red rounded">
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-white font-oswald uppercase tracking-wide flex items-center gap-3">
                            {room?.name || 'Room Control'} MATCH <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-red to-cyber-pink">OPERATIONS</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Moderator Select with Angled Edges */}
                        <div className="relative group clip-path-slant min-w-[200px]">
                            <div className="absolute inset-0 bg-cyber-border group-hover:bg-cyber-red transition-colors duration-300"></div>
                            <div className="relative bg-cyber-charcoal m-[1px] flex items-center">
                                <div className="px-3 bg-cyber-black/50 h-full flex items-center justify-center border-r border-cyber-border/50">
                                    <Shield className="w-4 h-4 text-cyber-muted group-hover:text-cyber-red transition-colors" />
                                </div>
                                <select
                                    value={assignedModId}
                                    onChange={(e) => handleAssignModerator(e.target.value)}
                                    disabled={assigning}
                                    className="bg-transparent text-sm text-white focus:outline-none w-full cursor-pointer font-bold font-oswald uppercase tracking-wider py-3 px-4 appearance-none"
                                >
                                    <option value="">Select Mod</option>
                                    {moderators.map(mod => <option key={mod._id} value={mod._id} className="bg-cyber-charcoal">{mod.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-cyber-muted absolute right-3 pointer-events-none" />
                            </div>
                        </div>

                        {/* Match Selector */}
                        <div className="relative group min-w-[120px]">
                            <div className="flex items-center bg-cyber-charcoal border border-cyber-border hover:border-cyber-pink transition-colors h-[46px]">
                                <div className="bg-black/40 h-full px-3 flex items-center text-cyber-muted font-bold font-oswald text-xs uppercase border-r border-cyber-border">Match</div>
                                <select
                                    value={matchNumber}
                                    onChange={(e) => setMatchNumber(parseInt(e.target.value))}
                                    className="bg-transparent text-white px-3 py-1 focus:outline-none text-lg font-bold font-oswald w-full appearance-none text-center"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(num => <option key={num} value={num} className="bg-cyber-charcoal">{num}</option>)}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={fetchRoomAndState}
                            className="h-[46px] w-[46px] flex items-center justify-center bg-cyber-charcoal border border-cyber-border hover:bg-cyber-red hover:text-white hover:border-cyber-red transition-all cursor-pointer"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Stats Bar */}
                {!loading && gameStates.length > 0 && (
                    <div className="flex gap-8 mb-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-cyber-muted font-bold uppercase tracking-widest font-oswald">Active {isSolo ? 'Players' : 'Squads'}</span>
                            <span className="text-2xl font-bold font-mono text-white leading-none">{gameStates.filter(g => !g.isDisqualified && !g.isCompleted).length}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-cyber-muted font-bold uppercase tracking-widest font-oswald">Eliminated</span>
                            <span className="text-2xl font-bold font-mono text-white leading-none">{gameStates.filter(g => g.isCompleted).length}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-cyber-muted font-bold uppercase tracking-widest font-oswald">Total Kills</span>
                            <span className="text-2xl font-bold font-mono text-cyber-red leading-none">{gameStates.reduce((acc, curr) => acc + curr.totalKills, 0)}</span>
                        </div>
                    </div>
                )}

                {/* --- GAME STATE LIST --- */}
                {loading ? (
                    <div className="text-center py-32">
                        <div className="inline-block w-16 h-16 border-t-4 border-cyber-red border-solid rounded-full animate-spin mb-4"></div>
                        <div className="text-cyber-muted font-oswald text-xl animate-pulse tracking-widest">SYSTEM INITIALIZING...</div>
                    </div>
                ) : gameStates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-cyber-border/50 bg-cyber-charcoal/20">
                        <Sword className="w-20 h-20 text-cyber-muted mb-6 opacity-20" />
                        <h3 className="text-3xl font-black text-white mb-2 font-oswald uppercase tracking-wide">Match Pending</h3>
                        <p className="text-cyber-muted mb-8 text-center max-w-md">The battlefield is empty. Initialize the scoring system to begin tracking squad performance.</p>
                        <button onClick={handleStartMatch} disabled={processing} className="btn-cyber-primary flex items-center gap-3 px-8 py-4 text-lg clip-path-slant">
                            {processing ? <RefreshCw className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                            INITIALIZE SYSTEM
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {/* Header Row */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-bold text-cyber-muted uppercase tracking-widest font-oswald border-b border-cyber-border/30">
                            <div className="col-span-1">Status</div>
                            <div className="col-span-4">{isSolo ? 'Player' : 'Squad'}</div>
                            <div className="col-span-1 text-center">Rank</div>
                            <div className="col-span-1 text-center">Pts</div>
                            <div className="col-span-2 text-center">Elims</div>
                            <div className="col-span-3 text-right">Actions</div>
                        </div>

                        {sortedGameStates.map((gs, index) => {
                            const isActive = !gs.isCompleted && !gs.isDisqualified;
                            const isWinner = gs.isCompleted && gs.squadPlacement === 1;
                            const currentRank = gs.squadPlacement || index + 1;

                            return (
                                <div key={gs._id} className={`group relative bg-cyber-card border border-cyber-border hover:border-cyber-muted transition-all duration-200 ${expandedSquad === gs._id ? 'border-cyber-red/50 bg-cyber-charcoal' : ''}`}>
                                    <div className={`absolute top-0 bottom-0 left-0 w-1 ${gs.isDisqualified ? 'bg-red-600' : isWinner ? 'bg-yellow-500' : gs.isCompleted ? 'bg-gray-500' : 'bg-success-500'}`}></div>
                                    <div className="p-4 md:py-4 md:px-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                        <div className="col-span-1 flex items-center">
                                            {gs.isDisqualified ? <AlertTriangle className="text-red-600 w-5 h-5" /> : gs.isCompleted ? <CheckCircle className="text-cyber-muted w-5 h-5" /> : <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>}
                                        </div>
                                        <div className="col-span-4" onClick={() => setExpandedSquad(expandedSquad === gs._id ? null : gs._id)}>
                                            <h3 className="text-xl font-bold text-white font-oswald uppercase tracking-wide group-hover:text-cyber-red transition-colors cursor-pointer flex items-center gap-2">
                                                {gs.squadName}
                                                {gs.isDisqualified && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 font-sans font-bold tracking-widest rounded-sm">DQ</span>}
                                                {gs.isCompleted && !gs.isDisqualified && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 font-sans font-bold tracking-widest rounded-sm flex items-center gap-1 ${isWinner ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'}`}>
                                                        {isWinner ? 'WINNER' : `ELIMINATED #${gs.squadPlacement || '-'}`}
                                                    </span>
                                                )}
                                            </h3>
                                        </div>
                                        <div className="col-span-1 text-center hidden md:block">
                                            <div className="text-2xl font-black text-white font-oswald">{currentRank}</div>
                                        </div>
                                        <div className="col-span-1 text-center hidden md:block">
                                            <div className="text-xl font-bold text-cyber-blue font-mono">{gs.squadPoints || 0}</div>
                                        </div>
                                        <div className="col-span-2 text-center hidden md:block">
                                            <div className="text-xl font-bold text-cyber-red font-mono">{gs.players.reduce((a, b) => a + (b.kills || 0), 0)}</div>
                                        </div>
                                        <div className="col-span-3 flex justify-end items-center gap-3">
                                            {isActive && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const activeCount = gameStates.filter(x => !x.isCompleted && !x.isDisqualified).length;
                                                        handleCompleteMatch(gs._id, gs.squadName, activeCount === 1);
                                                    }}
                                                    className={`h-8 px-4 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest font-oswald transition-all border ${gameStates.filter(x => !x.isCompleted && !x.isDisqualified).length === 1 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-cyber-black text-cyber-muted border-cyber-border hover:border-cyber-red hover:text-cyber-red'}`}
                                                >
                                                    {gameStates.filter(x => !x.isCompleted && !x.isDisqualified).length === 1 ? 'Crown Winner' : 'Eliminate'}
                                                </button>
                                            )}
                                            <button onClick={() => setExpandedSquad(expandedSquad === gs._id ? null : gs._id)} className={`p-2 hover:text-white transition-colors ${expandedSquad === gs._id ? 'text-cyber-red rotate-180' : 'text-cyber-muted'}`}>
                                                <ChevronDown className="w-5 h-5 transition-transform" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedSquad === gs._id && (
                                        <div className={`border-t border-cyber-border bg-black/40 animate-fade-in ${isSolo ? 'p-2' : 'p-6'}`}>
                                            <div className={`grid gap-4 ${isSolo ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
                                                {gs.players.map((player) => (
                                                    <div key={player.ffId} className="bg-cyber-charcoal border border-cyber-border hover:border-cyber-muted/50 p-3 flex flex-col gap-3 relative overflow-hidden group/player">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className={`font-bold text-sm uppercase font-oswald tracking-wide truncate ${player.isEliminated ? 'text-cyber-muted line-through' : 'text-white'}`}>{player.playerName}</div>
                                                                <div className="text-[10px] text-cyber-muted font-mono">{player.ffId}</div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleTogglePlayerElimination(gs._id, player.ffId, !player.isEliminated)}
                                                                disabled={gs.isCompleted || gs.isDisqualified}
                                                                className={`text-[9px] font-bold uppercase border px-1.5 py-0.5 transition-colors ${player.isEliminated ? 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white' : 'border-cyber-border text-cyber-muted hover:border-white hover:text-white'}`}
                                                            >
                                                                {player.isEliminated ? 'Revive' : 'Kill'}
                                                            </button>
                                                        </div>
                                                        <div className={`flex items-center justify-between bg-black/50 p-1 border border-cyber-border ${player.isEliminated ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            <button onClick={() => handleUpdateKills(gs._id, player.ffId, Math.max(0, (player.kills || 0) - 1))} disabled={gs.isCompleted || gs.isDisqualified} className="w-8 h-8 flex items-center justify-center hover:bg-cyber-red/20 text-cyber-muted hover:text-white transition-colors border-r border-cyber-border"><Minus className="w-3 h-3" /></button>
                                                            <div className="flex items-center gap-3 px-3">
                                                                <div className="text-center"><span className="block text-lg font-bold font-mono text-cyber-blue leading-none">{player.killPoints || 0}</span><span className="text-[8px] uppercase text-cyber-muted font-bold tracking-widest">Pts</span></div>
                                                                <div className="w-px h-6 bg-cyber-border"></div>
                                                                <div className="text-center"><span className="block text-lg font-bold font-mono text-white leading-none">{player.kills || 0}</span><span className="text-[8px] uppercase text-cyber-muted font-bold tracking-widest">Kills</span></div>
                                                            </div>
                                                            <button onClick={() => handleUpdateKills(gs._id, player.ffId, (player.kills || 0) + 1)} disabled={gs.isCompleted || gs.isDisqualified} className="w-8 h-8 flex items-center justify-center hover:bg-emerald-500/20 text-cyber-muted hover:text-emerald-500 transition-colors"><Plus className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex justify-end border-t border-cyber-border/30 pt-4">
                                                {!gs.isDisqualified && !gs.isCompleted && (
                                                    <button onClick={() => handleDisqualify(gs._id, gs.squadName)} className="text-xs text-cyber-muted hover:text-red-500 flex items-center gap-2 uppercase font-bold tracking-widest transition-colors font-oswald"><Shield className="w-3 h-3" /> Disqualify {isSolo ? 'Player' : 'Squad'}</button>
                                                )}
                                                {gs.isDisqualified && (
                                                    <button onClick={() => handleRevokeDisqualify(gs._id, gs.squadName)} className="text-xs text-red-500 hover:text-white flex items-center gap-2 uppercase font-bold tracking-widest transition-colors font-oswald"><Shield className="w-3 h-3" /> Revoke Disqualification</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomMatchControl;

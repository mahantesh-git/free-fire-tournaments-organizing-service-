import { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Navbar from '../components/layout/Navbar';
import { Trophy, User, Users, Target, Crosshair, RefreshCw, BarChart2, AlertTriangle, Skull, Clock } from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socketService';
import MatchSelector from '../components/common/MatchSelector';
import ScoreboardSkeleton from '../components/common/ScoreboardSkeleton';

const IndividualScoreboard = ({ isAudience = false }) => {
    const { tournament, players, loading, error, selectedMatch } = useTournament();
    const [currentRoom, setCurrentRoom] = useState('all');
    const [rooms, setRooms] = useState([]);
    const [sortedPlayers, setSortedPlayers] = useState([]);

    // Timer State
    const [timer, setTimer] = useState({ status: 'IDLE', duration: 0, remaining: 0, endsAt: null });
    const [displayTime, setDisplayTime] = useState('00:00');

    // Timer Logic
    useEffect(() => {
        const fetchTimer = async () => {
            try {
                const res = await api.get('/api/gamestate');
                if (res.data.success && res.data.gameState?.timer) {
                    setTimer(res.data.gameState.timer);
                }
            } catch (e) { console.error(e); }
        };
        fetchTimer();

        const handleTimerUpdate = (data) => setTimer(data);
        socketService.on('timerUpdate', handleTimerUpdate);
        return () => socketService.off('timerUpdate', handleTimerUpdate);
    }, []);

    useEffect(() => {
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        if (timer.status === 'RUNNING' && timer.endsAt) {
            const interval = setInterval(() => {
                const ends = new Date(timer.endsAt).getTime();
                const now = Date.now();
                const diff = Math.max(0, Math.ceil((ends - now) / 1000));
                setDisplayTime(formatTime(diff));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setDisplayTime(formatTime(timer.remaining || 0));
        }
    }, [timer]);

    useEffect(() => {
        // If audience, don't default to 'all' if there are rooms available
        if (isAudience && currentRoom === 'all' && rooms.length > 1) {
            const firstRealRoom = rooms.find(r => r !== 'all');
            if (firstRealRoom) setCurrentRoom(firstRealRoom);
        }
    }, [isAudience, rooms, currentRoom]);

    useEffect(() => {
        // Extract unique rooms
        const uniqueRooms = new Set(['all']);
        if (Array.isArray(players)) {
            players.forEach(player => {
                if (player.room && player.room !== 'Unassigned') {
                    uniqueRooms.add(player.room);
                }
            });
        }
        setRooms(Array.from(uniqueRooms));
    }, [players]);

    useEffect(() => {
        if (!Array.isArray(players)) {
            setSortedPlayers([]);
            return;
        }

        let filtered = currentRoom === 'all'
            ? players
            : players.filter(p => p.room === currentRoom);

        const rankingSort = tournament?.settings?.rankingSort || 'POINTS';
        const killPoints = tournament?.settings?.killPoints || 1;
        const placementPointsMap = tournament?.settings?.placementPoints || {};

        const calculatePoints = (player) => {
            if (player.totalPoints !== undefined) return player.totalPoints;
            const kills = player.total || 0;
            const placement = player.matchPlacement || 999;
            const pPoints = placementPointsMap[placement] || 0;
            const kPoints = kills * killPoints;
            return pPoints + kPoints;
        };

        // Pre-calculate points to allow use in render
        filtered = filtered.map(player => ({
            ...player,
            calculatedPoints: calculatePoints(player)
        }));

        filtered.sort((a, b) => {
            if (rankingSort === 'KILLS') {
                return (b.total || 0) - (a.total || 0);
            } else {
                // POINTS
                if (a.calculatedPoints !== b.calculatedPoints) {
                    return b.calculatedPoints - a.calculatedPoints;
                }
                return (b.total || 0) - (a.total || 0); // Tie-breaker: Kills
            }
        });
        setSortedPlayers(filtered);
    }, [players, currentRoom, tournament]);

    if (loading) {
        return <ScoreboardSkeleton type="individual" />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-cyber-black flex items-center justify-center p-4">
                <Navbar />
                <div className="card-cyber p-8 max-w-md w-full border-red-500/50 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-900/10 z-0"></div>
                    <div className="text-red-500 text-6xl mb-4 relative z-10 font-bold">⚠️</div>
                    <h2 className="text-3xl font-bold text-white mb-2 font-oswald uppercase tracking-wide relative z-10">Connection Failure</h2>
                    <p className="text-cyber-muted mb-8 relative z-10">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-cyber-primary relative z-10 w-full"
                    >
                        RETRY CONNECTION
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter">
            {!isAudience && <Navbar />}
            <div className={`p-4 md:p-6 max-w-6xl mx-auto ${isAudience ? 'pt-8' : ''}`}>
                <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border/20 pb-6">
                    <div>
                        {isAudience && (
                            <div className="flex items-center gap-2 mb-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-pink opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-pink"></span>
                                </span>
                                <span className="text-cyber-pink font-oswald font-bold tracking-[0.3em] text-[10px] uppercase animate-pulse">
                                    Live Broadcast
                                </span>
                            </div>
                        )}
                        <h1 className="text-2xl md:text-4xl font-black text-white mb-1 font-oswald uppercase tracking-tight flex flex-wrap items-center gap-x-3">
                            {tournament?.name || 'Tournament'} <span className="text-stroke-cyber-blue text-transparent">Solo Board</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-cyber-muted uppercase tracking-[0.2em] text-[11px] font-oswald font-bold flex items-center gap-2 opacity-80">
                                <BarChart2 className="w-3.5 h-3.5 text-cyber-pink" />
                                {selectedMatch ? `MATCH ${selectedMatch} PERFORMANCE` : (isAudience ? 'MATCH RESULTS' : 'OVERALL PERFORMANCE STATS')}
                            </p>

                            {/* Timer Display */}
                            {timer.status !== 'IDLE' && (
                                <div className={`flex items-center gap-2 px-3 py-1 rounded border ${timer.status === 'RUNNING' ? 'bg-cyber-yellow/10 border-cyber-yellow/30' : 'bg-cyber-charcoal border-cyber-border'}`}>
                                    <Clock className={`w-3.5 h-3.5 ${timer.status === 'RUNNING' ? 'text-cyber-yellow animate-pulse' : 'text-cyber-muted'}`} />
                                    <span className={`font-mono font-bold text-sm ${timer.status === 'RUNNING' ? 'text-cyber-yellow' : 'text-white'}`}>
                                        {displayTime}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.location.reload()}
                            className="p-1.5 rounded-sm border border-cyber-border/30 hover:bg-cyber-pink/10 hover:border-cyber-pink/50 text-cyber-muted hover:text-white transition-all duration-300 group"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                        <MatchSelector isAudience={isAudience} />
                    </div>
                </header>


                {/* Compact Stat Strip */}
                <div className="flex flex-wrap items-stretch gap-px bg-cyber-border/20 rounded-sm border border-cyber-border/30 overflow-hidden mb-6">
                    <div className="flex-1 bg-cyber-card/40 py-3 px-4 flex items-center gap-4 border-r border-cyber-border/20">
                        <div className="p-2 bg-cyber-blue/10 rounded-sm">
                            <User className="w-4 h-4 text-cyber-blue" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-cyber-muted uppercase tracking-widest leading-none mb-1">Players</div>
                            <div className="text-xl font-black text-white font-oswald leading-none">{players.length}</div>
                        </div>
                    </div>
                    <div className="flex-1 bg-cyber-card/40 py-3 px-4 flex items-center gap-4 border-r border-cyber-border/20">
                        <div className="p-2 bg-cyber-red/10 rounded-sm">
                            <Crosshair className="w-4 h-4 text-cyber-red" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-cyber-muted uppercase tracking-widest leading-none mb-1">Total Kills</div>
                            <div className="text-xl font-black text-white font-oswald leading-none">
                                {players.reduce((sum, p) => sum + (p.total || 0), 0)}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[120px] bg-cyber-card/40 py-3 px-4 flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/10 rounded-sm">
                            <Trophy className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-cyber-muted uppercase tracking-widest leading-none mb-1">Rooms</div>
                            <div className="text-xl font-black text-white font-oswald leading-none">{rooms.length - 1}</div>
                        </div>
                    </div>
                </div>

                {/* Compact Filter Tabs */}
                {rooms.length > 2 && (
                    <div className="mb-6 border-b border-cyber-border/30 overflow-x-auto">
                        <div className="flex min-w-max">
                            {rooms.filter(r => !isAudience || r !== 'all').map(room => (
                                <button
                                    key={room}
                                    onClick={() => setCurrentRoom(room)}
                                    className={`px-4 py-2.5 font-oswald font-bold uppercase tracking-widest text-[11px] transition-all border-b-2 ${currentRoom === room
                                        ? 'border-cyber-red text-white bg-cyber-red/5'
                                        : 'border-transparent text-cyber-muted hover:text-white hover:bg-cyber-charcoal/40'
                                        }`}
                                >
                                    {room === 'all' ? 'GLOBAL' : room}
                                    <span className="ml-2 text-[10px] opacity-40">
                                        [{room === 'all' ? players.length : players.filter(p => p.room === room).length}]
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- PODIUM / TOP 3 (Dynamic / Sorted) --- */}
                {sortedPlayers.length > 0 &&
                    players.some(p => String(p.matchPlacement) === '1') && // Robust check for Winner (number/string)
                    (
                        <div className="mb-12 relative">
                            <div className="flex flex-wrap justify-center items-end gap-4 md:gap-6">

                                {/* 2nd Place */}
                                {sortedPlayers[1] && (
                                    <div className="order-1 relative z-10 w-full md:w-64">
                                        <div className="bg-cyber-card border-t-2 border-l-2 border-cyber-purple p-6 pb-12 overflow-hidden relative group">
                                            <div className="absolute top-0 right-0 w-8 h-8 bg-cyber-purple/20 -skew-x-12 transform translate-x-4 -translate-y-4"></div>
                                            <div className="text-4xl font-black text-cyber-purple/50 absolute top-2 right-2 font-oswald select-none">#2</div>

                                            <div className="text-xs font-bold text-cyber-purple uppercase tracking-widest mb-1 font-oswald">
                                                Runner Up
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-4 font-inter truncate">{sortedPlayers[1].playerName}</h3>
                                            <div className="flex justify-between items-end border-t border-cyber-border/50 pt-4">
                                                <div>
                                                    <div className="text-[10px] text-cyber-muted uppercase">Points</div>
                                                    <div className="text-2xl font-bold font-mono text-white">{sortedPlayers[1].calculatedPoints || 0}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-cyber-muted uppercase">Kills</div>
                                                    <div className="text-lg font-bold font-mono text-cyber-purple">{sortedPlayers[1].total || 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Podium Base */}
                                        <div className="h-24 bg-gradient-to-b from-cyber-charcoal to-black border-x border-cyber-border/30 opacity-80 hidden md:block relative">
                                            <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-purple/50"></div>
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-6xl font-black text-white/20 font-oswald">2</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 1st Place - Center */}
                                {sortedPlayers[0] && (
                                    <div className="order-first md:order-2 relative z-20 w-full md:w-80 -mt-8 md:mt-0 shadow-2xl shadow-cyber-red/20 mb-8 md:mb-0">
                                        <div className="bg-cyber-black border-2 border-cyber-red p-8 pb-16 relative overflow-hidden clip-path-polygon-header">
                                            {/* Glowing Effect */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyber-red/20 blur-[60px] rounded-full"></div>
                                            <div className="absolute top-0 left-0 w-full h-1 bg-cyber-red shadow-[0_0_10px_#ff3b3b]"></div>

                                            <Trophy className="w-12 h-12 text-cyber-red mx-auto mb-4 drop-shadow-[0_0_8px_rgba(255,59,59,0.8)]" />
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-cyber-red uppercase tracking-[0.4em] mb-2 font-oswald">
                                                    {sortedPlayers[0].matchPlacement === 1 ? 'Champion' : 'Top Scorer'}
                                                </div>
                                                <h3 className="text-3xl md:text-4xl font-black text-white mb-6 uppercase italic font-oswald tracking-wide leading-none">
                                                    {sortedPlayers[0].playerName}
                                                </h3>
                                                <div className="inline-flex items-center gap-6 bg-cyber-charcoal/80 border border-cyber-red/30 px-6 py-3 backdrop-blur-md">
                                                    <div className="text-center border-r border-white/10 pr-6">
                                                        <div className="text-3xl font-black text-white font-oswald leading-none">{sortedPlayers[0].calculatedPoints || 0}</div>
                                                        <div className="text-[9px] text-cyber-muted uppercase tracking-widest mt-1">Total Pts</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-3xl font-black text-cyber-red font-oswald leading-none">{sortedPlayers[0].total || 0}</div>
                                                        <div className="text-[9px] text-cyber-muted uppercase tracking-widest mt-1">Kills</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Podium Base */}
                                        <div className="h-32 bg-gradient-to-b from-cyber-charcoal to-black border-x border-cyber-border/30 hidden md:block relative">
                                            <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-red"></div>
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-8xl font-black text-cyber-red/30 font-oswald">1</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3rd Place */}
                                {sortedPlayers[2] && (
                                    <div className="order-2 relative z-10 w-full md:w-64">
                                        <div className="bg-cyber-card border-t-2 border-r-2 border-cyber-pink p-6 pb-12 overflow-hidden relative group">
                                            <div className="absolute top-0 left-0 w-8 h-8 bg-cyber-pink/20 skew-x-12 transform -translate-x-4 -translate-y-4"></div>
                                            <div className="text-4xl font-black text-cyber-pink/50 absolute top-2 right-2 font-oswald select-none">#3</div>

                                            <div className="text-xs font-bold text-cyber-pink uppercase tracking-widest mb-1 font-oswald">
                                                Third Place
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-4 font-inter truncate">{sortedPlayers[2].playerName}</h3>
                                            <div className="flex justify-between items-end border-t border-cyber-border/50 pt-4">
                                                <div>
                                                    <div className="text-[10px] text-cyber-muted uppercase">Points</div>
                                                    <div className="text-2xl font-bold font-mono text-white">{sortedPlayers[2].calculatedPoints || 0}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-cyber-muted uppercase">Kills</div>
                                                    <div className="text-lg font-bold font-mono text-cyber-pink">{sortedPlayers[2].total || 0}</div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Podium Base */}
                                        <div className="h-16 bg-gradient-to-b from-cyber-charcoal to-black border-x border-cyber-border/30 opacity-80 hidden md:block relative">
                                            <div className="absolute top-0 left-0 w-full h-[1px] bg-cyber-pink/50"></div>
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-6xl font-black text-white/20 font-oswald">3</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                {/* Players List */}
                <div className="space-y-3">
                    {sortedPlayers.map((player, index) => (
                        <div
                            key={player._id}
                            className={`group relative bg-cyber-card border border-cyber-border transition-all duration-300 hover:scale-[1.01] 
                                ${player.matchPlacement === 1 ? 'border-2 border-cyber-yellow shadow-[0_0_30px_rgba(255,211,0,0.2)] bg-gradient-to-r from-cyber-yellow/10 to-transparent' :
                                    index === 0 ? 'border-2 border-cyber-red shadow-[0_0_20px_rgba(255,59,59,0.1)]' : ''}
                                ${player.isDisqualified ? 'bg-cyber-red/5 border-cyber-red/40' :
                                    player.isEliminated ? 'opacity-80' : ''}`}
                        >
                            {/* Status Indicator color strip */}
                            <div className={`absolute top-0 bottom-0 left-0 w-1 ${player.matchPlacement === 1 ? 'bg-cyber-yellow' :
                                index === 0 ? 'bg-cyber-red' :
                                    index === 1 ? 'bg-cyber-purple' :
                                        index === 2 ? 'bg-cyber-pink' :
                                            'bg-cyber-border'
                                }`}></div>

                            <div className="p-3 md:py-4 md:px-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                {/* Rank */}
                                <div className="col-span-1 flex items-center justify-center md:justify-start">
                                    <div className={`text-2xl font-black font-oswald italic leading-none ${index === 0 ? 'text-cyber-yellow' :
                                        index === 1 ? 'text-gray-300' :
                                            index === 2 ? 'text-amber-600' :
                                                'text-cyber-muted/50'
                                        }`}>
                                        {String(index + 1).padStart(2, '0')}
                                    </div>
                                </div>

                                {/* Player Info */}
                                <div className="col-span-1 md:col-span-7">
                                    <h3 className={`font-oswald font-bold text-lg tracking-wide uppercase leading-tight flex flex-wrap items-center gap-2 ${player.isEliminated || player.isDisqualified ? 'text-gray-500 line-through decoration-cyber-red/50 decoration-1' : 'text-white'
                                        }`}>
                                        {player.playerName}
                                        {player.isEliminated && <Skull className="w-3 h-3 text-cyber-red/60" />}
                                        {player.matchPlacement === 1 && (
                                            <span className="bg-cyber-yellow text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm animate-bounce flex items-center gap-1">
                                                <Trophy className="w-2.5 h-2.5" /> BOOYAH!
                                            </span>
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-3 text-[10px] font-mono mt-0.5 text-cyber-muted opacity-80">
                                        {player.ffName && <span className={player.isEliminated || player.isDisqualified ? 'text-gray-600' : 'text-white/60'}>{player.ffName}</span>}
                                        <span className="w-1 h-1 bg-cyber-border/40 rounded-full hidden md:block"></span>
                                        <span className={player.isEliminated || player.isDisqualified ? 'text-gray-600' : ''}>ID: {player.ffId}</span>
                                    </div>
                                </div>

                                {/* Total Kills / Points */}
                                <div className="col-span-1 md:col-span-4 flex justify-between md:justify-end items-center gap-6 border-t border-cyber-border/10 pt-3 md:border-0 md:pt-0">
                                    <div className="text-right min-w-[80px] flex flex-col items-center md:items-end">
                                        <div className="text-2xl font-black text-cyber-blue font-oswald leading-none">{player.calculatedPoints || 0}_</div>
                                        <div className="text-[8px] font-bold text-cyber-blue/80 uppercase tracking-[0.2em] font-oswald mt-1">Points</div>
                                    </div>

                                    <div className="text-center md:text-right">
                                        {player.isDisqualified ? (
                                            <div className="text-[10px] font-bold text-cyber-red uppercase font-oswald tracking-widest flex items-center gap-1 px-1.5 py-0.5 bg-cyber-red/5 border border-cyber-red/20 opacity-70">
                                                DQ
                                            </div>
                                        ) : player.isEliminated ? (
                                            <div className="text-[10px] font-bold text-cyber-red/50 uppercase font-oswald tracking-widest flex items-center gap-1.5 px-1.5 py-0.5 bg-black/20 border border-cyber-red/10">
                                                K.I.A
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-bold text-success-500 uppercase font-oswald tracking-widest flex items-center gap-1.5 px-1.5 py-0.5 bg-success-500/5 border border-success-500/10">
                                                <div className="w-1 h-1 bg-success-500 rounded-full animate-pulse"></div>
                                                ACTIVE
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-right flex flex-col items-center md:items-end">
                                        <div className="text-2xl font-black text-white font-oswald leading-none">{player.total || 0}_</div>
                                        <div className="text-[8px] font-bold text-cyber-red/80 uppercase tracking-[0.2em] font-oswald mt-1">Kills</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {sortedPlayers.length === 0 && (
                        <div className="card-cyber p-12 text-center border-dashed border-2 border-cyber-border">
                            <Users className="w-16 h-16 text-cyber-muted mx-auto mb-4 opacity-20" />
                            <h3 className="text-2xl font-oswald font-bold text-cyber-muted uppercase tracking-widest">No Registered Players</h3>
                            <p className="text-cyber-muted/50 mt-2 font-mono text-sm uppercase tracking-tighter">Enter the arena to start tracking stats...</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default IndividualScoreboard;

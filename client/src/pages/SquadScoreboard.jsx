import { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Navbar from '../components/layout/Navbar';
import { Trophy, Users, Sword, Crosshair, RefreshCw, BarChart2, AlertTriangle, Skull, Target } from 'lucide-react';
import MatchSelector from '../components/common/MatchSelector';
import ScoreboardSkeleton from '../components/common/ScoreboardSkeleton';
import api from '../services/api';
import socketService from '../services/socketService';
import { Clock } from 'lucide-react';

const SquadScoreboard = ({ isAudience = false }) => {
    const { tournament, squads, loading, error, selectedMatch } = useTournament();
    const [currentRoom, setCurrentRoom] = useState('all');
    const [rooms, setRooms] = useState([]);
    const [sortedSquads, setSortedSquads] = useState([]);

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
        if (Array.isArray(squads)) {
            squads.forEach(squad => {
                if (squad.room && squad.room !== 'Unassigned') {
                    uniqueRooms.add(squad.room);
                }
            });
        }
        setRooms(Array.from(uniqueRooms));
    }, [squads]);

    useEffect(() => {
        // Filter and sort squads
        if (!Array.isArray(squads)) {
            setSortedSquads([]);
            return;
        }

        let filtered = currentRoom === 'all'
            ? squads
            : squads.filter(s => s.room === currentRoom);

        const rankingSort = tournament?.settings?.rankingSort || 'POINTS';

        filtered = [...filtered].sort((a, b) => {
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
        setSortedSquads(filtered);
    }, [squads, currentRoom, tournament]);

    if (loading) {
        return <ScoreboardSkeleton type="squad" />;
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
            <div className={`p-4 md:p-6 max-w-7xl mx-auto ${isAudience ? 'pt-8' : ''}`}>
                <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyber-border/20 pb-6">
                    <div>
                        {isAudience && (
                            <div className="flex items-center gap-2 mb-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-red opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-red"></span>
                                </span>
                                <span className="text-cyber-red font-oswald font-bold tracking-[0.3em] text-[10px] uppercase animate-pulse">
                                    Live Broadcast
                                </span>
                            </div>
                        )}
                        <h1 className="text-2xl md:text-4xl font-black text-white mb-1 font-oswald uppercase tracking-tight flex flex-wrap items-center gap-x-3">
                            {tournament?.name || 'Tournament'} <span className="text-stroke-cyber-blue text-transparent">Scoreboard</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-cyber-muted uppercase tracking-[0.2em] text-[11px] font-oswald font-bold flex items-center gap-2 opacity-80">
                                <BarChart2 className="w-3.5 h-3.5 text-cyber-blue" />
                                {selectedMatch ? `MATCH ${selectedMatch} RANKINGS` : (isAudience ? 'LIVE STANDINGS' : 'OVERALL STANDINGS')}
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
                            className="p-1.5 rounded-sm border border-cyber-border/30 hover:bg-cyber-red/10 hover:border-cyber-red/50 text-cyber-muted hover:text-white transition-all duration-300 group"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                        <MatchSelector isAudience={isAudience} />
                    </div>
                </header>


                {/* Compact HUD Stat Strip */}
                <div className="flex flex-wrap items-stretch gap-px bg-cyber-border/20 rounded-sm border border-cyber-border/30 overflow-hidden mb-6">
                    <div className="flex-1 min-w-[120px] bg-cyber-card/40 p-3 flex items-center gap-3 border-r border-cyber-border/20">
                        <Users className="w-4 h-4 text-cyber-purple opacity-70" />
                        <div>
                            <div className="text-[9px] font-bold text-cyber-muted uppercase tracking-widest leading-none mb-1">Squads</div>
                            <div className="text-lg font-black text-white font-oswald leading-none">{squads.length}</div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[120px] bg-cyber-card/40 p-3 flex items-center gap-3 border-r border-cyber-border/20">
                        <Crosshair className="w-4 h-4 text-cyber-pink opacity-70" />
                        <div>
                            <div className="text-[9px] font-bold text-cyber-muted uppercase tracking-widest leading-none mb-1">Contestants</div>
                            <div className="text-lg font-black text-white font-oswald leading-none">
                                {squads.reduce((sum, s) => sum + (s.players?.length || 0), 0)}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[120px] bg-cyber-card/40 p-3 flex items-center gap-3 border-r border-cyber-border/20">
                        <Sword className="w-4 h-4 text-cyber-red opacity-70" />
                        <div>
                            <div className="text-[9px] font-bold text-cyber-muted uppercase tracking-widest leading-none mb-1">Kills</div>
                            <div className="text-lg font-black text-white font-oswald leading-none">
                                {squads.reduce((sum, s) => sum + (s.totalKills || 0), 0)}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[120px] bg-cyber-card/40 p-3 flex items-center gap-3">
                        <Trophy className="w-4 h-4 text-emerald-500 opacity-70" />
                        <div>
                            <div className="text-[9px] font-bold text-cyber-muted uppercase tracking-widest leading-none mb-1">Rooms</div>
                            <div className="text-lg font-black text-white font-oswald leading-none">{rooms.length - 1}</div>
                        </div>
                    </div>
                </div>

                {/* Compact Filter Tabs */}
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
                                    [{room === 'all' ? squads.length : squads.filter(s => s.room === room).length}]
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                {/* DEBUG LOGGING */}
                {console.log("DEBUG PODIUM:", {
                    squadsLength: squads.length,
                    hasWinner: squads.some(s => s.isCompleted && String(s.squadPlacement) === '1'),
                    winnerData: squads.find(s => String(s.squadPlacement) === '1'),
                    firstSquad: sortedSquads[0]
                })}

                {/* --- PODIUM / TOP 3 (Dynamic / Sorted) --- */}
                {sortedSquads.length > 0 &&
                    squads.some(s => s.isCompleted && String(s.squadPlacement) === '1') && // Robust check for Winner (number/string)
                    (sortedSquads[0]?.squadPoints > 0 || sortedSquads[0]?.totalKills > 0) && (
                        <div className="mb-12 relative">
                            <div className="flex flex-wrap justify-center items-end gap-4 md:gap-6">

                                {/* 2nd Place */}
                                {sortedSquads[1] && (
                                    <div className="order-1 relative z-10 w-full md:w-64">
                                        <div className="bg-cyber-card border-t-2 border-l-2 border-cyber-purple p-6 pb-12 overflow-hidden relative group">
                                            <div className="absolute top-0 right-0 w-8 h-8 bg-cyber-purple/20 -skew-x-12 transform translate-x-4 -translate-y-4"></div>
                                            <div className="text-4xl font-black text-cyber-purple/50 absolute top-2 right-2 font-oswald select-none">#2</div>

                                            <div className="text-xs font-bold text-cyber-purple uppercase tracking-widest mb-1 font-oswald">
                                                Runner Up
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-4 font-inter truncate">{sortedSquads[1].squadName}</h3>
                                            <div className="flex justify-between items-end border-t border-cyber-border/50 pt-4">
                                                <div>
                                                    <div className="text-[10px] text-cyber-muted uppercase">Points</div>
                                                    <div className="text-2xl font-bold font-mono text-white">{sortedSquads[1].squadPoints || 0}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-cyber-muted uppercase">Kills</div>
                                                    <div className="text-lg font-bold font-mono text-cyber-purple">{sortedSquads[1].totalKills || 0}</div>
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
                                {sortedSquads[0] && (
                                    <div className="order-first md:order-2 relative z-20 w-full md:w-80 -mt-8 md:mt-0 shadow-2xl shadow-cyber-red/20 mb-8 md:mb-0">
                                        <div className="bg-cyber-black border-2 border-cyber-red p-8 pb-16 relative overflow-hidden clip-path-polygon-header">
                                            {/* Glowing Effect */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyber-red/20 blur-[60px] rounded-full"></div>
                                            <div className="absolute top-0 left-0 w-full h-1 bg-cyber-red shadow-[0_0_10px_#ff3b3b]"></div>

                                            <Trophy className="w-12 h-12 text-cyber-red mx-auto mb-4 drop-shadow-[0_0_8px_rgba(255,59,59,0.8)]" />
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-cyber-red uppercase tracking-[0.4em] mb-2 font-oswald">
                                                    {sortedSquads[0].squadPlacement === 1 ? 'Champion' : 'Top Scorer'}
                                                </div>
                                                <h3 className="text-3xl md:text-4xl font-black text-white mb-6 uppercase italic font-oswald tracking-wide leading-none">
                                                    {sortedSquads[0].squadName}
                                                </h3>
                                                <div className="inline-flex items-center gap-6 bg-cyber-charcoal/80 border border-cyber-red/30 px-6 py-3 backdrop-blur-md">
                                                    <div className="text-center border-r border-white/10 pr-6">
                                                        <div className="text-3xl font-black text-white font-oswald leading-none">{sortedSquads[0].squadPoints || 0}</div>
                                                        <div className="text-[9px] text-cyber-muted uppercase tracking-widest mt-1">Total Pts</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-3xl font-black text-cyber-red font-oswald leading-none">{sortedSquads[0].totalKills || 0}</div>
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
                                {sortedSquads[2] && (
                                    <div className="order-2 relative z-10 w-full md:w-64">
                                        <div className="bg-cyber-card border-t-2 border-r-2 border-cyber-pink p-6 pb-12 overflow-hidden relative group">
                                            <div className="absolute top-0 left-0 w-8 h-8 bg-cyber-pink/20 skew-x-12 transform -translate-x-4 -translate-y-4"></div>
                                            <div className="text-4xl font-black text-cyber-pink/50 absolute top-2 right-2 font-oswald select-none">#3</div>

                                            <div className="text-xs font-bold text-cyber-pink uppercase tracking-widest mb-1 font-oswald">
                                                Third Place
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-4 font-inter truncate">{sortedSquads[2].squadName}</h3>
                                            <div className="flex justify-between items-end border-t border-cyber-border/50 pt-4">
                                                <div>
                                                    <div className="text-[10px] text-cyber-muted uppercase">Points</div>
                                                    <div className="text-2xl font-bold font-mono text-white">{sortedSquads[2].squadPoints || 0}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-cyber-muted uppercase">Kills</div>
                                                    <div className="text-lg font-bold font-mono text-cyber-pink">{sortedSquads[2].totalKills || 0}</div>
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
                    )
                }

                {/* Leaderboard List */}
                <div className="space-y-4">
                    {sortedSquads.map((squad, index) => {
                        // Only show winner if match is completed AND they are rank 1
                        const isWinner = squad.isCompleted && squad.squadPlacement === 1;
                        return (
                            <div
                                key={squad._id}
                                className={`group relative bg-cyber-card border border-cyber-border transition-all duration-300 hover:scale-[1.01] 
                                ${isWinner ? 'border-2 border-cyber-yellow shadow-[0_0_30px_rgba(255,211,0,0.15)] bg-gradient-to-r from-cyber-yellow/5 to-transparent' : ''}
                                ${squad.isDisqualified ? 'bg-cyber-red/5 border-cyber-red/40' :
                                        (squad.isActiveMatch && squad.players?.every(p => p.isEliminated)) ? 'bg-cyber-charcoal/50 border-cyber-border' : ''}`}
                            >
                                {/* Status Indicator color strip */}
                                <div className={`absolute top-0 bottom-0 left-0 w-1 ${isWinner ? 'bg-cyber-yellow' :
                                    index === 1 ? 'bg-cyber-purple' :
                                        index === 2 ? 'bg-cyber-pink' :
                                            'bg-cyber-border'
                                    }`}></div>

                                <div className="p-3 md:py-4 md:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-0">
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Rank */}
                                        <div className={`text-2xl font-black font-oswald italic leading-none min-w-[50px] ${index === 0 ? 'text-cyber-yellow' :
                                            index === 1 ? 'text-gray-300' :
                                                index === 2 ? 'text-amber-600' :
                                                    'text-cyber-muted/50'
                                            }`}>
                                            {String(squad.squadPlacement || index + 1).padStart(2, '0')}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className={`text-xl font-black uppercase font-oswald tracking-wide transition-colors ${squad.isDisqualified || (squad.isActiveMatch && squad.players?.every(p => p.isEliminated)) ? 'text-gray-500' : 'text-white'
                                                    }`}>
                                                    {squad.squadName}
                                                </h3>
                                                {isWinner && (
                                                    <span className="bg-cyber-yellow text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm animate-bounce flex items-center gap-1 shadow-[0_0_10px_rgba(255,211,0,0.3)]">
                                                        <Trophy className="w-2.5 h-2.5" /> WINNER
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 text-[10px] font-bold text-cyber-muted uppercase tracking-wider font-oswald opacity-70">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {squad.players?.length || 0} OPS
                                                </span>
                                                {squad.room && squad.room !== 'Unassigned' && (
                                                    <span className="px-1.5 py-0.5 bg-cyber-charcoal/50 border border-cyber-border/20 rounded-sm text-cyber-blue font-mono font-normal">
                                                        {squad.room}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 self-end md:self-auto border-t border-cyber-border/10 pt-3 md:border-0 md:pt-0 w-full md:w-auto">
                                        <div className="text-center md:text-right flex-1 md:flex-none">
                                            {squad.isDisqualified ? (
                                                <div className="text-[10px] font-bold text-cyber-red uppercase font-oswald tracking-widest flex items-center justify-center md:justify-end gap-1 px-2 py-0.5 bg-cyber-red/5 border border-cyber-red/20 opacity-70">
                                                    DQ
                                                </div>
                                            ) : (squad.isCompleted && squad.squadPlacement !== 1) || (squad.players?.every(p => p.isEliminated) && squad.players?.length > 0) ? (
                                                <div className="text-[10px] font-bold text-cyber-red/50 uppercase font-oswald tracking-widest flex items-center justify-center md:justify-end gap-1 px-2 py-0.5 bg-black/20 border border-cyber-red/10">
                                                    ELIMINATED
                                                </div>
                                            ) : (squad.isCompleted && isWinner) ? (
                                                <div className="text-[10px] font-bold text-cyber-yellow uppercase font-oswald tracking-widest flex items-center justify-center md:justify-end gap-1 px-2 py-0.5 bg-cyber-yellow/10 border border-cyber-yellow/20">
                                                    WINNER
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-bold text-success-500 uppercase font-oswald tracking-widest flex items-center justify-center md:justify-end gap-1.5 px-2 py-0.5 bg-success-500/5 border border-success-500/10">
                                                    <div className="w-1 h-1 bg-success-500 rounded-full animate-pulse"></div>
                                                    {squad.isActiveMatch ? 'BATTLE' : 'STANDBY'}
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-right min-w-[80px] flex flex-col items-center md:items-end">
                                            <div className="text-2xl font-black text-cyber-blue font-oswald leading-none">{squad.squadPoints || 0}</div>
                                            <div className="text-[9px] font-bold text-cyber-blue/80 uppercase tracking-widest font-oswald mt-0.5">Points</div>
                                        </div>

                                        <div className="text-right min-w-[80px] flex flex-col items-center md:items-end">
                                            <div className="text-2xl font-black text-white font-oswald leading-none">{squad.totalKills || 0}</div>
                                            <div className="text-[9px] font-bold text-cyber-red/80 uppercase tracking-widest font-oswald mt-0.5">Total Kills</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Compact Player Mini Grid */}
                                <div className="bg-black/20 p-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1 border-t border-cyber-border/10">
                                    {squad.players?.map((player, pIndex) => (
                                        <div key={pIndex} className="bg-cyber-charcoal/20 border border-cyber-border/10 p-2 flex justify-between items-center group/player hover:border-cyber-muted/30 transition-colors rounded-sm">
                                            <div className={`overflow-hidden ${player.isEliminated ? 'opacity-40' : ''}`}>
                                                <div className={`text-[9px] font-bold text-white/80 font-oswald uppercase truncate leading-tight ${player.isEliminated ? 'line-through decoration-cyber-red/40 text-white/30' : ''} flex items-center gap-1`}>
                                                    {player.playerName}
                                                    {player.isEliminated && <Skull className="w-2 h-2 text-cyber-red" />}
                                                </div>
                                                <div className="text-[8px] text-cyber-muted font-mono truncate leading-none mt-0.5 opacity-60">
                                                    {player.ffId}
                                                </div>
                                            </div>
                                            <div className="text-lg font-black text-cyber-muted/60 group-hover/player:text-white transition-colors font-oswald italic leading-none ml-1">
                                                {player.total || 0}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {sortedSquads.length === 0 && (
                    <div className="card-cyber p-12 text-center border-dashed border-2 border-cyber-border">
                        <Users className="w-16 h-16 text-cyber-muted mx-auto mb-4 opacity-20" />
                        <h3 className="text-2xl font-oswald font-bold text-cyber-muted uppercase tracking-widest">No Active Squads</h3>
                        <p className="text-cyber-muted/50 mt-2 font-mono text-sm uppercase tracking-tighter">Waiting for combatants to register...</p>
                    </div>
                )}
            </div>
        </div >
    );
};

export default SquadScoreboard;

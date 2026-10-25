import { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import Navbar from '../components/layout/Navbar';
import { Trophy, Users, Crosshair, RefreshCw, BarChart2, Skull, Clock, Target, Medal, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socketService';
import MatchSelector from '../components/common/MatchSelector';
import ScoreboardSkeleton from '../components/common/ScoreboardSkeleton';

const SquadScoreboard = ({ isAudience = false }) => {
    const { tournament, squads, loading, error, selectedMatch, maxMatch, switchMatch } = useTournament();
    const [currentRoom, setCurrentRoom] = useState('all');
    const [rooms, setRooms] = useState([]);
    const [sortedSquads, setSortedSquads] = useState([]);
    const [expandedSquad, setExpandedSquad] = useState(null);

    const [timer, setTimer] = useState({ status: 'IDLE', duration: 0, remaining: 0, endsAt: null });
    const [displayTime, setDisplayTime] = useState('00:00');

    // Timer fetch & socket
    useEffect(() => {
        const fetchTimer = async () => {
            try {
                const res = await api.get('/api/gamestate');
                if (res.data.success && res.data.gameState?.timer) setTimer(res.data.gameState.timer);
            } catch (e) { console.error(e); }
        };
        fetchTimer();
        const handleTimerUpdate = (data) => setTimer(data);
        socketService.on('timerUpdate', handleTimerUpdate);
        return () => socketService.off('timerUpdate', handleTimerUpdate);
    }, []);

    useEffect(() => {
        const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
        if (timer.status === 'RUNNING' && timer.endsAt) {
            const interval = setInterval(() => {
                const diff = Math.max(0, Math.ceil((new Date(timer.endsAt).getTime() - Date.now()) / 1000));
                setDisplayTime(fmt(diff));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setDisplayTime(fmt(timer.remaining || 0));
        }
    }, [timer]);

    // Audience: redirect from all rooms to first real room
    useEffect(() => {
        if (isAudience && currentRoom === 'all' && rooms.length > 1) {
            const firstRealRoom = rooms.find(r => r !== 'all');
            if (firstRealRoom) setCurrentRoom(firstRealRoom);
        }
    }, [isAudience, rooms, currentRoom]);

    // Audience: redirect from Overall to latest match
    useEffect(() => {
        if (isAudience && selectedMatch === null && maxMatch) switchMatch(maxMatch);
    }, [isAudience, selectedMatch, maxMatch, switchMatch]);

    // Extract unique rooms
    useEffect(() => {
        const uniqueRooms = new Set(['all']);
        if (Array.isArray(squads)) {
            squads.forEach(s => { if (s.room && s.room !== 'Unassigned') uniqueRooms.add(s.room); });
        }
        setRooms(Array.from(uniqueRooms));
    }, [squads]);

    // Filter & sort squads
    useEffect(() => {
        if (!Array.isArray(squads)) { setSortedSquads([]); return; }
        let filtered = currentRoom === 'all' ? squads : squads.filter(s => s.room === currentRoom);
        const rankingSort = tournament?.settings?.rankingSort || 'POINTS';

        filtered = [...filtered].sort((a, b) => {
            // DQ always at bottom
            if (a.isDisqualified && !b.isDisqualified) return 1;
            if (!a.isDisqualified && b.isDisqualified) return -1;

            if (rankingSort === 'KILLS') {
                // Primary: kills desc — tiebreaker: points desc — final: name asc
                if ((b.totalKills || 0) !== (a.totalKills || 0))
                    return (b.totalKills || 0) - (a.totalKills || 0);
                if ((b.squadPoints || 0) !== (a.squadPoints || 0))
                    return (b.squadPoints || 0) - (a.squadPoints || 0);
                return (a.squadName || '').localeCompare(b.squadName || '');
            } else {
                // POINTS default — tiebreaker: kills desc — final: name asc
                if ((b.squadPoints || 0) !== (a.squadPoints || 0))
                    return (b.squadPoints || 0) - (a.squadPoints || 0);
                if ((b.totalKills || 0) !== (a.totalKills || 0))
                    return (b.totalKills || 0) - (a.totalKills || 0);
                return (a.squadName || '').localeCompare(b.squadName || '');
            }
        });
        setSortedSquads(filtered);
    }, [squads, currentRoom, tournament]);

    if (loading) return <ScoreboardSkeleton type="squad" />;

    if (error) return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-10 max-w-md w-full text-center">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-400 text-xl">⚠</span>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Connection Failed</h2>
                <p className="text-[#888] text-sm mb-6">{error}</p>
                <button onClick={() => window.location.reload()} className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-lg transition-colors">
                    Retry
                </button>
            </div>
        </div>
    );

    const totalPlayers = squads.reduce((s, sq) => s + (sq.players?.length || 0), 0);
    const totalKills = squads.reduce((s, sq) => s + (sq.totalKills || 0), 0);
    const top1 = sortedSquads[0];
    const top2 = sortedSquads[1];
    const top3 = sortedSquads[2];
    const showPodium = sortedSquads.length >= 1 &&
        (selectedMatch ? squads.some(s => s.isCompleted && String(s.squadPlacement) === '1') : true) &&
        (top1?.squadPoints > 0 || top1?.totalKills > 0);

    const rankColor = (i) => i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-[#999]';

    return (
        <div className="min-h-screen bg-[#0D0D0D] text-white font-inter">
            {!isAudience && <Navbar />}

            <div className={`w-full px-3 md:px-6 ${isAudience ? 'pt-4 pb-8' : 'py-4'}`}>

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        {isAudience && (
                            <div className="flex items-center gap-2 mb-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                                </span>
                                <span className="text-red-400 text-[11px] font-semibold uppercase tracking-widest">Live</span>
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {tournament?.name || 'Tournament'}
                            <span className="text-[#999] font-normal ml-2 text-lg">— Squad Leaderboard</span>
                        </h1>
                        <p className="text-[#aaa] text-sm mt-1">
                            {selectedMatch ? `Match ${selectedMatch} Results` : isAudience ? 'Latest Standings' : 'Overall Performance'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {timer.status !== 'IDLE' && (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-mono font-semibold ${timer.status === 'RUNNING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-[#1A1A1A] border-[#2A2A2A] text-white'}`}>
                                <Clock className="w-3.5 h-3.5" />
                                {displayTime}
                            </div>
                        )}
                        <button onClick={() => window.location.reload()} className="p-2 rounded-lg border border-[#333] bg-[#181818] hover:bg-[#222] text-[#aaa] hover:text-white transition-colors" title="Refresh">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <MatchSelector isAudience={isAudience} />
                    </div>
                </div>

                {/* ── Stat Strip ── */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    {[
                        { label: 'Squads', value: squads.length, icon: Users, color: 'text-violet-400' },
                        { label: 'Total Kills', value: totalKills, icon: Crosshair, color: 'text-red-400' },
                        { label: 'Players', value: totalPlayers, icon: Target, color: 'text-blue-400' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-[#151515] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-[#222] ${color}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[11px] text-[#aaa] uppercase tracking-wider font-medium">{label}</div>
                                <div className="text-xl font-bold text-white font-mono">{value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Room Filter ── */}
                {rooms.length > 2 && (
                    <div className="flex gap-1.5 flex-wrap mb-6">
                        {rooms.filter(r => !isAudience || r !== 'all').map(room => (
                            <button
                                key={room}
                                onClick={() => setCurrentRoom(room)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${currentRoom === room
                                    ? 'bg-red-500/15 border border-red-500/40 text-red-400'
                                    : 'bg-[#181818] border border-[#333] text-[#aaa] hover:text-white hover:border-[#555]'}`}
                            >
                                {room === 'all' ? 'All Rooms' : room}
                                <span className="ml-1.5 opacity-50 font-mono text-[10px]">
                                    {room === 'all' ? squads.length : squads.filter(s => s.room === room).length}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Podium ── */}
                {showPodium && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-semibold text-[#ccc] uppercase tracking-wider">Top Squads</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* 1st Place — center on desktop */}
                            {top1 && (
                                <div className="md:col-start-2 md:row-start-1 bg-[#151515] border border-amber-400/40 rounded-xl p-5 relative overflow-clip">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent pointer-events-none rounded-xl" />
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded-full">
                                            {top1.squadPlacement === 1 ? '🏆 Champion' : '🥇 #1'}
                                        </span>
                                        <Trophy className="w-5 h-5 text-amber-400/50" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white truncate mb-1">{top1.squadName}</h3>
                                    <p className="text-[11px] text-[#aaa] mb-3">{top1.players?.length || 0} members</p>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-2xl font-bold text-white font-mono">{top1.squadPoints || 0}</div>
                                            <div className="text-[10px] text-[#aaa] uppercase tracking-wider">Points</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-red-400 font-mono">{top1.totalKills || 0}</div>
                                            <div className="text-[10px] text-[#aaa] uppercase tracking-wider">Kills</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* 2nd Place */}
                            {top2 && (
                                <div className="md:col-start-1 md:row-start-1 bg-[#151515] border border-[#333] rounded-xl p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-400/10 px-2 py-0.5 rounded-full">🥈 #2</span>
                                        <Medal className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <h3 className="text-base font-semibold text-white truncate mb-1">{top2.squadName}</h3>
                                    <p className="text-[11px] text-[#555] mb-3">{top2.players?.length || 0} members</p>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-xl font-bold text-white font-mono">{top2.squadPoints || 0}</div>
                                            <div className="text-[10px] text-[#666] uppercase tracking-wider">Points</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-base font-bold text-red-400 font-mono">{top2.totalKills || 0}</div>
                                            <div className="text-[10px] text-[#666] uppercase tracking-wider">Kills</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* 3rd Place */}
                            {top3 && (
                                <div className="md:col-start-3 md:row-start-1 bg-[#151515] border border-[#333] rounded-xl p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-700/10 px-2 py-0.5 rounded-full">🥉 #3</span>
                                        <Medal className="w-4 h-4 text-amber-700/50" />
                                    </div>
                                    <h3 className="text-base font-semibold text-white truncate mb-1">{top3.squadName}</h3>
                                    <p className="text-[11px] text-[#555] mb-3">{top3.players?.length || 0} members</p>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-xl font-bold text-white font-mono">{top3.squadPoints || 0}</div>
                                            <div className="text-[10px] text-[#666] uppercase tracking-wider">Points</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-base font-bold text-red-400 font-mono">{top3.totalKills || 0}</div>
                                            <div className="text-[10px] text-[#666] uppercase tracking-wider">Kills</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Squad List ── */}
                <div>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[11px] font-semibold text-[#aaa] uppercase tracking-widest border-b border-[#2A2A2A] mb-1">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-4">Squad</div>
                        <div className="col-span-2 text-center hidden md:block">Status</div>
                        <div className="col-span-1 text-center hidden md:block">Room</div>
                        <div className="col-span-2 text-right">Points</div>
                        <div className="col-span-2 text-right">Kills</div>
                    </div>

                    <div className="space-y-1">
                        {sortedSquads.map((squad, index) => {
                            const isWinner = squad.isCompleted && squad.squadPlacement === 1;
                            const allElim = squad.players?.every(p => p.isEliminated) && squad.players?.length > 0;
                            const isExpanded = expandedSquad === squad._id;

                            return (
                                <div key={squad._id}>
                                    {/* Squad Row */}
                                    <div
                                        onClick={() => setExpandedSquad(isExpanded ? null : squad._id)}
                                        className={`grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-xl border cursor-pointer transition-all hover:bg-[#141414] ${isWinner
                                            ? 'bg-amber-400/5 border-amber-400/20'
                                            : index < 3
                                                ? index === 0 ? 'bg-amber-400/5 border-amber-400/15' : index === 1 ? 'bg-slate-400/5 border-slate-400/10' : 'bg-amber-700/5 border-amber-700/10'
                                                : 'border-transparent'
                                            } ${squad.isDisqualified ? 'opacity-40' : ''}`}
                                    >
                                        {/* Rank */}
                                        <div className={`col-span-1 text-center text-sm font-bold font-mono ${rankColor(index)}`}>
                                            {index === 0 ? '①' : index === 1 ? '②' : index === 2 ? '③' : String(index + 1).padStart(2, '0')}
                                        </div>

                                        {/* Squad Info */}
                                        <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${index === 0 ? 'bg-amber-400/20 text-amber-400' : 'bg-[#222] text-[#999]'}`}>
                                                {squad.squadName?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                                                    {squad.squadName}
                                                    {isWinner && <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full uppercase">Winner</span>}
                                                </div>
                                                <div className="text-[11px] text-[#888]">{squad.players?.length || 0} players</div>
                                            </div>
                                            {/* Expand toggle */}
                                            {isExpanded
                                                ? <ChevronUp className="w-3.5 h-3.5 text-[#999] flex-shrink-0" />
                                                : <ChevronDown className="w-3.5 h-3.5 text-[#888] flex-shrink-0" />
                                            }
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2 text-center hidden md:block">
                                            {squad.isDisqualified ? (
                                                <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full uppercase">DQ</span>
                                            ) : allElim ? (
                                                <span className="text-[10px] font-semibold text-red-400/60 bg-red-500/5 px-2 py-0.5 rounded-full uppercase">Eliminated</span>
                                            ) : isWinner ? (
                                                <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full uppercase">Winner</span>
                                            ) : (
                                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase flex items-center justify-center gap-1">
                                                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                                                    {squad.isActiveMatch ? 'Battle' : 'Standby'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Room */}
                                        <div className="col-span-1 text-center hidden md:block">
                                            {squad.room && squad.room !== 'Unassigned' ? (
                                                <span className="text-[10px] font-mono text-[#aaa] bg-[#222] px-2 py-0.5 rounded">{squad.room}</span>
                                            ) : <span className="text-[#666] text-xs">—</span>}
                                        </div>

                                        {/* Points */}
                                        <div className="col-span-2 text-right">
                                            <span className="text-sm font-bold font-mono text-white">{squad.squadPoints || 0}</span>
                                        </div>

                                        {/* Kills */}
                                        <div className="col-span-2 text-right">
                                            <span className={`text-sm font-bold font-mono ${(squad.totalKills || 0) > 0 ? 'text-red-400' : 'text-[#777]'}`}>{squad.totalKills || 0}</span>
                                        </div>
                                    </div>

                                    {/* Expanded Player Grid */}
                                    {isExpanded && squad.players?.length > 0 && (
                                        <div className="ml-8 mr-4 mt-1 mb-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                                            {squad.players.map((player, pIndex) => (
                                                <div key={pIndex} className={`bg-[#181818] border border-[#2A2A2A] rounded-lg px-3 py-2 flex items-center justify-between ${player.isEliminated ? 'opacity-40' : ''}`}>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-medium text-white truncate flex items-center gap-1">
                                                            {player.playerName}
                                                            {player.isEliminated && <Skull className="w-2.5 h-2.5 text-[#888] flex-shrink-0" />}
                                                        </div>
                                                        <div className="text-[10px] text-[#888] font-mono truncate">{player.ffId}</div>
                                                    </div>
                                                    <div className="text-sm font-bold text-[#ccc] font-mono ml-2 flex-shrink-0">{player.total || 0}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {sortedSquads.length === 0 && (
                            <div className="text-center py-20 text-[#888]">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-medium">No Squads Yet</p>
                                <p className="text-xs mt-1 text-[#777]">Waiting for teams to register...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SquadScoreboard;

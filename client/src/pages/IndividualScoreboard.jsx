import { useState, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import Navbar from '../components/layout/Navbar';
import { Trophy, User, Users, Crosshair, RefreshCw, BarChart2, Skull, Clock, Target, Medal } from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socketService';
import MatchSelector from '../components/common/MatchSelector';
import ScoreboardSkeleton from '../components/common/ScoreboardSkeleton';

const IndividualScoreboard = ({ isAudience = false }) => {
    const { tournament, players, loading, error, selectedMatch, maxMatch, switchMatch } = useTournament();
    const [currentRoom, setCurrentRoom] = useState('all');
    const [rooms, setRooms] = useState([]);
    const [sortedPlayers, setSortedPlayers] = useState([]);

    const [timer, setTimer] = useState({ status: 'IDLE', duration: 0, remaining: 0, endsAt: null });
    const [displayTime, setDisplayTime] = useState('00:00');

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
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        if (timer.status === 'RUNNING' && timer.endsAt) {
            const interval = setInterval(() => {
                const diff = Math.max(0, Math.ceil((new Date(timer.endsAt).getTime() - Date.now()) / 1000));
                setDisplayTime(formatTime(diff));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setDisplayTime(formatTime(timer.remaining || 0));
        }
    }, [timer]);

    useEffect(() => {
        if (isAudience && currentRoom === 'all' && rooms.length > 1) {
            const firstRealRoom = rooms.find(r => r !== 'all');
            if (firstRealRoom) setCurrentRoom(firstRealRoom);
        }
    }, [isAudience, rooms, currentRoom]);

    useEffect(() => {
        if (isAudience && selectedMatch === null && maxMatch) switchMatch(maxMatch);
    }, [isAudience, selectedMatch, maxMatch, switchMatch]);

    useEffect(() => {
        const uniqueRooms = new Set(['all']);
        if (Array.isArray(players)) {
            players.forEach(p => { if (p.room && p.room !== 'Unassigned') uniqueRooms.add(p.room); });
        }
        setRooms(Array.from(uniqueRooms));
    }, [players]);

    useEffect(() => {
        if (!Array.isArray(players)) { setSortedPlayers([]); return; }
        let filtered = currentRoom === 'all' ? players : players.filter(p => p.room === currentRoom);
        const rankingSort = tournament?.settings?.rankingSort || 'POINTS';
        const killPoints = tournament?.settings?.killPoints || 1;
        const placementPointsMap = tournament?.settings?.placementPoints || {};
        const calculatePoints = (player) => {
            if (player.totalPoints !== undefined) return player.totalPoints;
            const pPoints = placementPointsMap[player.matchPlacement || 999] || 0;
            return pPoints + (player.total || 0) * killPoints;
        };
        filtered = filtered.map(p => ({ ...p, calculatedPoints: calculatePoints(p) }));
        filtered.sort((a, b) => {
            if (rankingSort === 'KILLS') return (b.total || 0) - (a.total || 0);
            if (a.calculatedPoints !== b.calculatedPoints) return b.calculatedPoints - a.calculatedPoints;
            return (b.total || 0) - (a.total || 0);
        });
        setSortedPlayers(filtered);
    }, [players, currentRoom, tournament]);

    if (loading) return <ScoreboardSkeleton type="individual" />;

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

    const totalKills = players.reduce((s, p) => s + (p.total || 0), 0);
    const top1 = sortedPlayers[0];
    const top2 = sortedPlayers[1];
    const top3 = sortedPlayers[2];
    const showPodium = sortedPlayers.length >= 1 && (selectedMatch ? players.some(p => String(p.matchPlacement) === '1') : true);

    const rankColor = (i) => i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-[#999]';
    const rankBg = (i) => i === 0 ? 'bg-amber-400/10 border-amber-400/30' : i === 1 ? 'bg-slate-400/10 border-slate-400/20' : i === 2 ? 'bg-amber-700/10 border-amber-700/30' : 'bg-transparent border-transparent';

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
                            <span className="text-[#999] font-normal ml-2 text-lg">— Solo Leaderboard</span>
                        </h1>
                        <p className="text-[#aaa] text-sm mt-1">
                            {selectedMatch ? `Match ${selectedMatch} Results` : isAudience ? 'Latest Standings' : 'Overall Performance'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Timer */}
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
                        { label: 'Players', value: players.length, icon: User, color: 'text-blue-400' },
                        { label: 'Total Kills', value: totalKills, icon: Crosshair, color: 'text-red-400' },
                        { label: 'Rooms', value: rooms.length - 1, icon: Target, color: 'text-emerald-400' },
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
                                    {room === 'all' ? players.length : players.filter(p => p.room === room).length}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Podium ── */}
                {showPodium && sortedPlayers.length >= 1 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-semibold text-[#ccc] uppercase tracking-wider">Top Performers</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* 1st */}
                            {top1 && (
                                <div className="md:col-start-2 md:row-start-1 bg-[#151515] border border-amber-400/40 rounded-xl p-5 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent pointer-events-none rounded-xl" />
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded-full">
                                            {top1.matchPlacement === 1 ? '🏆 Champion' : '🥇 #1 Place'}
                                        </span>
                                        <Trophy className="w-5 h-5 text-amber-400/50" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white truncate mb-3">{top1.playerName}</h3>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-2xl font-bold text-white font-mono">{top1.calculatedPoints || 0}</div>
                                            <div className="text-[10px] text-[#aaa] uppercase tracking-wider">Points</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-red-400 font-mono">{top1.total || 0}</div>
                                            <div className="text-[10px] text-[#aaa] uppercase tracking-wider">Kills</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* 2nd */}
                            {top2 && (
                                <div className="md:col-start-1 md:row-start-1 bg-[#151515] border border-[#333] rounded-xl p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-400/10 px-2 py-0.5 rounded-full">🥈 #2 Place</span>
                                        <Medal className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <h3 className="text-base font-semibold text-white truncate mb-3">{top2.playerName}</h3>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-xl font-bold text-white font-mono">{top2.calculatedPoints || 0}</div>
                                            <div className="text-[10px] text-[#666] uppercase tracking-wider">Points</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-base font-bold text-red-400 font-mono">{top2.total || 0}</div>
                                            <div className="text-[10px] text-[#666] uppercase tracking-wider">Kills</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* 3rd */}
                            {top3 && (
                                <div className="md:col-start-3 md:row-start-1 bg-[#151515] border border-[#333] rounded-xl p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-700/10 px-2 py-0.5 rounded-full">🥉 #3 Place</span>
                                        <Medal className="w-4 h-4 text-amber-700/50" />
                                    </div>
                                    <h3 className="text-base font-semibold text-white truncate mb-3">{top3.playerName}</h3>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-xl font-bold text-white font-mono">{top3.calculatedPoints || 0}</div>
                                            <div className="text-[10px] text-[#666] uppercase tracking-wider">Points</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-base font-bold text-red-400 font-mono">{top3.total || 0}</div>
                                            <div className="text-[10px] text-[#666] uppercase tracking-wider">Kills</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Player List ── */}
                <div>
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[11px] font-semibold text-[#aaa] uppercase tracking-widest border-b border-[#2A2A2A] mb-1">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-5">Player</div>
                        <div className="col-span-2 text-center hidden md:block">Room</div>
                        <div className="col-span-2 text-right">Points</div>
                        <div className="col-span-2 text-right">Kills</div>
                    </div>

                    <div className="space-y-1">
                        {sortedPlayers.map((player, index) => {
                            const isChamp = player.matchPlacement === 1;
                            return (
                                <div
                                    key={player._id}
                                    className={`grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-xl border transition-all hover:bg-[#141414] ${isChamp
                                        ? 'bg-amber-400/5 border-amber-400/20'
                                        : index < 3
                                            ? `${rankBg(index)} border`
                                            : 'border-transparent'
                                        } ${player.isDisqualified ? 'opacity-40' : ''}`}
                                >
                                    {/* Rank */}
                                    <div className={`col-span-1 text-center text-sm font-bold font-mono ${rankColor(index)}`}>
                                        {index === 0 ? '①' : index === 1 ? '②' : index === 2 ? '③' : String(index + 1).padStart(2, '0')}
                                    </div>

                                    {/* Player Info */}
                                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${index === 0 ? 'bg-amber-400/20 text-amber-400' : 'bg-[#222] text-[#999]'}`}>
                                            {player.playerName?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`text-sm font-semibold truncate ${player.isEliminated || player.isDisqualified ? 'text-[#777]' : 'text-white'}`}>
                                                {player.playerName}
                                                {isChamp && <span className="ml-2 text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full uppercase">Winner</span>}
                                                {player.isEliminated && !player.isDisqualified && <Skull className="inline ml-1.5 w-3 h-3 text-[#888]" />}
                                            </div>
                                            <div className="text-[11px] text-[#888] font-mono truncate">{player.ffId}</div>
                                        </div>
                                    </div>

                                    {/* Room */}
                                    <div className="col-span-2 text-center hidden md:block">
                                        {player.room && player.room !== 'Unassigned' ? (
                                            <span className="text-[10px] font-mono text-[#aaa] bg-[#222] px-2 py-0.5 rounded">{player.room}</span>
                                        ) : <span className="text-[#666] text-xs">—</span>}
                                    </div>

                                    {/* Points */}
                                    <div className="col-span-2 text-right">
                                        <span className="text-sm font-bold font-mono text-white">{player.calculatedPoints || 0}</span>
                                    </div>

                                    {/* Kills */}
                                    <div className="col-span-2 text-right">
                                        <span className={`text-sm font-bold font-mono ${(player.total || 0) > 0 ? 'text-red-400' : 'text-[#777]'}`}>{player.total || 0}</span>
                                    </div>
                                </div>
                            );
                        })}

                        {sortedPlayers.length === 0 && (
                            <div className="text-center py-20 text-[#888]">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-medium">No Players Yet</p>
                                <p className="text-xs mt-1 text-[#777]">Waiting for participants to register...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndividualScoreboard;

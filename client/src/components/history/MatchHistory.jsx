import React, { useState, useEffect, useMemo } from 'react';
import { getTournamentMatches } from '../../services/historyService';
import Card from '../common/Card';
import Modal from '../common/Modal';
import {
    Trophy,
    Users,
    Target,
    Clock,
    Award,
    ChevronDown,
    ChevronUp,
    Shield,
    AlertTriangle,
    Copy,
    Check,
    Search,
    Calendar,
    Swords,
    Crown,
    ExternalLink,
    Filter,
    Flame,
    ArrowUpDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const MatchHistory = ({ tournamentId, tournament }) => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMatch, setSelectedMatch] = useState(null);

    // Organizer ranking preference: 'POINTS' | 'KILLS'
    const organizerRankingSort = tournament?.settings?.rankingSort || 'POINTS';
    const [rankingMetric, setRankingMetric] = useState(organizerRankingSort);

    // Sync with tournament prop if updated
    useEffect(() => {
        if (tournament?.settings?.rankingSort) {
            setRankingMetric(tournament.settings.rankingSort);
        }
    }, [tournament?.settings?.rankingSort]);

    // Modal internal states
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSquads, setExpandedSquads] = useState({});
    const [allExpanded, setAllExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState('standings'); // 'standings' | 'events'
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadMatches();
    }, [tournamentId]);

    const loadMatches = async () => {
        try {
            setLoading(true);
            const data = await getTournamentMatches(tournamentId);
            setMatches(data.matches || []);
        } catch (err) {
            console.error('Failed to load match history:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds, startedAt, completedAt) => {
        let sec = seconds;
        if (!sec && startedAt && completedAt) {
            sec = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000);
        }
        if (!sec || isNaN(sec) || sec <= 0) return 'N/A';
        const mins = Math.floor(sec / 60);
        const remainingSecs = Math.floor(sec % 60);
        return `${mins}m ${remainingSecs}s`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    /**
     * Sorts participants by the organizer's ranking metric (POINTS or KILLS)
     */
    const sortParticipantsByMetric = (participants, metric = rankingMetric) => {
        if (!participants || participants.length === 0) return [];

        return [...participants].sort((a, b) => {
            // 1. Disqualified participants placed at the bottom
            if (a.isDisqualified && !b.isDisqualified) return 1;
            if (!a.isDisqualified && b.isDisqualified) return -1;

            if (metric === 'KILLS') {
                // Primary: Total Kills (descending)
                const killsA = a.totalKills ?? a.players?.reduce((s, p) => s + (p.kills || 0), 0) ?? 0;
                const killsB = b.totalKills ?? b.players?.reduce((s, p) => s + (p.kills || 0), 0) ?? 0;
                if (killsB !== killsA) return killsB - killsA;

                // Tiebreaker 1: Total Points (descending)
                const ptsA = a.totalPoints || 0;
                const ptsB = b.totalPoints || 0;
                if (ptsB !== ptsA) return ptsB - ptsA;

                // Tiebreaker 2: Survival Rank (in-game finish ascending)
                const survA = a.finalRank || 999;
                const survB = b.finalRank || 999;
                if (survA !== survB) return survA - survB;

                return (a.squadName || '').localeCompare(b.squadName || '');
            } else {
                // Primary: Total Points (descending)
                const ptsA = a.totalPoints || 0;
                const ptsB = b.totalPoints || 0;
                if (ptsB !== ptsA) return ptsB - ptsA;

                // Tiebreaker 1: Total Kills (descending)
                const killsA = a.totalKills ?? a.players?.reduce((s, p) => s + (p.kills || 0), 0) ?? 0;
                const killsB = b.totalKills ?? b.players?.reduce((s, p) => s + (p.kills || 0), 0) ?? 0;
                if (killsB !== killsA) return killsB - killsA;

                // Tiebreaker 2: Survival Rank (in-game finish ascending)
                const survA = a.finalRank || 999;
                const survB = b.finalRank || 999;
                if (survA !== survB) return survA - survB;

                return (a.squadName || '').localeCompare(b.squadName || '');
            }
        });
    };

    /**
     * Resolves the #1 ranked participant by points or kills
     */
    const getTopRankedParticipant = (match, metric = rankingMetric) => {
        if (!match || !match.participants || match.participants.length === 0) return null;

        const sorted = sortParticipantsByMetric(match.participants, metric);
        const top = sorted[0];
        if (!top) return null;

        const isSolo = match.mode === 'SOLO' || (top.players && top.players.length === 1);
        const topPlayer = top.players?.[0];

        const squadName = top.squadName || 'Unknown Team';
        const ffName = topPlayer?.ffName;
        const playerName = topPlayer?.playerName;
        const ffId = topPlayer?.ffId;
        const kills = top.totalKills ?? top.players?.reduce((s, p) => s + (p.kills || 0), 0) ?? 0;
        const points = top.totalPoints || 0;
        const isBooyah = top.finalRank === 1;

        let displayName = squadName;
        if (isSolo) {
            if (ffName && playerName && ffName !== playerName) {
                displayName = `${ffName} (${playerName})`;
            } else if (ffName) {
                displayName = ffName;
            } else if (playerName) {
                displayName = playerName;
            }
        }

        return {
            squadName,
            displayName,
            ffName,
            playerName,
            ffId,
            kills,
            points,
            isSolo,
            isBooyah,
            survivalRank: top.finalRank,
            participant: top
        };
    };

    const handleOpenDetails = (match) => {
        setSelectedMatch(match);
        setSearchQuery('');
        setExpandedSquads({});
        setAllExpanded(false);
        setActiveTab('standings');
    };

    const toggleSquadExpand = (squadKey) => {
        setExpandedSquads(prev => ({
            ...prev,
            [squadKey]: !prev[squadKey]
        }));
    };

    const toggleExpandAll = () => {
        const nextState = !allExpanded;
        setAllExpanded(nextState);
        if (selectedMatch?.participants) {
            const next = {};
            selectedMatch.participants.forEach((p, idx) => {
                const key = p.squadId || p.squadName || idx;
                next[key] = nextState;
            });
            setExpandedSquads(next);
        }
    };

    // Copy formatted standings to clipboard
    const handleCopyStandings = () => {
        if (!selectedMatch) return;
        const sorted = sortParticipantsByMetric(selectedMatch.participants, rankingMetric);
        const top = getTopRankedParticipant(selectedMatch, rankingMetric);

        let text = `🏆 MATCH ${selectedMatch.matchNumber} STANDINGS (RANKED BY ${rankingMetric})\n`;
        if (top) {
            text += `👑 #1 LEADER: ${top.displayName} [${top.points} pts, ${top.kills} kills]${top.isBooyah ? ' (Booyah)' : ''}\n`;
        }
        text += `Date: ${formatDate(selectedMatch.completedAt)} | Mode: ${selectedMatch.mode || 'SQUAD'}\n`;
        text += `------------------------------------\n`;

        sorted.forEach((p, idx) => {
            const rankStr = `#${idx + 1}`;
            const name = p.squadName || 'Unknown Team';
            const dqStr = p.isDisqualified ? ' [DISQUALIFIED]' : p.finalRank === 1 ? ' [Booyah]' : '';
            const pts = `${p.totalPoints || 0} pts`;
            const kills = `${p.totalKills || 0} kills`;
            text += `${rankStr} ${name}${dqStr} - ${pts} (${kills})\n`;

            if (p.players && p.players.length > 0) {
                p.players.forEach(pl => {
                    text += `   • ${pl.ffName || pl.playerName || 'Player'} (${pl.kills || 0} kills)\n`;
                });
            }
        });

        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Leaderboard copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    // Filtered and sorted participants in selected match (ranked by points/kills)
    const sortedParticipants = useMemo(() => {
        if (!selectedMatch?.participants) return [];
        return sortParticipantsByMetric(selectedMatch.participants, rankingMetric);
    }, [selectedMatch, rankingMetric]);

    const filteredParticipants = useMemo(() => {
        if (!searchQuery.trim()) return sortedParticipants;
        const q = searchQuery.toLowerCase();
        return sortedParticipants.filter(p => {
            const teamMatch = p.squadName?.toLowerCase().includes(q);
            const playerMatch = p.players?.some(pl =>
                pl.playerName?.toLowerCase().includes(q) ||
                pl.ffName?.toLowerCase().includes(q) ||
                String(pl.ffId || '').includes(q)
            );
            return teamMatch || playerMatch;
        });
    }, [sortedParticipants, searchQuery]);

    // Total kills in the match
    const totalMatchKills = useMemo(() => {
        if (!selectedMatch?.participants) return 0;
        return selectedMatch.participants.reduce((sum, p) => sum + (p.totalKills || 0), 0);
    }, [selectedMatch]);

    if (loading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center gap-3 text-cyber-muted py-8">
                    <Clock className="w-5 h-5 animate-spin text-cyber-neon" />
                    <span>Loading match history...</span>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6 border-red-500/30">
                <div className="text-center text-red-400">
                    Error loading matches: {error}
                </div>
            </Card>
        );
    }

    if (matches.length === 0) {
        return (
            <Card className="p-8 text-center">
                <Trophy className="w-12 h-12 text-cyber-muted/40 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-oswald mb-1">
                    No Match History Available Yet
                </h3>
                <p className="text-sm text-cyber-muted max-w-md mx-auto">
                    Completed matches and final standings for this tournament will appear here once finalized.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Title and Organizer Ranking Rule Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold font-oswald uppercase tracking-wider text-white flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-cyber-red" />
                    Match History ({matches.length})
                </h2>

                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyber-muted">
                        Ranked By:
                    </span>
                    <div className="inline-flex rounded-sm p-0.5 bg-black/60 border border-white/10">
                        <button
                            type="button"
                            onClick={() => setRankingMetric('POINTS')}
                            className={`px-3 py-1 text-xs font-oswald uppercase tracking-wider transition-all ${
                                rankingMetric === 'POINTS'
                                    ? 'bg-cyber-neon text-black font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Points
                        </button>
                        <button
                            type="button"
                            onClick={() => setRankingMetric('KILLS')}
                            className={`px-3 py-1 text-xs font-oswald uppercase tracking-wider transition-all ${
                                rankingMetric === 'KILLS'
                                    ? 'bg-cyber-neon text-black font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Kills
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-3">
                    {matches.map((match) => {
                        const sortedParticipants = sortParticipantsByMetric(match.participants, rankingMetric);
                        const topRanked = getTopRankedParticipant(match, rankingMetric);

                        return (
                            <Card key={match._id} className="p-4 hover:border-cyber-neon/40 transition-all border border-white/10 bg-[#0d0f12]">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-white/5">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="bg-cyber-red/20 border border-cyber-red/40 px-3 py-1 rounded">
                                            <span className="text-cyber-red font-bold font-oswald tracking-wider">
                                                MATCH {match.matchNumber}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-cyber-muted text-xs font-mono">
                                            <Clock className="w-3.5 h-3.5 text-cyber-neon" />
                                            {formatDate(match.completedAt)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-cyber-muted text-xs font-mono">
                                            <Target className="w-3.5 h-3.5 text-cyber-pink" />
                                            {formatDuration(match.duration, match.startedAt, match.completedAt)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 border border-white/10">
                                        {match.mode === 'SQUAD' ? (
                                            <Users className="w-4 h-4 text-cyber-pink" />
                                        ) : (
                                            <Target className="w-4 h-4 text-cyber-neon" />
                                        )}
                                        <span className="text-gray-300 text-xs font-oswald uppercase tracking-wider">
                                            {match.mode || 'SQUAD'}
                                        </span>
                                    </div>
                                </div>

                                {/* #1 RANKED LEADER BANNER (BY POINTS / KILLS) */}
                                {topRanked && (
                                    <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-[#0e1015] border border-cyan-500/50 p-3 mb-3 flex items-center justify-between rounded-sm shadow-[0_0_15px_rgba(0,240,255,0.12)]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/60 rounded flex items-center justify-center shrink-0">
                                                <Trophy className="w-5 h-5 text-cyan-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 border border-cyan-500/40">
                                                        RANK #1 (BY {rankingMetric})
                                                    </span>
                                                    {topRanked.isBooyah && (
                                                        <span className="text-[10px] font-mono uppercase text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 border border-yellow-500/30">
                                                            Booyah
                                                        </span>
                                                    )}
                                                    {topRanked.isSolo && topRanked.ffId && (
                                                        <span className="text-[10px] font-mono text-gray-400">
                                                            UID: {topRanked.ffId}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-white font-oswald font-bold uppercase text-base tracking-wide mt-0.5">
                                                    {topRanked.displayName}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-cyan-400 font-bold font-mono text-base">
                                                {topRanked.points} pts
                                            </div>
                                            <div className="text-gray-400 font-mono text-xs">
                                                {topRanked.kills} kills
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Top 3 Standings Preview (Ranked by Points/Kills) */}
                                <div className="space-y-1.5">
                                    {sortedParticipants
                                        .slice(0, 3)
                                        .map((participant, pIndex) => {
                                            const rankNumber = pIndex + 1;
                                            const isSolo = match.mode === 'SOLO' || (participant.players && participant.players.length === 1);
                                            const pName = isSolo && participant.players?.[0]?.ffName
                                                ? participant.players[0].ffName
                                                : participant.squadName;

                                            return (
                                                <div
                                                    key={participant.squadId || participant.squadName}
                                                    className="flex items-center justify-between bg-black/40 p-2.5 border-l-2 text-sm"
                                                    style={{
                                                        borderLeftColor:
                                                            rankNumber === 1 ? '#00f0ff' :
                                                            rankNumber === 2 ? '#6366f1' :
                                                            '#f59e0b'
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`font-mono font-bold text-xs w-6 ${
                                                            rankNumber === 1 ? 'text-cyan-400' :
                                                            rankNumber === 2 ? 'text-indigo-300' :
                                                            'text-amber-400'
                                                        }`}>
                                                            #{rankNumber}
                                                        </span>
                                                        <span className="text-white font-oswald tracking-wide font-medium">
                                                            {pName}
                                                        </span>
                                                        {participant.finalRank === 1 && (
                                                            <span className="text-[9px] font-mono uppercase text-yellow-400 bg-yellow-500/10 px-1 py-0.2 border border-yellow-500/30">
                                                                Booyah
                                                            </span>
                                                        )}
                                                        {participant.isDisqualified && (
                                                            <span className="text-red-400 text-[10px] uppercase font-mono px-2 py-0.5 bg-red-900/30 border border-red-500/30">
                                                                DQ
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs font-mono">
                                                        <span className={`text-cyber-muted ${rankingMetric === 'KILLS' ? 'font-bold text-white' : ''}`}>
                                                            {participant.totalKills || 0} kills
                                                        </span>
                                                        <span className={`font-bold ${rankingMetric === 'POINTS' ? 'text-cyan-400' : 'text-cyber-pink'}`}>
                                                            {participant.totalPoints || 0} pts
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>

                                {/* View Full Results button */}
                                <button
                                    type="button"
                                    className="w-full mt-3 py-2 px-3 text-cyan-400 hover:text-black hover:bg-cyan-400 border border-cyan-500/30 hover:border-cyan-400 text-xs font-oswald uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
                                    onClick={() => handleOpenDetails(match)}
                                >
                                    <span>View Full Results ({match.participants?.length || 0} {match.mode === 'SOLO' ? 'players' : 'teams'})</span>
                                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* FULL MATCH DETAILS MODAL */}
            {selectedMatch && (() => {
                const modalTop = getTopRankedParticipant(selectedMatch, rankingMetric);

                return (
                    <Modal
                        isOpen={!!selectedMatch}
                        onClose={() => setSelectedMatch(null)}
                        size="xl"
                        title={`MATCH ${selectedMatch.matchNumber} FULL RESULTS`}
                    >
                        <div className="space-y-6">
                            {/* Match Summary Header Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-[#12141a] p-3 border border-white/10">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyber-muted block">
                                        Mode / Format
                                    </span>
                                    <span className="text-lg font-bold font-oswald uppercase text-white mt-0.5 block">
                                        {selectedMatch.mode || 'SQUAD'}
                                    </span>
                                </div>
                                <div className="bg-[#12141a] p-3 border border-white/10">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyber-muted block">
                                        Match Duration
                                    </span>
                                    <span className="text-lg font-bold font-mono text-cyan-400 mt-0.5 block">
                                        {formatDuration(selectedMatch.duration, selectedMatch.startedAt, selectedMatch.completedAt)}
                                    </span>
                                </div>
                                <div className="bg-[#12141a] p-3 border border-white/10">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyber-muted block">
                                        Participants
                                    </span>
                                    <span className="text-lg font-bold font-mono text-white mt-0.5 block">
                                        {selectedMatch.participants?.length || 0} {selectedMatch.mode === 'SOLO' ? 'Players' : 'Teams'}
                                    </span>
                                </div>
                                <div className="bg-[#12141a] p-3 border border-white/10">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyber-muted block">
                                        Total Kills
                                    </span>
                                    <span className="text-lg font-bold font-mono text-cyber-pink mt-0.5 block">
                                        {totalMatchKills} Kills
                                    </span>
                                </div>
                            </div>

                            {/* #1 RANKED LEADER BANNER */}
                            {modalTop && (
                                <div className="bg-gradient-to-r from-cyan-950/50 via-blue-950/40 to-[#12141a] border-2 border-cyan-500/60 p-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_25px_rgba(0,240,255,0.18)]">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 bg-cyan-500/20 border-2 border-cyan-500/80 rounded flex items-center justify-center shrink-0">
                                            <Crown className="w-7 h-7 text-cyan-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-300 bg-cyan-500/20 px-2 py-0.5 border border-cyan-500/40">
                                                    🏆 RANK #1 (HIGHEST {rankingMetric})
                                                </span>
                                                {modalTop.isBooyah && (
                                                    <span className="text-[10px] font-mono uppercase text-yellow-400 bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/30">
                                                        Booyah In-Game
                                                    </span>
                                                )}
                                                <span className="text-xs font-mono text-gray-400">
                                                    {modalTop.isSolo ? 'Solo Leader' : 'Leading Squad'}
                                                </span>
                                            </div>
                                            <div className="text-2xl font-bold font-oswald uppercase tracking-wider text-white mt-1">
                                                {modalTop.displayName}
                                            </div>
                                            {modalTop.isSolo && modalTop.ffId && (
                                                <div className="text-xs font-mono text-cyan-400/90 mt-0.5">
                                                    Free Fire UID: {modalTop.ffId}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right bg-black/50 px-3.5 py-1.5 border border-white/10">
                                            <div className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">
                                                Total Kills
                                            </div>
                                            <div className="text-xl font-bold font-mono text-cyber-pink">
                                                {modalTop.kills} Kills
                                            </div>
                                        </div>
                                        <div className="text-right bg-black/50 px-3.5 py-1.5 border border-cyan-500/40">
                                            <div className="text-[10px] font-mono uppercase text-cyan-400/80 tracking-wider">
                                                Total Points
                                            </div>
                                            <div className="text-2xl font-bold font-mono text-cyan-400">
                                                {modalTop.points} pts
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Controls Toolbar: Tabs, Ranking Toggle, Search, Expand All, Copy */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('standings')}
                                        className={`px-3 py-1.5 text-xs font-oswald uppercase tracking-wider transition-all border ${
                                            activeTab === 'standings'
                                                ? 'bg-cyber-neon/20 text-cyan-300 border-cyber-neon/60'
                                                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                                        }`}
                                    >
                                        Standings ({sortedParticipants.length})
                                    </button>
                                    {selectedMatch.events && selectedMatch.events.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('events')}
                                            className={`px-3 py-1.5 text-xs font-oswald uppercase tracking-wider transition-all border ${
                                                activeTab === 'events'
                                                    ? 'bg-cyber-neon/20 text-cyan-300 border-cyber-neon/60'
                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                                            }`}
                                        >
                                            Events Log ({selectedMatch.events.length})
                                        </button>
                                    )}

                                    {/* Metric switcher inside modal */}
                                    <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-3 border-l border-white/10">
                                        <span className="text-[10px] font-mono uppercase text-gray-400">Sort:</span>
                                        <button
                                            type="button"
                                            onClick={() => setRankingMetric(rankingMetric === 'POINTS' ? 'KILLS' : 'POINTS')}
                                            className="px-2 py-0.5 text-[11px] font-mono font-bold bg-white/5 hover:bg-white/10 border border-white/15 text-cyan-300 uppercase flex items-center gap-1"
                                            title="Click to toggle ranking by Points or Kills"
                                        >
                                            <ArrowUpDown className="w-3 h-3" />
                                            <span>{rankingMetric}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {activeTab === 'standings' && (
                                        <>
                                            {/* Search box */}
                                            <div className="relative">
                                                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Filter teams or players..."
                                                    className="pl-8 pr-3 py-1 text-xs bg-black/60 border border-white/15 text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-500 w-44 sm:w-52"
                                                />
                                            </div>

                                            {/* Expand all button */}
                                            <button
                                                type="button"
                                                onClick={toggleExpandAll}
                                                className="px-2.5 py-1 text-xs font-mono uppercase bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                                                title="Expand or collapse player details for all teams"
                                            >
                                                {allExpanded ? 'Collapse All' : 'Expand All'}
                                            </button>
                                        </>
                                    )}

                                    {/* Copy text button */}
                                    <button
                                        type="button"
                                        onClick={handleCopyStandings}
                                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-oswald uppercase tracking-wider bg-cyber-pink/20 border border-cyber-pink/40 text-cyber-pink hover:bg-cyber-pink hover:text-black transition-colors"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copied ? 'Copied' : 'Copy Leaderboard'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* TAB 1: STANDINGS TABLE & BREAKDOWN (RANKED BY POINTS / KILLS) */}
                            {activeTab === 'standings' && (
                                <div className="space-y-2">
                                    {filteredParticipants.length === 0 ? (
                                        <div className="text-center py-8 text-cyber-muted text-sm font-mono">
                                            No teams match your search &quot;{searchQuery}&quot;
                                        </div>
                                    ) : (
                                        filteredParticipants.map((p, idx) => {
                                            const squadKey = p.squadId || p.squadName || idx;
                                            const isExpanded = !!expandedSquads[squadKey];
                                            const leaderboardRank = idx + 1; // Rank is determined by Points / Kills sorting!
                                            const isSolo = selectedMatch.mode === 'SOLO' || (p.players && p.players.length === 1);
                                            const topPlayer = p.players?.[0];

                                            return (
                                                <div
                                                    key={squadKey}
                                                    className={`border transition-all ${
                                                        p.isDisqualified
                                                            ? 'bg-red-950/20 border-red-500/30'
                                                            : leaderboardRank === 1
                                                            ? 'bg-gradient-to-r from-cyan-950/30 to-[#0e1015] border-cyan-500/50'
                                                            : leaderboardRank === 2
                                                            ? 'bg-[#14142b] border-indigo-500/40'
                                                            : leaderboardRank === 3
                                                            ? 'bg-[#241a0d] border-amber-500/40'
                                                            : 'bg-[#0e1015] border-white/10 hover:border-white/20'
                                                    }`}
                                                >
                                                    {/* Header Row */}
                                                    <div
                                                        className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
                                                        onClick={() => toggleSquadExpand(squadKey)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {/* Leaderboard Rank badge (By Points / Kills) */}
                                                            <div
                                                                className={`w-9 h-9 flex items-center justify-center font-oswald font-bold text-sm border ${
                                                                    leaderboardRank === 1
                                                                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                                                                        : leaderboardRank === 2
                                                                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                                                        : leaderboardRank === 3
                                                                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                                                        : 'bg-white/5 border-white/10 text-gray-400'
                                                                }`}
                                                            >
                                                                #{leaderboardRank}
                                                            </div>

                                                            {/* Team/Player Name & In-Game Badges */}
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-white font-oswald font-bold uppercase tracking-wider text-base">
                                                                        {p.squadName}
                                                                    </span>
                                                                    {p.finalRank === 1 && (
                                                                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                                                                            Booyah In-Game
                                                                        </span>
                                                                    )}
                                                                    {p.isDisqualified && (
                                                                        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1">
                                                                            <AlertTriangle className="w-3 h-3" />
                                                                            Disqualified
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Solo player info or DQ Reason */}
                                                                {isSolo && topPlayer && (
                                                                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                                                                        IGN: <span className="text-cyan-400">{topPlayer.ffName || topPlayer.playerName}</span>
                                                                        {topPlayer.ffId && ` • UID: ${topPlayer.ffId}`}
                                                                    </p>
                                                                )}

                                                                {p.isDisqualified && p.disqualificationReason && (
                                                                    <p className="text-xs text-red-400/90 font-mono mt-0.5">
                                                                        Reason: {p.disqualificationReason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Points, Kills & Expand Chevron */}
                                                        <div className="flex items-center gap-5">
                                                            <div className="text-right">
                                                                <div className={`text-xs font-mono ${rankingMetric === 'KILLS' ? 'text-white font-bold' : 'text-gray-400'}`}>
                                                                    <span>{p.totalKills || 0}</span> kills
                                                                </div>
                                                                <div className={`text-sm font-mono font-bold ${rankingMetric === 'POINTS' ? 'text-cyan-400 text-base' : 'text-cyber-pink'}`}>
                                                                    {p.totalPoints || 0} pts
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                                                aria-label="Toggle squad details"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronUp className="w-5 h-5" />
                                                                ) : (
                                                                    <ChevronDown className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Player Breakdown */}
                                                    {isExpanded && (
                                                        <div className="px-4 pb-3 pt-1 border-t border-white/5 bg-black/40">
                                                            {p.players && p.players.length > 0 ? (
                                                                <div className="space-y-2 mt-2">
                                                                    <div className="text-[11px] font-mono uppercase tracking-wider text-cyber-muted flex items-center justify-between pb-1 border-b border-white/5">
                                                                        <span>Roster Breakdown ({p.players.length} Players)</span>
                                                                        <span>Kills / Status</span>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                        {p.players.map((pl, pIdx) => (
                                                                            <div
                                                                                key={pl.playerId || pl.ffId || pIdx}
                                                                                className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 rounded-sm"
                                                                            >
                                                                                <div className="min-w-0 pr-2">
                                                                                    <div className="text-xs font-bold text-white font-mono truncate">
                                                                                        {pl.ffName || pl.playerName || `Player ${pIdx + 1}`}
                                                                                    </div>
                                                                                    <div className="text-[10px] text-gray-400 font-mono truncate">
                                                                                        {pl.playerName && pl.ffName ? `${pl.playerName} • ` : ''}
                                                                                        UID: {pl.ffId || 'N/A'}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="flex items-center gap-3 shrink-0">
                                                                                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 border border-cyan-800/40">
                                                                                        {pl.kills || 0} kills
                                                                                    </span>
                                                                                    <span
                                                                                        className={`text-[10px] font-mono uppercase px-1.5 py-0.5 ${
                                                                                            pl.isEliminated
                                                                                                ? 'text-gray-500 bg-white/5'
                                                                                                : 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 font-bold'
                                                                                        }`}
                                                                                    >
                                                                                        {pl.isEliminated ? 'Eliminated' : 'Survived'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="py-2 text-xs font-mono text-gray-500 italic">
                                                                    No individual player stats recorded for this team.
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* TAB 2: EVENTS LOG */}
                            {activeTab === 'events' && (
                                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                                    {selectedMatch.events && selectedMatch.events.length > 0 ? (
                                        selectedMatch.events.map((evt, eIdx) => (
                                            <div
                                                key={eIdx}
                                                className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 text-xs font-mono"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`px-2 py-0.5 font-bold uppercase text-[10px] ${
                                                        evt.type === 'KILL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                                                        evt.type === 'ELIMINATION' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                                                        evt.type === 'WINNER' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                                                        evt.type === 'DISQUALIFY' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' :
                                                        'bg-white/10 text-gray-300'
                                                    }`}>
                                                        {evt.type}
                                                    </span>
                                                    <span className="text-gray-200">
                                                        {evt.metadata?.description || evt.metadata?.reason || `${evt.type} event recorded`}
                                                    </span>
                                                </div>
                                                <span className="text-gray-500 text-[11px]">
                                                    {formatDate(evt.timestamp)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-cyber-muted text-sm font-mono">
                                            No event logs recorded for this match.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Modal>
                );
            })()}
        </div>
    );
};

export default MatchHistory;

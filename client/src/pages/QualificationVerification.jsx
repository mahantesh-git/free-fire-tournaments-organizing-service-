import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    Trophy,
    Search,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    Sparkles,
    Shield,
    Crosshair
} from 'lucide-react';
import api from '../services/api';
import socketService from '../services/socketService';
import { getTenantSlug } from '../utils/tenant';
import { toast } from 'react-hot-toast';

const QualificationVerification = () => {
    const { tournamentId } = useParams();
    const [searchParams] = useSearchParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [checking, setChecking] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchResult, setSearchResult] = useState(null);

    // Tenant slug resolution
    const tenantSlug = searchParams.get('tenant') || getTenantSlug() || localStorage.getItem('tenantSlug') || '';

    const fetchTournamentMeta = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const tenantParam = tenantSlug ? `?tenant=${tenantSlug}` : '';
            const res = await api.get(`/api/tournaments/${tournamentId}/qualification${tenantParam}`);
            if (res.data.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error('Failed to load qualification info:', error);
            if (!isSilent) {
                toast.error(error.response?.data?.message || 'Failed to load tournament details');
            }
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [tournamentId, tenantSlug]);

    useEffect(() => {
        fetchTournamentMeta();
    }, [fetchTournamentMeta]);

    // Socket listener for real-time updates
    useEffect(() => {
        const socket = socketService.connect();
        if (tenantSlug) {
            socketService.emit('join_tenant', tenantSlug);
        }

        const handleUpdate = () => {
            fetchTournamentMeta(true);
        };

        socketService.on('qualificationUpdated', handleUpdate);
        socketService.on('tournamentStandingsUpdated', handleUpdate);
        socketService.on('tournamentCompleted', handleUpdate);

        return () => {
            socketService.off('qualificationUpdated', handleUpdate);
            socketService.off('tournamentStandingsUpdated', handleUpdate);
            socketService.off('tournamentCompleted', handleUpdate);
        };
    }, [tenantSlug, fetchTournamentMeta]);

    // Verify Player ID Handler
    const handleCheckStatus = async (e) => {
        if (e) e.preventDefault();
        const query = searchQuery.trim();
        if (!query) {
            toast.error('Please enter your Free Fire Player ID / UID');
            return;
        }

        setChecking(true);
        setHasSearched(true);
        setSearchResult(null);

        try {
            const tenantParam = tenantSlug ? `&tenant=${tenantSlug}` : '';
            const res = await api.get(`/api/tournaments/${tournamentId}/qualification?playerId=${encodeURIComponent(query)}${tenantParam}`);
            if (res.data.success && res.data.searchResult) {
                setSearchResult(res.data.searchResult);
            } else {
                setSearchResult({
                    found: false,
                    query,
                    message: `No player found matching "${query}" in this tournament.`
                });
            }
        } catch (err) {
            console.error('Failed to verify status:', err);
            setSearchResult({
                found: false,
                query,
                message: err.response?.data?.message || `Failed to verify status for "${query}". Please check your UID and try again.`
            });
        } finally {
            setChecking(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cyber-black text-white flex flex-col items-center justify-center p-6">
                <RefreshCw className="w-10 h-10 text-cyber-red animate-spin mb-4" />
                <h3 className="text-xl font-oswald uppercase tracking-wider text-white">Connecting to Tournament...</h3>
                <p className="text-xs text-cyber-muted font-mono mt-1">Fetching official qualification parameters</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-cyber-black text-white flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-12 h-12 text-cyber-red mb-4" />
                <h2 className="text-2xl font-black font-oswald uppercase text-white">Tournament Not Found</h2>
                <p className="text-sm text-cyber-muted max-w-md mt-2">
                    Standings or qualification data for this tournament is not currently active.
                </p>
            </div>
        );
    }

    const { tournamentName, mode, qualification, isComplete } = data;
    const cutoff = qualification?.cutoff || 48;
    const cutoffType = qualification?.type === 'SQUADS' && mode !== 'SOLO' ? 'Squads' : 'Players';

    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter selection:bg-cyber-red selection:text-white pb-20 w-full">
            {/* Ambient Esports Glow */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[140px]" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyber-red/10 rounded-full blur-[140px]" />
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
            </div>

            {/* Navigation Header - Full Width */}
            <header className="relative z-10 border-b border-cyber-border/40 bg-cyber-charcoal/80 backdrop-blur-md sticky top-0 px-4 md:px-8 py-4 w-full">
                <div className="w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded bg-yellow-500/10 border border-yellow-500/40 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl md:text-2xl font-black font-oswald uppercase text-white tracking-wide">
                                    {tournamentName}
                                </h1>
                                <span className="px-2 py-0.5 bg-cyber-red text-white text-[10px] font-black uppercase font-oswald rounded">
                                    {mode}
                                </span>
                            </div>
                            <p className="text-xs text-cyber-muted font-mono">
                                Next Round Qualification Verification • {isComplete ? 'Official Final Results' : 'Matches in Progress'}
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-[10px] font-black font-oswald uppercase text-yellow-400 tracking-wider block">
                            Qualification Cutoff
                        </span>
                        <span className="text-xs font-mono font-bold text-white">
                            Top {cutoff} {cutoffType}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content - Full Width Edge to Edge */}
            <main className="relative z-10 w-full px-4 md:px-8 mt-6 space-y-6">
                {/* Hero Cutoff Badge - Full Width */}
                <div className="w-full bg-gradient-to-r from-yellow-500/15 via-cyber-charcoal to-cyber-charcoal border-2 border-yellow-500/50 p-6 md:p-8 text-center shadow-[0_0_35px_rgba(234,179,8,0.12)]">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-black font-oswald uppercase tracking-wider rounded mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        <span>{qualification?.customTitle || 'Qualified for Next Round'}</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black font-oswald text-white uppercase tracking-tight">
                        Top <span className="text-yellow-400">{cutoff}</span> {cutoffType} 
                    </h2>
                    <p className="text-xs md:text-sm text-cyber-muted mt-2 max-w-2xl mx-auto">
                        Enter your Free Fire Player ID (UID) below to verify whether you have qualified for the next round.
                    </p>
                </div>

                {/* Player Verification Input Box - Full Width */}
                <div className="w-full bg-cyber-charcoal border border-cyber-border p-6 md:p-8 shadow-2xl">
                    <div className="max-w-2xl mx-auto text-center space-y-2 mb-6">
                        <span className="text-xs font-black font-oswald uppercase tracking-widest text-cyber-red">
                            Player Identification
                        </span>
                        <h3 className="text-2xl font-black font-oswald uppercase text-white">
                            Enter Your Player ID / UID
                        </h3>
                        <p className="text-xs text-cyber-muted">
                            Type your registered Free Fire in-game UID (or player name) and click check.
                        </p>
                    </div>

                    <form onSubmit={handleCheckStatus} className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 text-cyber-muted absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Enter Free Fire UID (e.g. 192837465)..."
                                className="w-full pl-12 pr-4 py-3.5 bg-black/80 border border-cyber-border focus:border-yellow-500 focus:outline-none text-white font-mono text-sm placeholder:text-cyber-muted/50 transition-colors"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={checking}
                            className="px-8 py-3.5 bg-cyber-red hover:bg-cyber-red/80 text-white font-black font-oswald uppercase tracking-wider text-sm transition-all shadow-[0_0_20px_rgba(255,0,60,0.3)] shrink-0 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                        >
                            {checking ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <span>Check Status</span>
                            )}
                        </button>
                    </form>

                    {/* Verification Response Display */}
                    {hasSearched && (
                        <div className="max-w-2xl mx-auto mt-8">
                            {checking && (
                                <div className="p-8 text-center bg-black/40 border border-cyber-border/40">
                                    <RefreshCw className="w-6 h-6 text-yellow-400 animate-spin mx-auto mb-2" />
                                    <span className="text-xs font-mono text-cyber-muted uppercase tracking-wider">
                                        Searching tournament database...
                                    </span>
                                </div>
                            )}

                            {/* CASE 1: QUALIFIED */}
                            {!checking && searchResult && searchResult.found && searchResult.isQualified && (
                                <div className="bg-gradient-to-b from-emerald-950/70 to-black border-2 border-emerald-500 p-6 md:p-8 relative overflow-hidden shadow-[0_0_35px_rgba(16,185,129,0.3)]">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-2.5 py-0.5 bg-emerald-500 text-black font-black font-oswald uppercase text-xs tracking-wider">
                                                     QUALIFIED FOR NEXT ROUND
                                                </span>
                                                <span className="text-xs font-mono text-emerald-400 font-bold">
                                                    Placed #{searchResult.qualificationRank || searchResult.rank} (Top {cutoff} Cutoff)
                                                </span>
                                            </div>

                                            <h4 className="text-2xl md:text-3xl font-black font-oswald uppercase text-white mt-2">
                                                {searchResult.player?.name || searchResult.player?.ffName}
                                            </h4>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-emerald-500/30 text-xs font-mono">
                                                <div>
                                                    <span className="text-cyber-muted block text-[10px] uppercase font-oswald">Player ID</span>
                                                    <span className="text-white font-bold">{searchResult.player?.ffId || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-cyber-muted block text-[10px] uppercase font-oswald">Squad / Room</span>
                                                    <span className="text-white font-bold truncate block">{searchResult.player?.teamName || searchResult.player?.roomName || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-cyber-muted block text-[10px] uppercase font-oswald">Total Points</span>
                                                    <span className="text-emerald-400 font-bold text-sm">{searchResult.player?.totalPoints ?? 0} pts</span>
                                                </div>
                                                <div>
                                                    <span className="text-cyber-muted block text-[10px] uppercase font-oswald">Total Kills</span>
                                                    <span className="text-cyber-red font-bold text-sm">{searchResult.player?.totalKills ?? 0} kills</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-emerald-300/90 mt-5 bg-emerald-950/50 p-3.5 border border-emerald-500/30">
                                             <strong>Congratulations!</strong> Your spot is officially secured for the next stage. Please stay tuned for your upcoming match schedule and room credentials.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CASE 2: NOT QUALIFIED */}
                            {!checking && searchResult && searchResult.found && !searchResult.isQualified && (
                                <div className="bg-gradient-to-b from-red-950/50 to-black border-2 border-red-500/60 p-6 md:p-8 relative overflow-hidden shadow-[0_0_25px_rgba(239,68,68,0.2)]">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500 text-red-400 flex items-center justify-center shrink-0">
                                            <XCircle className="w-8 h-8" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-2.5 py-0.5 bg-red-900/60 text-red-300 font-black font-oswald uppercase text-xs tracking-wider border border-red-500/40">
                                                    NOT QUALIFIED
                                                </span>
                                                <span className="text-xs font-mono text-red-400 font-bold">
                                                    Rank #{searchResult.rank} • Cutoff was Top {cutoff}
                                                </span>
                                            </div>

                                            <h4 className="text-2xl md:text-3xl font-black font-oswald uppercase text-white mt-2">
                                                {searchResult.player?.name || searchQuery}
                                            </h4>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-red-500/20 text-xs font-mono">
                                                <div>
                                                    <span className="text-cyber-muted block text-[10px] uppercase font-oswald">Player ID</span>
                                                    <span className="text-white font-bold">{searchResult.player?.ffId || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-cyber-muted block text-[10px] uppercase font-oswald">Squad / Room</span>
                                                    <span className="text-white font-bold truncate block">{searchResult.player?.teamName || searchResult.player?.roomName || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-cyber-muted block text-[10px] uppercase font-oswald">Total Points</span>
                                                    <span className="text-cyan-400 font-bold">{searchResult.player?.totalPoints ?? 0} pts</span>
                                                </div>
                                                <div>
                                                    <span className="text-cyber-muted block text-[10px] uppercase font-oswald">Total Kills</span>
                                                    <span className="text-cyber-red font-bold">{searchResult.player?.totalKills ?? 0} kills</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-cyber-muted mt-5 bg-black/50 p-3.5 border border-cyber-border">
                                                Rank <strong>#{searchResult.rank}</strong> was just outside the qualification boundary (Top {cutoff}). Thank you for competing hard in this tournament! Keep grinding for our next event.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CASE 3: NOT FOUND */}
                            {!checking && searchResult && !searchResult.found && (
                                <div className="bg-cyber-charcoal border border-amber-500/50 p-5 flex items-start gap-3 text-left">
                                    <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="font-bold text-white font-oswald uppercase text-sm">
                                            Player Record Not Found
                                        </h5>
                                        <p className="text-xs text-cyber-muted mt-1 leading-relaxed">
                                            {searchResult.message || `No participant found with ID "${searchQuery}". Please verify that you entered your exact Free Fire In-Game UID or registered name.`}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default QualificationVerification;

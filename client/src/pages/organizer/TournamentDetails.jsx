import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Navbar from '../../components/layout/Navbar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getTenantSlug } from '../../utils/tenant';
import { getPlayers } from '../../services/playerService';
import { ArrowLeft, Share2, Copy, Users, Settings, Calendar, Play, History, TrendingUp, Clock } from 'lucide-react';

// History Components
import MatchHistory from '../../components/history/MatchHistory';
import TournamentTimeline from '../../components/history/TournamentTimeline';
import TournamentAnalytics from '../../components/analytics/TournamentAnalytics';

// QR Code Component
import QRCodeCard from '../../components/tournament/QRCodeCard';

const TournamentDetails = () => {
    const { tournamentId } = useParams();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [playerCount, setPlayerCount] = useState(0);
    const [activeTab, setActiveTab] = useState('overview');

    const tenantSlug = getTenantSlug();
    const isLocalhost = window.location.hostname.includes('localhost') && !window.location.hostname.includes('.');
    const registrationLink = tournament
        ? (isLocalhost
            ? `${window.location.protocol}//${window.location.host}/register?tenant=${tenantSlug}&mode=${tournament.mode}&tournamentId=${tournamentId}`
            : `${window.location.protocol}//${window.location.host}/register?mode=${tournament.mode}&tournamentId=${tournamentId}`)
        : '';

    const liveLink = tournament
        ? (isLocalhost && tenantSlug
            ? `${window.location.protocol}//${window.location.host}/live/${tournamentId}?tenant=${tenantSlug}`
            : `${window.location.protocol}//${window.location.host}/live/${tournamentId}`)
        : '';

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch Tournament Details
                const res = await api.get(`/api/tournaments/${tournamentId}`);
                if (res.data.success) {
                    const tourny = res.data.tournament;
                    setTournament(tourny);

                    // Fetch Counts based on mode
                    if (tourny.mode === 'SQUAD') {
                        const squadsRes = await api.get(`/api/kills/getSquads?tournamentId=${tournamentId}`);
                        const squadList = Array.isArray(squadsRes.data) ? squadsRes.data : (squadsRes.data.squads || []);
                        setPlayerCount(tourny.mode === 'SQUAD' ? squadList.length : squadList.length * 4);
                    } else {
                        const playersRes = await getPlayers(tournamentId);
                        // Access the player array from the response object
                        const playerList = playersRes.players || (Array.isArray(playersRes) ? playersRes : []);
                        setPlayerCount(playerList.length);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch details", error);
                toast.error("Failed to load tournament details", { id: 'fetch-tournament-details-error' });
            } finally {
                setLoading(false);
            }
        };

        if (tournamentId) fetchDetails();
    }, [tournamentId]);

    const copyLink = () => {
        navigator.clipboard.writeText(registrationLink);
        toast.success("Registration Link copied!");
    };

    const copyLiveLink = () => {
        navigator.clipboard.writeText(liveLink);
        toast.success("Live Scoreboard Link copied!");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cyber-black text-white flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-cyber-red"></div>
            </div>
        );
    }

    if (!tournament) {
        return <div className="min-h-screen bg-cyber-black text-white p-8 font-oswald uppercase tracking-wider">Tournament not found</div>;
    }

    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter">
            {/* Navbar (Placeholder/Basic for now if not fully redesigned) */}
            <div className="border-b border-cyber-border bg-cyber-charcoal px-6 py-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center space-x-3">
                    <h1 className="text-xl font-oswald font-bold tracking-wider text-white uppercase">Tournament<span className="text-cyber-red">Manager</span></h1>
                </div>
                <button
                    onClick={() => navigate('/organizer/dashboard')}
                    className="flex items-center text-cyber-muted hover:text-white mb-2 text-sm font-oswald uppercase tracking-wider gap-1"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-cyber-border pb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-oswald font-black text-white mb-2 uppercase tracking-wide">
                            {tournament.name}
                        </h1>
                        <div className="flex items-center gap-3 text-sm font-oswald uppercase tracking-wider">
                            <span className="px-3 py-1 bg-cyber-card border border-cyber-border text-cyber-muted font-bold">
                                {tournament.mode}
                            </span>
                            <span className={`px-3 py-1 border font-bold ${tournament.status === 'OPEN' ? 'bg-emerald-900/20 text-emerald-500 border-emerald-500/30' :
                                tournament.status === 'ONGOING' ? 'bg-amber-900/20 text-amber-500 border-amber-500/30' :
                                    'bg-cyber-card text-cyber-muted border-cyber-border'
                                }`}>
                                {tournament.status}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={copyLiveLink}
                            className="flex items-center gap-2 border-cyber-pink text-cyber-pink hover:bg-cyber-pink/10"
                        >
                            <Share2 className="w-4 h-4" />
                            Copy Live Link
                        </Button>
                        <Button
                            variant="primary" // Automatically uses new cyber-red style
                            onClick={() => navigate(`/organizer/tournament/${tournamentId}/rooms`)}
                            className="flex items-center gap-2"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Manage Rooms
                        </Button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-cyber-border mb-8" style={{ backgroundColor: '#1A1A1A', borderBottomColor: '#2A2A2A', borderBottomWidth: '1px' }}>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-6 py-3 font-oswald uppercase tracking-wider text-sm transition-all ${activeTab === 'overview'
                                ? 'bg-cyber-red text-white border-b-2 border-cyber-red'
                                : 'text-cyber-muted hover:text-white hover:bg-cyber-charcoal/50'
                                }`}
                            style={{
                                backgroundColor: activeTab === 'overview' ? '#FF3B3B' : 'transparent',
                                color: activeTab === 'overview' ? '#ffffff' : '#A0A0A0',
                                borderBottom: activeTab === 'overview' ? '2px solid #FF3B3B' : 'none'
                            }}
                        >
                            <Users className="w-4 h-4 inline mr-2" />
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-3 font-oswald uppercase tracking-wider text-sm transition-all ${activeTab === 'history'
                                ? 'bg-cyber-red text-white border-b-2 border-cyber-red'
                                : 'text-cyber-muted hover:text-white hover:bg-cyber-charcoal/50'
                                }`}
                            style={{
                                backgroundColor: activeTab === 'history' ? '#FF3B3B' : 'transparent',
                                color: activeTab === 'history' ? '#ffffff' : '#A0A0A0',
                                borderBottom: activeTab === 'history' ? '2px solid #FF3B3B' : 'none'
                            }}
                        >
                            <History className="w-4 h-4 inline mr-2" />
                            Match History
                        </button>
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`px-6 py-3 font-oswald uppercase tracking-wider text-sm transition-all ${activeTab === 'timeline'
                                ? 'bg-cyber-red text-white border-b-2 border-cyber-red'
                                : 'text-cyber-muted hover:text-white hover:bg-cyber-charcoal/50'
                                }`}
                            style={{
                                backgroundColor: activeTab === 'timeline' ? '#FF3B3B' : 'transparent',
                                color: activeTab === 'timeline' ? '#ffffff' : '#A0A0A0',
                                borderBottom: activeTab === 'timeline' ? '2px solid #FF3B3B' : 'none'
                            }}
                        >
                            <Clock className="w-4 h-4 inline mr-2" />
                            Timeline
                        </button>
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`px-6 py-3 font-oswald uppercase tracking-wider text-sm transition-all ${activeTab === 'analytics'
                                ? 'bg-cyber-red text-white border-b-2 border-cyber-red'
                                : 'text-cyber-muted hover:text-white hover:bg-cyber-charcoal/50'
                                }`}
                            style={{
                                backgroundColor: activeTab === 'analytics' ? '#FF3B3B' : 'transparent',
                                color: activeTab === 'analytics' ? '#ffffff' : '#A0A0A0',
                                borderBottom: activeTab === 'analytics' ? '2px solid #FF3B3B' : 'none'
                            }}
                        >
                            <TrendingUp className="w-4 h-4 inline mr-2" />
                            Analytics
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content - Stats & Actions */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* QR Code Registration Card */}
                            <QRCodeCard
                                registrationUrl={registrationLink}
                                tournamentName={tournament.name}
                                mode={tournament.mode}
                                tournamentId={tournamentId}
                            />

                            {/* Player Pool Stats */}
                            <div className="card-cyber p-8 border-t-4 border-t-cyber-purple">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-oswald font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                        <Users className="w-5 h-5 text-cyber-purple" />
                                        Registered Players
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/playerRegistration?tournamentId=${tournamentId}`)}
                                        className="text-xs"
                                    >
                                        Manage / Add Manually
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-cyber-black p-6 border border-cyber-border relative overflow-hidden group hover:border-cyber-purple/50 transition-colors">
                                        <div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Users className="w-12 h-12 text-white" />
                                        </div>
                                        <div className="text-cyber-muted text-xs font-oswald uppercase tracking-widest mb-2">
                                            {tournament.mode === 'SQUAD' ? 'Total Squads' : 'Total Pool'}
                                        </div>
                                        <div className="text-4xl font-oswald font-black text-white">{playerCount}</div>
                                        <div className="text-cyber-muted/50 text-xs mt-2 font-mono">DB_RECORDS</div>
                                    </div>
                                    <div className="bg-cyber-black p-6 border border-cyber-border relative overflow-hidden group hover:border-cyber-purple/50 transition-colors">
                                        <div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Users className="w-12 h-12 text-white" />
                                        </div>
                                        <div className="text-cyber-muted text-xs font-oswald uppercase tracking-widest mb-2">
                                            {tournament.mode === 'SQUAD' ? 'Total Players' : 'Potential Squads'}
                                        </div>
                                        <div className="text-4xl font-oswald font-black text-white">
                                            {tournament.mode === 'SQUAD' ? playerCount * 4 : Math.floor(playerCount / 4)}
                                        </div>
                                        <div className="text-cyber-muted/50 text-xs mt-2 font-mono">
                                            {tournament.mode === 'SQUAD' ? 'ESTIMATED_4P' : 'FULL_SQUADS_4P'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar - Quick Actions / Info */}
                        <div className="space-y-6">
                            <div className="glass-cyber p-6 border border-cyber-border text-sm">
                                <h3 className="text-sm font-oswald font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-cyber-border pb-2">
                                    <Settings className="w-4 h-4 text-cyber-red" />
                                    Tournament Info
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-cyber-muted group-hover:text-white transition-colors">Max Players/Room</span>
                                        <span className="text-white font-mono font-bold bg-cyber-black px-2 py-0.5 border border-cyber-border">{tournament.maxPlayersPerRoom}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-cyber-muted group-hover:text-white transition-colors">Total Rooms</span>
                                        <span className="text-white font-mono font-bold bg-cyber-black px-2 py-0.5 border border-cyber-border">{tournament.totalRooms || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-cyber-muted group-hover:text-white transition-colors">Created At</span>
                                        <span className="text-white font-mono font-bold bg-cyber-black px-2 py-0.5 border border-cyber-border">{new Date(tournament.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <MatchHistory tournamentId={tournamentId} />
                )}

                {activeTab === 'timeline' && (
                    <TournamentTimeline tournamentId={tournamentId} />
                )}

                {activeTab === 'analytics' && (
                    <TournamentAnalytics tournamentId={tournamentId} />
                )}
            </div>
        </div>
    );
};

export default TournamentDetails;

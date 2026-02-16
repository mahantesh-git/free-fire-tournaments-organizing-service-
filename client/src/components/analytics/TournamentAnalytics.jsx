import { useState, useEffect } from 'react';
import Card from '../common/Card';
import { Trophy, Users, Target, TrendingUp, Award, Download } from 'lucide-react';

const TournamentAnalytics = ({ tournamentId }) => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadAnalytics();
    }, [tournamentId]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/analytics/tournament/${tournamentId}/overview`, {
                headers: {
                    'x-tenant-id': localStorage.getItem('tenantSlug')
                }
            });
            const data = await response.json();
            setAnalytics(data.analytics);
        } catch (err) {
            console.error('Failed to load analytics:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format) => {
        try {
            const response = await fetch(`/api/analytics/tournament/${tournamentId}/export?format=${format}`, {
                headers: {
                    'x-tenant-id': localStorage.getItem('tenantSlug')
                }
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tournament-export-${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="text-center text-cyber-muted">Loading analytics...</div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6 border-red-500/30">
                <div className="text-center text-red-400">Error: {error}</div>
            </Card>
        );
    }

    if (!analytics) return null;

    const { overview, leaderboard, topKillers } = analytics;

    return (
        <div className="space-y-6">
            {/* Header with Export */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-oswald uppercase tracking-wider text-white flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-cyber-red" />
                    Tournament Analytics
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleExport('json')}
                        className="px-4 py-2 bg-cyber-red/20 border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white transition-colors font-oswald uppercase text-sm flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export JSON
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        className="px-4 py-2 bg-cyber-pink/20 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-white transition-colors font-oswald uppercase text-sm flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-cyber-red/30">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-cyber-red" />
                        <div>
                            <div className="text-cyber-muted text-sm font-oswald uppercase">Total Matches</div>
                            <div className="text-2xl font-bold text-white">{overview.totalMatches}</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-cyber-pink/30">
                    <div className="flex items-center gap-3">
                        <Target className="w-8 h-8 text-cyber-pink" />
                        <div>
                            <div className="text-cyber-muted text-sm font-oswald uppercase">Total Kills</div>
                            <div className="text-2xl font-bold text-white">{overview.totalKills}</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-emerald-500/30">
                    <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-emerald-400" />
                        <div>
                            <div className="text-cyber-muted text-sm font-oswald uppercase">Participants</div>
                            <div className="text-2xl font-bold text-white">{overview.totalParticipants}</div>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-indigo-500/30">
                    <div className="flex items-center gap-3">
                        <Award className="w-8 h-8 text-indigo-400" />
                        <div>
                            <div className="text-cyber-muted text-sm font-oswald uppercase">Avg Duration</div>
                            <div className="text-2xl font-bold text-white">
                                {Math.floor(overview.averageMatchDuration / 60)}m
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Squads */}
                <Card className="p-6">
                    <h3 className="text-xl font-bold font-oswald uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-cyber-red" />
                        Top Squads
                    </h3>
                    <div className="space-y-2">
                        {leaderboard.slice(0, 5).map((squad, index) => (
                            <div
                                key={squad._id}
                                className="flex items-center justify-between p-3 bg-cyber-charcoal/50 border-l-2"
                                style={{
                                    borderLeftColor:
                                        index === 0 ? '#10b981' :
                                            index === 1 ? '#6366f1' :
                                                index === 2 ? '#f59e0b' : '#64748b'
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-cyber-muted font-mono text-sm w-6">
                                        #{index + 1}
                                    </span>
                                    <span className="text-white font-oswald">{squad.squadName}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-cyber-muted">{squad.totalKills} kills</span>
                                    <span className="text-cyber-pink font-bold">{squad.totalPoints} pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Top Killers */}
                <Card className="p-6">
                    <h3 className="text-xl font-bold font-oswald uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-cyber-red" />
                        Top Killers
                    </h3>
                    <div className="space-y-2">
                        {topKillers.slice(0, 5).map((player, index) => (
                            <div
                                key={player.ffId}
                                className="flex items-center justify-between p-3 bg-cyber-charcoal/50"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-cyber-muted font-mono text-sm w-6">
                                        #{index + 1}
                                    </span>
                                    <div>
                                        <div className="text-white font-oswald">{player.playerName}</div>
                                        <div className="text-cyber-muted text-xs font-mono">{player.ffName}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-cyber-red font-bold">{player.totalKills} kills</div>
                                    <div className="text-cyber-muted text-xs">{player.matches} matches</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default TournamentAnalytics;

import { useState, useEffect } from 'react';
import { getTournamentMatches } from '../../services/historyService';
import Card from '../common/Card';
import { Trophy, Users, Target, Clock, Award } from 'lucide-react';

const MatchHistory = ({ tournamentId }) => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="text-center text-cyber-muted">
                    Loading match history...
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6 border-red-500/30">
                <div className="text-center text-red-400">
                    Error: {error}
                </div>
            </Card>
        );
    }

    if (matches.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center text-cyber-muted">
                    No match history available yet.
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold font-oswald uppercase tracking-wider text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-cyber-red" />
                Match History
            </h2>

            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-3">
                    {matches.map((match, index) => (
                        <Card key={match._id} className="p-4 hover:border-cyber-red/50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-cyber-red/20 px-3 py-1 rounded">
                                        <span className="text-cyber-red font-bold font-oswald">
                                            MATCH {match.matchNumber}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-cyber-muted text-sm">
                                        <Clock className="w-4 h-4" />
                                        {formatDate(match.completedAt)}
                                    </div>
                                    <div className="flex items-center gap-2 text-cyber-muted text-sm">
                                        <Target className="w-4 h-4" />
                                        {formatDuration(match.duration)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {match.mode === 'SQUAD' ? (
                                        <Users className="w-5 h-5 text-cyber-pink" />
                                    ) : (
                                        <Target className="w-5 h-5 text-cyber-pink" />
                                    )}
                                    <span className="text-cyber-muted text-sm font-oswald uppercase">
                                        {match.mode}
                                    </span>
                                </div>
                            </div>

                            {/* Winner */}
                            {match.winner && (
                                <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Award className="w-5 h-5 text-emerald-400" />
                                        <span className="text-emerald-400 font-bold font-oswald uppercase">
                                            Winner: {match.winner.squadName}
                                        </span>
                                    </div>
                                    <span className="text-emerald-400 font-bold">
                                        {match.winner.totalPoints} pts
                                    </span>
                                </div>
                            )}

                            {/* Top 3 */}
                            <div className="space-y-2">
                                {match.participants
                                    .filter(p => p.finalRank <= 3)
                                    .sort((a, b) => a.finalRank - b.finalRank)
                                    .map(participant => (
                                        <div
                                            key={participant.squadId}
                                            className="flex items-center justify-between bg-cyber-charcoal/50 p-2 border-l-2"
                                            style={{
                                                borderLeftColor:
                                                    participant.finalRank === 1 ? '#10b981' :
                                                        participant.finalRank === 2 ? '#6366f1' :
                                                            '#f59e0b'
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-cyber-muted font-mono text-sm w-6">
                                                    #{participant.finalRank}
                                                </span>
                                                <span className="text-white font-oswald">
                                                    {participant.squadName}
                                                </span>
                                                {participant.isDisqualified && (
                                                    <span className="text-red-400 text-xs uppercase px-2 py-0.5 bg-red-900/30 border border-red-500/30">
                                                        DQ
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-cyber-muted">
                                                    {participant.totalKills} kills
                                                </span>
                                                <span className="text-cyber-pink font-bold">
                                                    {participant.totalPoints} pts
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            {/* Expand for full results */}
                            <button
                                className="w-full mt-3 text-cyber-muted hover:text-cyber-red text-sm font-oswald uppercase tracking-wider transition-colors"
                                onClick={() => {
                                    // TODO: Implement detailed match view
                                    console.log('View full match details:', match);
                                }}
                            >
                                View Full Results →
                            </button>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MatchHistory;

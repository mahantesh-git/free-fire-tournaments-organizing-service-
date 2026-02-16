import { useState, useEffect } from 'react';
import { getTournamentTimeline } from '../../services/historyService';
import Card from '../common/Card';
import { Clock, Trophy, Users, Shield, Archive, CheckCircle } from 'lucide-react';

const TournamentTimeline = ({ tournamentId }) => {
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadTimeline();
    }, [tournamentId]);

    const loadTimeline = async () => {
        try {
            setLoading(true);
            const data = await getTournamentTimeline(tournamentId);
            setTimeline(data.timeline || []);
        } catch (err) {
            console.error('Failed to load timeline:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getEventIcon = (eventType) => {
        switch (eventType) {
            case 'CREATED':
                return <Trophy className="w-5 h-5 text-cyber-red" />;
            case 'ROOMS_GENERATED':
                return <Users className="w-5 h-5 text-cyber-pink" />;
            case 'MATCH_COMPLETED':
                return <CheckCircle className="w-5 h-5 text-emerald-400" />;
            case 'MODERATOR_ASSIGNED':
                return <Shield className="w-5 h-5 text-indigo-400" />;
            case 'ARCHIVED':
                return <Archive className="w-5 h-5 text-cyber-muted" />;
            default:
                return <Clock className="w-5 h-5 text-cyber-muted" />;
        }
    };

    const getEventColor = (eventType) => {
        switch (eventType) {
            case 'CREATED':
                return 'border-cyber-red/30 bg-cyber-red/5';
            case 'ROOMS_GENERATED':
                return 'border-cyber-pink/30 bg-cyber-pink/5';
            case 'MATCH_COMPLETED':
                return 'border-emerald-500/30 bg-emerald-500/5';
            case 'MODERATOR_ASSIGNED':
                return 'border-indigo-500/30 bg-indigo-500/5';
            case 'ARCHIVED':
                return 'border-cyber-muted/30 bg-cyber-charcoal/30';
            default:
                return 'border-cyber-border bg-cyber-charcoal/20';
        }
    };

    const formatEventName = (eventType) => {
        return eventType.replace(/_/g, ' ');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="text-center text-cyber-muted">
                    Loading timeline...
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

    if (timeline.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center text-cyber-muted">
                    No timeline events yet.
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold font-oswald uppercase tracking-wider text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-cyber-red" />
                Tournament Timeline
            </h2>

            <Card className="p-6">
                <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-4">
                        {timeline.map((event, index) => (
                            <div key={index} className="relative">
                                {/* Timeline connector */}
                                {index < timeline.length - 1 && (
                                    <div className="absolute left-6 top-12 bottom-0 w-px bg-cyber-border" />
                                )}

                                <div className={`flex gap-4 p-4 border ${getEventColor(event.event)} transition-colors`}>
                                    <div className="flex-shrink-0 mt-1">
                                        {getEventIcon(event.event)}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-white font-oswald uppercase tracking-wider font-bold">
                                                {formatEventName(event.event)}
                                            </h3>
                                            <span className="text-cyber-muted text-xs font-mono">
                                                {formatDate(event.timestamp)}
                                            </span>
                                        </div>

                                        {event.performedBy && (
                                            <div className="text-sm text-cyber-muted mb-2">
                                                By: <span className="text-cyber-pink">{event.performedBy.role}</span>
                                                {event.performedBy.email && (
                                                    <span className="ml-2 font-mono text-xs">
                                                        ({event.performedBy.email})
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {event.details && Object.keys(event.details).length > 0 && (
                                            <div className="mt-2 text-xs text-cyber-muted font-mono bg-cyber-black/50 p-2 border border-cyber-border">
                                                {Object.entries(event.details).map(([key, value]) => (
                                                    <div key={key} className="flex gap-2">
                                                        <span className="text-cyber-pink">{key}:</span>
                                                        <span>{String(value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default TournamentTimeline;

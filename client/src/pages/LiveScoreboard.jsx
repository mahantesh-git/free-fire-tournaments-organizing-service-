import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import SquadScoreboard from './SquadScoreboard';
import IndividualScoreboard from './IndividualScoreboard';
import CyberLoader from '../components/common/CyberLoader';

const LiveScoreboard = () => {
    const { tournamentId } = useParams();
    const [mode, setMode] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTournament = async () => {
            try {
                const res = await api.get(`/api/tournaments/${tournamentId}`);
                if (res.data.success) {
                    setMode(res.data.tournament.mode);
                }
            } catch (err) {
                console.error("Failed to fetch tournament for live view", err);
            } finally {
                setLoading(false);
            }
        };

        if (tournamentId) fetchTournament();
    }, [tournamentId]);

    if (loading) {
        return <CyberLoader text="INITIALIZING LINK" />;
    }

    if (!mode) {
        return (
            <div className="min-h-screen bg-cyber-black flex items-center justify-center text-white">
                <div className="text-center font-oswald uppercase relative z-10">
                    <h2 className="text-4xl font-black mb-4">Link Error</h2>
                    <p className="text-cyber-muted tracking-widest">Tournament record not found in central database.</p>
                </div>
            </div>
        );
    }

    return mode === 'SQUAD' ? <SquadScoreboard isAudience={true} /> : <IndividualScoreboard isAudience={true} />;
};

export default LiveScoreboard;

import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getPlayers, getSquads, getGameState } from '../services/tournamentService';
import socketService from '../services/socketService';
import { getTenantSlug } from '../utils/tenant';

const TournamentContext = createContext(null);

export const TournamentProvider = ({ children }) => {
    const [tournament, setTournament] = useState(null);
    const [players, setPlayers] = useState([]);
    const [squads, setSquads] = useState([]);
    const [gameState, setGameState] = useState(null);
    const [selectedMatch, setSelectedMatch] = useState(() => {
        // Initialize from URL query param for persistence across reloads
        const params = new URLSearchParams(window.location.search);
        const match = params.get('match');
        return match ? parseInt(match) : null;
    }); // null = Overall
    const [maxMatch, setMaxMatch] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load all data
    const loadData = useCallback(async (silent = false, matchFilter = null) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const api = (await import('../services/api')).default;

            const pathParts = window.location.pathname.split('/');
            const dashboardIndex = pathParts.indexOf('tournament');
            const liveIndex = pathParts.indexOf('live');
            let tournamentId = null;

            // Priority: URL Path > Query Params
            if (dashboardIndex !== -1 && pathParts[dashboardIndex + 1]) {
                tournamentId = pathParts[dashboardIndex + 1];
            } else if (liveIndex !== -1 && pathParts[liveIndex + 1]) {
                tournamentId = pathParts[liveIndex + 1];
            } else {
                const params = new URLSearchParams(window.location.search);
                tournamentId = params.get('tournamentId');
            }

            // Sync Tenant from Query Param
            const params = new URLSearchParams(window.location.search);
            const queryTenant = params.get('tenant');
            if (queryTenant) {
                localStorage.setItem('tenantSlug', queryTenant);
                // Proactively join socket room if connected
                socketService.emit('join_tenant', queryTenant);
            }

            if (tournamentId) {
                try {
                    const tRes = await api.get(`/api/tournaments/${tournamentId}`);
                    if (tRes.data.success) {
                        setTournament(tRes.data.tournament);
                    }
                } catch (tErr) {
                    console.error('Failed to fetch tournament metadata:', tErr);
                }
            }

            // Logic Fix: Ensure we use the current selectedMatch if matchFilter is null (from WebSocket)
            const effectiveMatch = (matchFilter === undefined || matchFilter === null)
                ? selectedMatch
                : matchFilter;

            const [playersRes, squadsRes] = await Promise.all([
                getPlayers(tournamentId, effectiveMatch),
                getSquads(tournamentId, effectiveMatch),
            ]);

            // Sanitize and extract maxMatch
            const playersData = playersRes.players || playersRes;
            const squadsData = squadsRes.squads || squadsRes;

            // maxMatch might come from either API, use whichever is highest
            const matchCount = Math.max(playersRes.maxMatch || 0, squadsRes.maxMatch || 0, 1);
            setMaxMatch(matchCount);

            setPlayers(Array.isArray(playersData) ? playersData : []);
            setSquads(Array.isArray(squadsData) ? squadsData : []);

            // Try to get game state, but don't fail if it doesn't exist
            try {
                const stateData = await getGameState();
                setGameState(stateData);
            } catch (err) {
                // Game state doesn't exist yet, that's okay
                setGameState(null);
            }
        } catch (err) {
            setError(err.message);
            console.error('Error loading tournament data:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [selectedMatch]);

    // Switch Match Helper
    const switchMatch = (matchNum) => {
        setSelectedMatch(matchNum);

        // Update URL query parameter without full reload for persistence
        const url = new URL(window.location);
        if (matchNum === null) {
            url.searchParams.delete('match');
        } else {
            url.searchParams.set('match', matchNum);
        }
        window.history.pushState({}, '', url);

        loadData(false, matchNum);
    };

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    // Setup WebSocket listeners
    useEffect(() => {
        socketService.connect();

        // Join tenant room so we get updates for this specific organization
        const tenantSlug = getTenantSlug();

        if (tenantSlug) {
            console.log(`📡 [Socket] Joining tenant room: ${tenantSlug}`);
            socketService.emit('join_tenant', tenantSlug);
        }

        const handleSquadUpdate = (data) => {
            console.log('📢 Squad update received:', data);
            loadData(true);
        };

        const handlePlayerUpdate = (data) => {
            console.log('📢 Player update received:', data);
            loadData(true);
        };

        const handleJoinedTenant = (data) => {
            console.log('✅ Successfully joined tenant room:', data.tenantId);
        };

        socketService.on('squadUpdate', handleSquadUpdate);
        socketService.on('playerUpdate', handlePlayerUpdate);
        socketService.on('joined_tenant', handleJoinedTenant);

        return () => {
            socketService.off('squadUpdate', handleSquadUpdate);
            socketService.off('playerUpdate', handlePlayerUpdate);
            socketService.off('joined_tenant', handleJoinedTenant);
        };
    }, [loadData]);

    const value = {
        tournament,
        players,
        squads,
        gameState,
        selectedMatch,
        maxMatch,
        loading,
        error,
        loadData,
        switchMatch,
        setPlayers,
        setSquads,
        setGameState,
    };

    return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
};

export const useTournament = () => {
    const context = useContext(TournamentContext);
    if (!context) {
        throw new Error('useTournament must be used within a TournamentProvider');
    }
    return context;
};

export { TournamentContext };

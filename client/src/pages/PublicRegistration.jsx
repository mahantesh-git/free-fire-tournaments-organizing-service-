import { useState, useEffect } from 'react';
import { addPlayer } from '../services/playerService';
import { validatePlayerName, validateFFID } from '../security/inputSanitizer';
import toast from 'react-hot-toast';
import api from '../services/api';
import { User, Users, Trophy, Shield, Crosshair, CheckCircle, DoorOpen, Swords } from 'lucide-react';

// ─── Mode metadata ──────────────────────────────────────────────────────────
const MODE_META = {
    SOLO:        { label: 'Solo',         subtitle: 'Register as a lone wolf mercenary',         playerCount: 1 },
    DUO:         { label: 'Duo',          subtitle: 'Register your 2-player duo team',           playerCount: 2 },
    SQUAD:       { label: 'Squad',        subtitle: 'Register your 4-player death squad',        playerCount: 4 },
    CLASH_SQUAD: { label: 'Clash Squad',  subtitle: 'Register your 4-player clash team (4v4)',   playerCount: 4 },
};

const emptyPlayer = () => ({ playerName: '', ffName: '', ffId: '' });

const PublicRegistration = () => {
    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [registeredData, setRegisteredData] = useState(null);
    const [mode, setMode] = useState('SOLO');
    const [tournamentId, setTournamentId] = useState(null);

    // Solo form
    const [formData, setFormData] = useState({ playerName: '', ffName: '', ffId: '' });

    // Team form — shared for DUO (2), SQUAD (4), CLASH_SQUAD (4)
    const [teamData, setTeamData] = useState({
        teamName: '',
        players: [emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer()],
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tenantParam = params.get('tenant');
        const modeParam = params.get('mode');
        const tournamentIdParam = params.get('tournamentId');

        if (tenantParam) localStorage.setItem('tenantSlug', tenantParam);
        if (modeParam) setMode(modeParam.toUpperCase());
        if (tournamentIdParam) setTournamentId(tournamentIdParam);

        const savedData = localStorage.getItem('tournament_registration');
        if (savedData) {
            setRegistered(true);
            setRegisteredData(JSON.parse(savedData));
        }
    }, []);

    // Derived helpers
    const isTeamMode = mode === 'DUO' || mode === 'SQUAD' || mode === 'CLASH_SQUAD';
    const playerCount = (MODE_META[mode] || MODE_META.SOLO).playerCount;
    const meta = MODE_META[mode] || MODE_META.SOLO;


    const handleSoloSubmit = async (e) => {
        e.preventDefault();
        if (!validatePlayerName(formData.playerName)) {
            toast.error('Invalid username (2-30 chars, alphanumeric)', { id: 'reg-name-err' });
            return;
        }
        if (!validateFFID(formData.ffId)) {
            toast.error('Invalid Free Fire ID (8-12 digits)', { id: 'reg-ffid-err' });
            return;
        }
        setLoading(true);
        try {
            const res = await addPlayer({ ...formData, tournamentId });
            const savedData = { ...formData, roomAssignment: res?.roomAssignment };
            localStorage.setItem('tournament_registration', JSON.stringify(savedData));
            setRegistered(true);
            setRegisteredData(savedData);
            toast.success('Registration successful!', { id: 'reg-success' });
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Failed to register', { id: 'reg-error' });
        } finally {
            setLoading(false);
        }
    };

    const handleTeamSubmit = async (e) => {
        e.preventDefault();
        if (!teamData.teamName || teamData.teamName.trim().length < 2) {
            toast.error('Enter a valid team name (min 2 chars)', { id: 'team-name-err' });
            return;
        }
        for (let i = 0; i < playerCount; i++) {
            const p = teamData.players[i];
            if (!validatePlayerName(p.playerName)) {
                toast.error(`Player ${i + 1}: Invalid username`, { id: `team-p${i}-name-err` });
                return;
            }
            if (!validateFFID(p.ffId)) {
                toast.error(`Player ${i + 1}: Invalid Free Fire ID`, { id: `team-p${i}-ffid-err` });
                return;
            }
        }
        setLoading(true);
        try {
            let response;
            if (mode === 'DUO') {
                response = await api.post('/api/duos/register', {
                    teamName: teamData.teamName,
                    players: teamData.players.slice(0, 2),
                    tournamentId,
                });
            } else {
                // SQUAD or CLASH_SQUAD
                response = await api.post('/api/squads/register', {
                    squadName: teamData.teamName,
                    players: teamData.players.slice(0, 4),
                    tournamentId,
                    mode,
                });
            }
            const savedData = {
                teamName: teamData.teamName,
                mode,
                roomAssignment: response.data?.roomAssignment,
            };
            localStorage.setItem('tournament_registration', JSON.stringify(savedData));
            setRegistered(true);
            setRegisteredData(savedData);
            toast.success(
                mode === 'DUO' ? 'Duo registered!' : mode === 'CLASH_SQUAD' ? 'Clash Squad registered!' : 'Squad registered!',
                { id: 'team-reg-success' }
            );
        } catch (error) {
            const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Registration failed';
            toast.error(msg, { id: 'team-reg-error' });
        } finally {
            setLoading(false);
        }
    };

    const handleTeamPlayerChange = (index, field, value) => {
        const updated = [...teamData.players];
        updated[index] = { ...updated[index], [field]: value };
        setTeamData({ ...teamData, players: updated });
    };

    const Header = () => (
        <div className="w-full py-4 flex justify-center bg-cyber-charcoal border-b border-cyber-border sticky top-0 z-50 shadow-lg mb-8">
            <div className="flex items-center gap-2 font-oswald uppercase tracking-widest text-white">
                <Trophy className="w-6 h-6 text-cyber-red" />
                <span className="font-bold text-lg">
                    Tournament <span className="text-cyber-red">Regulars</span>
                </span>
            </div>
        </div>
    );

    if (registered) {
        return (
            <div className="min-h-screen bg-transparent text-white font-inter flex flex-col items-center">
                <Header />
                <div className="flex-1 flex flex-col justify-center w-full px-4 mb-20">
                    <div className="card-cyber relative max-w-md w-full mx-auto p-10 text-center overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />

                        <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />

                        <h1 className="text-4xl font-black font-oswald text-white mb-2 uppercase tracking-wide">
                            Registered<span className="text-emerald-500">!</span>
                        </h1>
                        <p className="text-cyber-muted mb-8 font-oswald uppercase tracking-wider text-sm">
                            You are secured for the tournament
                        </p>

                        <div className="bg-cyber-charcoal/80 border border-cyber-border p-6 mb-8 text-left space-y-4">
                            {registeredData?.teamName ? (
                                <>
                                    <div className="flex justify-between items-center border-b border-cyber-border pb-2">
                                        <span className="text-cyber-muted text-xs uppercase tracking-widest font-bold font-oswald">
                                            {registeredData.mode === 'DUO' ? 'Duo Name' : 'Team Name'}
                                        </span>
                                        <span className="text-white font-bold font-oswald uppercase tracking-wider text-lg">
                                            {registeredData.teamName}
                                        </span>
                                    </div>
                                    <div className="text-cyber-pink text-xs font-bold uppercase tracking-widest text-center mt-4">
                                        <Users className="w-4 h-4 mx-auto mb-1" />
                                        {registeredData.mode === 'DUO' ? '2 Players Ready' : '4 Players Ready'}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center border-b border-cyber-border pb-2">
                                        <span className="text-cyber-muted text-xs uppercase tracking-widest font-bold font-oswald">Details</span>
                                        <span className="text-cyber-red text-xs uppercase tracking-widest font-bold font-oswald">Solo Entry</span>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        <div className="flex justify-between">
                                            <span className="text-cyber-muted text-sm font-mono">Alias:</span>
                                            <span className="text-white font-bold font-oswald tracking-wide">{registeredData?.playerName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-cyber-muted text-sm font-mono">FF IGN:</span>
                                            <span className="text-white font-bold font-oswald tracking-wide">{registeredData?.ffName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-cyber-muted text-sm font-mono">ID:</span>
                                            <span className="text-cyber-pink font-bold font-mono tracking-wide">{registeredData?.ffId}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {registeredData?.roomAssignment?.assigned && (
                                <div className="mt-4 pt-3 border-t border-cyber-border/60 bg-cyber-black/60 p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <DoorOpen className="w-5 h-5 text-emerald-400" />
                                        <div>
                                            <div className="text-[10px] uppercase font-oswald text-cyber-muted tracking-wider">Assigned Room</div>
                                            <div className="text-emerald-400 font-oswald font-bold text-base tracking-wide">
                                                {registeredData.roomAssignment.roomName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] uppercase font-oswald text-cyber-muted tracking-wider">Slot</div>
                                        <div className="text-white font-mono font-bold text-sm">
                                            #{registeredData.roomAssignment.slotNumber}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 text-xs text-emerald-100/80 font-mono">
                            <p className="font-bold text-emerald-400 mb-1 uppercase">Next Steps</p>
                            <p>You have been automatically slated into your room. Room ID and password will activate once the organizer finalizes the roster.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-white font-inter">
            <Header />
            <div className="flex items-center justify-center p-4 min-h-[calc(100vh-140px)]">
                <div className="card-cyber relative max-w-3xl w-full p-8 md:p-12 overflow-hidden border-2 border-cyber-red/30">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Crosshair className="w-48 h-48 text-cyber-red spin-slow" />
                    </div>

                    {/* Mode-aware heading */}
                    <div className="text-center mb-10 relative z-10">
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-2 font-oswald uppercase tracking-wide flex items-center justify-center gap-3">
                            {mode === 'SOLO' ? <User className="w-10 h-10 text-cyber-red" /> :
                             mode === 'CLASH_SQUAD' ? <Swords className="w-10 h-10 text-cyber-red" /> :
                             <Users className="w-10 h-10 text-cyber-red" />}
                            {meta.label} <span className="text-cyber-red">Entry</span>
                        </h1>
                        <p className="text-cyber-muted text-xs font-bold font-oswald uppercase tracking-[0.3em]">
                            {meta.subtitle}
                        </p>
                    </div>

                    {/* Rules */}
                    <div className="mb-8 bg-cyber-charcoal border-l-4 border-cyber-pink p-4 relative z-10">
                        <h4 className="text-cyber-pink font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2 font-oswald">
                            <Shield className="w-3 h-3" /> Registration Protocols
                        </h4>
                        <ul className="text-cyber-muted space-y-1 text-xs font-mono ml-1">
                            <li><span className="text-white font-bold">Username:</span> 2-30 chars. Alphanumeric, dots &amp; underscores only.</li>
                            <li><span className="text-white font-bold">FF Name:</span> Exact In-Game Name for accurate scoring.</li>
                            <li><span className="text-white font-bold">FF ID:</span> 8-12 digits. ID Verification required.</li>
                            {isTeamMode && <li><span className="text-white font-bold">Team Name:</span> Min 2 chars. Unique per tournament.</li>}
                        </ul>
                    </div>

                    {/* ── SOLO FORM ── */}
                    {mode === 'SOLO' && (
                        <form onSubmit={handleSoloSubmit} className="space-y-6 relative z-10">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-oswald font-bold text-cyber-muted uppercase tracking-widest mb-2">Username</label>
                                    <input
                                        value={formData.playerName}
                                        onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
                                        placeholder="ENTER YOUR ALIAS"
                                        required
                                        className="input-cyber w-full py-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-oswald font-bold text-cyber-muted uppercase tracking-widest mb-2">In-Game Free Fire Name</label>
                                    <input
                                        value={formData.ffName}
                                        onChange={(e) => setFormData({ ...formData, ffName: e.target.value })}
                                        placeholder="EXACT IN-GAME NAME"
                                        required
                                        className="input-cyber w-full py-3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-oswald font-bold text-cyber-muted uppercase tracking-widest mb-2">Free Fire ID</label>
                                    <input
                                        value={formData.ffId}
                                        onChange={(e) => setFormData({ ...formData, ffId: e.target.value })}
                                        placeholder="NUMERICAL UID"
                                        required
                                        className="input-cyber w-full py-3 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn-cyber-primary text-lg py-4 shadow-[0_0_20px_rgba(255,59,59,0.3)] hover:shadow-[0_0_30px_rgba(255,59,59,0.5)]"
                                >
                                    {loading ? 'PROCESSING...' : 'CONFIRM REGISTRATION'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── TEAM FORM (DUO / SQUAD / CLASH_SQUAD) ── */}
                    {isTeamMode && (
                        <form onSubmit={handleTeamSubmit} className="space-y-8 relative z-10">
                            <div>
                                <label className="block text-xs font-oswald font-bold text-cyber-red uppercase tracking-widest mb-2">
                                    {mode === 'DUO' ? 'Duo Team Name' : mode === 'CLASH_SQUAD' ? 'Clash Squad Name' : 'Squad Handle'}
                                </label>
                                <input
                                    value={teamData.teamName}
                                    onChange={(e) => setTeamData({ ...teamData, teamName: e.target.value })}
                                    placeholder={mode === 'DUO' ? 'DUO TEAM NAME' : 'TEAM NAME'}
                                    required
                                    className="input-cyber w-full text-lg py-3 font-bold uppercase"
                                />
                            </div>

                            <div className={`grid grid-cols-1 gap-6 ${playerCount > 2 ? 'md:grid-cols-2' : ''}`}>
                                {teamData.players.slice(0, playerCount).map((player, index) => (
                                    <div key={index} className="space-y-4 p-5 bg-cyber-charcoal border border-cyber-border hover:border-cyber-red/50 transition-colors relative group">
                                        <div className="absolute top-0 right-0 bg-cyber-border text-cyber-muted px-2 py-0.5 text-[10px] font-bold font-oswald uppercase tracking-widest group-hover:bg-cyber-red group-hover:text-white transition-colors">
                                            Player 0{index + 1}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-cyber-muted uppercase tracking-widest mb-1.5 font-oswald">Username</label>
                                            <input
                                                value={player.playerName}
                                                onChange={(e) => handleTeamPlayerChange(index, 'playerName', e.target.value)}
                                                placeholder="ALIAS"
                                                required
                                                className="w-full bg-cyber-black border border-cyber-border px-3 py-2 text-sm text-white focus:outline-none focus:border-cyber-pink font-medium transition-colors uppercase"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-cyber-muted uppercase tracking-widest mb-1.5 font-oswald">FF Name</label>
                                            <input
                                                value={player.ffName}
                                                onChange={(e) => handleTeamPlayerChange(index, 'ffName', e.target.value)}
                                                placeholder="IGN"
                                                required
                                                className="w-full bg-cyber-black border border-cyber-border px-3 py-2 text-sm text-white focus:outline-none focus:border-cyber-pink font-medium transition-colors uppercase"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-cyber-muted uppercase tracking-widest mb-1.5 font-oswald">FF ID</label>
                                            <input
                                                value={player.ffId}
                                                onChange={(e) => handleTeamPlayerChange(index, 'ffId', e.target.value)}
                                                placeholder="UID"
                                                required
                                                className="w-full bg-cyber-black border border-cyber-border px-3 py-2 text-sm text-white focus:outline-none focus:border-cyber-pink font-medium transition-colors font-mono"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn-cyber-primary text-lg py-4 shadow-[0_0_20px_rgba(255,59,59,0.3)] hover:shadow-[0_0_30px_rgba(255,59,59,0.5)]"
                                >
                                    {loading
                                        ? `PROCESSING ${meta.label.toUpperCase()}...`
                                        : `CONFIRM ${meta.label.toUpperCase()} REGISTRATION`}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicRegistration;

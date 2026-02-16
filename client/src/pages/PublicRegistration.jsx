import { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { addPlayer } from '../services/playerService';
import Toast from '../components/common/Toast';
import { validatePlayerName, validateFFID } from '../security/inputSanitizer';
import toast from 'react-hot-toast';
import { User, Users, Trophy, Shield, Crosshair, CheckCircle } from 'lucide-react';

const PublicRegistration = () => {
    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(false);
    const [registeredData, setRegisteredData] = useState(null);
    const [mode, setMode] = useState('SOLO'); // Default to SOLO
    const [tournamentId, setTournamentId] = useState(null);

    const [formData, setFormData] = useState({
        playerName: '',
        ffName: '',
        ffId: '',
    });

    // Squad form data (4 players)
    const [squadData, setSquadData] = useState({
        squadName: '',
        players: [
            { playerName: '', ffName: '', ffId: '' },
            { playerName: '', ffName: '', ffId: '' },
            { playerName: '', ffName: '', ffId: '' },
            { playerName: '', ffName: '', ffId: '' }
        ]
    });

    useEffect(() => {
        // Parse Query Params for Tenant ID, Mode, and Tournament ID
        const params = new URLSearchParams(window.location.search);
        const tenantParam = params.get('tenant');
        const modeParam = params.get('mode');
        const tournamentIdParam = params.get('tournamentId');

        if (tenantParam) {
            localStorage.setItem('tenantSlug', tenantParam);
        }
        if (modeParam) {
            setMode(modeParam);
        }
        if (tournamentIdParam) {
            setTournamentId(tournamentIdParam);
        }

        // Check if already registered on this device
        const savedData = localStorage.getItem('tournament_registration');
        if (savedData) {
            setRegistered(true);
            setRegisteredData(JSON.parse(savedData));
        }
    }, []);


    const handleSoloSubmit = async (e) => {
        e.preventDefault();

        // Final validation check before submission
        if (!validatePlayerName(formData.playerName)) {
            toast.error('Please fix the username (2-30 chars, alphanumeric)', { id: 'solo-reg-name-error' });
            return;
        }
        if (!validateFFID(formData.ffId)) {
            toast.error('Please fix the Free Fire ID (8-12 numerical digits)', { id: 'solo-reg-ffid-error' });
            return;
        }

        setLoading(true);
        try {
            await addPlayer({ ...formData, tournamentId });
            localStorage.setItem('tournament_registration', JSON.stringify(formData));
            setRegistered(true);
            setRegisteredData(formData);
            toast.success('Registration successful!', { id: 'solo-reg-success' });
        } catch (error) {
            console.error('Registration failed:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to register player', { id: 'solo-reg-error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSquadSubmit = async (e) => {
        e.preventDefault();

        // Validate squad name
        if (!squadData.squadName || squadData.squadName.length < 2) {
            toast.error('Please enter a valid squad name', { id: 'squad-reg-name-error' });
            return;
        }

        // Validate all 4 players
        for (let i = 0; i < 4; i++) {
            const player = squadData.players[i];
            if (!validatePlayerName(player.playerName)) {
                toast.error(`Player ${i + 1}: Invalid username`, { id: `squad-reg-p${i + 1}-name-error` });
                return;
            }
            if (!validateFFID(player.ffId)) {
                toast.error(`Player ${i + 1}: Invalid Free Fire ID`, { id: `squad-reg-p${i + 1}-ffid-error` });
                return;
            }
        }

        setLoading(true);
        try {
            // Register squad using the new squad endpoint
            const response = await fetch('/api/squads/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': localStorage.getItem('tenantSlug')
                },
                body: JSON.stringify({ ...squadData, tournamentId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to register squad');
            }

            localStorage.setItem('tournament_registration', JSON.stringify(squadData));
            setRegistered(true);
            setRegisteredData(squadData);
            toast.success('Squad registered successfully!', { id: 'squad-reg-success' });
        } catch (error) {
            console.error('Squad registration failed:', error);
            toast.error(error.message || 'Failed to register squad', { id: 'squad-reg-error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSquadPlayerChange = (index, field, value) => {
        const newPlayers = [...squadData.players];
        newPlayers[index] = { ...newPlayers[index], [field]: value };
        setSquadData({ ...squadData, players: newPlayers });
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
            <div className="min-h-screen bg-cyber-black text-white font-inter flex flex-col items-center">
                <Header />
                <div className="flex-1 flex flex-col justify-center w-full px-4 mb-20">
                    <div className="card-cyber relative max-w-md w-full mx-auto p-10 text-center overflow-hidden border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                        {/* Success Decoration */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>

                        <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />

                        <h1 className="text-4xl font-black font-oswald text-white mb-2 uppercase tracking-wide">
                            Registered<span className="text-emerald-500">!</span>
                        </h1>
                        <p className="text-cyber-muted mb-8 font-oswald uppercase tracking-wider text-sm">
                            You are secured for the tournament
                        </p>

                        <div className="bg-cyber-charcoal/80 border border-cyber-border p-6 mb-8 text-left space-y-4">
                            {mode === 'SQUAD' ? (
                                <>
                                    <div className="flex justify-between items-center border-b border-cyber-border pb-2">
                                        <span className="text-cyber-muted text-xs uppercase tracking-widest font-bold font-oswald">Squad Name</span>
                                        <span className="text-white font-bold font-oswald uppercase tracking-wider text-lg">{registeredData?.squadName}</span>
                                    </div>
                                    <div className="text-cyber-pink text-xs font-bold uppercase tracking-widest text-center mt-4">
                                        <Users className="w-4 h-4 mx-auto mb-1" />
                                        4 Players Ready
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
                        </div>

                        <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 text-xs text-emerald-100/80 font-mono">
                            <p className="font-bold text-emerald-400 mb-1 uppercase">Next Steps</p>
                            <p>Wait for the organizer to share the room details. You'll receive the Room ID and Password before the match starts.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter">
            <Header />
            <div className="flex items-center justify-center p-4 min-h-[calc(100vh-140px)]">
                <div className="card-cyber relative max-w-3xl w-full p-8 md:p-12 overflow-hidden border-2 border-cyber-red/30">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Crosshair className="w-48 h-48 text-cyber-red spin-slow" />
                    </div>

                    <div className="text-center mb-10 relative z-10">
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-2 font-oswald uppercase tracking-wide flex items-center justify-center gap-3">
                            {mode === 'SQUAD' ? <Users className="w-10 h-10 text-cyber-red" /> : <User className="w-10 h-10 text-cyber-red" />}
                            {mode === 'SQUAD' ? 'Squad' : 'Solo'} <span className="text-cyber-red">Entry</span>
                        </h1>
                        <p className="text-cyber-muted text-xs font-bold font-oswald uppercase tracking-[0.3em]">
                            {mode === 'SQUAD' ? 'Register your 4-player death squad' : 'Register as a lone wolf mercenary'}
                        </p>
                    </div>

                    {/* How to Fix Clues Box */}
                    <div className="mb-8 bg-cyber-charcoal border-l-4 border-cyber-pink p-4 relative z-10">
                        <h4 className="text-cyber-pink font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2 font-oswald">
                            <Shield className="w-3 h-3" /> Registration Protocols
                        </h4>
                        <ul className="text-cyber-muted space-y-1 text-xs font-mono ml-1">
                            <li><span className="text-white font-bold">Username:</span> 2-30 chars. Alphanumeric, dots & underscores only.</li>
                            <li><span className="text-white font-bold">FF Name:</span> Exact In-Game Name for accurate scoring.</li>
                            <li><span className="text-white font-bold">FF ID:</span> 8-12 digits. ID Verification required.</li>
                        </ul>
                    </div>

                    {mode === 'SQUAD' ? (
                        // Squad Registration Form
                        <form onSubmit={handleSquadSubmit} className="space-y-8 relative z-10">
                            <div>
                                <label className="block text-xs font-oswald font-bold text-cyber-red uppercase tracking-widest mb-2">Squad Handle</label>
                                <input
                                    value={squadData.squadName}
                                    onChange={(e) => setSquadData({ ...squadData, squadName: e.target.value })}
                                    placeholder="TEAM NAME"
                                    required
                                    className="input-cyber w-full text-lg py-3 font-bold uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {squadData.players.map((player, index) => (
                                    <div key={index} className="space-y-4 p-5 bg-cyber-charcoal border border-cyber-border hover:border-cyber-red/50 transition-colors relative group">
                                        <div className="absolute top-0 right-0 bg-cyber-border text-cyber-muted px-2 py-0.5 text-[10px] font-bold font-oswald uppercase tracking-widest group-hover:bg-cyber-red group-hover:text-white transition-colors">
                                            Player 0{index + 1}
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-cyber-muted uppercase tracking-widest mb-1.5 font-oswald">Username</label>
                                            <input
                                                value={player.playerName}
                                                onChange={(e) => handleSquadPlayerChange(index, 'playerName', e.target.value)}
                                                placeholder="ALIAS"
                                                required
                                                className="w-full bg-cyber-black border border-cyber-border px-3 py-2 text-sm text-white focus:outline-none focus:border-cyber-pink font-medium transition-colors uppercase"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-cyber-muted uppercase tracking-widest mb-1.5 font-oswald">FF Name</label>
                                            <input
                                                value={player.ffName}
                                                onChange={(e) => handleSquadPlayerChange(index, 'ffName', e.target.value)}
                                                placeholder="IGN"
                                                required
                                                className="w-full bg-cyber-black border border-cyber-border px-3 py-2 text-sm text-white focus:outline-none focus:border-cyber-pink font-medium transition-colors uppercase"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-cyber-muted uppercase tracking-widest mb-1.5 font-oswald">FF ID</label>
                                            <input
                                                value={player.ffId}
                                                onChange={(e) => handleSquadPlayerChange(index, 'ffId', e.target.value)}
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
                                    {loading ? 'PROCESSING SQUAD...' : 'CONFIRM SQUAD REGISTRATION'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Solo Registration Form
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
                </div>
            </div>
        </div>
    );
};

export default PublicRegistration;

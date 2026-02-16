import { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import QRDisplayModal from '../components/player/QRDisplayModal';
import ExcelImport from '../components/player/ExcelImport';
import PlayerList from '../components/player/PlayerList';
import SquadList from '../components/player/SquadList';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';
import { getPlayers, addPlayer } from '../services/playerService';
import socketService from '../services/socketService';
import Toast from '../components/common/Toast';
import { UserPlus, FileSpreadsheet, Users, Download, Trash2, Shield } from 'lucide-react';

const PlayerRegistration = () => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [squads, setSquads] = useState([]);
    const [activeTab, setActiveTab] = useState('manual');
    const [showQRDisplay, setShowQRDisplay] = useState(false);

    const [formData, setFormData] = useState({
        playerName: '',
        ffName: '',
        ffId: '',
    });

    const [squadData, setSquadData] = useState({
        squadName: '',
        players: [
            { playerName: '', ffName: '', ffId: '' },
            { playerName: '', ffName: '', ffId: '' },
            { playerName: '', ffName: '', ffId: '' },
            { playerName: '', ffName: '', ffId: '' }
        ]
    });

    const [tournamentId, setTournamentId] = useState(null);
    const [tournament, setTournament] = useState(null);

    useEffect(() => {
        // Parse Query Params for Tournament ID
        const params = new URLSearchParams(window.location.search);
        const tid = params.get('tournamentId');
        if (tid) {
            setTournamentId(tid);
        }
    }, []);

    useEffect(() => {
        if (tournamentId) {
            fetchTournamentDetails();
        }
    }, [tournamentId]);

    useEffect(() => {
        if (tournamentId && tournament) {
            loadPlayers();
        }
    }, [tournamentId, tournament?.mode]);

    const fetchTournamentDetails = async () => {
        try {
            const res = await api.get(`/api/tournaments/${tournamentId}`);
            if (res.data.success) {
                setTournament(res.data.tournament);
            }
        } catch (error) {
            console.error("Failed to fetch tournament details", error);
        }
    };

    const loadPlayers = async () => {
        setLoading(true);
        try {
            if (tournament?.mode === 'SQUAD') {
                const res = await api.get(`/api/kills/getSquads?tournamentId=${tournamentId}`);
                const squadData = res.data.squads || (Array.isArray(res.data) ? res.data : []);
                setSquads(squadData);
            } else {
                const res = await getPlayers(tournamentId);
                const playerData = res.players || (Array.isArray(res) ? res : []);
                setPlayers(playerData);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            Toast.error('Failed to load registered entries');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (tournament?.mode === 'SQUAD') {
                // Register squad
                const res = await api.post('/api/kills/squadRegister', { ...squadData, tournamentId });
                if (res.data.success) {
                    Toast.success('Squad registered successfully!');
                    setSquadData({
                        squadName: '',
                        players: [
                            { playerName: '', ffName: '', ffId: '' },
                            { playerName: '', ffName: '', ffId: '' },
                            { playerName: '', ffName: '', ffId: '' },
                            { playerName: '', ffName: '', ffId: '' }
                        ]
                    });
                }
            } else {
                // Register individual player
                await addPlayer({ ...formData, tournamentId });
                setFormData({ playerName: '', ffName: '', ffId: '' });
                Toast.success('Player registered successfully!');
            }
            loadPlayers();
        } catch (error) {
            console.error('Failed to register:', error);
            Toast.error(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSquadPlayerChange = (index, field, value) => {
        const newPlayers = [...squadData.players];
        newPlayers[index] = { ...newPlayers[index], [field]: value };
        setSquadData({ ...squadData, players: newPlayers });
    };

    const handleExport = () => {
        exportPlayersToExcel(tournamentId);
    };

    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter">
            {/* Navbar Placeholder if not fully integrated yet, referencing previous style */}
            <div className="border-b border-cyber-border bg-cyber-charcoal px-6 py-4 shadow-lg mb-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-oswald font-bold tracking-wider text-white uppercase">
                        <span className="text-cyber-red">ADMIN</span> PANEL
                    </h1>
                    <div className="flex gap-4">
                        <Button variant="ghost" size="sm" onClick={() => window.location.href = '/'}>Home</Button>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8 max-w-7xl mx-auto block">
                <div className="mb-12 text-center relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 bg-cyber-red/20 blur-[100px] -z-10"></div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-4 font-oswald uppercase tracking-wide leading-none">
                        {tournament?.mode === 'SQUAD' ? (
                            <>SQUAD <span className="text-stroke-cyber-red text-transparent">MANAGEMENT</span></>
                        ) : (
                            <>Player <span className="text-stroke-cyber-red text-transparent">Registration</span></>
                        )}
                    </h1>
                    <div className="h-1 w-24 bg-cyber-red mx-auto mb-6"></div>
                    <p className="text-cyber-muted uppercase tracking-[0.3em] text-sm font-oswald font-bold">
                        {tournament?.mode === 'SQUAD'
                            ? 'Register squads of 4 or track tournament entries'
                            : 'Register competitors individually or bulk import via Excel'}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: Registration Form */}
                    <div className="card-cyber p-8 relative overflow-hidden h-fit">
                        {/* Corner Accents */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-red opacity-100" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-red opacity-100" />

                        <div className="flex items-center gap-4 mb-8 border-b-2 border-cyber-border pb-4">
                            <h2 className="text-2xl font-oswald font-bold text-white uppercase tracking-wider flex items-center gap-3">
                                <UserPlus className="w-6 h-6 text-cyber-red" />
                                New Entry
                            </h2>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-0 mb-8 w-full bg-cyber-black border border-cyber-border">
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`flex-1 py-4 font-oswald font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'manual'
                                    ? 'bg-cyber-red text-white'
                                    : 'text-cyber-muted hover:text-white hover:bg-cyber-charcoal'
                                    }`}
                            >
                                <UserPlus className="w-4 h-4" /> Manual Add
                            </button>
                            <button
                                onClick={() => setActiveTab('import')}
                                className={`flex-1 py-4 font-oswald font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'import'
                                    ? 'bg-cyber-pink text-white'
                                    : 'text-cyber-muted hover:text-white hover:bg-cyber-charcoal'
                                    }`}
                            >
                                <FileSpreadsheet className="w-4 h-4" /> Bulk Import
                            </button>
                        </div>

                        {activeTab === 'manual' && (
                            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                                {tournament?.mode === 'SQUAD' ? (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-oswald font-bold text-cyber-red uppercase tracking-widest mb-2">Squad Handle</label>
                                            <input
                                                value={squadData.squadName}
                                                onChange={(e) => setSquadData({ ...squadData, squadName: e.target.value })}
                                                placeholder="TEAM NAME"
                                                required
                                                className="input-cyber w-full"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {squadData.players.map((player, index) => (
                                                <div key={index} className="space-y-3 p-3 bg-cyber-charcoal border border-cyber-border relative group">
                                                    <div className="absolute top-0 right-0 bg-cyber-border text-cyber-muted px-2 py-0.5 text-[10px] font-bold font-oswald uppercase">
                                                        P0{index + 1}
                                                    </div>
                                                    <input
                                                        value={player.playerName}
                                                        onChange={(e) => handleSquadPlayerChange(index, 'playerName', e.target.value)}
                                                        placeholder="ALIAS"
                                                        required
                                                        className="w-full bg-cyber-black border border-cyber-border px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-red transition-colors uppercase"
                                                    />
                                                    <input
                                                        value={player.ffName}
                                                        onChange={(e) => handleSquadPlayerChange(index, 'ffName', e.target.value)}
                                                        placeholder="IGN"
                                                        required
                                                        className="w-full bg-cyber-black border border-cyber-border px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-red transition-colors uppercase"
                                                    />
                                                    <input
                                                        value={player.ffId}
                                                        onChange={(e) => handleSquadPlayerChange(index, 'ffId', e.target.value)}
                                                        placeholder="UID"
                                                        required
                                                        className="w-full bg-cyber-black border border-cyber-border px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-red transition-colors font-mono"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-oswald font-bold text-cyber-muted uppercase tracking-widest mb-2">Username</label>
                                            <input
                                                value={formData.playerName}
                                                onChange={(e) => setFormData({ ...formData, playerName: e.target.value })}
                                                placeholder="ENTER ALIAS"
                                                required
                                                className="input-cyber w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-oswald font-bold text-cyber-muted uppercase tracking-widest mb-2">Free Fire Name</label>
                                            <input
                                                value={formData.ffName}
                                                onChange={(e) => setFormData({ ...formData, ffName: e.target.value })}
                                                placeholder="EXACT IN-GAME NAME"
                                                required
                                                className="input-cyber w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-oswald font-bold text-cyber-muted uppercase tracking-widest mb-2">Free Fire ID (ffud)</label>
                                            <input
                                                value={formData.ffId}
                                                onChange={(e) => setFormData({ ...formData, ffId: e.target.value })}
                                                placeholder="8-12 DIGIT ID"
                                                required
                                                className="input-cyber w-full"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex gap-4">
                                    <Button
                                        type="submit"
                                        loading={loading}
                                        className="flex-1"
                                    >
                                        {tournament?.mode === 'SQUAD' ? 'REGISTER SQUAD' : 'REGISTER PLAYER'}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (tournament?.mode === 'SQUAD') {
                                                setSquadData({
                                                    squadName: '',
                                                    players: [
                                                        { playerName: '', ffName: '', ffId: '' },
                                                        { playerName: '', ffName: '', ffId: '' },
                                                        { playerName: '', ffName: '', ffId: '' },
                                                        { playerName: '', ffName: '', ffId: '' }
                                                    ]
                                                });
                                            } else {
                                                setFormData({ playerName: '', ffName: '', ffId: '' });
                                            }
                                        }}
                                        className="px-4 border border-cyber-border text-cyber-muted hover:text-white hover:border-white transition-colors uppercase font-bold font-oswald tracking-wider"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'import' && (
                            <div className="py-8 animate-fade-in">
                                <ExcelImport onImportSuccess={loadPlayers} tournamentId={tournamentId} />
                                <div className="mt-8 text-center">
                                    <p className="text-cyber-muted text-xs font-oswald uppercase tracking-wider mb-4">Need a template?</p>
                                    <button
                                        onClick={() => setShowQRDisplay(true)}
                                        className="text-cyber-pink hover:text-white border-b border-cyber-pink hover:border-white transition-colors font-bold uppercase text-xs tracking-widest pb-1"
                                    >
                                        View QR Format Guide
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Player List */}
                    <div className="card-cyber p-0 relative overflow-hidden flex flex-col h-[600px] border-t-4 border-t-cyber-purple">
                        <div className="p-6 border-b border-cyber-border bg-cyber-charcoal flex justify-between items-center">
                            <h2 className="text-xl font-oswald font-bold text-white uppercase tracking-wider flex items-center gap-3">
                                {tournament?.mode === 'SQUAD' ? (
                                    <Shield className="w-5 h-5 text-cyber-purple" />
                                ) : (
                                    <Users className="w-5 h-5 text-cyber-purple" />
                                )}
                                {tournament?.mode === 'SQUAD' ? 'Squad Database' : 'Player Database'}
                            </h2>
                            <div className="font-mono text-cyber-purple font-bold bg-cyber-black px-3 py-1 border border-cyber-border text-sm">
                                {tournament?.mode === 'SQUAD' ? squads.length : players.length} RECORDS
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-cyber-black/50">
                            {tournament?.mode === 'SQUAD' ? (
                                <SquadList squads={squads} onUpdate={loadPlayers} tournamentId={tournamentId} />
                            ) : (
                                <PlayerList players={players} onUpdate={loadPlayers} />
                            )}
                        </div>

                        <div className="p-6 border-t border-cyber-border bg-cyber-charcoal">
                            <button
                                onClick={handleExport}
                                disabled={(tournament?.mode === 'SQUAD' ? squads.length : players.length) === 0}
                                className="w-full btn-cyber-secondary flex items-center justify-center gap-2 py-4"
                            >
                                <Download className="w-4 h-4" />
                                EXPORT DATABASE TO EXCEL
                            </button>
                        </div>
                    </div>
                </div>

                <QRDisplayModal
                    isOpen={showQRDisplay}
                    onClose={() => setShowQRDisplay(false)}
                />
            </div>
        </div>
    );
};

export default PlayerRegistration;

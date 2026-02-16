import { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Toast from '../components/common/Toast';
import SquadCard from '../components/admin/SquadCard';
import TopPlayersModal from '../components/admin/TopPlayersModal';
import Navbar from '../components/layout/Navbar';
import {
    updatePlayerKills,
    deleteAllData,
    completeSquadMatch,
    endGlobalMatch,
    getActiveMatches
} from '../services/tournamentService';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Trophy, Users, Crosshair, Layers, Trash2, Save, Upload, Download, RefreshCw, StopCircle, PlayCircle } from 'lucide-react';

const AdminPanel = () => {
    const navigate = useNavigate();
    const { squads, players, gameState, loadData, loading: contextLoading } = useTournament();

    // UI State
    const [currentRoom, setCurrentRoom] = useState('all');
    const [isTopPlayersModalOpen, setIsTopPlayersModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Data State
    const [placements, setPlacements] = useState({});

    // Derived Data
    const rooms = useMemo(() => {
        const uniqueRooms = new Set(['all']);
        squads.forEach(squad => {
            if (squad.room && squad.room !== 'Unassigned') {
                uniqueRooms.add(squad.room);
            }
        });
        return Array.from(uniqueRooms).sort((a, b) => {
            if (a === 'all') return -1;
            if (b === 'all') return 1;
            return a.localeCompare(b, undefined, { numeric: true });
        });
    }, [squads]);

    const filteredSquads = useMemo(() => {
        return currentRoom === 'all'
            ? squads
            : squads.filter(s => s.room === currentRoom);
    }, [squads, currentRoom]);

    const totalKills = useMemo(() => {
        return players.reduce((sum, p) => sum + (p.total || 0), 0);
    }, [players]);

    // Handlers
    const handleUpdateKills = async (identifier, map, value) => {
        try {
            await updatePlayerKills({
                ffId: identifier,
                [map]: value
            });
        } catch (error) {
            Toast.error('Failed to update kills');
            console.error(error);
        }
    };

    const handleUpdatePlacement = (squadId, value) => {
        setPlacements(prev => ({
            ...prev,
            [squadId]: value
        }));
    };

    const handleDeletePlayer = async (playerId) => {
        if (window.confirm('Are you sure you want to delete this player?')) {
            Toast.error('Delete player functionality not yet implemented in service');
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('⚠️ CRITICAL: Are you sure you want to DELETE ALL DATA? This cannot be undone.')) {
            const verify = prompt('Type DELETE to confirm:');
            if (verify === 'DELETE') {
                setLoading(true);
                try {
                    await deleteAllData();
                    await loadData();
                    Toast.success('All data cleared successfully');
                } catch (error) {
                    Toast.error(error.message);
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const handleEndMatch = async () => {
        if (!window.confirm('Are you sure you want to END the match? This will save all placements and calculate scores.')) {
            return;
        }

        setLoading(true);
        try {
            const matchesData = await getActiveMatches();
            const activeMatches = matchesData.matches || [];
            const squadGameMap = {};
            activeMatches.forEach(m => {
                if (m.squadId) squadGameMap[m.squadId._id] = m._id;
            });

            let updatedCount = 0;
            const promises = Object.keys(placements).map(async (squadId) => {
                const gameStateId = squadGameMap[squadId];
                if (gameStateId) {
                    await completeSquadMatch(gameStateId, parseInt(placements[squadId]));
                    updatedCount++;
                }
            });

            await Promise.all(promises);
            await endGlobalMatch();
            Toast.success(`Match ended! Scores calculated for ${updatedCount} squads.`);
            loadData();
        } catch (error) {
            console.error('Error ending match:', error);
            Toast.error('Failed to end match properly');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = (type) => {
        Toast.loading('Exporting data...');
        setTimeout(() => {
            try {
                const wb = XLSX.utils.book_new();
                if (type === 'squads') {
                    const data = squads.map(s => ({
                        'Squad Name': s.squadName,
                        'Room': s.room,
                        'Total Kills': s.totalKills,
                        'Rank': placements[s._id] || s.roundPlacement || '-'
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, "Squads");
                }
                XLSX.writeFile(wb, `tournament_${type}_${new Date().getTime()}.xlsx`);
                Toast.dismiss();
                Toast.success('Export complete');
            } catch (err) {
                Toast.error('Export failed');
                console.error(err);
            }
        }, 500);
    };

    const handleSaveTopPlayers = (selectedIds) => {
        console.log('Selected Top Players:', selectedIds);
        Toast.success('Top players selection saved (Local)');
    };

    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter selection:bg-cyber-red selection:text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,59,59,0.1),transparent_70%)]"></div>
                <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-[radial-gradient(circle_at_100%_100%,rgba(255,0,110,0.1),transparent_60%)]"></div>
                <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-5"></div>
            </div>

            <Navbar />

            <div className="p-4 md:p-8 pb-32 relative z-10">
                <div className="max-w-7xl mx-auto">
                    {/* Header Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Card className="p-4 flex items-center justify-between group hover:border-cyber-red/50 transition-colors">
                            <div>
                                <div className="text-3xl font-oswald font-bold text-white group-hover:text-cyber-red transition-colors">{players.length}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">Total Players</div>
                            </div>
                            <Users className="w-8 h-8 text-cyber-red/20 group-hover:text-cyber-red group-hover:scale-110 transition-all" />
                        </Card>
                        <Card className="p-4 flex items-center justify-between group hover:border-cyber-pink/50 transition-colors">
                            <div>
                                <div className="text-3xl font-oswald font-bold text-white group-hover:text-cyber-pink transition-colors">{squads.length}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">Total Squads</div>
                            </div>
                            <Layers className="w-8 h-8 text-cyber-pink/20 group-hover:text-cyber-pink group-hover:scale-110 transition-all" />
                        </Card>
                        <Card className="p-4 flex items-center justify-between group hover:border-cyber-purple/50 transition-colors">
                            <div>
                                <div className="text-3xl font-oswald font-bold text-white group-hover:text-cyber-purple transition-colors">{rooms.length - 1}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">Total Rooms</div>
                            </div>
                            <Trophy className="w-8 h-8 text-cyber-purple/20 group-hover:text-cyber-purple group-hover:scale-110 transition-all" />
                        </Card>
                        <Card className="p-4 flex items-center justify-between group hover:border-cyber-neon/50 transition-colors">
                            <div>
                                <div className="text-3xl font-oswald font-bold text-cyber-neon text-shadow-neon">{totalKills}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest font-mono">Total Kills</div>
                            </div>
                            <Crosshair className="w-8 h-8 text-cyber-neon/20 group-hover:text-cyber-neon group-hover:scale-110 group-hover:rotate-45 transition-all" />
                        </Card>
                    </div>

                    {/* Main Control Bar */}
                    <div className="mb-6 sticky top-4 z-40">
                        <div className="absolute inset-0 bg-cyber-black/80 backdrop-blur-md border-b border-white/5 shadow-2xl skew-x-[-10deg] transform origin-top-left scale-x-110 -z-10"></div>
                        <Card className="p-4 bg-cyber-black/80 backdrop-blur border-cyber-red/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-cyber-red/10 to-transparent pointer-events-none"></div>

                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h1 className="text-3xl font-oswald font-bold text-white leading-none tracking-tight flex items-center gap-3">
                                            <span className="text-cyber-red">///</span> ADMIN CONTROL
                                        </h1>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`w-2 h-2 rounded-none transform rotate-45 ${gameState?.active ? 'bg-cyber-neon shadow-[0_0_10px_#00f0ff]' : 'bg-cyber-red shadow-[0_0_10px_#ff3b3b]'} animate-pulse`}></div>
                                            <span className={`text-xs font-mono font-bold tracking-widest ${gameState?.active ? 'text-cyber-neon' : 'text-cyber-red'}`}>
                                                {gameState?.active ? 'SYSTEM ONLINE // MATCH ACTIVE' : 'SYSTEM STANDBY // NO MATCH'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 justify-center">
                                    <Button size="sm" variant="secondary" onClick={() => setIsTopPlayersModalOpen(true)} icon="trophy">
                                        TOP PLAYERS
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={loadData} loading={loading || contextLoading} icon="refresh">
                                        REFRESH
                                    </Button>
                                    <Button size="sm" variant="primary" onClick={() => handleExport('squads')} icon="download">
                                        EXPORT
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={handleClearAll} icon="trash">
                                        WIPE DATA
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Match Control & Navigation */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                        <div className="lg:col-span-3">
                            <Card className="p-2 h-full flex items-center bg-cyber-card/50 border-white/5">
                                <div className="flex flex-wrap gap-2 w-full">
                                    {rooms.map(room => (
                                        <button
                                            key={room}
                                            onClick={() => setCurrentRoom(room)}
                                            className={`px-6 py-2 rounded-none font-oswald font-bold text-sm transition-all flex-grow md:flex-grow-0 skew-x-[-10deg] border-l-2 ${currentRoom === room
                                                ? 'bg-cyber-red text-white border-white shadow-[0_0_15px_rgba(255,59,59,0.4)]'
                                                : 'bg-cyber-charcoal text-gray-400 border-transparent hover:bg-gray-800 hover:text-white hover:border-cyber-red/50'
                                                }`}
                                        >
                                            <span className="skew-x-[10deg] block">
                                                {room === 'all' ? 'ALL SECTORS' : `SECTOR ${room}`}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        <div className="lg:col-span-1">
                            {gameState?.active ? (
                                <Button
                                    variant="danger"
                                    className="w-full h-full text-xl font-oswald tracking-widest shadow-[0_0_30px_rgba(255,0,0,0.3)] animate-pulse border-2 border-red-500"
                                    onClick={handleEndMatch}
                                    loading={loading}
                                >
                                    <StopCircle className="w-6 h-6 mr-2" /> TERMINATE MATCH
                                </Button>
                            ) : (
                                <Button
                                    variant="success"
                                    className="w-full h-full text-xl font-oswald tracking-widest shadow-[0_0_30px_rgba(0,255,110,0.3)] border-2 border-cyber-pink"
                                    onClick={() => navigate('/blueprint')}
                                >
                                    <PlayCircle className="w-6 h-6 mr-2" /> INITIATE MATCH
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {filteredSquads.map(squad => (
                            <SquadCard
                                key={squad._id}
                                squad={{
                                    ...squad,
                                    roundPlacement: placements[squad._id] || squad.roundPlacement
                                }}
                                roomNumber={squad.room}
                                onUpdateKills={handleUpdateKills}
                                onUpdatePlacement={handleUpdatePlacement}
                                onDeletePlayer={handleDeletePlayer}
                            />
                        ))}

                        {filteredSquads.length === 0 && (
                            <div className="text-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl bg-black/20">
                                <div className="text-6xl mb-4 opacity-20">📭</div>
                                <h3 className="text-xl font-oswald text-gray-400">NO SQUADS FOUND</h3>
                                <p className="font-mono text-xs text-gray-600 mt-2">ADJUST FILTERS OR SYNC DATABASE</p>
                            </div>
                        )}
                    </div>
                </div>

                <TopPlayersModal
                    isOpen={isTopPlayersModalOpen}
                    onClose={() => setIsTopPlayersModalOpen(false)}
                    players={players}
                    selectedIds={gameState?.selectedTopPlayers || []}
                    onSave={handleSaveTopPlayers}
                />
            </div>
        </div>
    );
};

export default AdminPanel;

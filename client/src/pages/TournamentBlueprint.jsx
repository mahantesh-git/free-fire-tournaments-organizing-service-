import { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Navbar from '../components/layout/Navbar';
import QRDisplayModal from '../components/player/QRDisplayModal';
import { startMatch, getGameConfig, resetMatch } from '../services/gameConfigService';

const TournamentBlueprint = () => {
    const [loading, setLoading] = useState(false);
    const [activeGame, setActiveGame] = useState(null);
    const [showQRDisplay, setShowQRDisplay] = useState(false);

    // Configuration State
    const [config, setConfig] = useState({
        gameMode: 'squads',
        killPoints: 1,
        placementPoints: {
            1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5,
            7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
        }
    });

    // Load current game state on mount
    useEffect(() => {
        checkActiveGame();
    }, []);

    const checkActiveGame = async () => {
        const game = await getGameConfig();
        setActiveGame(game);
    };

    const handlePlacementChange = (rank, value) => {
        setConfig(prev => ({
            ...prev,
            placementPoints: {
                ...prev.placementPoints,
                [rank]: parseInt(value) || 0
            }
        }));
    };

    const handleStartMatch = async () => {
        setLoading(true);
        try {
            const matchData = {
                active: true,
                gameMode: config.gameMode,
                scoringConfig: {
                    killPoints: parseFloat(config.killPoints),
                    placementPoints: config.placementPoints
                }
            };
            await startMatch(matchData);
            checkActiveGame();
        } catch (error) {
            console.error('Failed to start match', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetMatch = async () => {
        if (window.confirm('Are you sure you want to end the current match? This action cannot be undone.')) {
            setLoading(true);
            try {
                await resetMatch();
                setActiveGame(null);
            } catch (error) {
                console.error('Failed to reset match', error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gaming-dark via-gaming-darker to-gaming-dark">
            <Navbar />
            <div className="p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-gaming-neon mb-2 font-heading text-center">
                        TOURNAMENT BLUEPRINT
                    </h1>
                    <div className="flex justify-center mb-6">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowQRDisplay(true)}
                            className="text-gaming-neon border-gaming-neon/30 hover:bg-gaming-neon/10"
                        >
                            📱 Registration QR
                        </Button>
                    </div>
                    <p className="text-gray-400 text-center mb-10">Configure and initialize match settings</p>

                    {activeGame ? (
                        <Card className="p-8 text-center border-gaming-neon bg-gaming-darker bg-opacity-90">
                            <div className="text-6xl mb-4 animate-pulse">🎮</div>
                            <h2 className="text-3xl font-bold text-white mb-2">MATCH IN PROGRESS</h2>
                            <p className="text-gaming-neon text-xl mb-6 font-mono">
                                Mode: {activeGame.gameMode === 'squads' ? 'Registered Squads' : 'Random Teams'}
                            </p>

                            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-8 bg-black bg-opacity-40 p-4 rounded-lg">
                                <div className="text-right text-gray-400">Kill Points:</div>
                                <div className="text-left font-bold text-white">{activeGame.scoringConfig?.killPoints}</div>
                                <div className="text-right text-gray-400">Winning Points:</div>
                                <div className="text-left font-bold text-white">{activeGame.scoringConfig?.placementPoints?.['1']}</div>
                            </div>

                            <Button
                                variant="danger"
                                size="lg"
                                onClick={handleResetMatch}
                                loading={loading}
                                className="w-full max-w-xs mx-auto"
                            >
                                STOP MATCH & RESET
                            </Button>
                        </Card>
                    ) : (
                        <Card className="p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
                                <span className="text-2xl">⚙️</span>
                                <h2 className="text-2xl font-bold text-white">Match Configuration</h2>
                            </div>

                            {/* Game Mode */}
                            <div className="mb-8">
                                <label className="block text-gray-400 text-sm font-bold mb-3 uppercase tracking-wider">
                                    Game Mode
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setConfig({ ...config, gameMode: 'squads' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${config.gameMode === 'squads'
                                            ? 'border-gaming-neon bg-gaming-neon bg-opacity-10 text-white shadow-[0_0_15px_rgba(0,255,255,0.3)]'
                                            : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800'
                                            }`}
                                    >
                                        <span className="text-2xl">🛡️</span>
                                        <div className="text-left">
                                            <div className="font-bold">Registered Squads</div>
                                            <div className="text-xs opacity-70">Use pre-registered teams</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setConfig({ ...config, gameMode: 'random' })}
                                        className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${config.gameMode === 'random'
                                            ? 'border-gaming-accent bg-gaming-accent bg-opacity-10 text-white shadow-[0_0_15px_rgba(255,0,255,0.3)]'
                                            : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800'
                                            }`}
                                    >
                                        <span className="text-2xl">🎲</span>
                                        <div className="text-left">
                                            <div className="font-bold">Random Teams</div>
                                            <div className="text-xs opacity-70">Shuffle players into random squads</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Kill Points */}
                            <div className="mb-8">
                                <label className="block text-gray-400 text-sm font-bold mb-3 uppercase tracking-wider">
                                    Points Configuration
                                </label>
                                <Input
                                    label="Points per Kill"
                                    type="number"
                                    value={config.killPoints}
                                    onChange={(val) => setConfig({ ...config, killPoints: val })}
                                    min="0"
                                    step="0.5"
                                    className="max-w-xs"
                                />
                            </div>

                            {/* Placement Points Grid */}
                            <div className="mb-8">
                                <label className="block text-gray-400 text-sm font-bold mb-4 uppercase tracking-wider">
                                    Placement Points (Rank 1-12)
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {[...Array(12)].map((_, i) => {
                                        const rank = i + 1;
                                        const isTop3 = rank <= 3;
                                        return (
                                            <div key={rank} className="relative">
                                                <label className={`absolute -top-2 left-3 px-1 text-xs font-bold bg-gaming-darker z-10 ${isTop3 ? 'text-yellow-400' : 'text-gray-500'
                                                    }`}>
                                                    {rank === 1 ? '1st 👑' : rank === 2 ? '2nd 🥈' : rank === 3 ? '3rd 🥉' : `${rank}th`}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={config.placementPoints[rank]}
                                                    onChange={(e) => handlePlacementChange(rank, e.target.value)}
                                                    className={`w-full bg-gaming-dark border-2 rounded-lg py-3 px-2 text-center text-white font-mono font-bold focus:outline-none focus:border-gaming-neon transition-colors ${isTop3 ? 'border-yellow-600/50 focus:border-yellow-400' : 'border-gray-700'
                                                        }`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-6 border-t border-gray-700">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={handleStartMatch}
                                    loading={loading}
                                    className="w-full text-lg py-4 shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                                >
                                    🚀 INITIALIZE MATCH
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
            <QRDisplayModal
                isOpen={showQRDisplay}
                onClose={() => setShowQRDisplay(false)}
            />
        </div>
    );
};

export default TournamentBlueprint;

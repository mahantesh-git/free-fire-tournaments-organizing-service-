import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { Shield, UserPlus, ArrowRight } from 'lucide-react';

const Home = () => {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const initialParticles = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: Math.random() * 15 + 10,
            drift: (Math.random() - 0.5) * 200,
        }));
        setParticles(initialParticles);
    }, []);

    return (
        <div className="min-h-screen bg-cyber-black relative overflow-hidden flex flex-col">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyber-red/10 rounded-full blur-[128px] animate-pulse-glow" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyber-purple/10 rounded-full blur-[128px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
            </div>

            {/* Particles */}
            <div className="absolute inset-0 pointer-events-none">
                {particles.map((particle) => (
                    <div
                        key={particle.id}
                        className="absolute w-1 h-1 bg-cyber-red/50 rounded-full"
                        style={{
                            left: `${particle.left}%`,
                            animation: `float-cyber ${particle.duration}s linear infinite`,
                            animationDelay: `${particle.delay}s`,
                            '--drift': `${particle.drift}px`,
                        }}
                    />
                ))}
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-grow flex flex-col items-center justify-center p-4 md:p-8">

                {/* Hero Header */}
                <div className="text-center mb-16 animate-fade-in">
                    <h1 className="font-oswald text-6xl md:text-8xl font-black mb-2 text-white uppercase tracking-tight italic">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-red to-cyber-pink">FREE FIRE</span>
                    </h1>
                    <p className="text-xl font-oswald text-white tracking-[0.3em] uppercase opacity-80">
                        TOURNAMENT SYSTEM
                    </p>
                </div>

                {/* Split Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full mb-12">

                    {/* LOGIN CARD */}
                    <Link to="/organizer/login" className="group">
                        <div className="bg-cyber-card/80 backdrop-blur-md border border-cyber-border hover:border-cyber-red transition-all duration-300 p-8 h-full relative overflow-hidden clip-path-slant group-hover:transform group-hover:-translate-y-2 group-hover:shadow-[0_0_30px_rgba(255,59,59,0.2)]">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Shield size={120} />
                            </div>

                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="bg-cyber-red/20 w-16 h-16 flex items-center justify-center rounded-none mb-6 border border-cyber-red/50 group-hover:bg-cyber-red group-hover:text-white transition-colors">
                                        <Shield className="w-8 h-8 text-cyber-red group-hover:text-white" />
                                    </div>
                                    <h2 className="text-3xl font-oswald font-bold text-white mb-2 uppercase italic">Admin Login</h2>
                                    <p className="text-cyber-muted text-sm leading-relaxed mb-8">
                                        Already an organizer? Access your dashboard to manage tournaments, rooms, and live matches.
                                    </p>
                                </div>
                                <div className="flex items-center text-cyber-red font-bold font-oswald uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                                    Access Portal <ArrowRight className="ml-2 w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* REGISTER CARD */}
                    <Link to="/organizer/register" className="group">
                        <div className="bg-cyber-card/80 backdrop-blur-md border border-cyber-border hover:border-cyber-pink transition-all duration-300 p-8 h-full relative overflow-hidden clip-path-slant group-hover:transform group-hover:-translate-y-2 group-hover:shadow-[0_0_30px_rgba(255,0,110,0.2)]">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <UserPlus size={120} />
                            </div>

                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="bg-cyber-pink/20 w-16 h-16 flex items-center justify-center rounded-none mb-6 border border-cyber-pink/50 group-hover:bg-cyber-pink group-hover:text-white transition-colors">
                                        <UserPlus className="w-8 h-8 text-cyber-pink group-hover:text-white" />
                                    </div>
                                    <h2 className="text-3xl font-oswald font-bold text-white mb-2 uppercase italic">Register Org</h2>
                                    <p className="text-cyber-muted text-sm leading-relaxed mb-8">
                                        New here? Create an organization account to start hosting professional tournaments instantly.
                                    </p>
                                </div>
                                <div className="flex items-center text-cyber-pink font-bold font-oswald uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                                    Create Account <ArrowRight className="ml-2 w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Footer Attribution */}
                <div className="mt-16 text-center text-white/10 text-[10px] font-oswald uppercase tracking-[0.5em]">
                    System v2.0 // Secure Access
                </div>
            </div>

            <style>{`
                @keyframes float-cyber {
                    0% { transform: translateY(100vh) scale(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translate(var(--drift), -10vh) scale(1); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default Home;

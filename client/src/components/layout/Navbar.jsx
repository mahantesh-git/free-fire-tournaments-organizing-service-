import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { Menu, X, LogOut, User } from 'lucide-react';

const Navbar = () => {
    const location = useLocation();
    const { isAuthenticated, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    const links = [
        { to: '/', label: 'HOME' },
        { to: '/scoreboard', label: 'RANKINGS' },
        { to: '/squadscoreboard', label: 'SQUADS' },
        { to: '/register', label: 'ENTER MATCH' },
        { to: '/blueprint', label: 'BLUEPRINT' },
        { to: '/playerRegistration', label: 'REGISTRATION' },
        { to: '/conducters', label: 'PERSONNEL' },
        { to: '/squadScoreCard', label: 'ADMIN PANEL' },
    ];

    return (
        <nav className="bg-cyber-black/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
            {/* Scifi decorative line */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyber-neon/50 to-transparent"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo/Brand */}
                    <div className="flex-shrink-0 flex items-center gap-2 group cursor-pointer">
                        <Link to="/" className="flex items-center gap-3 relative">
                            <div className="w-10 h-10 bg-cyber-black border border-cyber-neon/30 flex items-center justify-center relative overflow-hidden group-hover:border-cyber-neon transition-colors duration-300 clip-path-slant">
                                <div className="absolute inset-0 bg-cyber-neon/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="font-oswald font-bold text-cyber-neon text-xl italic pr-1">FF</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-oswald font-bold text-xl text-white tracking-widest leading-none group-hover:text-cyber-neon transition-colors">
                                    TOURNAMENT
                                </span>
                                <span className="text-[9px] font-mono text-gray-500 tracking-[0.2em] uppercase leading-none mt-1">
                                    System v2.0
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden lg:block">
                        <div className="ml-10 flex items-baseline space-x-1">
                            {links.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`px-4 py-2 text-sm font-oswald font-bold tracking-wider skew-x-[-10deg] transition-all duration-200 border border-transparent ${isActive(link.to)
                                        ? 'bg-cyber-neon text-black border-cyber-neon shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                                        : 'text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5'
                                        }`}
                                >
                                    <span className="skew-x-[10deg] block">{link.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>



                    {/* Mobile Menu Button */}
                    <div className="lg:hidden flex items-center">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="bg-cyber-black border border-white/20 inline-flex items-center justify-center p-2 text-gray-400 hover:text-white hover:border-cyber-neon hover:text-cyber-neon focus:outline-none transition-all"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="lg:hidden bg-cyber-black/95 backdrop-blur-xl border-b border-white/10 absolute w-full z-50 animate-in slide-in-from-top-5 fade-in duration-200">
                    <div className="px-4 pt-2 pb-4 space-y-1">
                        {links.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setIsMenuOpen(false)}
                                className={`block px-4 py-3 border-l-2 text-sm font-oswald font-bold uppercase tracking-wider transition-colors ${isActive(link.to)
                                    ? 'border-cyber-neon bg-cyber-neon/10 text-cyber-neon'
                                    : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;

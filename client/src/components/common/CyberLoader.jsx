import React from 'react';

const CyberLoader = ({ text = "LOADING SCOREBOARD" }) => {
    return (
        <div className="min-h-screen bg-cyber-black flex flex-col items-center justify-center relative overflow-hidden text-white">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none"></div>

            {/* Pulsing Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none animate-pulse"
                style={{
                    backgroundImage: 'linear-gradient(#ff3b3b 1px, transparent 1px), linear-gradient(90deg, #ff3b3b 1px, transparent 1px)',
                    backgroundSize: '100px 100px'
                }}>
            </div>

            {/* Corner HUD Brackets */}
            <div className="absolute top-12 left-12 w-24 h-24 border-t-4 border-l-4 border-cyber-red/30 clip-path-slant-sm"></div>
            <div className="absolute bottom-12 right-12 w-24 h-24 border-b-4 border-r-4 border-cyber-pink/30 clip-path-slant-sm"></div>

            {/* Main Animation Container */}
            <div className="relative w-64 h-64 flex items-center justify-center mb-16">
                {/* Layered Cyber Rings */}
                {/* Outer Pink Ring */}
                <div className="absolute inset-0 border-[1px] border-cyber-pink/20 rounded-full"></div>
                <div className="absolute inset-0 border-t-2 border-cyber-pink rounded-full animate-[spin_4s_linear_infinite]"></div>

                {/* Middle Cyan Ring */}
                <div className="absolute inset-6 border-[1px] border-cyber-blue/20 rounded-full"></div>
                <div className="absolute inset-6 border-b-2 border-cyber-blue rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>

                {/* Inner Red Ring */}
                <div className="absolute inset-12 border-[1px] border-cyber-red/20 rounded-full"></div>
                <div className="absolute inset-12 border-l-2 border-cyber-red rounded-full animate-[spin_1.5s_linear_infinite]"></div>

                {/* Central Power Core */}
                <div className="absolute inset-24 bg-gradient-to-br from-cyber-red to-cyber-pink rounded-full blur-2xl opacity-40 animate-pulse"></div>
                <div className="relative z-10 w-4 h-4 bg-white rounded-full shadow-[0_0_20px_#ff3b3b,0_0_40px_#ff006e]"></div>

                {/* Orbiting Particles */}
                <div className="absolute w-full h-full animate-[spin_6s_linear_infinite]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyber-blue rounded-full shadow-[0_0_10px_#00f0ff]"></div>
                </div>
            </div>

            {/* Slanted Content Panel */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Status Bar */}
                <div className="flex items-center gap-1 mb-6 animate-pulse">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className={`h-1.5 w-6 clip-path-slant-sm ${i < 5 ? 'bg-cyber-red' : 'bg-cyber-charcoal'}`}></div>
                    ))}
                    <span className="ml-3 text-[10px] font-black font-mono text-cyber-red tracking-[0.4em]">BATTLE_DATA_SYNC</span>
                </div>

                {/* Primary Text with Stroke Effect */}
                <div className="relative group overflow-hidden">
                    <h2 className="text-5xl md:text-7xl font-black font-oswald tracking-[0.1em] uppercase leading-none italic pointer-events-none">
                        <span className="relative z-10">{text === "INITIALIZING LINK" ? "LOADING" : text}</span>
                        <span className="absolute inset-0 text-stroke-cyber-blue text-transparent translate-x-1 translate-y-1 opacity-50">
                            {text === "INITIALIZING LINK" ? "LOADING" : text}
                        </span>
                    </h2>
                </div>

                {/* Subtext and Progress */}
                <div className="mt-8 flex flex-col items-center gap-4">
                    <p className="text-sm font-oswald text-cyber-muted tracking-[0.6em] uppercase animate-pulse">
                        Synchronizing <span className="text-cyber-blue">Neural Hub</span>
                    </p>
                    <div className="w-64 h-0.5 bg-cyber-charcoal relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyber-red to-transparent w-1/2 animate-[progress_2s_ease-in-out_infinite]"></div>
                    </div>
                </div>
            </div>

            {/* Glitch Overlay Effect */}
            <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-10 bg-gradient-to-b from-transparent via-cyber-pink to-transparent h-2 w-full animate-[glitch_3s_linear_infinite]"></div>

            <style>{`
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                @keyframes glitch {
                    0% { transform: translateY(-100%); }
                    10% { transform: translateY(100vh); }
                    11% { transform: translateY(-100%); }
                    100% { transform: translateY(-100%); }
                }
            `}</style>
        </div>
    );
};

export default CyberLoader;

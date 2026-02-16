import React from 'react';

const ScoreboardSkeleton = ({ type = 'squad' }) => {
    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter overflow-hidden">
            <div className="p-4 md:p-8 max-w-7xl mx-auto pt-12">
                {/* Header Skeleton */}
                <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-pulse">
                    <div>
                        <div className="h-3 w-24 bg-cyber-charcoal opacity-50 mb-4 rounded"></div>
                        <div className="h-12 md:h-20 w-64 md:w-96 bg-cyber-charcoal rounded mb-4"></div>
                        <div className="h-1 w-32 bg-cyber-red/30 mb-4"></div>
                        <div className="h-4 w-48 bg-cyber-charcoal opacity-50 rounded"></div>
                    </div>
                    <div className="h-10 w-32 bg-cyber-charcoal rounded-sm opacity-30"></div>
                </header>

                {/* Statistics Grid Skeleton */}
                <div className={`grid grid-cols-2 ${type === 'squad' ? 'lg:grid-cols-4' : 'md:grid-cols-3'} gap-4 mb-8 animate-pulse`}>
                    {[...Array(type === 'squad' ? 4 : 3)].map((_, i) => (
                        <div key={i} className="card-cyber p-6 flex flex-col items-center justify-center border-l-4 border-l-cyber-charcoal/50">
                            <div className="w-8 h-8 bg-cyber-charcoal/50 rounded-full mb-2"></div>
                            <div className="h-8 w-12 bg-cyber-charcoal rounded mb-2"></div>
                            <div className="h-3 w-20 bg-cyber-charcoal rounded opacity-30"></div>
                        </div>
                    ))}
                </div>

                {/* Filters/Tabs Skeleton (for Squad) */}
                {type === 'squad' && (
                    <div className="mb-8 border-b border-cyber-border/50 animate-pulse">
                        <div className="flex space-x-1">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="px-8 py-3 h-10 w-24 bg-cyber-charcoal/20 border-b-2 border-transparent"></div>
                            ))}
                        </div>
                    </div>
                )}

                {/* List Skeleton */}
                <div className="space-y-4 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-cyber-card/30 border border-cyber-border/30 h-24 relative overflow-hidden">
                            {/* Shimmering bar */}
                            <div className="absolute top-0 bottom-0 left-0 w-1 bg-cyber-charcoal/40"></div>
                            <div className="p-4 md:py-6 md:px-8 flex items-center gap-6">
                                <div className="w-12 h-12 bg-cyber-charcoal/40 rounded italic font-black text-2xl flex items-center justify-center text-cyber-charcoal/10">#</div>
                                <div className="flex-1 space-y-3">
                                    <div className="h-6 w-1/3 bg-cyber-charcoal/40 rounded"></div>
                                    <div className="h-3 w-1/4 bg-cyber-charcoal/20 rounded"></div>
                                </div>
                                <div className="hidden md:flex flex-col items-end space-y-2">
                                    <div className="h-4 w-12 bg-cyber-charcoal/40 rounded"></div>
                                    <div className="h-2 w-16 bg-cyber-charcoal/20 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Background pattern noise animation */}
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
        </div>
    );
};

export default ScoreboardSkeleton;

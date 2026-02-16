import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Copy, Trash2, RefreshCw, Users, Shield, CheckCircle, AlertTriangle, Key } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import ModeratorAssignmentModal from '../../components/admin/ModeratorAssignmentModal';
import Navbar from '../../components/layout/Navbar';

const ModeratorManager = () => {
    const navigate = useNavigate();

    const [moderators, setModerators] = useState([]);
    const [limit, setLimit] = useState({ current: 0, max: 5, available: 5 });
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newModeratorName, setNewModeratorName] = useState('');
    const [newModeratorEmail, setNewModeratorEmail] = useState('');
    const [newModeratorPhone, setNewModeratorPhone] = useState('');
    const [creating, setCreating] = useState(false);

    // Assignment Modal State
    const [assignmentModal, setAssignmentModal] = useState({
        isOpen: false,
        moderator: null
    });

    useEffect(() => {
        fetchModerators();
    }, []);

    const fetchModerators = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/moderators/list');

            if (res.data.success) {
                setModerators(res.data.moderators);
                setLimit(res.data.limit);

                if (res.data.moderators.length === 0) {
                    toast('No moderators found. Create one to get started!', {
                        icon: 'ℹ️',
                        id: 'no-mods-info'
                    });
                }
            }
            setLoading(false);
        } catch (error) {
            console.error(error);
            const message = error.response?.data?.message || 'Failed to load moderators';
            toast.error(message, { id: 'fetch-mods-error' });

            // If it's an auth error, it might be due to session expire
            if (error.response?.status === 401 || error.response?.status === 403) {
                toast('Your session may have expired. Please re-login.', { icon: '🔐' });
            }

            setLoading(false);
        }
    };

    const handleCreateModerator = async (e) => {
        e.preventDefault();

        if (!newModeratorName.trim() || !newModeratorEmail.trim() || !newModeratorPhone.trim()) {
            return toast.error('Please fill in all fields (Name, Email, Phone)', { id: 'create-mod-empty-fields' });
        }

        setCreating(true);
        try {
            const res = await api.post('/api/moderators/create', {
                name: newModeratorName.trim(),
                email: newModeratorEmail.trim(),
                phoneNumber: newModeratorPhone.trim()
            });

            if (res.data.success) {
                toast.success('Moderator created successfully!', { id: 'create-mod-success' });
                setModerators([res.data.moderator, ...moderators]);
                setLimit(prev => ({ ...prev, current: prev.current + 1, available: prev.available - 1 }));
                setNewModeratorName('');
                setNewModeratorEmail('');
                setNewModeratorPhone('');
                setShowCreateForm(false);

                // Auto-copy access code
                navigator.clipboard.writeText(res.data.moderator.accessCode);
                toast.success(`Access code copied: ${res.data.moderator.accessCode}`, { id: 'copy-new-mod-code' });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create moderator', { id: 'create-mod-error' });
        } finally {
            setCreating(false);
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success('Access code copied!', { id: 'copy-mod-code-manual' });
    };

    const handleDeleteModerator = async (id, name) => {
        if (!confirm(`Revoke access for "${name}"? This will free up a moderator slot.`)) return;

        try {
            await api.delete(`/api/moderators/${id}`);
            toast.success('Moderator access revoked', { id: 'revoke-mod-success' });
            fetchModerators();
        } catch (error) {
            toast.error('Failed to revoke access', { id: 'revoke-mod-error' });
        }
    };

    const handleRegenerateCode = async (id, name) => {
        if (!confirm(`Regenerate access code for "${name}"? The old code will stop working.`)) return;

        try {
            const res = await api.put(`/api/moderators/${id}/regenerate`);
            if (res.data.success) {
                toast.success('Access code regenerated!', { id: 'regen-mod-code-success' });
                navigator.clipboard.writeText(res.data.accessCode);
                toast.success(`New code copied: ${res.data.accessCode}`, { id: 'copy-regen-mod-code' });
                fetchModerators();
            }
        } catch (error) {
            toast.error('Failed to regenerate code', { id: 'regen-mod-code-error' });
        }
    };

    return (
        <div className="min-h-screen bg-cyber-black text-white font-inter selection:bg-cyber-red selection:text-white overflow-hidden relative">
            {/* Background Details */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyber-red/5 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyber-purple/5 rounded-full blur-[128px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center text-cyber-muted hover:text-white mb-6 transition-colors font-oswald uppercase tracking-wider text-sm"
                    >
                        <div className="bg-cyber-charcoal p-1 mr-2 border border-cyber-border group-hover:border-cyber-red transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        Back to Dashboard
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Shield className="w-6 h-6 text-cyber-red" />
                                <span className="text-cyber-red font-bold font-oswald uppercase tracking-widest text-sm">Access Control</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black text-white font-oswald uppercase tracking-tight italic leading-none">
                                MODERATOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-red to-cyber-pink">MANAGEMENT</span>
                            </h1>
                            <p className="text-cyber-muted mt-2 font-mono text-sm border-l-2 border-cyber-red pl-4">
                                Grant and manage secure access for tournament officials.
                            </p>
                        </div>

                        <button
                            onClick={fetchModerators}
                            className="bg-cyber-charcoal hover:bg-cyber-charcoal/80 text-white p-3 border border-cyber-border hover:border-cyber-red transition-all group"
                            title="Refresh List"
                        >
                            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                        </button>
                    </div>
                </header>

                {/* Limit Status Card */}
                <div className="mb-8 relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyber-red to-cyber-purple opacity-30 group-hover:opacity-50 blur transition duration-500"></div>
                    <div className="relative bg-cyber-card border border-cyber-border p-6 md:p-8 bg-cyber-black/90">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-sm font-bold text-cyber-muted uppercase tracking-widest font-oswald mb-1">Active Moderators</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-white font-oswald italic">{limit.current}</span>
                                    <span className="text-2xl text-cyber-muted font-oswald">/ {limit.max}</span>
                                </div>
                            </div>

                            <div className="flex-1 md:mx-12">
                                <div className="flex justify-between text-xs font-mono text-cyber-muted mb-2 uppercase">
                                    <span>Capacity</span>
                                    <span>{Math.round((limit.current / limit.max) * 100)}% Used</span>
                                </div>
                                <div className="h-2 bg-cyber-charcoal w-full overflow-hidden relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyber-red to-cyber-purple transition-all duration-500 relative"
                                        style={{ width: `${(limit.current / limit.max) * 100}%` }}
                                    >
                                        <div className="absolute top-0 right-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white]"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-sm text-cyber-muted uppercase tracking-widest font-oswald">Available Slots</p>
                                <p className="text-3xl font-bold text-cyber-neon font-mono">{limit.available}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Create Button */}
                {!showCreateForm && (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        disabled={limit.available === 0}
                        className="w-full mb-8 btn-cyber-primary py-6 text-lg flex items-center justify-center gap-3 clip-path-slant disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        DEPLOY NEW MODERATOR
                        {limit.available === 0 && <span className="text-xs bg-black/30 px-2 py-1 ml-2 font-mono uppercase text-red-400 border border-red-500/50">Limit Reached</span>}
                    </button>
                )}

                {/* Create Form */}
                {showCreateForm && (
                    <div className="mb-8 p-1 relative animation-slide-up">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyber-red/20 to-transparent clip-path-slant"></div>
                        <div className="relative bg-cyber-card border border-cyber-red/50 p-6 md:p-8 clip-path-slant bg-cyber-black">
                            <h3 className="text-xl font-bold mb-6 font-oswald uppercase tracking-wide flex items-center gap-2 text-white">
                                <Key className="w-5 h-5 text-cyber-red" />
                                Initialize New Moderator Access
                            </h3>
                            <form onSubmit={handleCreateModerator} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-cyber-muted uppercase tracking-widest mb-2 font-oswald">
                                        Moderator Identity / Callsign
                                    </label>
                                    <input
                                        type="text"
                                        value={newModeratorName}
                                        onChange={(e) => setNewModeratorName(e.target.value)}
                                        placeholder="E.g. MOD-ALPHA-01" // More thematic placeholder
                                        className="w-full bg-cyber-charcoal border border-cyber-border text-white text-lg font-bold font-oswald tracking-wide px-4 py-3 focus:outline-none focus:border-cyber-red focus:shadow-[0_0_15px_rgba(255,59,59,0.2)] transition-all placeholder:text-cyber-muted/30 uppercase"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-cyber-muted uppercase tracking-widest mb-2 font-oswald">
                                            Email Address (For Credentials)
                                        </label>
                                        <input
                                            type="email"
                                            value={newModeratorEmail}
                                            onChange={(e) => setNewModeratorEmail(e.target.value)}
                                            placeholder="MODERATOR@EXAMPLE.COM"
                                            className="w-full bg-cyber-charcoal border border-cyber-border text-white text-lg font-bold font-oswald tracking-wide px-4 py-3 focus:outline-none focus:border-cyber-red transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-cyber-muted uppercase tracking-widest mb-2 font-oswald">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={newModeratorPhone}
                                            onChange={(e) => setNewModeratorPhone(e.target.value)}
                                            placeholder="+1 234 567 890"
                                            className="w-full bg-cyber-charcoal border border-cyber-border text-white text-lg font-bold font-oswald tracking-wide px-4 py-3 focus:outline-none focus:border-cyber-red transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 btn-cyber-primary py-3 clip-path-slant"
                                    >
                                        {creating ? 'INITIALIZING...' : 'CONFIRM & EMAIL ACCESS KEYS'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setNewModeratorName('');
                                            setNewModeratorEmail('');
                                            setNewModeratorPhone('');
                                        }}
                                        className="px-8 bg-cyber-charcoal text-cyber-muted hover:text-white border border-cyber-border hover:border-white transition-all font-oswald font-bold uppercase tracking-wider clip-path-slant"
                                    >
                                        ABORT
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Moderators List */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block w-16 h-16 border-t-4 border-cyber-red border-solid rounded-full animate-spin mb-4"></div>
                        <div className="text-cyber-muted font-oswald text-xl animate-pulse tracking-widest">RETRIEVING ACCESS LIST...</div>
                    </div>
                ) : moderators.length === 0 ? (
                    <div className="text-center py-20 bg-cyber-charcoal/30 border border-dashed border-cyber-border rounded-lg">
                        <Users className="w-16 h-16 text-cyber-muted/20 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-cyber-muted mb-2 font-oswald uppercase">No Active Moderators</h3>
                        <p className="text-cyber-muted/50 font-mono text-sm max-w-md mx-auto">
                            System is currently operating without delegated authority keys. Create a moderator to distribute workload.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {moderators.map((mod) => (
                            <div key={mod._id} className={`group bg-cyber-card border transition-all duration-300 relative overflow-hidden ${mod.isActive ? 'border-cyber-border hover:border-cyber-purple' : 'border-red-900/30 bg-red-900/5'}`}>
                                {/* Status Strip */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${mod.isActive ? 'bg-cyber-neon' : 'bg-red-600'}`}></div>

                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-3">
                                                <h3 className={`text-2xl font-black font-oswald uppercase tracking-wide ${mod.isActive ? 'text-white' : 'text-red-400 line-through'}`}>
                                                    {mod.name}
                                                </h3>
                                                <div className="flex flex-col text-[10px] font-mono text-cyber-muted uppercase">
                                                    <span>{mod.email}</span>
                                                    <span>{mod.phoneNumber}</span>
                                                </div>
                                                {mod.isActive ? (
                                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/30">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-red-900/20 text-red-500 text-[10px] font-bold uppercase tracking-widest border border-red-500/30 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" /> Revoked
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                {/* Access Code Box */}
                                                <div className="flex items-center gap-4 bg-black/40 p-3 border border-cyber-border/50 max-w-xl">
                                                    <div className="flex-1">
                                                        <span className="text-[10px] text-cyber-muted font-bold uppercase tracking-widest block mb-1">Access Code</span>
                                                        <code className="text-cyber-neon font-mono text-lg tracking-wider">
                                                            {mod.accessCode}
                                                        </code>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopyCode(mod.accessCode)}
                                                        className="p-2 hover:bg-cyber-charcoal text-cyber-muted hover:text-white transition-colors border border-transparent hover:border-cyber-border"
                                                        title="Copy Code"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Login URL Box */}
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-cyber-muted w-24 shrink-0 font-mono text-xs uppercase">Portal Link:</span>
                                                    <div className="flex-1 flex items-center gap-2 bg-cyber-charcoal/50 px-3 py-1.5 border border-cyber-border/30 rounded-sm">
                                                        <span className="text-cyber-muted truncate font-mono text-xs max-w-[200px] md:max-w-md">
                                                            {`${window.location.origin}/moderator/login?tenant=${localStorage.getItem('tenantSlug') || ''}`}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                const url = `${window.location.origin}/moderator/login?tenant=${localStorage.getItem('tenantSlug') || ''}`;
                                                                navigator.clipboard.writeText(url);
                                                                toast.success('Login URL copied!');
                                                            }}
                                                            className="ml-auto text-cyber-red hover:text-white transition-colors"
                                                            title="Copy Link"
                                                        >
                                                            <Copy className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Meta Info */}
                                                <div className="flex items-center gap-4 text-[10px] text-cyber-muted font-mono uppercase tracking-widest opacity-60">
                                                    <span>Created: {new Date(mod.createdAt).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>Last Active: {mod.lastUsed ? new Date(mod.lastUsed).toLocaleString() : 'NEVER'}</span>
                                                </div>

                                                {/* Assigned Squads Tags */}
                                                {mod.assignedSquads && mod.assignedSquads.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-cyber-border/30 mt-2">
                                                        {mod.assignedSquads.map(squad => (
                                                            <span key={squad._id} className="px-2 py-1 bg-cyber-purple/10 text-cyber-purple text-[10px] font-bold border border-cyber-purple/30 uppercase">
                                                                {squad.squadName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {mod.isActive && (
                                            <div className="flex flex-row md:flex-col gap-2 mt-4 md:mt-0">
                                                <button
                                                    onClick={() => setAssignmentModal({ isOpen: true, moderator: mod })}
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-cyber-charcoal hover:bg-cyber-purple/20 border border-cyber-border hover:border-cyber-purple text-white transition-all text-xs font-bold uppercase tracking-wider font-oswald w-full"
                                                    title="Assign Squads"
                                                >
                                                    <Users className="w-3 h-3" />
                                                    Assignments
                                                </button>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleRegenerateCode(mod._id, mod.name)}
                                                        className="flex-1 p-2 bg-cyber-charcoal hover:bg-cyber-card border border-cyber-border hover:border-white text-cyber-muted hover:text-white transition-all"
                                                        title="Regenerate Keys"
                                                    >
                                                        <RefreshCw className="w-4 h-4 mx-auto" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteModerator(mod._id, mod.name)}
                                                        className="flex-1 p-2 bg-red-900/10 hover:bg-red-900/30 border border-red-900/30 hover:border-red-500 text-red-500 hover:text-white transition-all"
                                                        title="Revoke Access"
                                                    >
                                                        <Trash2 className="w-4 h-4 mx-auto" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Assignment Modal */}
                <ModeratorAssignmentModal
                    isOpen={assignmentModal.isOpen}
                    onClose={() => setAssignmentModal({ isOpen: false, moderator: null })}
                    moderator={assignmentModal.moderator}
                    onUpdate={fetchModerators}
                />
            </div>
        </div>
    );
};

export default ModeratorManager;

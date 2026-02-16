import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

const ModeratorLogin = () => {
    const { tenantSlug: pathTenantSlug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'code'
    const [accessCode, setAccessCode] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const roomId = searchParams.get('room');
    const tenantParam = searchParams.get('tenant');

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!email.trim() || !password.trim() || !accessCode.trim()) {
            return toast.error('Please enter email, password, and access code', { id: 'mod-login-empty-fields' });
        }

        const payload = {
            email: email.trim(),
            password: password.trim(),
            accessCode: accessCode.trim()
        };

        setLoading(true);
        try {
            // Priority for tenant ID: Path > Query Param > LocalStorage
            const tenantSlug = pathTenantSlug || tenantParam || localStorage.getItem('tenantSlug');

            const headers = {};
            if (tenantSlug) {
                headers['x-tenant-id'] = tenantSlug;
            }

            const res = await api.post('/api/moderators/auth',
                payload,
                { headers }
            );

            if (res.data.success) {
                // Store moderator info, token and tenant slug
                localStorage.setItem('moderator', JSON.stringify(res.data.moderator));
                localStorage.setItem('mod_token', res.data.token);
                if (tenantSlug) localStorage.setItem('tenantSlug', tenantSlug);

                toast.success(`Welcome, ${res.data.moderator.name}!`, { id: 'mod-login-success' });

                // Navigate to moderator panel
                if (roomId) {
                    navigate(`/moderator/panel?room=${roomId}`);
                } else {
                    navigate('/moderator/panel');
                }
            }
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Invalid credentials';
            toast.error(errorMsg, { id: 'mod-login-failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cyber-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Details */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyber-red/5 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyber-purple/5 rounded-full blur-[128px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/10 rounded-full mb-4 border border-indigo-500/20">
                        <Lock className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Moderator Access</h1>
                    <p className="text-gray-400">
                        {loginMethod === 'email' ? 'Enter your credentials to continue' : 'Enter your access code to continue'}
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-cyber-muted uppercase tracking-widest mb-2 font-oswald">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="MODERATOR@EXAMPLE.COM"
                            className="w-full bg-cyber-black border border-cyber-border rounded-none px-4 py-3 text-white placeholder-cyber-muted/30 focus:outline-none focus:border-cyber-red transition-all"
                            autoFocus
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-cyber-muted uppercase tracking-widest mb-2 font-oswald">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-cyber-black border border-cyber-border rounded-none px-4 py-3 text-white placeholder-cyber-muted/30 focus:outline-none focus:border-cyber-red transition-all pr-12"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-cyber-muted uppercase tracking-widest mb-2 font-oswald">
                            Security Access Code
                        </label>
                        <input
                            type="text"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder="MOD#XXXXXXXX"
                            className="w-full bg-cyber-black border border-cyber-border rounded-none px-4 py-3 text-white placeholder-cyber-muted/30 focus:outline-none focus:border-cyber-red transition-all font-mono tracking-widest uppercase"
                            disabled={loading}
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        loading={loading}
                        className="w-full py-4 flex items-center justify-center gap-2 group"
                    >
                        <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        <span className="text-lg">Initialize Session</span>
                    </Button>
                </form>

                {/* Help Text */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                    <p className="text-sm text-gray-400 text-center">
                        Don't have an access code? Contact the tournament organizer.
                    </p>
                </div>
            </div>

            {/* Security Note */}
            <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                    🔒 Your session is secure and will expire after 2 hours of inactivity
                </p>
            </div>
        </div>
    );
};

export default ModeratorLogin;

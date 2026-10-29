import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import Button from '../../components/common/Button';

const ModeratorLogin = () => {
    const { tenantSlug: pathTenantSlug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [accessCode, setAccessCode] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const roomId = searchParams.get('room');
    const tenantParam = searchParams.get('tenant');

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!email.trim() || !accessCode.trim()) {
            return toast.error('Please enter your email and security access code', { id: 'mod-login-empty-fields' });
        }

        const payload = {
            email: email.trim(),
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
        <div className="min-h-screen bg-cyber-black flex items-center justify-center p-6 relative overflow-clip">
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
                    <h1 className="text-3xl font-bold text-white mb-2">Moderator Access</h1>
                    <p className="text-gray-400">
                        Enter your email and access code to continue
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
                        <div className="flex items-center gap-2">
                            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            <span className="text-lg">Initialize Session</span>
                        </div>
                    </Button>
                </form>

                {/* Help Text */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                    <p className="text-sm text-gray-400 text-center">
                        Don't have an access code? Contact the tournament organizer.
                    </p>
                </div>

                {/* Security Note */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        🔒 Your session is secure and will expire after 2 hours of inactivity
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ModeratorLogin;

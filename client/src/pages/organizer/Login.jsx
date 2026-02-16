import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Button from '../../components/common/Button';

const OrganizerLogin = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/organizers/login', formData);
            if (res.data.success) {
                const { token, slug } = res.data.tenant;
                localStorage.setItem('org_token', token);
                localStorage.setItem('tenantSlug', slug);

                if (window.location.hostname === 'localhost') {
                    navigate('/organizer/dashboard');
                } else {
                    window.location.href = `http://${slug}.${window.location.host}/organizer/dashboard`;
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-cyber-black text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-cyber-red rounded-full filter blur-[128px]" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyber-purple rounded-full filter blur-[128px]" />
            </div>

            <div className="glass-cyber p-10 w-full max-w-md relative z-10 border-2 border-cyber-border shadow-2xl hover:shadow-cyber-red/10 transition-shadow duration-500">
                {/* Decorative Corner */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-cyber-red -translate-x-1 -translate-y-1"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-cyber-red -translate-x-1 -translate-y-1"></div>

                <h2 className="text-4xl font-oswald font-black mb-8 text-center text-white uppercase tracking-widest leading-none">
                    Organizer <span className="text-cyber-red block text-2xl mt-1 tracking-[0.3em]">Login</span>
                </h2>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded mb-6 text-sm font-bold text-center uppercase tracking-wide">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block mb-2 text-xs font-oswald font-bold text-cyber-muted uppercase tracking-widest">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="input-cyber w-full font-inter"
                            placeholder="organizer@example.com"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-2 text-xs font-oswald font-bold text-cyber-muted uppercase tracking-widest">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="input-cyber w-full font-inter"
                            placeholder="••••••••"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full text-base py-4 mt-4"
                        loading={loading}
                    >
                        Login to Dashboard
                    </Button>
                </form>

                <div className="mt-8 text-center border-t border-cyber-border pt-6">
                    <p className="text-cyber-muted text-sm font-inter">
                        New Organization?{' '}
                        <button
                            onClick={() => navigate('/organizer/register')}
                            className="text-cyber-red hover:text-white font-bold ml-1 uppercase tracking-wider transition-colors font-oswald"
                        >
                            Register
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OrganizerLogin;

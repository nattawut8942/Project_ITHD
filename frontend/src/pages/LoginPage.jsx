// frontend/src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

const LoginPage = () => {
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { setAuthToken } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const formData = new FormData(e.target);

        try {
            const res = await fetch(`${API_BASE}/authen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(formData))
            });
            const data = await res.json();

            if (data.success) {
                setAuthToken(data.token, data.user);
                navigate('/');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Cannot connect to server. Please try again.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/50 font-sans text-slate-800 relative overflow-hidden p-4">
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70 z-0"></div>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl z-0"></div>

            <div className="z-10 w-full max-w-md p-8 sm:p-10 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 backdrop-blur-sm">
                {/* Header */}
                <div className="text-center mb-6">
                    <img
                        src="/DAIKIN_logo.svg.png"
                        alt="DAIKIN Logo"
                        className="h-12 mx-auto mb-4 object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <h2 className="text-3xl font-black tracking-tight text-slate-950 leading-none">IT HELP DESK</h2>
                    <p className="text-sm font-bold text-indigo-600 mt-2 tracking-wide">DAIKIN THAILAND | Support System</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block pl-1">USERNAME</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                                <User size={18} />
                            </span>
                            <input
                                name="username"
                                placeholder="Enter your username"
                                autoComplete="username"
                                autoFocus
                                disabled={loading}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-50"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block pl-1">PASSWORD</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                                <Lock size={18} />
                            </span>
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                disabled={loading}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-11 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all text-sm text-slate-900 placeholder:text-slate-400 disabled:opacity-50"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
                            <AlertTriangle size={14} className="shrink-0" /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-2 text-sm tracking-wide flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><Loader2 size={16} className="animate-spin" /><span>Authenticating...</span></>
                        ) : (
                            <span>Secure Sign In</span>
                        )}
                    </button>
                </form>

                <p className="mt-4 text-center text-[11px] font-medium text-slate-500 bg-slate-50 py-2.5 px-4 rounded-xl border border-slate-100">
                    LOGIN ด้วย USERNAME/PASSWORD เพื่อเข้าเครื่องคอมพิวเตอร์ของคุณ
                </p>
                <p className="mt-4 text-center text-[11px] text-slate-400 tracking-wide">
                    © 2026 BY: NATTHAWUT.Y <span className="font-bold text-indigo-600">ALL RIGHTS RESERVED.</span>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
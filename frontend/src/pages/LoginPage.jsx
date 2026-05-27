// frontend/src/pages/LoginPage.jsx (UPDATED VERSION)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';


const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [empPicUrl, setEmpPicUrl] = useState(null);
    const { setAuthToken } = useAuth(); // ✅ U
    // se updated function

    useEffect(() => {
        const timer = setTimeout(() => {
            const trimmed = username.trim();
            if (trimmed) {
                setEmpPicUrl(`http://dcidmc.dci.daikin.co.jp/PICTURE/${trimmed}.jpg`);
            } else {
                setEmpPicUrl(null);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [username]);

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
                // ✅ Store both token and user data in context AND localStorage
                setAuthToken(data.token, data.user);

                // Redirect to dashboard
                navigate('/');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Server error');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50/50 font-sans text-slate-800 relative overflow-hidden p-4">
            {/* Background Pattern Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60 z-0 pointer-events-none"></div>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl z-0"></div>

            <div className="z-10 w-full max-w-md p-8 sm:p-10 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 backdrop-blur-sm">
                <div className="text-center mb-6">
    <img
        src="/DAIKIN_logo.svg.png"
        alt="DAIKIN Logo"
        className="h-12 mx-auto mb-4 object-contain" // ปรับลด mb-5 เป็น mb-4 ให้พอดี
    />
    
    {/* Fixed height container to prevent layout shift while typing
    <div className="h-20 flex items-center justify-center mb-4">
        {empPicUrl ? (
            <img
                src={empPicUrl}
                alt="Employee"
                className="h-20 w-20 rounded-full mx-auto object-cover border border-slate-100 animate-in fade-in zoom-in duration-300"
                onError={() => setEmpPicUrl(null)}
            />
        ) : (
            <div className="h-20 w-20 rounded-full mx-auto bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shadow-inner">
                <User size={32} />
            </div>
        )}
    </div> */}

    <h2 className="text-3xl font-black tracking-tight text-slate-950 leading-none">IT HELP
        <span className="text-red-800">|</span>
        <span className="text-indigo-600">DESK</span></h2>
    <p className="text-lg font-bold text-indigo-600 mt-2 tracking-wide">SERVICE PORTAL</p>
</div>


                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username Field */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block pl-1">USERNAME</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                                <User size={18} />
                            </span>
                            <input
                                name="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}

                                placeholder="Enter your username"
                                autoComplete="username"
                                autoFocus
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all text-sm text-slate-900 placeholder:text-slate-400"
                                required
                            />
                        </div>
                    </div>

                    {/* Password Field */}
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
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-11 outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all text-sm text-slate-900 placeholder:text-slate-400"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
                            <AlertTriangle size={14} className="text-red-500 shrink-0" /> {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-2 text-sm tracking-wide flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Authenticating...</span>
                            </>
                        ) : (
                            <span>LOGIN</span>
                        )}
                    </button>
                </form>

                <p className="m-3 text-center text-[12px] font-medium text-slate-500 mb-6 bg-slate-50 py-2.5 px-4 rounded-xl border border-slate-100">
                    Login ด้วย Username / Password เข้าเครื่องคอม

                </p>

                <button
                    type="button"
                    onClick={() => navigate('/tv')}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] mt-2 text-sm tracking-wide flex items-center justify-center gap-2"
                >
                    <Eye size={16} />
                    <span>View TV Monitor</span>
                </button>
                <p className="mt-8 text-center text-[11px] text-slate-400 tracking-wide">
                    © 2026 BY: NATTHAWUT.Y <span className="font-bold text-indigo-600">ALL RIGHTS RESERVED.</span>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;

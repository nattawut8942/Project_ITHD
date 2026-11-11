import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, MonitorPlay } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import logo from '../../public/DAIKIN_logo.svg.png';

const inputClass =
    'mt-2 block w-full min-h-[44px] rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-muted focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600';

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
    const { setAuthToken } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

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
                const from = location.state?.from || '/';
                navigate(from, { replace: true });
            } else {
                setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง');
            }
        } catch (err) {
            setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองใหม่');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-paper font-body text-ink-soft">
            <main className="flex flex-1 items-center justify-center px-5 py-12">
                <div className="dash-rise w-full max-w-md rounded-lg border border-line bg-surface p-7 shadow-lift sm:p-10">
                    <div className="flex flex-col items-center text-center">
                        <img
                            src={logo}
                            alt="DAIKIN"
                            className="h-14 w-auto object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />

                        <h1 className="mt-8 font-display text-4xl font-bold leading-tight text-ink">IT Help Desk</h1>
                        <p className="mt-2 text-base text-muted">แจ้งปัญหาและติดตามงานบริการ IT ได้ในที่เดียว</p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-10 space-y-6">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-ink">
                                ชื่อผู้ใช้
                            </label>
                            <input
                                id="username"
                                name="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="ชื่อผู้ใช้ของบริษัท"
                                autoComplete="username"
                                autoFocus
                                required
                                aria-invalid={error ? true : undefined}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-ink">
                                รหัสผ่าน
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="รหัสผ่านของบริษัท"
                                    autoComplete="current-password"
                                    required
                                    aria-invalid={error ? true : undefined}
                                    className={`${inputClass} pr-12`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                    aria-pressed={showPassword}
                                    className="absolute inset-y-0 right-0 mt-2 flex w-11 items-center justify-center rounded-r-md text-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                </button>
                            </div>
                        </div>

                        <p className="text-sm text-muted">
                            ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับที่ใช้เข้าคอมพิวเตอร์ของบริษัท
                        </p>

                        {error && (
                            <div role="alert" className="flex items-start gap-2 text-sm font-medium text-rose">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="lift flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-base font-semibold text-white shadow-soft transition-colors hover:bg-ink-soft active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none disabled:opacity-60"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                                    <span>กำลังตรวจสอบ...</span>
                                </>
                            ) : (
                                <span>เข้าสู่ระบบ</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 border-t border-line pt-6 text-center">
                        <button
                            type="button"
                            onClick={() => navigate('/tv')}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 text-sm font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                        >
                            <MonitorPlay size={16} aria-hidden="true" />
                            <span>ดูหน้า TV Monitor</span>
                        </button>
                    </div>
                </div>
            </main>

            <footer className="px-5 pb-6 text-center text-xs text-muted">
                © 2026 BY: NATTHAWUT.Y · สงวนลิขสิทธิ์
            </footer>
        </div>
    );
};

export default LoginPage;

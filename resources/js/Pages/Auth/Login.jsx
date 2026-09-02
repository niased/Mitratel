import React, { useState, useEffect } from 'react';
import InputError from '@/components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import ApplicationLogo from '@/components/ApplicationLogo';
import { 
    Lock, 
    Mail, 
    Eye, 
    EyeOff,
    Wifi,
    BatteryCharging,
    Server,
    Activity,
    Folder,
    Volume2,
    Search,
    Image as ImageIcon
} from 'lucide-react';

export default function Login({ status, canResetPassword }) {
    const [showPassword, setShowPassword] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [bgIndex, setBgIndex] = useState(0);

    // Real-time clock & date untuk Windows Taskbar
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
            setCurrentDate(now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }));
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Auto-switch background wallpaper
    useEffect(() => {
        const bgTimer = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % 3);
        }, 7000);
        return () => clearInterval(bgTimer);
    }, []);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-red-600 selection:text-white">
            <Head title="Login - Mitratel Desktop" />

            {/* CUSTOM ANIMATION STYLES */}
            <style>{`
                @keyframes flowLine {
                    0% { stroke-dashoffset: 100; }
                    100% { stroke-dashoffset: 0; }
                }
                @keyframes scanMove {
                    0% { transform: translateX(10px); opacity: 0.2; }
                    50% { opacity: 0.8; }
                    100% { transform: translateX(320px); opacity: 0.2; }
                }
                @keyframes signalRipple {
                    0% { r: 5px; opacity: 0.9; stroke-width: 2px; }
                    100% { r: 75px; opacity: 0; stroke-width: 0.5px; }
                }
                .animate-flow-dash {
                    stroke-dasharray: 12 6;
                    animation: flowLine 2s linear infinite;
                }
                .animate-scanline {
                    animation: scanMove 4s ease-in-out infinite alternate;
                }
                .animate-ripple-1 {
                    animation: signalRipple 3s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
                }
                .animate-ripple-2 {
                    animation: signalRipple 3s cubic-bezier(0.1, 0.8, 0.3, 1) 1.5s infinite;
                }
            `}</style>

            {/* AMBIENT LIGHTING BACKGROUND */}
            <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 blur-[140px] rounded-full pointer-events-none animate-pulse duration-[5000ms]" />
            <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-rose-700/10 blur-[130px] rounded-full pointer-events-none" />

            {/* ========================================================================= */}
            {/* 1. TOP HEADER (LOGO DENGAN TEKS PUTIH TERANG) */}
            {/* ========================================================================= */}
            <header className="w-full max-w-4xl mx-auto flex items-center justify-start z-30 mb-4 sm:mb-6">
                <Link 
                    href="/" 
                    className="flex items-center transition-transform duration-200 hover:scale-105"
                    title="Kembali ke Halaman Utama"
                >
                    <ApplicationLogo 
                        imageClassName="h-9 sm:h-11" 
                        showText={true} 
                        forceWhite={true} 
                    />
                </Link>
            </header>

            {/* ========================================================================= */}
            {/* 2. LAPTOP MOCKUP CONTAINER */}
            {/* ========================================================================= */}
            <div className="w-full max-w-4xl relative z-10 my-auto">
                {/* A. SCREEN FRAME (BEZEL) */}
                <div className="bg-slate-900 border border-slate-700/80 rounded-t-2xl p-2.5 sm:p-3.5 shadow-2xl relative z-20">
                    {/* Webcam Notch */}
                    <div className="flex justify-center items-center pb-2 pt-0.5">
                        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950 border border-slate-800">
                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                    </div>

                    {/* B. INNER DISPLAY */}
                    <div className="relative w-full min-h-[460px] sm:min-h-[500px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex flex-col justify-between">
                        {/* MAIN WORKSPACE */}
                        <div className="relative flex-1 py-6 px-6 sm:px-10 md:px-12 flex items-center justify-between overflow-hidden">
                            {/* LAYER BACKGROUND GRAFIK ANIMASI */}
                            <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:32px_32px] z-10" />
                                
                                {/* TEMA 1: RED SCANNING TOWER */}
                                <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${bgIndex === 0 ? 'opacity-100' : 'opacity-0'}`}>
                                    <div className="absolute right-10 top-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-red-600/15 rounded-full blur-3xl" />
                                    <div className="absolute inset-0 w-full h-full flex items-center justify-center opacity-40">
                                        <svg viewBox="0 0 380 300" className="w-full h-auto max-h-[350px] drop-shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                                            <defs>
                                                <linearGradient id="areaGlowRed" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                                                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                                                </linearGradient>
                                                <linearGradient id="scanGradient" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
                                                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
                                                </linearGradient>
                                            </defs>
                                            <circle cx="190" cy="45" r="10" fill="none" stroke="#ef4444" className="animate-ripple-1" />
                                            <circle cx="190" cy="45" r="10" fill="none" stroke="#ef4444" className="animate-ripple-2" />
                                            <circle cx="190" cy="150" r="100" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                                            <circle cx="190" cy="150" r="70" fill="none" stroke="#ef4444" strokeWidth="1" className="animate-spin duration-[20s]" strokeDasharray="8 8" />
                                            <g stroke="#f43f5e" strokeLinecap="round">
                                                <line x1="190" y1="45" x2="155" y2="235" strokeWidth="2" />
                                                <line x1="190" y1="45" x2="225" y2="235" strokeWidth="2" />
                                                <line x1="178" y1="95" x2="202" y2="95" strokeWidth="1.5" />
                                                <line x1="170" y1="145" x2="210" y2="145" strokeWidth="1.5" />
                                                <line x1="162" y1="195" x2="218" y2="195" strokeWidth="1.5" />
                                                <circle cx="190" cy="45" r="4.5" fill="#ef4444" className="animate-pulse" />
                                            </g>
                                            <rect x="20" y="40" width="30" height="200" fill="url(#scanGradient)" className="animate-scanline" />
                                            <path d="M 20 200 Q 70 130 110 170 T 190 90 T 270 150 T 360 100 L 360 240 L 20 240 Z" fill="url(#areaGlowRed)" />
                                            <path d="M 20 200 Q 70 130 110 170 T 190 90 T 270 150 T 360 100" fill="none" stroke="#ef4444" strokeWidth="2.5" className="animate-flow-dash" />
                                        </svg>
                                    </div>
                                </div>

                                {/* TEMA 2: CYAN FIBER STREAM */}
                                <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${bgIndex === 1 ? 'opacity-100' : 'opacity-0'}`}>
                                    <div className="absolute right-12 top-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-sky-500/15 rounded-full blur-3xl" />
                                    <div className="absolute inset-0 w-full h-full flex items-center justify-center opacity-40">
                                        <svg viewBox="0 0 380 300" className="w-full h-auto max-h-[350px] drop-shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                                            <defs>
                                                <linearGradient id="areaGlowCyan" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                                                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M 10 100 Q 100 200 190 120 T 370 180" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 4" />
                                            <path d="M 10 140 Q 120 80 200 160 T 370 110" fill="none" stroke="#38bdf8" strokeWidth="2.5" className="animate-flow-dash" />
                                            <circle cx="200" cy="160" r="6" fill="#38bdf8" className="animate-ping" />
                                            <circle cx="120" cy="80" r="4" fill="#0284c7" />
                                            <circle cx="290" cy="135" r="5" fill="#38bdf8" className="animate-pulse" />
                                            <g fill="#38bdf8" opacity="0.6">
                                                <rect x="50" y="180" width="4" height="40" className="animate-pulse" />
                                                <rect x="60" y="160" width="4" height="60" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
                                                <rect x="70" y="190" width="4" height="30" className="animate-pulse" style={{ animationDelay: '0.4s' }} />
                                                <rect x="80" y="150" width="4" height="70" className="animate-pulse" style={{ animationDelay: '0.1s' }} />
                                            </g>
                                            <path d="M 30 220 Q 100 150 180 210 T 350 160 L 350 260 L 30 260 Z" fill="url(#areaGlowCyan)" />
                                        </svg>
                                    </div>
                                </div>

                                {/* TEMA 3: EMERALD 5G MATRIX */}
                                <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${bgIndex === 2 ? 'opacity-100' : 'opacity-0'}`}>
                                    <div className="absolute right-10 bottom-10 w-[450px] h-[450px] bg-emerald-500/15 rounded-full blur-3xl" />
                                    <div className="absolute inset-0 w-full h-full flex items-center justify-center opacity-40">
                                        <svg viewBox="0 0 380 300" className="w-full h-auto max-h-[350px] drop-shadow-[0_0_20px_rgba(52,211,153,0.25)]">
                                            <defs>
                                                <linearGradient id="areaGlowEmerald" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                                                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                                                </linearGradient>
                                            </defs>
                                            <polygon points="190,40 280,100 280,200 190,260 100,200 100,100" fill="none" stroke="#059669" strokeWidth="1.5" strokeDasharray="6 6" className="animate-spin duration-[30s]" />
                                            <polygon points="190,70 250,110 250,180 190,220 130,180 130,110" fill="none" stroke="#34d399" strokeWidth="2" className="animate-flow-dash" />
                                            <circle cx="190" cy="145" r="8" fill="#10b981" className="animate-ping" />
                                            <circle cx="190" cy="145" r="10" fill="none" stroke="#34d399" className="animate-ripple-1" />
                                            <path d="M 40 180 Q 110 230 190 145 T 340 210" fill="none" stroke="#34d399" strokeWidth="2.5" className="animate-flow-dash" />
                                            <path d="M 40 180 Q 110 230 190 145 T 340 210 Z" fill="url(#areaGlowEmerald)" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* SHORTCUT DESKTOP ICONS */}
                            <div className="hidden lg:flex flex-col gap-4 z-10 select-none absolute top-6 left-6 xl:left-8">
                                <div className="flex flex-col items-center gap-1 group cursor-pointer w-16">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all shadow-md backdrop-blur-sm">
                                        <Server className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] text-slate-300 font-medium group-hover:text-white text-center drop-shadow-md">Assets</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 group cursor-pointer w-16">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-sky-400 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-md backdrop-blur-sm">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] text-slate-300 font-medium group-hover:text-white text-center drop-shadow-md">Maintenance</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 group cursor-pointer w-16">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-md backdrop-blur-sm">
                                        <Folder className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] text-slate-300 font-medium group-hover:text-white text-center drop-shadow-md">Data Management</span>
                                </div>
                            </div>

                            {/* WALLPAPER SWITCHER */}
                            <div className="absolute top-4 right-4 sm:top-5 sm:right-6 z-20 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800 shadow-lg">
                                <ImageIcon className="w-3 h-3 text-slate-400 mr-1" />
                                {[0, 1, 2].map((idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setBgIndex(idx)}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                            bgIndex === idx 
                                                ? (idx === 0 ? 'bg-red-500 w-4' : idx === 1 ? 'bg-sky-400 w-4' : 'bg-emerald-400 w-4')
                                                : 'bg-slate-700 hover:bg-slate-500'
                                        }`}
                                        title={`Tema ${idx + 1}`}
                                    />
                                ))}
                            </div>

                            {/* FORM LOGIN */}
                            <div className="relative z-10 w-full max-w-sm ml-auto my-auto py-2 pr-1 sm:pr-2">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-md">
                                        Selamat Datang
                                    </h1>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Masuk dengan email dan password kamu untuk melanjutkan.
                                    </p>
                                </div>

                                {status && (
                                    <div className="mt-4 text-xs font-medium text-emerald-400 bg-emerald-950/80 p-3 rounded-xl border border-emerald-800/80 backdrop-blur-sm">
                                        {status}
                                    </div>
                                )}

                                <form onSubmit={submit} className="space-y-4 mt-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                                            Email
                                        </Label>
                                        <div className="relative">
                                            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                            <Input
                                                id="email"
                                                type="email"
                                                name="email"
                                                value={data.email}
                                                autoComplete="username"
                                                autoFocus
                                                placeholder="nama@mitratel.co.id"
                                                onChange={(e) => setData('email', e.target.value)}
                                                className="pl-10 h-10 text-xs rounded-xl bg-slate-900/90 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm"
                                            />
                                        </div>
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={data.password}
                                                autoComplete="current-password"
                                                placeholder="••••••••"
                                                onChange={(e) => setData('password', e.target.value)}
                                                className="pl-10 pr-10 h-10 text-xs rounded-xl bg-slate-900/90 border-slate-700/80 text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors z-10 cursor-pointer"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="remember"
                                                checked={data.remember}
                                                onCheckedChange={(checked) => setData('remember', !!checked)}
                                                className="border-slate-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                            />
                                            <Label htmlFor="remember" className="text-xs text-slate-300 cursor-pointer font-normal">
                                                Ingat saya
                                            </Label>
                                        </div>

                                        {canResetPassword && (
                                            <Link
                                                href={route('password.request')}
                                                className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors"
                                            >
                                                Lupa password?
                                            </Link>
                                        )}
                                    </div>

                                    <Button 
                                        type="submit" 
                                        disabled={processing}
                                        className="w-full h-10 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all duration-200 active:scale-[0.99] mt-2 cursor-pointer"
                                    >
                                        {processing ? 'Memproses...' : 'Masuk ke Dashboard'}
                                    </Button>
                                </form>

                                <div className="pt-4 border-t border-slate-800/80 mt-5">
                                    <p className="text-[11px] text-slate-400">
                                        Ada masalah saat login? Hubungi <span className="font-semibold text-slate-200">Admin Mitratel</span>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* WINDOWS BOTTOM TASKBAR */}
                        <div className="w-full h-10 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-4 flex items-center justify-between text-xs text-slate-300 select-none z-30">
                            <div className="flex items-center gap-2">
                                <button className="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-xs transition-all shadow-md shadow-red-600/20 active:scale-95 cursor-pointer">
                                    <span>Start</span>
                                </button>
                                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded-lg text-slate-400 text-[11px] w-36">
                                    <Search className="w-3 h-3 text-slate-500" />
                                    <span>Cari aplikasi...</span>
                                </div>
                                <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                                    <div className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer" title="System Dashboard">
                                        <Server className="w-3.5 h-3.5 text-red-400" />
                                    </div>
                                    <div className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer" title="Network Explorer">
                                        <Folder className="w-3.5 h-3.5 text-emerald-400" />
                                    </div>
                                </div>
                            </div>

                            {/* SYSTEM TRAY KANAN */}
                            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                                <Wifi className="w-3.5 h-3.5 text-slate-300" />
                                <Volume2 className="w-3.5 h-3.5 text-slate-300" />
                                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                                
                                <div className="flex flex-col items-end text-[10px] leading-tight text-slate-200 border-l border-slate-800 pl-2.5">
                                    <span className="font-semibold">{currentTime || '12:00'}</span>
                                    <span className="text-slate-500 text-[9px]">{currentDate || '11/08/2026'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* C. LAPTOP HINGE */}
                <div className="w-[96%] mx-auto h-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-x border-slate-700/60 relative z-20" />

                {/* D. LAPTOP BASE DECK */}
                <div className="relative z-10 -mt-0.5">
                    <div className="w-[108%] -ml-[4%] h-3.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-b-md border-t border-slate-500/60 shadow-md relative z-20 flex items-start justify-center">
                        <div className="w-24 h-1.5 bg-slate-950 rounded-b-md border-x border-b border-slate-700/70" />
                    </div>
                    <div 
                        className="w-[114%] -ml-[7%] h-20 bg-gradient-to-b from-black/40 via-black/15 to-transparent blur-md relative z-0 -mt-1 pointer-events-none opacity-40"
                        style={{
                            clipPath: 'polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)'
                        }}
                    />
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. FOOTER */}
            {/* ========================================================================= */}
            <footer className="w-full text-center py-2 z-10 text-[11px] text-slate-600 font-medium">
                &copy; {new Date().getFullYear()} PT Dayamitra Telekomunikasi Tbk. All rights reserved.
            </footer>
        </div>
    );
}
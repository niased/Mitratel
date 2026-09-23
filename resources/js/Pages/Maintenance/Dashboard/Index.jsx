import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DashboardRpm from './DashboardRpm';
import DashboardSmartkey from './DashboardSmartkey';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
    Activity,
    KeyRound,
    MapPin,
    BarChart3,
    Sparkles,
    ChevronDown,
    Check
} from 'lucide-react';

export default function DashboardIndex({ 
    auth, 
    rpmSummary = {},
    tiaraSummary = {},
    smartkeySummary = {}, 
    filterOptions = {}, 
    filters = {} 
}) {
    // Mode Switcher: 'rpm' (ANT) | 'tiara' (TIARA) | 'smartkey'
    const [viewMode, setViewMode] = useState('rpm');

    const isRpmActive = viewMode === 'rpm' || viewMode === 'tiara';

    const getRpmLabel = () => {
        if (viewMode === 'tiara') return 'Dashboard RPM (TIARA)';
        return 'Dashboard RPM (ANT)';
    };

    return (
        <AuthenticatedLayout header="Dashboard Maintenance">
            <Head title="Dashboard Maintenance" />

            {/* HEADER HALAMAN & SWITCHER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Dashboard Maintenance
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pusat kendali dan pemonitoran performa RPM ANT, RPM TIARA, serta status SmartKey.
                    </p>
                </div>

                {/* SUB-MENU SWITCHER (DROPDOWN RPM + BUTTON SMARTKEY) */}
                <div className="inline-flex items-center p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm self-start md:self-auto gap-1">
                    
                    {/* DROPDOWN MENU KATEGORI DASHBOARD RPM */}
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer focus:outline-none ${
                                isRpmActive
                                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                        >
                            {viewMode === 'tiara' ? (
                                <Sparkles className="w-4 h-4 shrink-0" />
                            ) : (
                                <Activity className="w-4 h-4 shrink-0" />
                            )}
                            <span>{getRpmLabel()}</span>
                            <ChevronDown className="w-4 h-4 shrink-0 ml-1 opacity-80" />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 z-50 shadow-lg p-1.5 rounded-xl">
                            <DropdownMenuItem
                                onClick={() => setViewMode('rpm')}
                                className={`flex items-center justify-between text-xs sm:text-sm cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                                    viewMode === 'rpm'
                                        ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-slate-800/80'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-rose-500" />
                                    <span>Dashboard RPM (ANT)</span>
                                </div>
                                {viewMode === 'rpm' && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => setViewMode('tiara')}
                                className={`flex items-center justify-between text-xs sm:text-sm cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                                    viewMode === 'tiara'
                                        ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-slate-800/80'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-rose-500" />
                                    <span>Dashboard RPM (TIARA)</span>
                                </div>
                                {viewMode === 'tiara' && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* BUTTON STATUS SMARTKEY */}
                    <button
                        type="button"
                        onClick={() => setViewMode('smartkey')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                            viewMode === 'smartkey'
                                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        <KeyRound className="w-4 h-4 shrink-0" />
                        <span>Status SmartKey</span>
                    </button>
                </div>
            </div>

            {/* VIEW 1: MONITORING RPM (ANT) */}
            {viewMode === 'rpm' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-rose-600" /> Performa Log RPM (ANT)
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Ringkasan aktivitas RPM ANT terdeteksi
                                </p>
                            </div>
                        </div>
                        <div className="w-full">
                            <DashboardRpm 
                                summary={rpmSummary} 
                                options={filterOptions.rpm || {}} 
                                filters={filters.rpm || {}} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW 2: MONITORING RPM (TIARA) */}
            {viewMode === 'tiara' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-rose-600" /> Performa Tiket RPM (TIARA)
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Ringkasan aktivitas & performa pengerjaan tiket TIARA
                                </p>
                            </div>
                        </div>
                        <div className="w-full">
                            <DashboardRpm 
                                summary={tiaraSummary} 
                                options={filterOptions.tiara || {}} 
                                filters={filters.tiara || {}} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW 3: STATUS SMARTKEY */}
            {viewMode === 'smartkey' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-rose-600" /> Monitoring & Sebaran SmartKey
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Ringkasan status unit dan pemetaan lokasi SmartKey
                                </p>
                            </div>
                        </div>
                        <div className="w-full relative z-0">
                            <DashboardSmartkey 
                                summary={smartkeySummary} 
                                options={filterOptions.smartkey || {}} 
                                filters={filters.smartkey || {}} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
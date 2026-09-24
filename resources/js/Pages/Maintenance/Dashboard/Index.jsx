import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';

import DashboardRpm from './DashboardRpm';
import DashboardSmartkey from './DashboardSmartkey';

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export default function DashboardIndex({
    auth,
    rpmSummary = {},
    tiaraSummary = {},
    rpmAllSummary = {},
    smartkeySummary = {},
    filterOptions = {},
    filters = {}
}) {
    // Mode Switcher: 'rpm' (ANT) | 'tiara' (TIARA) | 'rpm_all' (Gabungan) | 'smartkey'
    const [viewMode, setViewMode] = useState('rpm');

    const isRpmActive = viewMode === 'rpm' || viewMode === 'tiara' || viewMode === 'rpm_all';

    const getRpmLabel = () => {
        if (viewMode === 'tiara') return 'Dashboard RPM (TIARA)';
        if (viewMode === 'rpm_all') return 'Dashboard RPM (Gabungan)';
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
                            <Icon
                                name="chart"
                                size={16}
                                fill={isRpmActive ? 'white' : 'theme'}
                            />
                            <span>{getRpmLabel()}</span>
                            <Icon
                                name="chevronDown"
                                size={16}
                                fill={isRpmActive ? 'white' : 'theme'}
                                className="shrink-0 ml-1 opacity-80"
                            />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-60 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 z-50 shadow-lg p-1.5 rounded-xl">
                            {/* OPSI 1: RPM ANT */}
                            <DropdownMenuItem
                                onClick={() => setViewMode('rpm')}
                                className={`flex items-center justify-between text-xs sm:text-sm cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                                    viewMode === 'rpm'
                                        ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-slate-800/80'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon name="chart" size={16} fill="theme" />
                                    <span>Dashboard RPM (ANT)</span>
                                </div>

                                {viewMode === 'rpm' && (
                                    <Icon name="check" size={16} fill="theme" />
                                )}
                            </DropdownMenuItem>

                            {/* OPSI 2: RPM TIARA */}
                            <DropdownMenuItem
                                onClick={() => setViewMode('tiara')}
                                className={`flex items-center justify-between text-xs sm:text-sm cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                                    viewMode === 'tiara'
                                        ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-slate-800/80'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon name="chart" size={16} fill="theme" />
                                    <span>Dashboard RPM (TIARA)</span>
                                </div>

                                {viewMode === 'tiara' && (
                                    <Icon name="check" size={16} fill="theme" />
                                )}
                            </DropdownMenuItem>

                            {/* OPSI 3: RPM GABUNGAN */}
                            <DropdownMenuItem
                                onClick={() => setViewMode('rpm_all')}
                                className={`flex items-center justify-between text-xs sm:text-sm cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                                    viewMode === 'rpm_all'
                                        ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-slate-800/80'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon name="chart" size={16} fill="theme" />
                                    <span>Dashboard RPM (Gabungan)</span>
                                </div>

                                {viewMode === 'rpm_all' && (
                                    <Icon name="check" size={16} fill="theme" />
                                )}
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
                        <Icon
                            name="electronic-locks-close"
                            size={16}
                            fill={viewMode === 'smartkey' ? 'white' : 'red'}
                        />
                        <span>Status SmartKey</span>
                    </button>
                </div>
            </div>

            {/* VIEW 1: MONITORING RPM (ANT) */}
            {viewMode === 'rpm' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="w-full">
                            <DashboardRpm
                                title="Performa Log RPM (ANT)"
                                description="Ringkasan aktivitas dan Performa RPM (Ant)"
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
                        <div className="w-full">
                            <DashboardRpm
                                title="Performa RPM (TIARA)"
                                description="Ringkasan aktivitas & performa RPM (Tiara)"
                                summary={tiaraSummary}
                                options={filterOptions.tiara || {}}
                                filters={filters.tiara || {}}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW 3: MONITORING RPM (GABUNGAN ANT + TIARA) */}
            {viewMode === 'rpm_all' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="w-full">
                            <DashboardRpm
                                title="Performa RPM (Gabungan)"
                                description="Ringkasan akumulasi aktivitas & performa RPM (ANT + TIARA)"
                                summary={rpmAllSummary}
                                options={filterOptions.rpmAll || {}}
                                filters={filters.rpmAll || {}}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW 4: STATUS SMARTKEY */}
            {viewMode === 'smartkey' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Icon name="local" size={20} />
                                    Monitoring & Sebaran SmartKey
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
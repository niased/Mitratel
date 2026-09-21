import React, { useMemo, useState } from 'react';
import { 
    KeyRound, 
    MapPin, 
    ShieldAlert, 
    Lock, 
    Unlock, 
    HelpCircle, 
    PieChart as PieChartIcon, 
    BarChart3 
} from 'lucide-react';
import { 
    PieChart, 
    Pie, 
    Cell, 
    Tooltip, 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Legend 
} from 'recharts';
import Map from '@/components/Map';

const SMARTKEY_STATUS_CONFIG = {
    LOCKED: {
        label: 'LOCKED',
        color: '#0ea5e9',
        bg: 'rgba(14,165,233,0.35)',
        badgeBg: 'rgba(14,165,233,0.15)',
        badgeBorder: 'rgba(14,165,233,0.3)',
    },
    UNLOCKED: {
        label: 'UNLOCKED',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.35)',
        badgeBg: 'rgba(245,158,11,0.15)',
        badgeBorder: 'rgba(245,158,11,0.3)',
    },
    '#N/A': {
        label: '#N/A',
        color: '#64748b',
        bg: 'rgba(100,116,139,0.35)',
        badgeBg: 'rgba(100,116,139,0.15)',
        badgeBorder: 'rgba(100,116,139,0.3)',
    },
};

const normalizeStatus = (statusStr) => {
    if (!statusStr) return '#N/A';
    const clean = String(statusStr).toUpperCase().replace(/[^A-Z0-9#]/g, '');
    if (clean === 'LOCKED') return 'LOCKED';
    if (clean === 'UNLOCKED') return 'UNLOCKED';
    return '#N/A';
};

const getSmartkeyPopupData = (item, lat, lng) => {
    const props = item?.properties || item || {};
    return {
        title: props.site_name || props.site_id || 'Site SmartKey',
        details: [
            { label: 'Tower ID', value: props.tower_id || '-' },
            { label: 'SN Key', value: props.serial_number || '-' },
            { label: 'Personil KSM', value: props.ksm || '-' },
            { label: 'Infrako', value: props.infrako || '-' },
            { label: 'Kota / Kab', value: props.kota_kab || '-' },
            { label: 'Posisi Unit', value: props.posisi_unit || '-' },
            { 
                label: 'Koordinat', 
                value: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`, 
                isMonospace: true 
            },
        ],
        statusText: normalizeStatus(props.status_aktifitas || props.status),
    };
};

export default function StatistikSmartkey({ summary = {} }) {
    const activeSummary = summary?.summary || summary || {};
    const activeChart = summary?.chart || summary?.chart_data || [];
    const activeMapRaw = useMemo(() => {
        if (Array.isArray(summary?.map_data) && summary.map_data.length > 0) return summary.map_data;
        if (Array.isArray(summary?.mapData) && summary.mapData.length > 0) return summary.mapData;
        if (Array.isArray(summary?.map) && summary.map.length > 0) return summary.map;
        if (Array.isArray(summary?.table_data) && summary.table_data.length > 0) return summary.table_data;
        return [];
    }, [summary]);

    const [hiddenBars, setHiddenBars] = useState({
        Locked: false,
        Unlocked: false,
        '#N/A': false,
    });

    const handleLegendClick = (e) => {
        const { dataKey } = e;
        if (dataKey) {
            setHiddenBars((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
        }
    };

    const totalUnit = Number(activeSummary.total_unit ?? 0);
    const totalAktif = Number(activeSummary.count_aktif ?? 0);
    const totalProblem = Number(activeSummary.count_problem ?? 0);
    const countLocked = Number(activeSummary.count_locked ?? 0);
    const countUnlocked = Number(activeSummary.count_unlocked ?? 0);
    const countNA = Number(activeSummary.count_na ?? 0);

    const normalizedMapData = useMemo(() => {
        if (!Array.isArray(activeMapRaw)) return [];
        return activeMapRaw
            .map((item) => {
                if (!item) return null;
                let lat = Number(item.latitude || item.lat);
                let lng = Number(item.longitude || item.lng);
                if ((isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) && item.long_lat) {
                    const parts = String(item.long_lat)
                        .split(/[\s,;\/]+/)
                        .map((p) => parseFloat(p.replace(',', '.')))
                        .filter((n) => !isNaN(n));
                    if (parts.length >= 2) {
                        if (Math.abs(parts[0]) > 50) { lng = parts[0]; lat = parts[1]; }
                        else if (Math.abs(parts[1]) > 50) { lat = parts[0]; lng = parts[1]; }
                        else { lng = parts[0]; lat = parts[1]; }
                    }
                }
                if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;
                const statusClean = normalizeStatus(item.status_aktifitas || item.status);
                return {
                    ...item,
                    latitude: lat,
                    longitude: lng,
                    lat: lat,
                    lng: lng,
                    position: [lat, lng],
                    coordinates: [lng, lat],
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    properties: {
                        ...item,
                        site_name: item.site_name || item.site_id || 'Site SmartKey',
                        status: statusClean,
                        status_aktifitas: statusClean,
                        latitude: lat,
                        longitude: lng,
                    },
                    status_aktifitas: statusClean,
                    status: statusClean,
                };
            })
            .filter(Boolean);
    }, [activeMapRaw]);

    const donutData = useMemo(() => {
        const raw = [
            { name: 'Locked', value: countLocked, color: '#0ea5e9', badgeClass: 'bg-sky-500' },
            { name: 'Unlocked', value: countUnlocked, color: '#f59e0b', badgeClass: 'bg-amber-500' },
            { name: '#N/A', value: countNA, color: '#64748b', badgeClass: 'bg-slate-500' },
        ];
        return raw.map((item) => ({
            ...item,
            pct: totalUnit > 0 ? ((item.value / totalUnit) * 100).toFixed(1) : '0.0'
        }));
    }, [countLocked, countUnlocked, countNA, totalUnit]);

    const barInfrakoData = useMemo(() => {
        if (!Array.isArray(activeChart)) return [];
        return activeChart
            .map((item) => {
                const locked = Number(item.locked || 0);
                const unlocked = Number(item.unlocked || 0);
                const total = Number(item.total || 0);
                const naCalculated = item.na !== undefined ? Number(item.na) : Math.max(0, total - (locked + unlocked));
                return {
                    name: item.infrako || 'Unassigned',
                    Locked: locked,
                    Unlocked: unlocked,
                    '#N/A': naCalculated,
                    total: total || (locked + unlocked + naCalculated),
                };
            })
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);
    }, [activeChart]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Total Unit</span>
                            <KeyRound className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white mt-1.5">
                            {totalUnit.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-normal leading-tight">Total terdaftar di sistem</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Unit Aktif</span>
                            <MapPin className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1.5">
                            {totalAktif.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60 mt-2 font-normal leading-tight">Operasional normal</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Rusak / Hilang</span>
                            <ShieldAlert className="h-4 w-4 text-rose-500" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1.5">
                            {totalProblem.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <p className="text-[10px] text-rose-600/70 dark:text-rose-400/60 mt-2 font-normal leading-tight">Perlu tindak lanjut</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Locked</span>
                            <Lock className="h-4 w-4 text-sky-500" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400 mt-1.5">
                            {countLocked.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <p className="text-[10px] text-sky-600/70 dark:text-sky-400/60 mt-2 font-normal leading-tight">Status posisi terkunci</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                            <span className="text-[11px] font-medium uppercase tracking-wider">Unlocked</span>
                            <Unlock className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-1.5">
                            {countUnlocked.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 mt-2 font-normal leading-tight">Sedang terbuka / diakses</p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
                    <div>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                            <span className="text-[11px] font-medium uppercase tracking-wider">#N/A</span>
                            <HelpCircle className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-400 mt-1.5">
                            {countNA.toLocaleString('id-ID')}
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-normal leading-tight">Belum teridentifikasi</p>
                </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-sky-500" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Peta Sebaran SmartKey
                        </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                        {normalizedMapData.length} Pin Terdeteksi
                    </span>
                </div>
                <div className="p-0">
                    <Map 
                        data={activeMapRaw}
                        statusKey="status_aktifitas"
                        statusConfig={SMARTKEY_STATUS_CONFIG}
                        getPopupData={getSmartkeyPopupData}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <PieChartIcon className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Proporsi Status Aktivitas Global
                        </h3>
                    </div>
                    <div className="relative w-full h-[220px] my-2 flex items-center justify-center">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                            <span className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                                {totalUnit.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                                Total Keys
                            </span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={68}
                                    outerRadius={88}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {donutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    wrapperStyle={{ outline: 'none' }}
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderColor: '#1e293b',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        color: '#f8fafc',
                                        padding: '8px 12px',
                                    }}
                                    formatter={(val, name) => [`${val.toLocaleString('id-ID')} unit`, name]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        {donutData.map((item) => (
                            <div key={item.name} className="flex flex-col items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60">
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${item.badgeClass}`} />
                                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate">
                                        {item.name}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                                    {item.value.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">({item.pct}%)</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <BarChart3 className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Status Aktivitas per Region Infrako (Top 6)
                        </h3>
                    </div>
                    <div className="w-full h-[260px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barInfrakoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderColor: '#1e293b',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        color: '#f8fafc',
                                        padding: '8px 12px',
                                    }}
                                />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    iconType="circle"
                                    onClick={handleLegendClick}
                                    wrapperStyle={{ fontSize: '11px', paddingBottom: '12px', cursor: 'pointer' }}
                                    formatter={(value) => {
                                        const isHidden = hiddenBars[value];
                                        return (
                                            <span className={`select-none transition-opacity ${isHidden ? 'opacity-30 line-through' : 'opacity-100 text-slate-600 dark:text-slate-300'}`}>
                                                {value}
                                            </span>
                                        );
                                    }}
                                />
                                <Bar dataKey="#N/A" fill="#64748b" radius={[4, 4, 0, 0]} hide={hiddenBars['#N/A']} />
                                <Bar dataKey="Locked" fill="#0ea5e9" radius={[4, 4, 0, 0]} hide={hiddenBars['Locked']} />
                                <Bar dataKey="Unlocked" fill="#f59e0b" radius={[4, 4, 0, 0]} hide={hiddenBars['Unlocked']} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
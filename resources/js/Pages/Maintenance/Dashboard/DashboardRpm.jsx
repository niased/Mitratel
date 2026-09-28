import React, { useState, useRef, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Filter, Image as ImageIcon, Loader2, RotateCcw, Activity } from 'lucide-react';
import { toPng } from 'html-to-image';

import HybridDropdown from '@/components/HybridDropdown';

// Import Sub-Komponen
import StatistikRpm from './StatistikRpm';
import GrafikRpm from './GrafikRpm';
import TabelRpm from './TabelRpm';

export default function DashboardRpm({ 
    summary = {}, 
    options = {}, 
    filters = {}, 
    title = "Performa RPM", 
    description = "Ringkasan aktivitas & performa RPM" 
}) {
    const [isExporting, setIsExporting] = useState(false);
    const dashboardRef = useRef(null);

    // Ambil Props & URL Params langsung dari Inertia
    const pageProps = usePage().props || {};
    const inertiaFilters = pageProps.filters || {};

    // Helper untuk membaca nilai filter aktif dari 4 sumber sekaligus
    const getActiveFilterValue = (...keys) => {
        for (const k of keys) {
            if (filters && filters[k] && filters[k] !== 'ALL') return filters[k];
        }
        for (const k of keys) {
            if (inertiaFilters[k] && inertiaFilters[k] !== 'ALL') return inertiaFilters[k];
            if (inertiaFilters.rpmAll && inertiaFilters.rpmAll[k] && inertiaFilters.rpmAll[k] !== 'ALL') return inertiaFilters.rpmAll[k];
            if (inertiaFilters.rpm && inertiaFilters.rpm[k] && inertiaFilters.rpm[k] !== 'ALL') return inertiaFilters.rpm[k];
            if (inertiaFilters.tiara && inertiaFilters.tiara[k] && inertiaFilters.tiara[k] !== 'ALL') return inertiaFilters.tiara[k];
        }
        if (summary && summary.filters) {
            for (const k of keys) {
                if (summary.filters[k] && summary.filters[k] !== 'ALL') return summary.filters[k];
            }
        }
        if (typeof window !== 'undefined' && window.location.search) {
            const urlParams = new URLSearchParams(window.location.search);
            for (const k of keys) {
                const val = urlParams.get(k);
                if (val && val !== 'ALL') return val;
            }
        }
        return 'ALL';
    };

    // Helper Opsi Dropdown
    const getOptionsList = (key, fallbackKeys = []) => {
        if (options && options[key] && options[key].length > 0) return options[key];
        for (const fk of fallbackKeys) {
            if (options && options[fk] && options[fk].length > 0) return options[fk];
        }
        if (summary && summary.options) {
            if (summary.options[key]) return summary.options[key];
            for (const fk of fallbackKeys) {
                if (summary.options[fk]) return summary.options[fk];
            }
        }
        return [];
    };

    // Formatter Opsi Pilihan HybridDropdown
    const tahunOptions = useMemo(() => [
        { value: 'ALL', label: 'Semua Tahun' },
        ...getOptionsList('tahun', ['year']).map(t => ({ value: String(t), label: `Tahun ${t}` }))
    ], [options, summary]);

    const regionalOptions = useMemo(() => [
        { value: 'ALL', label: 'Semua Regional' },
        ...getOptionsList('regional', ['sitearea_reg', 'reg']).map(r => ({ value: String(r), label: String(r) }))
    ], [options, summary]);

    const rtpOptions = useMemo(() => [
        { value: 'ALL', label: 'Semua RTP/Area' },
        ...getOptionsList('rtp', ['sitearea_to', 'to']).map(to => ({ value: String(to), label: String(to) }))
    ], [options, summary]);

    const siteIdOptions = useMemo(() => [
        { value: 'ALL', label: 'Semua Site ID' },
        ...getOptionsList('site_id', ['siteid', 'site_code']).map(s => ({ value: String(s), label: String(s) }))
    ], [options, summary]);

    // State Filter Terpilih
    const selectedTahun    = getActiveFilterValue('tahun', 'year');
    const selectedRegional = getActiveFilterValue('regional', 'sitearea_reg', 'reg');
    const selectedRtp      = getActiveFilterValue('rtp', 'sitearea_to', 'to');
    const selectedSiteId   = getActiveFilterValue('site_id', 'siteid', 'site_code');

    const isFiltered = selectedTahun !== 'ALL' || selectedRegional !== 'ALL' || selectedRtp !== 'ALL' || selectedSiteId !== 'ALL';

    const handleFilterChange = (key, value) => {
        const newParams = {};

        if (selectedTahun !== 'ALL') newParams.tahun = selectedTahun;
        if (selectedRegional !== 'ALL') {
            newParams.regional = selectedRegional;
            newParams.sitearea_reg = selectedRegional;
        }
        if (selectedRtp !== 'ALL') newParams.rtp = selectedRtp;
        if (selectedSiteId !== 'ALL') {
            newParams.site_id = selectedSiteId;
            newParams.siteid = selectedSiteId;
        }

        if (key === 'tahun') newParams.tahun = value;
        if (key === 'regional') {
            newParams.regional = value;
            newParams.sitearea_reg = value;
            newParams.reg = value;
        }
        if (key === 'rtp') newParams.rtp = value;
        if (key === 'site_id') {
            newParams.site_id = value;
            newParams.siteid = value;
        }

        Object.keys(newParams).forEach(k => {
            if (newParams[k] === 'ALL' || !newParams[k]) delete newParams[k];
        });

        router.get(
            window.location.pathname,
            newParams,
            {
                preserveState: true,
                preserveScroll: true,
                replace: true
            }
        );
    };

    const handleResetAllFilters = () => {
        router.get(
            window.location.pathname,
            {},
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleDownloadDashboardImage = async () => {
        if (!dashboardRef.current) return;
        setIsExporting(true);
        const isDarkMode = document.documentElement.classList.contains('dark');
        try {
            const dataUrl = await toPng(dashboardRef.current, { 
                cacheBust: true,
                quality: 1.0,
                pixelRatio: 2,
                backgroundColor: isDarkMode ? '#020617' : '#f8fafc'
            });
            const link = document.createElement('a');
            const fileName = `Dashboard_RPM_${selectedTahun}_${selectedRtp}_${new Date().toISOString().slice(0,10)}.png`;
            link.download = fileName;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Gagal mendownload gambar dashboard:", err);
            alert("Terjadi kesalahan saat memproses gambar.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-5">
            <style>{`
                .capture-area *::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    background: transparent !important;
                }
                .capture-area * {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
            `}</style>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-rose-500" />
                        <span>{title}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {description}
                    </p>
                </div>

                <button
                    onClick={handleDownloadDashboardImage}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 dark:disabled:bg-rose-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-md shadow-rose-600/20 dark:shadow-rose-950/40 cursor-pointer shrink-0 self-start sm:self-auto"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating Image...</span>
                        </>
                    ) : (
                        <>
                            <ImageIcon className="w-4 h-4" />
                            <span>Download Dashboard (PNG)</span>
                        </>
                    )}
                </button>
            </div>

            {/* BAR KONTROL FILTER */}
            <div className="bg-white dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
                <div className="flex flex-wrap items-center gap-3 w-full">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider pr-1">
                        <Filter className="w-4 h-4 text-rose-500" />
                        <span>Filter Data RPM</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

                    {/* 1. FILTER TAHUN */}
                    <div className="w-full sm:w-36">
                        <HybridDropdown
                            value={selectedTahun}
                            options={tahunOptions}
                            onChange={(val) => handleFilterChange('tahun', val)}
                            placeholder="Semua Tahun"
                            searchPlaceholder="Cari tahun..."
                            allowCustom={false}
                            className="text-xs font-semibold"
                        />
                    </div>

                    {/* 2. FILTER REGIONAL */}
                    <div className="w-full sm:w-44">
                        <HybridDropdown
                            value={selectedRegional}
                            options={regionalOptions}
                            onChange={(val) => handleFilterChange('regional', val)}
                            placeholder="Semua Regional"
                            searchPlaceholder="Cari Regional..."
                            allowCustom={false}
                            className="text-xs font-semibold"
                        />
                    </div>

                    {/* 3. FILTER RTP / AREA */}
                    <div className="w-full sm:w-48">
                        <HybridDropdown
                            value={selectedRtp}
                            options={rtpOptions}
                            onChange={(val) => handleFilterChange('rtp', val)}
                            placeholder="Semua RTP/Area"
                            searchPlaceholder="Cari RTP / Area..."
                            allowCustom={false}
                            className="text-xs font-semibold"
                        />
                    </div>

                    {/* 4. FILTER SITE ID */}
                    <div className="w-full sm:w-44">
                        <HybridDropdown
                            value={selectedSiteId}
                            options={siteIdOptions}
                            onChange={(val) => handleFilterChange('site_id', val)}
                            placeholder="Semua Site ID"
                            searchPlaceholder="Cari Site ID..."
                            allowCustom={false}
                            className="text-xs font-semibold"
                        />
                    </div>

                    {/* BUTTON RESET FILTER */}
                    {isFiltered && (
                        <button
                            type="button"
                            onClick={handleResetAllFilters}
                            className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* CAPTURE AREA */}
            <div ref={dashboardRef} className="capture-area space-y-5 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-900 rounded-xl overflow-hidden transition-colors duration-200">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Dashboard RPM</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Filter: Tahun ({selectedTahun === 'ALL' ? 'Semua' : selectedTahun}) | Regional ({selectedRegional === 'ALL' ? 'Semua' : selectedRegional}) | RTP/Area ({selectedRtp === 'ALL' ? 'Semua' : selectedRtp}) | Site ID ({selectedSiteId === 'ALL' ? 'Semua' : selectedSiteId})
                        </p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        Generated: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>

                <StatistikRpm summary={summary} />
                <GrafikRpm summary={summary} />
                <TabelRpm 
                    monthlyPivot={summary.monthlyPivot || {}} 
                    rtpPivot={summary.rtpPivot || []} 
                    regionalPivot={summary.regionalPivot || summary.regPivot || summary.regional_pivot || []} 
                />
            </div>
        </div>
    );
}
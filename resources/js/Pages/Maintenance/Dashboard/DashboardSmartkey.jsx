import React, { useState, useRef, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { Filter, Image as ImageIcon, Loader2, RotateCcw } from 'lucide-react';
import { toPng } from 'html-to-image';

import HybridDropdown from '@/components/HybridDropdown';

// Import Sub-Komponen
import StatistikSmartkey from './StatistikSmartkey';
import TabelSmartkey from './TabelSmartkey';

export default function DashboardSmartkey({ 
    summary = {}, 
    tableData = [], 
    options = {},
    filters = {}
}) {
    const [isExporting, setIsExporting] = useState(false);
    const dashboardRef = useRef(null);

    // Opsi asal
    const listInfrako = options.infrako || [];
    const listStatus = options.status || [];
    const listSN = options.sn || [];

    // Formatter Opsi HybridDropdown
    const infrakoOptions = useMemo(() => [
        { value: 'ALL', label: 'Semua Infrako' },
        ...(listInfrako || []).map(i => ({ value: String(i), label: String(i) }))
    ], [listInfrako]);

    const statusOptions = useMemo(() => [
        { value: 'ALL', label: 'Semua Status Unit' },
        ...(listStatus || []).map(s => ({ value: String(s), label: String(s) }))
    ], [listStatus]);

    const snOptions = useMemo(() => [
        { value: 'ALL', label: 'Semua Serial Number' },
        ...(listSN || []).map(sn => ({ value: String(sn), label: String(sn) }))
    ], [listSN]);

    // State filter terpilih
    const selectedInfrako = Array.isArray(filters.infrako) ? (filters.infrako[0] || 'ALL') : (filters.infrako || 'ALL');
    const selectedStatus = Array.isArray(filters.status) ? (filters.status[0] || 'ALL') : (filters.status || 'ALL');
    const selectedSN = Array.isArray(filters.sn) ? (filters.sn[0] || 'ALL') : (filters.sn || 'ALL');

    const isFiltered = selectedInfrako !== 'ALL' || selectedStatus !== 'ALL' || selectedSN !== 'ALL';

    const resolvedTableData = useMemo(() => {
        if (Array.isArray(tableData) && tableData.length > 0) return tableData;
        if (summary?.table_data) return summary.table_data;
        if (summary?.tableData) return summary.tableData;
        if (summary?.pivot) return summary.pivot;
        return tableData;
    }, [tableData, summary]);

    const handleFilterChange = (key, value) => {
        const updatedFilters = { ...filters };
        if (value === 'ALL' || !value) {
            delete updatedFilters[key];
        } else {
            updatedFilters[key] = value;
        }

        router.get(
            window.location.pathname,
            updatedFilters,
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
            dashboardRef.current.classList.add('exporting-mode');
            await new Promise((resolve) => setTimeout(resolve, 300));

            const dataUrl = await toPng(dashboardRef.current, { 
                cacheBust: true,
                quality: 1.0,
                pixelRatio: 2,
                backgroundColor: isDarkMode ? '#020617' : '#f8fafc',
                fetchRequestInit: { mode: 'cors' },
            });

            const link = document.createElement('a');
            const infraName = selectedInfrako === 'ALL' ? 'Semua' : selectedInfrako;
            const statusName = selectedStatus === 'ALL' ? 'Semua' : selectedStatus;
            const fileName = `Dashboard_SmartKey_${infraName}_${statusName}_${new Date().toISOString().slice(0,10)}.png`;
            
            link.download = fileName;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Gagal mendownload gambar dashboard:", err);
            alert("Terjadi kesalahan saat memproses gambar.");
        } finally {
            if (dashboardRef.current) {
                dashboardRef.current.classList.remove('exporting-mode');
            }
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
                .capture-area.exporting-mode * {
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                }
            `}</style>

            {/* BAR KONTROL FILTER & DOWNLOAD */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider pr-1">
                        <Filter className="w-4 h-4 text-sky-500" />
                        <span>Filter SmartKey</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                    
                    <div className="w-full sm:w-48">
                        <HybridDropdown
                            value={selectedInfrako}
                            options={infrakoOptions}
                            onChange={(val) => handleFilterChange('infrako', val)}
                            placeholder="Semua Infrako"
                            searchPlaceholder="Cari Infrako..."
                            allowCustom={false}
                            className="text-xs font-semibold"
                        />
                    </div>

                    <div className="w-full sm:w-44">
                        <HybridDropdown
                            value={selectedStatus}
                            options={statusOptions}
                            onChange={(val) => handleFilterChange('status', val)}
                            placeholder="Semua Status Unit"
                            searchPlaceholder="Cari Status..."
                            allowCustom={false}
                            className="text-xs font-semibold"
                        />
                    </div>

                    <div className="w-full sm:w-52">
                        <HybridDropdown
                            value={selectedSN}
                            options={snOptions}
                            onChange={(val) => handleFilterChange('sn', val)}
                            placeholder="Semua Serial Number"
                            searchPlaceholder="Cari Serial Number..."
                            allowCustom={false}
                            className="text-xs font-semibold"
                        />
                    </div>

                    {isFiltered && (
                        <button
                            type="button"
                            onClick={handleResetAllFilters}
                            className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Filter</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                        type="button"
                        onClick={handleDownloadDashboardImage}
                        disabled={isExporting}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-400 dark:disabled:bg-sky-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-md shadow-sky-600/20 dark:shadow-sky-950/40 cursor-pointer"
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
            </div>

            {/* AREA CAPTURE DASHBOARD */}
            <div ref={dashboardRef} className="capture-area space-y-5 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-900 rounded-xl overflow-hidden transition-colors duration-200">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Dashboard SmartKey</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Filter: Region Infrako ({selectedInfrako === 'ALL' ? 'Semua' : selectedInfrako}) | Status Unit ({selectedStatus === 'ALL' ? 'Semua' : selectedStatus}) | Serial Number ({selectedSN === 'ALL' ? 'Semua' : selectedSN})
                        </p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        Generated: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>

                <StatistikSmartkey summary={summary} />
                <TabelSmartkey tableData={resolvedTableData} />
            </div>
        </div>
    );
}
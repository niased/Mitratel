import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuSearchInput
} from '@/components/ui/dropdown-menu';
import { 
    Filter, ChevronDown, Image as ImageIcon, Loader2, RotateCcw 
} from 'lucide-react';
import { toPng } from 'html-to-image';

import StatistikCombat from './StatistikCombat';
import TabelCombat from './TabelCombat';

function FilterMultiSelect({ options = [], selectedValues = [], onChange, placeholder = "Pilih...", searchPlaceholder = "Cari..." }) {
    const [search, setSearch] = useState('');
    const showSearch = options.length > 5;

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const q = search.toLowerCase();
        return options.filter((opt) => String(opt).toLowerCase().includes(q));
    }, [options, search]);

    const handleToggle = (opt) => {
        if (selectedValues.includes(opt)) {
            onChange(selectedValues.filter((item) => item !== opt));
        } else {
            onChange([...selectedValues, opt]);
        }
    };

    const handleSelectAll = () => {
        if (selectedValues.length === options.length) {
            onChange([]);
        } else {
            onChange([...options]);
        }
    };

    const getTriggerLabel = () => {
        if (selectedValues.length === 0) return placeholder;
        if (selectedValues.length === 1) return selectedValues[0];
        return `${selectedValues.length} Terpilih`;
    };

    return (
        <DropdownMenu onOpenChange={(open) => { if (!open) setSearch(''); }}>
            <DropdownMenuTrigger className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 h-9 px-3 rounded-lg flex items-center justify-between text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700 shadow-sm cursor-pointer">
                <span className="truncate font-normal">{getTriggerLabel()}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--anchor-width)] min-w-[12rem] max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 z-50 shadow-md p-1">
                {showSearch && (
                    <DropdownMenuSearchInput
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder={searchPlaceholder}
                        className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 mb-1"
                    />
                )}
                <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-red-600 dark:text-red-400 hover:underline font-medium cursor-pointer"
                    >
                        {selectedValues.length === options.length ? "Batal Semua" : "Pilih Semua"}
                    </button>
                    {selectedValues.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="text-slate-400 hover:text-rose-500 font-medium transition-colors cursor-pointer"
                        >
                            Reset
                        </button>
                    )}
                </div>
                {filteredOptions.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">Tidak ditemukan</div>
                ) : (
                    filteredOptions.map((opt) => {
                        const isChecked = selectedValues.includes(opt);
                        return (
                            <DropdownMenuCheckboxItem
                                key={opt}
                                checked={isChecked}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={() => handleToggle(opt)}
                                className="text-xs py-1.5 cursor-pointer text-slate-700 dark:text-slate-200 focus:bg-slate-100 dark:focus:bg-slate-800/60"
                            >
                                <span className="truncate">{opt}</span>
                            </DropdownMenuCheckboxItem>
                        );
                    })
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function DashboardCombat({ 
    summary = {}, 
    tableData = [], 
    options = {},
    filters = {}
}) {
    const [isExporting, setIsExporting] = useState(false);
    const dashboardRef = useRef(null);
    const [activeTrip, setActiveTrip] = useState(summary?.active_trip || null);

    const initialList = useMemo(() => {
        if (Array.isArray(tableData) && tableData.length > 0) return tableData;
        if (summary?.table_data) return summary.table_data;
        if (summary?.map_data) return summary.map_data;
        return [];
    }, [tableData, summary]);

    const [liveCombats, setLiveCombats] = useState(initialList);

    // Sinkronisasi data saat filter atau props berubah
    useEffect(() => {
        setLiveCombats(initialList);
    }, [initialList]);

    const listStatus = options.status_combat || options.status || [];
    const listType = options.type_combat || options.tipe || [];
    const listKetinggian = options.ketinggian_combat || options.ketinggian || [];

    const selectedStatus = filters.status_combat || filters.status || [];
    const selectedType = filters.type_combat || filters.tipe || [];
    const selectedKetinggian = filters.ketinggian_combat || filters.ketinggian || [];
    const isFiltered = selectedStatus.length > 0 || selectedType.length > 0 || selectedKetinggian.length > 0;

    // Polling posisi live dengan merge data aman (mencegah tanggal hilang)
    const fetchLivePositions = useCallback(async () => {
        try {
            const res = await axios.get('/combat-api/live-positions');
            if (res.data?.combats && Array.isArray(res.data.combats)) {
                setLiveCombats(prev => {
                    if (!prev || prev.length === 0) return res.data.combats;
                    const incomingMap = new Map(res.data.combats.map(item => [item.id, item]));
                    return prev.map(oldItem => {
                        const newItem = incomingMap.get(oldItem.id);
                        if (!newItem) return oldItem;
                        return {
                            ...oldItem,
                            ...newItem,
                            tanggal_ambil: (newItem.tanggal_ambil && newItem.tanggal_ambil !== '-') 
                                ? newItem.tanggal_ambil 
                                : (oldItem.tanggal_ambil || '-'),
                            tanggal_kembali: (newItem.tanggal_kembali && newItem.tanggal_kembali !== '-') 
                                ? newItem.tanggal_kembali 
                                : (oldItem.tanggal_kembali || '-'),
                            nama_site: (newItem.nama_site && newItem.nama_site !== '-') 
                                ? newItem.nama_site 
                                : (oldItem.nama_site || '-'),
                            pic_data: (newItem.pic_data && newItem.pic_data !== '-') 
                                ? newItem.pic_data 
                                : (oldItem.pic_data || '-'),
                        };
                    });
                });
            }
            if (res.data?.active_trip !== undefined) {
                setActiveTrip(res.data.active_trip);
            }
        } catch (err) {
            console.error("Gagal polling live position COMBAT:", err);
        }
    }, []);

    // Polling berkala setiap 10 detik
    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const poll = async () => {
            if (!isMounted) return;
            await fetchLivePositions();
            if (isMounted) {
                timeoutId = setTimeout(poll, 10000); 
            }
        };

        poll();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [fetchLivePositions]);

    const normalizeStatus = (statusStr) => {
        if (!statusStr) return 'UNASSIGNED';
        const clean = String(statusStr).toUpperCase().trim();
        if (clean.includes('TRANSIT')) return 'IN TRANSIT';
        if (clean.includes('ONSITE') || clean.startsWith('2.')) return 'ONSITE';
        if (clean.includes('READY') || clean.startsWith('5.')) return 'READY TO USE';
        if (clean.includes('BROKEN') || clean.startsWith('6.')) return 'BROKEN';
        return 'UNASSIGNED';
    };

    const dynamicSummary = useMemo(() => {
        return {
            ...summary,
            map_data: liveCombats,
            table_data: liveCombats,
            summary: {
                ...summary?.summary,
                totalCombat: liveCombats.length,
                count_onsite: liveCombats.filter(i => normalizeStatus(i.status_combat || i.status_raw) === 'ONSITE').length,
                count_in_transit: liveCombats.filter(i => normalizeStatus(i.status_combat || i.status_raw) === 'IN TRANSIT').length,
                count_ready: liveCombats.filter(i => normalizeStatus(i.status_combat || i.status_raw) === 'READY TO USE').length,
                count_broken: liveCombats.filter(i => normalizeStatus(i.status_combat || i.status_raw) === 'BROKEN').length,
            }
        };
    }, [summary, liveCombats]);

    const handleFilterChange = (key, values) => {
        router.get(
            window.location.pathname,
            { ...filters, [key]: values },
            { preserveState: true, preserveScroll: true, replace: true }
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
            const statusName = selectedStatus.length === 0 ? 'SemuaStatus' : selectedStatus.join('-');
            const fileName = `Dashboard_COMBAT_${statusName}_${new Date().toISOString().slice(0,10)}.png`;
            
            link.download = fileName;
            link.href = dataUrl;
            link.click();
        } catch (err) {
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

            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider pr-1">
                        <Filter className="w-4 h-4 text-red-600" />
                        <span>Filter COMBAT</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                    
                    <div className="w-full sm:w-48">
                        <FilterMultiSelect
                            options={listStatus} 
                            selectedValues={selectedStatus} 
                            onChange={(val) => handleFilterChange('status_combat', val)}
                            placeholder="Semua Status" 
                            searchPlaceholder="Cari Status..."
                        />
                    </div>

                    <div className="w-full sm:w-44">
                        <FilterMultiSelect
                            options={listType} 
                            selectedValues={selectedType} 
                            onChange={(val) => handleFilterChange('type_combat', val)}
                            placeholder="Semua Type" 
                            searchPlaceholder="Cari Type..."
                        />
                    </div>

                    <div className="w-full sm:w-44">
                        <FilterMultiSelect
                            options={listKetinggian}
                            selectedValues={selectedKetinggian}
                            onChange={(val) => handleFilterChange('ketinggian_combat', val)}
                            placeholder="Semua Ketinggian"
                            searchPlaceholder="Cari Ketinggian..."
                        />
                    </div>

                    {isFiltered && (
                        <button
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
                        onClick={handleDownloadDashboardImage}
                        disabled={isExporting}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-red-400 dark:disabled:bg-red-900 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-md shadow-red-600/20 dark:shadow-red-950/40 cursor-pointer"
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

            <div ref={dashboardRef} className="capture-area space-y-5 p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-900 rounded-xl overflow-hidden transition-colors duration-200">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Dashboard Visualisasi COMBAT</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Status ({selectedStatus.length === 0 ? 'Semua' : selectedStatus.join(', ')}) | Type ({selectedType.length === 0 ? 'Semua' : selectedType.join(', ')}) | Ketinggian ({selectedKetinggian.length === 0 ? 'Semua' : selectedKetinggian.join(', ')})
                        </p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        Generated: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>

                <StatistikCombat 
                    summary={dynamicSummary} 
                    activeTrip={activeTrip}
                />

                <TabelCombat tableData={liveCombats} />
            </div>
        </div>
    );
}
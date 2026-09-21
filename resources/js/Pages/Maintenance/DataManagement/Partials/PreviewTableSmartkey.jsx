import React, { useState, useMemo, useCallback } from 'react';
import { 
    KeyRound, 
    Ban, 
    Check, 
    Loader2, 
    Filter, 
    Search, 
    ChevronLeft, 
    ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Tabel from '@/components/Tabel';

export default function PreviewTableSmartkey({ 
    previewData = [], 
    isSavingMaster = false, 
    onConfirmSave, 
    onCancel 
}) {
    const [skFilter, setSkFilter] = useState('ALL');
    const [skPreviewSearch, setSkPreviewSearch] = useState('');
    const [skCurrentPage, setSkCurrentPage] = useState(1);
    const [skPerPage, setSkPerPage] = useState(10);

    const skFilterOptions = useMemo(() => {
        const counts = { ALL: previewData.length, NEW: 0, UPDATE: 0 };

        previewData.forEach(item => {
            if (item.is_new) counts.NEW++;
            else counts.UPDATE++;
        });

        const list = [{ key: 'ALL', label: 'Semua Status', count: counts.ALL }];
        if (counts.NEW > 0) list.push({ key: 'NEW', label: 'Data Baru (#N/A)', count: counts.NEW });
        if (counts.UPDATE > 0) list.push({ key: 'UPDATE', label: 'Update Telemetri', count: counts.UPDATE });

        return list;
    }, [previewData]);

    const filteredSkPreviewData = useMemo(() => {
        return previewData.filter(item => {
            let matchFilter = true;
            if (skFilter === 'NEW') matchFilter = item.is_new;
            else if (skFilter === 'UPDATE') matchFilter = !item.is_new;

            const q = skPreviewSearch.toLowerCase().trim();
            const matchSearch = !q || 
                String(item.lock_id || '').toLowerCase().includes(q) ||
                String(item.serial_number || '').toLowerCase().includes(q) ||
                String(item.tower_id || '').toLowerCase().includes(q) ||
                String(item.site_name || '').toLowerCase().includes(q) ||
                String(item.status_aktifitas || '').toLowerCase().includes(q) ||
                String(item.long_lat || '').toLowerCase().includes(q);

            return matchFilter && matchSearch;
        });
    }, [previewData, skFilter, skPreviewSearch]);

    const skTotalFiltered = filteredSkPreviewData.length;
    const skTotalPages = Math.ceil(skTotalFiltered / skPerPage) || 1;

    const skPaginatedData = useMemo(() => {
        const start = (skCurrentPage - 1) * skPerPage;
        return filteredSkPreviewData.slice(start, start + skPerPage);
    }, [filteredSkPreviewData, skCurrentPage, skPerPage]);

    const getSkRowNumber = useCallback((index) => {
        return (skCurrentPage - 1) * skPerPage + index + 1;
    }, [skCurrentPage, skPerPage]);

    const getSkItemId = useCallback((item) => item.serial_number || item.lock_id, []);

    const skPreviewColumns = useMemo(() => [
        {
            key: 'xlookup_status',
            label: 'Status XLOOKUP',
            render: (item) => (
                <span className={`px-2 py-0.5 rounded-md font-semibold text-xs ${
                    item.is_new 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                }`}>
                    {item.xlookup_status}
                </span>
            )
        },
        {
            key: 'lock_id',
            label: 'Lock ID',
            render: (item) => (
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {item.lock_id || item.serial_number || '-'}
                </span>
            )
        },
        {
            key: 'serial_number',
            label: 'Serial Number',
            render: (item) => (
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {item.serial_number || '-'}
                </span>
            )
        },
        {
            key: 'tower_id',
            label: 'Tower ID / Site Code',
            render: (item) => (
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {item.tower_id || '#N/A'}
                </span>
            )
        },
        {
            key: 'site_name',
            label: 'Site Name',
            render: (item) => (
                <span className="font-medium text-slate-800 dark:text-slate-200">
                    {item.site_name || '#N/A'}
                </span>
            )
        },
        {
            key: 'status_aktifitas',
            label: 'Status Aktifitas',
            render: (item) => {
                const st = String(item.status_aktifitas || '').toUpperCase();
                const isUnlocked = st.includes('UNLOCK') || st.includes('OPEN');
                return (
                    <span className={`font-bold text-xs ${
                        isUnlocked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                        {st || 'LOCKED'}
                    </span>
                );
            }
        },
        {
            key: 'status_desc',
            label: 'Keterangan Perubahan',
            render: (item) => (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {item.status_desc || '-'}
                </span>
            )
        },
        {
            key: 'long_lat',
            label: 'Koordinat GPS',
            render: (item) => (
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    {item.long_lat || '-'}
                </span>
            )
        }
    ], []);

    if (previewData.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            {/* Header Bar */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Pratinjau Data Smart Key Terdeteksi ({previewData.length.toLocaleString('id-ID')} Baris Data)
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Menampilkan pencocokan XLOOKUP status telemetri gembok dengan Master Data SmartKey.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        disabled={isSavingMaster}
                        className="h-8 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                        <Ban className="w-3.5 h-3.5 text-rose-500" />
                        <span>Batal</span>
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={onConfirmSave}
                        disabled={isSavingMaster}
                        className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                    >
                        {isSavingMaster ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                        <span>{isSavingMaster ? 'Menyimpan...' : 'Masukkan ke Master Data SmartKey'}</span>
                    </Button>
                </div>
            </div>

            {/* Toolbar Filter */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mr-1.5">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span>Status XLOOKUP:</span>
                    </div>
                    {skFilterOptions.map((opt) => {
                        const isActive = skFilter === opt.key;
                        return (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                    setSkFilter(opt.key);
                                    setSkCurrentPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                {opt.label} <span className="text-[11px] opacity-70">({opt.count})</span>
                            </button>
                        );
                    })}
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari Lock ID, SN, Tower ID..."
                        value={skPreviewSearch}
                        onChange={(e) => {
                            setSkPreviewSearch(e.target.value);
                            setSkCurrentPage(1);
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>
            </div>

            {/* Tabel */}
            <div className="w-full overflow-x-auto relative">
                <Tabel
                    data={skPaginatedData}
                    columns={skPreviewColumns}
                    getItemId={getSkItemId}
                    getRowNumber={getSkRowNumber}
                    showCheckbox={false}
                    selectable={false}
                    emptyMessage="Tidak ada data Smart Key yang sesuai dengan filter."
                />
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <span>Tampilkan</span>
                    <select
                        value={skPerPage}
                        onChange={(e) => {
                            setSkPerPage(Number(e.target.value));
                            setSkCurrentPage(1);
                        }}
                        className="h-8 px-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none cursor-pointer"
                    >
                        <option value={10}>10 Baris</option>
                        <option value={25}>25 Baris</option>
                        <option value={50}>50 Baris</option>
                        <option value={100}>100 Baris</option>
                    </select>
                    <span>data per halaman</span>
                </div>

                <div>
                    Menampilkan <strong className="font-bold text-slate-700 dark:text-slate-200">{skTotalFiltered > 0 ? (skCurrentPage - 1) * skPerPage + 1 : 0}</strong> – <strong className="font-bold text-slate-700 dark:text-slate-200">{Math.min(skCurrentPage * skPerPage, skTotalFiltered)}</strong> dari <strong className="font-bold text-slate-700 dark:text-slate-200">{skTotalFiltered.toLocaleString('id-ID')}</strong> data Smart Key
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] mr-1">
                        Halaman <strong>{skCurrentPage}</strong> dari <strong>{skTotalPages}</strong>
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSkCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={skCurrentPage === 1}
                        className="h-8 w-8 p-0 cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSkCurrentPage(prev => Math.min(prev + 1, skTotalPages))}
                        disabled={skCurrentPage === skTotalPages}
                        className="h-8 w-8 p-0 cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
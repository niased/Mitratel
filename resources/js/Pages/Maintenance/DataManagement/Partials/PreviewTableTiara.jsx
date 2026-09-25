import React, { useState, useMemo, useCallback } from 'react';
import { FileSpreadsheet, Ban, Check, Loader2, Search, ChevronLeft, ChevronRight, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Tabel from '@/components/Tabel';

export default function PreviewTableTiara({ 
    previewData = [], 
    isSavingMaster = false, 
    saveProgressPercent = 0, 
    onConfirmSave, 
    onCancel 
}) {
    const [previewSearch, setPreviewSearch] = useState('');
    const [xlookupFilter, setXlookupFilter] = useState('ALL');
    const [dashFilter, setDashFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    // 1. Opsi Tab Status XLOOKUP (Semua, Data Baru, Update Status)
    const xlookupFilterOptions = useMemo(() => {
        const counts = { ALL: previewData.length, NEW: 0, UPDATE: 0 };
        previewData.forEach(item => {
            if (item.is_new === true || item.is_new === 1 || item.xlookup_status === '#N/A') {
                counts.NEW++;
            } else {
                counts.UPDATE++;
            }
        });
        const list = [{ key: 'ALL', label: 'Semua Status', count: counts.ALL }];
        if (counts.NEW > 0) list.push({ key: 'NEW', label: 'Data Baru (#N/A)', count: counts.NEW });
        if (counts.UPDATE > 0) list.push({ key: 'UPDATE', label: 'Update Status', count: counts.UPDATE });
        return list;
    }, [previewData]);

    // Subset data berdasarkan Tab XLOOKUP yang sedang aktif
    const activeXlookupData = useMemo(() => {
        return previewData.filter(item => {
            const isNewItem = item.is_new === true || item.is_new === 1 || item.xlookup_status === '#N/A';
            if (xlookupFilter === 'NEW') return isNewItem;
            if (xlookupFilter === 'UPDATE') return !isNewItem;
            return true;
        });
    }, [previewData, xlookupFilter]);

    // 2. Opsi Dropdown Status Dashboard (OK, PENDING / BELUM, REJECT, RETURN)
    const dashFilterOptions = useMemo(() => {
        const counts = { ALL: activeXlookupData.length, APPROVED: 0, PENDING: 0, REJECTED: 0, RETURNED: 0 };
        
        activeXlookupData.forEach(item => {
            const st = String(item.dashboard_status || 'PENDING').toUpperCase();
            if (st === 'APPROVED' || st === 'OK' || st === 'DONE') {
                counts.APPROVED++;
            } else if (st === 'REJECTED' || st === 'REJECT') {
                counts.REJECTED++;
            } else if (st === 'RETURNED' || st === 'RETURN') {
                counts.RETURNED++;
            } else {
                counts.PENDING++;
            }
        });

        return [
            { key: 'ALL', label: 'Semua Status Dashboard', count: counts.ALL, icon: null },
            { key: 'APPROVED', label: 'OK / APPROVED', count: counts.APPROVED, icon: '🟢' },
            { key: 'PENDING', label: 'PENDING / BELUM', count: counts.PENDING, icon: '🟡' },
            { key: 'REJECTED', label: 'REJECT', count: counts.REJECTED, icon: '🔴' },
            { key: 'RETURNED', label: 'RETURN', count: counts.RETURNED, icon: '🔵' },
        ];
    }, [activeXlookupData]);

    // Label Opsi yang Sedang Dipilih pada Dropdown
    const selectedDashOption = useMemo(() => {
        return dashFilterOptions.find(opt => opt.key === dashFilter) || dashFilterOptions[0];
    }, [dashFilterOptions, dashFilter]);

    const stats = useMemo(() => {
        let newCount = 0;
        let updateCount = 0;
        previewData.forEach(item => {
            if (item.is_new === true || item.is_new === 1 || item.xlookup_status === '#N/A') {
                newCount++;
            } else {
                updateCount++;
            }
        });
        return { newCount, updateCount };
    }, [previewData]);

    // 3. Penyaringan Gabungan (Search + Tab XLOOKUP + Dropdown Menu Status Dashboard)
    const filteredPreviewData = useMemo(() => {
        const q = previewSearch.toLowerCase().trim();
        return previewData.filter(item => {
            // Match Search Bar
            const matchSearch = !q || (
                String(item.ticket_number || '').toLowerCase().includes(q) ||
                String(item.siteoperator_code || '').toLowerCase().includes(q) ||
                String(item.siteoperator_name || '').toLowerCase().includes(q) ||
                String(item.company_name || '').toLowerCase().includes(q)
            );

            // Match XLOOKUP Filter
            const isNewItem = item.is_new === true || item.is_new === 1 || item.xlookup_status === '#N/A';
            let matchXlookup = true;
            if (xlookupFilter === 'NEW') matchXlookup = isNewItem;
            else if (xlookupFilter === 'UPDATE') matchXlookup = !isNewItem;

            // Match Dashboard Status Filter
            const st = String(item.dashboard_status || 'PENDING').toUpperCase();
            let matchDash = true;
            if (dashFilter === 'APPROVED') matchDash = (st === 'APPROVED' || st === 'OK' || st === 'DONE');
            else if (dashFilter === 'PENDING') matchDash = (st === 'PENDING');
            else if (dashFilter === 'REJECTED') matchDash = (st === 'REJECTED' || st === 'REJECT');
            else if (dashFilter === 'RETURNED') matchDash = (st === 'RETURNED' || st === 'RETURN');

            return matchSearch && matchXlookup && matchDash;
        });
    }, [previewData, previewSearch, xlookupFilter, dashFilter]);

    const totalFiltered = filteredPreviewData.length;
    const totalPages = Math.ceil(totalFiltered / perPage) || 1;
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * perPage;
        return filteredPreviewData.slice(start, start + perPage);
    }, [filteredPreviewData, currentPage, perPage]);

    const getRowNumber = useCallback((index) => (currentPage - 1) * perPage + index + 1, [currentPage, perPage]);
    const getItemId = useCallback((item) => item.ticket_number || item.siteoperator_code, []);

    const previewColumns = useMemo(() => [
        {
            key: 'xlookup_status',
            label: 'Hasil XLOOKUP',
            render: (item) => {
                const isNew = item.is_new === true || item.is_new === 1 || item.xlookup_status === '#N/A';
                return (
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold inline-block ${
                        isNew 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                    }`}>
                        {item.xlookup_status || (isNew ? '#N/A' : 'UPDATE')}
                    </span>
                );
            }
        },
        {
            key: 'status_desc',
            label: 'Keterangan Perubahan',
            render: (item) => {
                const isNew = item.is_new === true || item.is_new === 1 || item.xlookup_status === '#N/A';
                return (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {item.status_desc || (isNew ? '#N/A (Tiket Baru)' : 'Update Status')}
                    </span>
                );
            }
        },
        {
            key: 'ticket_number',
            label: 'No. Tiket TIARA',
            render: (item) => <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{item.ticket_number || '-'}</span>
        },
        {
            key: 'siteoperator_code',
            label: 'Site ID',
            render: (item) => <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{item.siteoperator_code || '-'}</span>
        },
        {
            key: 'siteoperator_name',
            label: 'Nama Site',
            render: (item) => <span className="font-medium text-slate-700 dark:text-slate-300">{item.siteoperator_name || '-'}</span>
        },
        {
            key: 'sitearea_reg',
            label: 'Regional',
            render: (item) => <span className="uppercase font-semibold text-purple-600 dark:text-purple-400">{item.sitearea_reg || '-'}</span>
        },
        {
            key: 'sitearea_to',
            label: 'TO / Area',
            render: (item) => <span className="uppercase font-medium text-slate-700 dark:text-slate-300">{item.sitearea_to || '-'}</span>
        },
        {
            key: 'company_name',
            label: 'Mitra / Vendor',
            render: (item) => <span className="font-medium text-slate-700 dark:text-slate-300">{item.company_name || '-'}</span>
        },
        {
            key: 'maintenance_date',
            label: 'Tgl Maintenance',
            render: (item) => <span className="text-xs text-slate-500 font-mono">{item.maintenance_date || '-'}</span>
        },
        {
            key: 'dashboard_status',
            label: 'Status Dashboard',
            render: (item) => {
                const st = String(item.dashboard_status || 'PENDING').toUpperCase();
                let colorStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'; // PENDING
                
                if (st === 'APPROVED' || st === 'OK' || st === 'DONE') {
                    colorStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                } else if (st === 'REJECTED' || st === 'REJECT') {
                    colorStyle = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                } else if (st === 'RETURNED' || st === 'RETURN') {
                    colorStyle = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                }

                return (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${colorStyle}`}>
                        {item.dashboard_status || 'PENDING'}
                    </span>
                );
            }
        }
    ], []);

    if (previewData.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-in fade-in">
            {/* HEADER PRATINJAU */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                        <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Pratinjau Data RPM (TIARA) Terdeteksi ({previewData.length.toLocaleString('id-ID')} Data)
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Terdiri dari <strong className="text-emerald-600 dark:text-emerald-400">{stats.newCount.toLocaleString('id-ID')} Data Baru (#N/A)</strong> dan <strong className="text-purple-600 dark:text-purple-400">{stats.updateCount.toLocaleString('id-ID')} Update Status</strong>.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2.5">
                        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSavingMaster} className="h-8 text-xs cursor-pointer">
                            <Ban className="w-3.5 h-3.5 text-rose-500 mr-1" /> Batal
                        </Button>

                        <Button 
                            type="button" 
                            size="sm" 
                            onClick={onConfirmSave} 
                            disabled={isSavingMaster} 
                            className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer transition-all min-w-[210px] justify-center"
                        >
                            {isSavingMaster ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                    <span>Menyimpan ({saveProgressPercent}%)...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    <span>Masukkan ke Master Data RPM (TIARA)</span>
                                </>
                            )}
                        </Button>
                    </div>

                    {isSavingMaster && (
                        <div className="w-full max-w-[210px] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500 transition-all duration-300 rounded-full" 
                                style={{ width: `${saveProgressPercent}%` }} 
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* TAB FILTER & DROPDOWN MENU UI BAR */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* TAB GROUP XLOOKUP STATUS */}
                    <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-2xl">
                        {xlookupFilterOptions.map(opt => (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => { 
                                    setXlookupFilter(opt.key); 
                                    setCurrentPage(1); 
                                }}
                                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                    xlookupFilter === opt.key
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                {opt.label} ({opt.count.toLocaleString('id-ID')})
                            </button>
                        ))}
                    </div>

                    {/* DROPDOWN-MENU UNTUK STATUS DASHBOARD */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-purple-500/40 text-slate-800 dark:text-slate-100 hover:border-purple-500 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer focus:outline-none"
                            >
                                <Filter className="w-3.5 h-3.5 text-purple-500" />
                                <span>
                                    {selectedDashOption.icon && <span className="mr-1.5">{selectedDashOption.icon}</span>}
                                    {selectedDashOption.label} ({selectedDashOption.count.toLocaleString('id-ID')})
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                            </button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="start" className="w-64 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
                            {dashFilterOptions.map(opt => (
                                <DropdownMenuItem
                                    key={opt.key}
                                    onClick={() => {
                                        setDashFilter(opt.key);
                                        setCurrentPage(1);
                                    }}
                                    className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                                        dashFilter === opt.key
                                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        {opt.icon && <span>{opt.icon}</span>}
                                        <span>{opt.label}</span>
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                        {opt.count.toLocaleString('id-ID')}
                                    </span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* SEARCH BAR */}
                <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari Tiket, Site ID, Vendor..."
                        value={previewSearch}
                        onChange={(e) => { setPreviewSearch(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                </div>
            </div>

            {/* TABEL DATA */}
            <Tabel data={paginatedData} columns={previewColumns} getItemId={getItemId} getRowNumber={getRowNumber} showCheckbox={false} selectable={false} />

            {/* PAGINASI */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Menampilkan <strong>{totalFiltered > 0 ? (currentPage - 1) * perPage + 1 : 0}</strong> - <strong>{Math.min(currentPage * perPage, totalFiltered)}</strong> dari <strong>{totalFiltered}</strong> data</span>
                <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
                </div>
            </div>
        </div>
    );
}
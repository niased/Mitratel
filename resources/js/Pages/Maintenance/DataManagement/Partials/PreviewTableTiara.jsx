import React, { useState, useMemo, useCallback } from 'react';
import { FileSpreadsheet, Ban, Check, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Tabel from '@/components/Tabel';

export default function PreviewTableTiara({ 
    previewData = [], 
    isSavingMaster = false, 
    saveProgressPercent = 0, 
    onConfirmSave, 
    onCancel 
}) {
    const [previewSearch, setPreviewSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const filteredPreviewData = useMemo(() => {
        const q = previewSearch.toLowerCase().trim();
        if (!q) return previewData;
        return previewData.filter(item => 
            String(item.ticket_number || '').toLowerCase().includes(q) ||
            String(item.siteoperator_code || '').toLowerCase().includes(q) ||
            String(item.siteoperator_name || '').toLowerCase().includes(q) ||
            String(item.company_name || '').toLowerCase().includes(q)
        );
    }, [previewData, previewSearch]);

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
            key: 'hasil',
            label: 'Hasil XLOOKUP',
            render: () => <span className="font-semibold text-purple-600 dark:text-purple-400 text-xs">#N/A (Data Baru)</span>
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
            render: (item) => <span className="font-bold text-xs text-amber-600 dark:text-amber-400">{item.dashboard_status || 'PENDING'}</span>
        }
    ], []);

    if (previewData.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                        <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Pratinjau Data RPM (TIARA) Terdeteksi ({previewData.length.toLocaleString('id-ID')} Data Baru)
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Baris data ini belum ada di Master Data RPM (TIARA) dan siap ditambahkan.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2.5">
                        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSavingMaster} className="h-8 text-xs cursor-pointer">
                            <Ban className="w-3.5 h-3.5 text-rose-500 mr-1" /> Batal
                        </Button>

                        {/* TOMBOL DENGAN TAMPILAN PERSEN (%) LOADING */}
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

                    {/* PROGRESS BAR STRIPING RINGKAS */}
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

            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 flex justify-end">
                <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari Tiket, Site ID, Vendor..."
                        value={previewSearch}
                        onChange={(e) => { setPreviewSearch(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                </div>
            </div>

            <Tabel data={paginatedData} columns={previewColumns} getItemId={getItemId} getRowNumber={getRowNumber} showCheckbox={false} selectable={false} />

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
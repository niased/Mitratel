import React, { useState, useMemo, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { 
    Lock, 
    Check, 
    Ban, 
    Loader2, 
    ChevronLeft, 
    ChevronRight,
    Search,
    Filter
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Tabel from '@/components/Tabel';

import TabTarikanRpm from './TabTarikanRpm';
import TabTarikanSmartkey from './TabTarikanSmartkey';
import useTabTarikanRpmControl from './TabTarikanRpmControl';

export default function TabDataTarikan() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role || 'view';
    const canWrite = userRole === 'admin' || userRole === 'staff';

    const rpmControl = useTabTarikanRpmControl(canWrite);
    const { 
        previewData, 
        isSavingMaster, 
        handleConfirmSaveMaster, 
        handleCancelPreview 
    } = rpmControl;

    const [selectedApproveFilter, setSelectedApproveFilter] = useState('ALL');
    const [previewSearch, setPreviewSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);

    const getApproveTextColor = (statusVal) => {
        const str = String(statusVal || '').toLowerCase().trim();
        if (str.includes('ok') || str.includes('approve') || str.includes('setuju')) {
            return 'text-emerald-600 dark:text-emerald-400 font-bold';
        }
        if (str.includes('reject') || str.includes('tolak') || str.includes('nok')) {
            return 'text-rose-600 dark:text-rose-400 font-bold';
        }
        if (str.includes('return') || str.includes('revisi')) {
            return 'text-sky-600 dark:text-sky-400 font-bold';
        }
        return 'text-amber-600 dark:text-amber-400 font-bold';
    };

    const approveFilterOptions = useMemo(() => {
        const counts = { ALL: previewData.length, BELUM: 0, OK: 0, REJECT: 0, RETURN: 0 };

        previewData.forEach(item => {
            const str = String(item.approve || '').toLowerCase();
            if (str.includes('ok') || str.includes('approve')) counts.OK++;
            else if (str.includes('reject')) counts.REJECT++;
            else if (str.includes('return')) counts.RETURN++;
            else counts.BELUM++;
        });

        const list = [{ key: 'ALL', label: 'Semua Status', count: counts.ALL }];
        if (counts.BELUM > 0) list.push({ key: 'BELUM', label: 'Belum', count: counts.BELUM });
        if (counts.OK > 0) list.push({ key: 'OK', label: 'OK / Approved', count: counts.OK });
        if (counts.REJECT > 0) list.push({ key: 'REJECT', label: 'Reject', count: counts.REJECT });
        if (counts.RETURN > 0) list.push({ key: 'RETURN', label: 'Return', count: counts.RETURN });

        return list;
    }, [previewData]);

    const filteredPreviewData = useMemo(() => {
        return previewData.filter(item => {
            const itemApprove = String(item.approve || '').toLowerCase();
            let matchApprove = true;

            if (selectedApproveFilter === 'BELUM') {
                matchApprove = !itemApprove.includes('ok') && !itemApprove.includes('reject') && !itemApprove.includes('return');
            } else if (selectedApproveFilter === 'OK') {
                matchApprove = itemApprove.includes('ok') || itemApprove.includes('approve');
            } else if (selectedApproveFilter === 'REJECT') {
                matchApprove = itemApprove.includes('reject');
            } else if (selectedApproveFilter === 'RETURN') {
                matchApprove = itemApprove.includes('return');
            }

            const q = previewSearch.toLowerCase().trim();
            const matchSearch = !q || 
                String(item.rpm_id || '').toLowerCase().includes(q) ||
                String(item.site_id || '').toLowerCase().includes(q) ||
                String(item.rtp || '').toLowerCase().includes(q) ||
                String(item.mitra || '').toLowerCase().includes(q);

            return matchApprove && matchSearch;
        });
    }, [previewData, selectedApproveFilter, previewSearch]);

    const totalFiltered = filteredPreviewData.length;
    const totalPages = Math.ceil(totalFiltered / perPage) || 1;

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * perPage;
        return filteredPreviewData.slice(start, start + perPage);
    }, [filteredPreviewData, currentPage, perPage]);

    const getRowNumber = useCallback((index) => {
        return (currentPage - 1) * perPage + index + 1;
    }, [currentPage, perPage]);

    const getItemId = useCallback((item) => {
        return item.rpm_id || item.site_id;
    }, []);

    const previewColumns = useMemo(() => [
        {
            key: 'hasil',
            label: 'Hasil',
            render: () => (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                    #N/A (Data Baru)
                </span>
            )
        },
        {
            key: 'rpm_id',
            label: 'ID RPM',
            render: (item) => (
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {item.rpm_id}
                </span>
            )
        },
        {
            key: 'site_id',
            label: 'Site ID',
            render: (item) => (
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {item.site_id}
                </span>
            )
        },
        {
            key: 'rtp',
            label: 'RTP',
            render: (item) => (
                <span className="uppercase font-medium text-slate-700 dark:text-slate-300">
                    {item.rtp}
                </span>
            )
        },
        {
            key: 'mitra',
            label: 'Mitra',
            render: (item) => (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.mitra || '-'}
                </span>
            )
        },
        {
            key: 'periode',
            label: 'Bulan / Tahun',
            render: (item) => (
                <span className="font-mono text-slate-700 dark:text-slate-300">
                    {item.bulan} / <strong className="text-emerald-500">{item.tahun}</strong>
                </span>
            )
        },
        {
            key: 'approve',
            label: 'Status Approve',
            render: (item) => (
                <span className={getApproveTextColor(item.approve)}>
                    {item.approve || '-'}
                </span>
            )
        }
    ], []);

    return (
        <div className="space-y-6">
            {!canWrite && (
                <Alert className="bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 py-3 rounded-xl shadow-xs">
                    <Lock className="w-4 h-4 shrink-0 text-amber-500" />
                    <AlertDescription className="text-xs font-medium ml-2">
                        Akun Anda memiliki izin akses <strong>Viewer</strong>. Fitur eksekusi Engine Auto-Report hanya dapat dijalankan oleh <strong>Administrator</strong> atau <strong>Staff Operasional</strong>.
                    </AlertDescription>
                </Alert>
            )}

            {/* DUA KARTU ENGINE DI ATAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <TabTarikanRpm canWrite={canWrite} control={rpmControl} />
                <TabTarikanSmartkey canWrite={canWrite} />
            </div>

            {/* TABEL PRATINJAU LEBAR PENUH DI BAWAH CARD */}
            {previewData.length > 0 && !rpmControl.processingRpm && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    
                    {/* Header Bar Tabel (Tanpa Ikon Box) */}
                    <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Daftar Data Baru Terdeteksi ({previewData.length.toLocaleString('id-ID')} Data #N/A)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Seluruh baris data ini belum ada di Master Data RPM dan siap ditambahkan secara massal.
                            </p>
                        </div>

                        {/* Tombol Aksi Batal & Masukkan ke Master */}
                        <div className="flex items-center gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancelPreview}
                                disabled={isSavingMaster}
                                className="h-8 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                                <Ban className="w-3.5 h-3.5 text-rose-500" />
                                <span>Batal</span>
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                onClick={handleConfirmSaveMaster}
                                disabled={isSavingMaster}
                                className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                            >
                                {isSavingMaster ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                                <span>{isSavingMaster ? 'Menyimpan...' : 'Masukkan ke Master Data'}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Toolbar Filter Status Approve & Pencarian */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mr-1.5">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <span>Status Approve:</span>
                            </div>
                            {approveFilterOptions.map((opt) => {
                                const isActive = selectedApproveFilter === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => {
                                            setSelectedApproveFilter(opt.key);
                                            setCurrentPage(1);
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

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-56">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari ID, Site, RTP..."
                                value={previewSearch}
                                onChange={(e) => {
                                    setPreviewSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Tabel */}
                    <div className="w-full overflow-x-auto relative">
                        <Tabel
                            data={paginatedData}
                            columns={previewColumns}
                            getItemId={getItemId}
                            getRowNumber={getRowNumber}
                            showCheckbox={false}
                            selectable={false}
                            emptyMessage="Tidak ada data baru (#N/A) yang sesuai dengan filter."
                        />
                    </div>

                    {/* Pagination Bar */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <span>Tampilkan</span>
                            <select
                                value={perPage}
                                onChange={(e) => {
                                    setPerPage(Number(e.target.value));
                                    setCurrentPage(1);
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
                            Menampilkan <strong className="font-bold text-slate-700 dark:text-slate-200">{totalFiltered > 0 ? (currentPage - 1) * perPage + 1 : 0}</strong> – <strong className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * perPage, totalFiltered)}</strong> dari <strong className="font-bold text-slate-700 dark:text-slate-200">{totalFiltered.toLocaleString('id-ID')}</strong> data baru
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] mr-1">
                                Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0 cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0 cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, PlusCircle, ClipboardPaste, AlertCircle } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';

import Tabel from '@/components/Tabel';
import Modal from '@/components/Modal';

const MAX_ROWS_LIMIT = 500;

const TABLE_COLUMNS = {
    rpm: [
        { key: 'rpm_id', altKeys: ['rpm_id', 'id_rpm'], label: 'ID RPM' }, 
        { key: 'site_id', altKeys: ['siteid', 'site_id'], label: 'Site ID' },
        { key: 'rtp', altKeys: ['rtp'], label: 'RTP' },
        { key: 'mitra', altKeys: ['mitra'], label: 'Mitra' },
        { key: 'bulan', altKeys: ['bulan'], label: 'Bulan' },
        { key: 'tahun', altKeys: ['tahun'], label: 'Tahun' },
        { key: 'tanggal_submit', altKeys: ['tanggalsubn', 'tanggal_submit', 'tanggalsubmit'], label: 'Tanggal Submit', type: 'date' },
        { key: 'tanggal_approve', altKeys: ['tanggalappr', 'tanggal_approve', 'tanggalapprove'], label: 'Tanggal Approve', type: 'date' },
        { key: 'approve', altKeys: ['approve', 'status_approve'], label: 'Approve Status' },
    ],
    smartkey: [
        { key: 'infrako', altKeys: ['infrako'], label: 'Infrako' },
        { key: 'ksm', altKeys: ['ksm'], label: 'KSM' },
        { key: 'batch', altKeys: ['batch'], label: 'Batch' },
        { key: 'lock_id', altKeys: ['lock_id', 'id_lock'], label: 'Lock ID' },
        { key: 'serial_number', altKeys: ['serial_number', 'sn'], label: 'Serial Number' },
        { key: 'tower_id', altKeys: ['tower_id'], label: 'Tower ID' },
        { key: 'site_name', altKeys: ['site_name'], label: 'Site Name' },
        { key: 'kota_kab', altKeys: ['kota_kab', 'kota', 'kabupaten'], label: 'Kota / Kab' },
        { key: 'status', altKeys: ['status'], label: 'Status' },
        { key: 'posisi_unit', altKeys: ['posisi_unit'], label: 'Posisi Unit' },
        { key: 'status_aktifitas', altKeys: ['status_aktifitas', 'status_aktivitas'], label: 'Status Aktifitas' },
        { key: 'long_lat', altKeys: ['long_lat', 'longlat', 'coordinate'], label: 'Long Lat' },
    ],
    // 9 KOLOM INTI TIARA (SUPER RINGKAS & FOKUS DASHBOARD)
    tiara: [
        { key: 'ticket_number', altKeys: ['ticket_number', 'tiara_id', 'id_tiara'], label: 'No. Tiket TIARA' },
        { key: 'siteoperator_code', altKeys: ['siteoperator_code', 'site_id', 'siteid'], label: 'Site ID' },
        { key: 'siteoperator_name', altKeys: ['siteoperator_name', 'site_name'], label: 'Nama Site' },
        { key: 'sitearea_reg', altKeys: ['sitearea_reg', 'regional', 'region'], label: 'Regional' },
        { key: 'sitearea_to', altKeys: ['sitearea_to', 'to_area', 'area'], label: 'TO / Area' },
        { key: 'company_name', altKeys: ['company_name', 'mitra', 'vendor'], label: 'Mitra / Vendor' },
        { key: 'maintenancetype_name', altKeys: ['maintenancetype_name', 'tipe_maintenance'], label: 'Jenis Pekerjaan' },
        { key: 'maintenance_date', altKeys: ['maintenance_date', 'tanggal_maintenance'], label: 'Tgl Maintenance', type: 'date' },
        { key: 'ticket_statusname', altKeys: ['ticket_statusname', 'status_asli'], label: 'Status TIARA' },
        { key: 'dashboard_status', altKeys: ['dashboard_status', 'status_approve', 'status'], label: 'Status Dashboard' },
    ]
};

export default function CrudTable({
    dataList = [],
    subTab = 'rpm',
    selectedIds = [],
    onSelectAll,
    onSelectRow,
    getRowNumber
}) {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role || 'view';
    const canWrite = userRole === 'admin' || userRole === 'staff';

    const getTabTitle = () => {
        if (subTab === 'rpm') return 'RPM (ANT)';
        if (subTab === 'tiara') return 'RPM (TIARA)';
        return 'SMART KEY';
    };

    const getFieldValue = useCallback((item, colDef) => {
        if (!item || !colDef) return '';
        if (colDef.altKeys && Array.isArray(colDef.altKeys)) {
            for (const k of colDef.altKeys) {
                if (item[k] !== undefined && item[k] !== null && item[k] !== '') {
                    return item[k];
                }
            }
        }
        return item[colDef.key] ?? '';
    }, []);

    const getItemId = useCallback((item) => {
        return item?.id || item?.ticket_number || item?.rpm_id || item?.serial_number || item?.lock_id || item?.infrako;
    }, []);

    const formattedColumns = useMemo(() => {
        const rawCols = TABLE_COLUMNS[subTab] || TABLE_COLUMNS.rpm;
        return rawCols.map(col => ({
            ...col,
            render: (item) => {
                const value = getFieldValue(item, col);
                switch (col.key) {
                    case 'rpm_id':
                        return <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{value || '-'}</span>;
                    case 'ticket_number':
                        return <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{value || '-'}</span>;
                    case 'site_id':
                    case 'siteoperator_code':
                        return <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{value || '-'}</span>;
                    case 'rtp':
                    case 'sitearea_reg':
                        return <span className="uppercase font-semibold">{value || '-'}</span>;
                    case 'tanggal_submit':
                    case 'tanggal_approve':
                    case 'maintenance_date':
                        return <span className="text-xs text-slate-500 dark:text-slate-400">{value || '-'}</span>;
                    case 'approve':
                    case 'dashboard_status': {
                        const approveVal = String(value || '').toLowerCase();
                        const isBelumApproved = approveVal.includes('belum') || approveVal.includes('pending') || approveVal.includes('returned');
                        const isApproved = approveVal.includes('approve') || approveVal.includes('setuju') || approveVal.includes('sudah');
                        return (
                            <Badge variant="outline" className={`font-semibold ${
                                isBelumApproved 
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                                    : isApproved
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                                {value || '-'}
                            </Badge>
                        );
                    }
                    case 'ticket_statusname':
                        return <span className="font-bold text-xs text-amber-600 dark:text-amber-400">{value || '-'}</span>;
                    case 'infrako':
                    case 'siteoperator_name':
                    case 'site_name':
                        return <span className="font-semibold text-slate-700 dark:text-slate-200">{value || '-'}</span>;
                    case 'ksm':
                    case 'batch':
                    case 'long_lat':
                        return <span className="text-xs font-mono">{value || '-'}</span>;
                    case 'lock_id':
                        return <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{value || '-'}</span>;
                    case 'serial_number':
                        return <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{value || '-'}</span>;
                    case 'tower_id':
                        return <span className="font-mono">{value || '-'}</span>;
                    default:
                        return value !== undefined && value !== null && value !== '' ? String(value) : '-';
                }
            }
        }));
    }, [subTab, getFieldValue]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editData, setEditData] = useState({});
    const [addItems, setAddItems] = useState([]);

    const createEmptyRow = useCallback(() => {
        const emptyObj = {};
        const rawCols = TABLE_COLUMNS[subTab] || TABLE_COLUMNS.rpm;
        rawCols.forEach(col => { emptyObj[col.key] = ''; });
        return emptyObj;
    }, [subTab]);

    const parseAndApplyExcelData = useCallback((pastedText) => {
        if (!pastedText) return false;
        let rawRows = pastedText.trim().split(/\r\n|\n|\r/).filter(row => row.trim().length > 0);
        
        if (rawRows.length === 1 && !rawRows[0].includes('\t')) return false;
        if (rawRows.length > MAX_ROWS_LIMIT) {
            alert(`Perhatian: Data paste berisi ${rawRows.length} baris. Dibatasi maksimal ${MAX_ROWS_LIMIT} baris.`);
            rawRows = rawRows.slice(0, MAX_ROWS_LIMIT);
        }

        const rawCols = TABLE_COLUMNS[subTab] || TABLE_COLUMNS.rpm;

        const parsedItems = rawRows.map(rowStr => {
            const cells = rowStr.split('\t').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
            const rowObj = createEmptyRow();

            rawCols.forEach((col, idx) => {
                if (cells[idx] !== undefined) {
                    rowObj[col.key] = cells[idx];
                    if (col.key === 'site_id' || col.key === 'siteoperator_code') {
                        rowObj.siteid = cells[idx];
                        rowObj.site_id = cells[idx];
                        rowObj.siteoperator_code = cells[idx];
                    }
                }
            });

            return rowObj;
        });

        if (parsedItems.length > 0) {
            setAddItems(parsedItems);
            return true;
        }
        return false;
    }, [subTab, createEmptyRow]);

    const handleContainerPaste = useCallback((e) => {
        if (isEditMode || !canWrite) return;
        const pastedText = e.clipboardData.getData('text');
        if (parseAndApplyExcelData(pastedText)) {
            e.preventDefault();
        }
    }, [isEditMode, canWrite, parseAndApplyExcelData]);

    const handlePasteFromClipboardButton = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && !parseAndApplyExcelData(text)) {
                alert("Format teks clipboard bukan urutan tabel Excel yang valid.");
            }
        } catch (err) {
            alert("Gagal membaca clipboard. Izinkan akses clipboard di browser atau gunakan Ctrl+V.");
        }
    }, [parseAndApplyExcelData]);

    const handleOpenAddModal = useCallback(() => {
        if (!canWrite) return;
        setIsEditMode(false);
        setAddItems([createEmptyRow()]);
        setIsModalOpen(true);
    }, [canWrite, createEmptyRow]);

    const handleOpenEditModal = useCallback((item) => {
        if (!canWrite) return;
        setIsEditMode(true);
        const rawCols = TABLE_COLUMNS[subTab] || TABLE_COLUMNS.rpm;
        const formattedItem = { ...item };
        rawCols.forEach(col => {
            formattedItem[col.key] = getFieldValue(item, col);
        });
        setEditData(formattedItem);
        setIsModalOpen(true);
    }, [canWrite, subTab, getFieldValue]);

    const handleCloseModal = useCallback(() => {
        if (isProcessing) return;
        setIsModalOpen(false);
        setEditData({});
        setAddItems([]);
    }, [isProcessing]);

    const handleAddMoreRows = useCallback((count = 1) => {
        setAddItems(prev => {
            if (prev.length + count > MAX_ROWS_LIMIT) {
                alert(`Maksimal penambahan data sekaligus adalah ${MAX_ROWS_LIMIT} baris.`);
                const allowedCount = MAX_ROWS_LIMIT - prev.length;
                if (allowedCount <= 0) return prev;
                return [...prev, ...Array.from({ length: allowedCount }, () => createEmptyRow())];
            }
            return [...prev, ...Array.from({ length: count }, () => createEmptyRow())];
        });
    }, [createEmptyRow]);

    const handleRemoveAddRow = useCallback((index) => {
        if (addItems.length <= 1) return;
        setAddItems(prev => prev.filter((_, i) => i !== index));
    }, [addItems.length]);

    const handleAddItemChange = useCallback((index, field, value) => {
        setAddItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    }, []);

    const handleSubmitForm = (e) => {
        e?.preventDefault();
        if (!canWrite) return;
        setIsProcessing(true);

        const routeName = subTab === 'rpm' 
            ? (isEditMode ? 'maintenance.data-management.update-rpm' : 'maintenance.data-management.store-rpm')
            : subTab === 'smartkey'
            ? (isEditMode ? 'maintenance.data-management.update-smartkey' : 'maintenance.data-management.store-smartkey')
            : (isEditMode ? 'maintenance.data-management.update-tiara' : 'maintenance.data-management.store-tiara');

        const method = isEditMode ? 'put' : 'post';
        
        const getUrl = () => {
            if (typeof window.route === 'function') {
                return isEditMode ? window.route(routeName, getItemId(editData)) : window.route(routeName);
            }
            return isEditMode ? `/maintenance/data-management/${subTab}/${getItemId(editData)}` : `/maintenance/data-management/${subTab}`;
        };

        const payload = isEditMode ? editData : { items: addItems };

        router[method](getUrl(), payload, {
            preserveScroll: true,
            onSuccess: () => {
                handleCloseModal();
                setIsProcessing(false);
            },
            onError: () => setIsProcessing(false),
            onFinish: () => setIsProcessing(false)
        });
    };

    return (
        <div className="space-y-3">
            <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Kelola Data Master {getTabTitle()}
                </span>
                
                {canWrite && (
                    <Button 
                        type="button" 
                        size="sm" 
                        onClick={handleOpenAddModal}
                        className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Data Baru</span>
                    </Button>
                )}
            </div>

            <Tabel
                data={dataList}
                columns={formattedColumns}
                selectedIds={selectedIds}
                onSelectAll={onSelectAll}
                onSelectRow={onSelectRow}
                onEditRow={canWrite ? handleOpenEditModal : undefined}
                getItemId={getItemId}
                getRowNumber={getRowNumber}
                emptyMessage={`Belum ada data Master ${getTabTitle()}.`}
            />

            {canWrite && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={`${isEditMode ? 'Edit Data' : 'Tambah Data Master'} (${getTabTitle()})`}
                    onSubmit={handleSubmitForm}
                    submitLabel={isEditMode ? 'Simpan Perubahan' : 'Simpan Semua Data'}
                    isProcessing={isProcessing}
                    onPaste={handleContainerPaste}
                    headerExtra={
                        !isEditMode && (
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePasteFromClipboardButton}
                                    className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                                >
                                    <ClipboardPaste className="w-3.5 h-3.5" />
                                    <span>Paste dari Excel</span>
                                </Button>
                                <Badge 
                                    variant="secondary"
                                    className={addItems.length >= MAX_ROWS_LIMIT 
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }
                                >
                                    {addItems.length} / {MAX_ROWS_LIMIT} Baris
                                </Badge>
                            </div>
                        )
                    }
                >
                    {!isEditMode && (
                        <Alert className="shrink-0 mb-3 bg-blue-50/60 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 p-2.5 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <AlertDescription className="text-[11px] leading-relaxed">
                                <strong>Smart Paste (Maks {MAX_ROWS_LIMIT} Baris):</strong> Tekan <strong>Ctrl + V</strong> untuk menempelkan sel dari Excel. 
                                {subTab === 'rpm' && ' Urutan 9 kolom RPM (ANT): ID RPM, Site ID, RTP, Mitra, Bulan, Tahun, Tgl Submit, Tgl Approve, Status.'}
                                {subTab === 'smartkey' && ' Urutan 12 kolom SmartKey: Infrako, KSM, Batch, Lock ID, Serial Number, Tower ID, Site Name, Kota/Kab, Status, Posisi Unit, Status Aktifitas, Long Lat.'}
                                {subTab === 'tiara' && ' Urutan 10 kolom RPM (TIARA): No. Tiket TIARA, Site ID, Nama Site, Regional, TO/Area, Mitra/Vendor, Jenis Pekerjaan, Tgl Maintenance, Status TIARA, Status Dashboard.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4">
                        {isEditMode ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
                                {(TABLE_COLUMNS[subTab] || TABLE_COLUMNS.rpm).map((col) => (
                                    <div key={col.key} className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{col.label}</Label>
                                        <Input 
                                            type={col.type || 'text'}
                                            disabled={isProcessing}
                                            value={editData[col.key] || ''} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditData(prev => {
                                                    const updated = { ...prev, [col.key]: val };
                                                    if (col.key === 'site_id' || col.key === 'siteoperator_code') {
                                                        updated.siteid = val;
                                                        updated.site_id = val;
                                                    }
                                                    return updated;
                                                });
                                            }} 
                                            placeholder={`Masukkan ${col.label}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {addItems.map((item, itemIdx) => (
                                    <div 
                                        key={`add-row-${itemIdx}`} 
                                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 relative group space-y-3 transition-all"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                Baris #{itemIdx + 1}
                                            </span>
                                            {addItems.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveAddRow(itemIdx)}
                                                    className="h-7 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs gap-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Hapus Baris
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {(TABLE_COLUMNS[subTab] || TABLE_COLUMNS.rpm).map((col) => (
                                                <div key={col.key} className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{col.label}</Label>
                                                    <Input 
                                                        type={col.type || 'text'}
                                                        disabled={isProcessing}
                                                        value={item[col.key] || ''} 
                                                        onChange={(e) => handleAddItemChange(itemIdx, col.key, e.target.value)} 
                                                        placeholder={col.label}
                                                        className="h-8 text-xs bg-white dark:bg-slate-900"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center gap-2 pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddMoreRows(1)}
                                        disabled={isProcessing || addItems.length >= MAX_ROWS_LIMIT}
                                        className="h-8 text-xs gap-1.5"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        <span>Tambah 1 Baris</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddMoreRows(5)}
                                        disabled={isProcessing || addItems.length >= MAX_ROWS_LIMIT}
                                        className="h-8 text-xs gap-1.5"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        <span>Tambah 5 Baris</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
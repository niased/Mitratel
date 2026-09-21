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
        return item?.id || item?.rpm_id || item?.serial_number || item?.lock_id || item?.infrako;
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
                    case 'site_id':
                        return <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{value || '-'}</span>;
                    case 'rtp':
                        return <span className="uppercase">{value || '-'}</span>;
                    case 'tanggal_submit':
                    case 'tanggal_approve':
                        return <span className="text-xs text-slate-500 dark:text-slate-400">{value || '-'}</span>;
                    case 'approve':
                        const approveVal = String(value || '').toLowerCase();
                        const isBelumApproved = approveVal.includes('belum');
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
                    case 'infrako':
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
        if (subTab === 'rpm') {
            return {
                rpm_id: '', site_id: '', rtp: '', mitra: '', bulan: '', tahun: '', tanggal_submit: '', tanggal_approve: '', approve: ''
            };
        }
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

        const parsedItems = rawRows.map(rowStr => {
            const cells = rowStr.split('\t').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
            const rowObj = createEmptyRow();

            if (subTab === 'rpm') {
                rowObj.rpm_id = cells[0] ?? '';
                rowObj.site_id = cells[1] ?? '';
                rowObj.siteid = cells[1] ?? '';
                rowObj.rtp = cells[2] ?? '';
                rowObj.mitra = cells[3] ?? '';
                rowObj.bulan = cells[4] ?? '';
                rowObj.tahun = cells[5] ?? '';
                rowObj.tanggal_submit = cells[6] ?? '';
                rowObj.tanggalsubn = cells[6] ?? '';
                rowObj.tanggal_approve = cells[7] ?? '';
                rowObj.tanggalappr = cells[7] ?? '';
                rowObj.approve = cells[8] ?? '';
            } else {
                rowObj.infrako = cells[0] ?? '';
                rowObj.ksm = cells[1] ?? '';
                rowObj.batch = cells[2] ?? '';
                rowObj.lock_id = cells[3] ?? '';
                rowObj.serial_number = cells[4] ?? '';
                rowObj.tower_id = cells[5] ?? '';
                rowObj.site_name = cells[6] ?? '';
                rowObj.kota_kab = cells[7] ?? '';
                rowObj.status = cells[8] ?? '';
                rowObj.posisi_unit = cells[9] ?? '';
                rowObj.status_aktifitas = cells[10] ?? '';
                rowObj.long_lat = cells[11] ?? '';
            }
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
        formattedItem.bulan = item.bulan || '';
        formattedItem.tahun = item.tahun || '';
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
            if (field === 'tanggal_submit') updated[index].tanggalsubn = value;
            if (field === 'tanggal_approve') updated[index].tanggalappr = value;
            if (field === 'site_id') updated[index].siteid = value;
            return updated;
        });
    }, []);

    const handleSubmitForm = (e) => {
        e?.preventDefault();
        if (!canWrite) return;
        setIsProcessing(true);

        const routeName = subTab === 'rpm' 
            ? (isEditMode ? 'maintenance.data-management.update-rpm' : 'maintenance.data-management.store-rpm')
            : (isEditMode ? 'maintenance.data-management.update-smartkey' : 'maintenance.data-management.store-smartkey');

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
                    Kelola Data Master {subTab.toUpperCase()}
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
                emptyMessage={`Belum ada data Master ${subTab.toUpperCase()}.`}
            />

            {canWrite && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={`${isEditMode ? 'Edit Data' : 'Tambah Data Master'} (${subTab.toUpperCase()})`}
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
                                <strong>Smart Paste (Maks {MAX_ROWS_LIMIT} Baris):</strong> Tekan <strong>Ctrl + V</strong> untuk menempelkan sel dari Excel. Pastikan urutan 12 kolom SmartKey: <em>Infrako, KSM, Batch, Lock ID, Serial Number, Tower ID, Site Name, Kota/Kab, Status, Posisi Unit, Status Aktifitas, Long Lat</em>.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4">
                        {isEditMode ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
                                {subTab === 'rpm' ? (
                                    <>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID RPM</Label>
                                            <Input disabled={isProcessing} value={editData.rpm_id || ''} onChange={(e) => setEditData({ ...editData, rpm_id: e.target.value })} placeholder="ID RPM" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Site ID</Label>
                                            <Input disabled={isProcessing} value={editData.site_id || editData.siteid || ''} onChange={(e) => setEditData({ ...editData, site_id: e.target.value, siteid: e.target.value })} placeholder="Site ID" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">RTP</Label>
                                            <Input disabled={isProcessing} value={editData.rtp || ''} onChange={(e) => setEditData({ ...editData, rtp: e.target.value })} placeholder="RTP" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mitra</Label>
                                            <Input disabled={isProcessing} value={editData.mitra || ''} onChange={(e) => setEditData({ ...editData, mitra: e.target.value })} placeholder="Mitra" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bulan</Label>
                                            <Input disabled={isProcessing} value={editData.bulan || ''} onChange={(e) => setEditData({ ...editData, bulan: e.target.value })} placeholder="Bulan" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tahun</Label>
                                            <Input disabled={isProcessing} value={editData.tahun || ''} onChange={(e) => setEditData({ ...editData, tahun: e.target.value })} placeholder="Tahun" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tanggal Submit</Label>
                                            <Input type="date" disabled={isProcessing} value={editData.tanggal_submit || editData.tanggalsubn || ''} onChange={(e) => setEditData({ ...editData, tanggal_submit: e.target.value, tanggalsubn: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tanggal Approve</Label>
                                            <Input type="date" disabled={isProcessing} value={editData.tanggal_approve || editData.tanggalappr || ''} onChange={(e) => setEditData({ ...editData, tanggal_approve: e.target.value, tanggalappr: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Approve Status</Label>
                                            <Input disabled={isProcessing} value={editData.approve || ''} onChange={(e) => setEditData({ ...editData, approve: e.target.value })} placeholder="Status Approve" />
                                        </div>
                                    </>
                                ) : (
                                    (TABLE_COLUMNS[subTab] || TABLE_COLUMNS.smartkey).map((col) => (
                                        <div key={col.key} className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{col.label}</Label>
                                            <Input 
                                                type={col.type || 'text'}
                                                disabled={isProcessing}
                                                value={editData[col.key] || ''} 
                                                onChange={(e) => setEditData({ ...editData, [col.key]: e.target.value })} 
                                                placeholder={`Masukkan ${col.label}`}
                                            />
                                        </div>
                                    ))
                                )}
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
                                        {subTab === 'rpm' ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">ID RPM</Label>
                                                    <Input disabled={isProcessing} value={item.rpm_id || ''} onChange={(e) => handleAddItemChange(itemIdx, 'rpm_id', e.target.value)} placeholder="ID RPM" className="h-8 text-xs bg-white dark:bg-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Site ID</Label>
                                                    <Input disabled={isProcessing} value={item.site_id || item.siteid || ''} onChange={(e) => handleAddItemChange(itemIdx, 'site_id', e.target.value)} placeholder="Site ID" className="h-8 text-xs bg-white dark:bg-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">RTP</Label>
                                                    <Input disabled={isProcessing} value={item.rtp || ''} onChange={(e) => handleAddItemChange(itemIdx, 'rtp', e.target.value)} placeholder="RTP" className="h-8 text-xs bg-white dark:bg-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Mitra</Label>
                                                    <Input disabled={isProcessing} value={item.mitra || ''} onChange={(e) => handleAddItemChange(itemIdx, 'mitra', e.target.value)} placeholder="Mitra" className="h-8 text-xs bg-white dark:bg-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Bulan</Label>
                                                    <Input disabled={isProcessing} value={item.bulan || ''} onChange={(e) => handleAddItemChange(itemIdx, 'bulan', e.target.value)} placeholder="Bulan" className="h-8 text-xs bg-white dark:bg-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Tahun</Label>
                                                    <Input disabled={isProcessing} value={item.tahun || ''} onChange={(e) => handleAddItemChange(itemIdx, 'tahun', e.target.value)} placeholder="Tahun" className="h-8 text-xs bg-white dark:bg-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Tanggal Submit</Label>
                                                    <Input type="date" disabled={isProcessing} value={item.tanggal_submit || item.tanggalsubn || ''} onChange={(e) => handleAddItemChange(itemIdx, 'tanggal_submit', e.target.value)} className="h-8 text-xs bg-white dark:bg-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Tanggal Approve</Label>
                                                    <Input type="date" disabled={isProcessing} value={item.tanggal_approve || item.tanggalappr || ''} onChange={(e) => handleAddItemChange(itemIdx, 'tanggal_approve', e.target.value)} className="h-8 text-xs bg-white dark:bg-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Status Approve</Label>
                                                    <Input disabled={isProcessing} value={item.approve || ''} onChange={(e) => handleAddItemChange(itemIdx, 'approve', e.target.value)} placeholder="Status Approve" className="h-8 text-xs bg-white dark:bg-slate-900" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {(TABLE_COLUMNS[subTab] || TABLE_COLUMNS.smartkey).map((col) => (
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
                                        )}
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
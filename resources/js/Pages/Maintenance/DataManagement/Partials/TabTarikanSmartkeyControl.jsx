import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { parseCSVQuoteAware } from './TabTarikanRpmControl';

export default function useTabTarikanSmartkeyControl(canWrite) {
    const [fileSmartkey, setFileSmartkey] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [processingSmartkey, setProcessingSmartkey] = useState(false);
    const [skProgress, setSkProgress] = useState(0);
    const [skStatusText, setSkStatusText] = useState('');
    const [skStats, setSkStats] = useState(null);
    const [skError, setSkError] = useState(null);
    const fileSmartkeyInputRef = useRef(null);

    // State Pratinjau
    const [previewData, setPreviewData] = useState([]);
    const [isSavingMaster, setIsSavingMaster] = useState(false);

    // State Langkah Checklist SmartKey
    const [skSteps, setSkSteps] = useState({
        read: 'idle',
        matching: 'idle',
        sync: 'idle',
    });

    /**
     * Memproses header CSV SmartKey (Lock History maupun Locks / Master Gembok)
     * Prioritas utama Serial Number: 'Smart Lock SN' -> 'Serial No Hardware'
     */
    const parseSmartkeyRows = (rawRows) => {
        if (!rawRows || rawRows.length <= 1) return [];

        // Normalisasi header kolom
        const rawHeaders = rawRows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
        const cleanedHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

        const findColIdx = (keywords) => {
            // 1. Pencocokan persis (exact match)
            for (const key of keywords) {
                const targetKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                const exactIdx = cleanedHeaders.indexOf(targetKey);
                if (exactIdx !== -1) return exactIdx;
            }

            // 2. Pencocokan kata kunci terikat (fuzzy match)
            for (const key of keywords) {
                const targetKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (targetKey.length < 2) continue;
                const fuzzyIdx = cleanedHeaders.findIndex(h => h.includes(targetKey));
                if (fuzzyIdx !== -1) return fuzzyIdx;
            }

            return -1;
        };

        // Identifikasi kolom
        const colLockId   = findColIdx(['lockid', 'idlock', 'kunciid', 'idkunci', 'lockno']);
        
        // Prioritas utama: 'Smart Lock SN', diikuti 'Serial No Hardware'
        const colSn       = findColIdx([
            'smartlocksn',       // Prioritas 1: "Smart Lock SN"
            'serialnohardware',  // Prioritas 2: "Serial No Hardware"
            'nohardware', 
            'hardwareid', 
            'hardwaresn',
            'serialnumber', 
            'serialno', 
            'devicesn', 
            'locksn',
            'sn'
        ]);

        const colTowerId  = findColIdx(['towerid', 'sitecode', 'siteid', 'idtower', 'idsite', 'kodetower', 'kodesite']);
        const colSiteName = findColIdx(['sitename', 'namasite', 'namatower', 'towername', 'site']);
        const colStatus   = findColIdx(['statusaktifitas', 'statusaktivitas', 'lockstatus', 'status', 'aktifitas', 'state', 'lockstate']);

        // Koordinat GPS
        const colLongLat  = findColIdx(['longlat', 'latlong', 'coordinate', 'coordinates', 'location', 'koordinat', 'gps', 'position']);
        const colLat      = findColIdx(['latitude', 'lat']);
        const colLng      = findColIdx(['longitude', 'long', 'lng']);

        const rows = [];
        const seenKeys = new Set();

        for (let i = rawRows.length - 1; i >= 1; i--) {
            const cells = rawRows[i];
            if (!cells || cells.length === 0) continue;

            let rawLockId = colLockId !== -1 ? (cells[colLockId] ?? '') : '';
            let rawSn     = colSn !== -1 ? (cells[colSn] ?? '') : '';

            rawLockId = rawLockId.replace(/^["']|["']$/g, '').trim().slice(0, 100);
            rawSn     = rawSn.replace(/^["']|["']$/g, '').trim().slice(0, 100);

            if (!rawLockId && !rawSn) continue;

            // Kunci unik gabungan
            const uniqueKey = `${rawSn}_${rawLockId}`;
            if (seenKeys.has(uniqueKey)) continue;
            seenKeys.add(uniqueKey);

            // Fallback saling isi HANYA jika salah satu kosong
            if (!rawSn && rawLockId) rawSn = rawLockId;
            if (!rawLockId && rawSn) rawLockId = rawSn;

            let rawTowerId  = colTowerId !== -1 ? (cells[colTowerId] ?? '') : '';
            let rawSiteName = colSiteName !== -1 ? (cells[colSiteName] ?? '') : '';

            rawTowerId  = rawTowerId.replace(/^["']|["']$/g, '').trim().slice(0, 100);
            rawSiteName = rawSiteName.replace(/^["']|["']$/g, '').trim().slice(0, 255);

            // Ekstraksi Koordinat GPS
            let cleanLongLat = '';
            if (colLongLat !== -1 && cells[colLongLat]) {
                const val = cells[colLongLat].replace(/^["']|["']$/g, '').trim();
                if (/[-+]?\d+\.\d+/.test(val) || (val.includes(',') && /\d/.test(val))) {
                    cleanLongLat = val.slice(0, 255);
                }
            }
            if (!cleanLongLat && colLat !== -1 && colLng !== -1 && cells[colLat] && cells[colLng]) {
                const latVal = cells[colLat].replace(/^["']|["']$/g, '').trim();
                const lngVal = cells[colLng].replace(/^["']|["']$/g, '').trim();
                if (latVal && lngVal && /\d/.test(latVal) && /\d/.test(lngVal)) {
                    cleanLongLat = `${latVal}, ${lngVal}`.slice(0, 255);
                }
            }

            const statusVal = colStatus !== -1 ? (cells[colStatus] ?? '') : 'LOCKED';

            rows.push({
                lock_id: rawLockId,
                serial_number: rawSn,
                tower_id: rawTowerId,
                site_name: rawSiteName,
                status_aktifitas: (statusVal || 'LOCKED').replace(/^["']|["']$/g, '').trim().slice(0, 100),
                long_lat: cleanLongLat
            });
        }

        return rows.reverse();
    };

    const handleProcessSmartkey = async (e) => {
        e.preventDefault();
        if (!canWrite || !fileSmartkey) return;

        setProcessingSmartkey(true);
        setSkProgress(0);
        setSkStats(null);
        setSkError(null);
        setPreviewData([]);
        setSkSteps({ read: 'processing', matching: 'idle', sync: 'idle' });

        try {
            setSkStatusText('Membaca berkas Smart Key...');
            setSkProgress(15);
            await new Promise(r => setTimeout(r, 200));

            const text = await fileSmartkey.text();
            const rawRows = parseCSVQuoteAware(text);

            if (rawRows.length <= 1) {
                alert('File CSV Smart Key kosong atau tidak memiliki baris data.');
                setProcessingSmartkey(false);
                return;
            }

            setSkSteps(prev => ({ ...prev, read: 'done', matching: 'processing' }));
            setSkProgress(35);
            setSkStatusText('Mencocokkan Serial Number & Lock ID dengan Master Data...');
            await new Promise(r => setTimeout(r, 200));

            const rows = parseSmartkeyRows(rawRows);

            if (rows.length === 0) {
                alert('Tidak ditemukan data Lock ID / Serial Number yang valid pada file CSV.');
                setProcessingSmartkey(false);
                return;
            }

            setSkSteps(prev => ({ ...prev, matching: 'done', sync: 'processing' }));
            setSkProgress(60);
            setSkStatusText('Membuat pratinjau data (XLOOKUP)...');

            const targetUrl = typeof route === 'function'
                ? route('maintenance.data-management.process-smartkey-batch')
                : '/maintenance/data-management/process-smartkey-batch';

            const response = await axios.post(targetUrl, { rows, preview_only: true });

            setSkSteps(prev => ({ ...prev, sync: 'done' }));
            setSkProgress(100);
            setSkStatusText('Pratinjau Data Selesai!');

            if (response.data && Array.isArray(response.data.rows)) {
                setPreviewData(response.data.rows);
                setSkStats({
                    total: response.data.total || rows.length,
                    synced: response.data.synced || 0,
                    newCount: response.data.new_count || 0,
                });
            }

            setFileSmartkey(null);
            if (fileSmartkeyInputRef.current) fileSmartkeyInputRef.current.value = '';
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Terjadi kesalahan sistem saat memproses berkas Smart Key.';
            setSkError(msg);
            setSkStatusText('Gagal memproses berkas Smart Key.');
        } finally {
            setProcessingSmartkey(false);
        }
    };

    const handleConfirmSaveMaster = async () => {
        if (previewData.length === 0) return;

        setIsSavingMaster(true);
        try {
            const targetUrl = typeof route === 'function'
                ? route('maintenance.data-management.process-smartkey-batch')
                : '/maintenance/data-management/process-smartkey-batch';

            // Menggunakan batch size 50 agar setiap request terkirim cepat dan aman dari timeout
            const batchSize = 50;
            let totalSynced = 0;

            for (let i = 0; i < previewData.length; i += batchSize) {
                const chunk = previewData.slice(i, i + batchSize).map(item => ({
                    lock_id: item.lock_id,
                    serial_number: item.serial_number,
                    tower_id: item.tower_id,
                    site_name: item.site_name,
                    status_aktifitas: item.status_aktifitas,
                    long_lat: item.long_lat,
                }));

                const response = await axios.post(targetUrl, { rows: chunk, preview_only: false });
                if (response.data) {
                    totalSynced += response.data.synced || 0;
                }
            }

            alert(`Berhasil memperbarui ${totalSynced.toLocaleString('id-ID')} data Smart Key ke Master!`);
            setPreviewData([]);
            setSkStats(null);
            router.reload({ only: ['smartkeyMasters', 'summary'] });
        } catch (err) {
            console.error(err);
            let errorMsg = 'Terjadi kesalahan saat menyimpan data ke database.';

            if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else if (typeof err.response?.data === 'string') {
                errorMsg = 'Error Server (500): Silakan periksa log server.';
            }

            alert(errorMsg);
        } finally {
            setIsSavingMaster(false);
        }
    };

    const handleCancelPreview = () => {
        setPreviewData([]);
        setSkStats(null);
        setFileSmartkey(null);
        if (fileSmartkeyInputRef.current) fileSmartkeyInputRef.current.value = '';
        setSkSteps({ read: 'idle', matching: 'idle', sync: 'idle' });
    };

    const clearFile = () => {
        setFileSmartkey(null);
        if (fileSmartkeyInputRef.current) fileSmartkeyInputRef.current.value = '';
        setSkSteps({ read: 'idle', matching: 'idle', sync: 'idle' });
    };

    return {
        fileSmartkey,
        setFileSmartkey,
        isDragging,
        setIsDragging,
        processingSmartkey,
        skProgress,
        skStatusText,
        skStats,
        skError,
        skSteps,
        previewData,
        isSavingMaster,
        fileSmartkeyInputRef,
        handleProcessSmartkey,
        handleConfirmSaveMaster,
        handleCancelPreview,
        clearFile,
    };
}
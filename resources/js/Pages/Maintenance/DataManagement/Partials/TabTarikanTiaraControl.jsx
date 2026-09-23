import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { parseCSVQuoteAware } from './TabTarikanRpmControl';

export default function useTabTarikanTiaraControl(canWrite) {
    const [fileTiara, setFileTiara] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [processingTiara, setProcessingTiara] = useState(false);
    const [tiaraProgress, setTiaraProgress] = useState(0);
    const [tiaraStatusText, setTiaraStatusText] = useState('');
    const [tiaraStats, setTiaraStats] = useState(null);
    const [tiaraError, setTiaraError] = useState(null);
    const fileTiaraInputRef = useRef(null);

    const [previewData, setPreviewData] = useState([]);
    const [isSavingMaster, setIsSavingMaster] = useState(false);
    const [saveProgressPercent, setSaveProgressPercent] = useState(0);

    const [toast, setToast] = useState({
        isOpen: false,
        type: 'info',
        title: '',
        message: ''
    });

    const showToast = (type, title, message) => {
        setToast({ isOpen: true, type, title, message });
    };

    const closeToast = () => {
        setToast(prev => ({ ...prev, isOpen: false }));
    };

    const [tiaraSteps, setTiaraSteps] = useState({
        parse: 'idle',
        filter: 'idle',
        clean: 'idle',
        xlookup: 'idle',
        detectNa: 'idle',
    });

    const parseTiaraRows = (rawRows) => {
        if (!rawRows || rawRows.length <= 1) return [];
        const rawHeaders = rawRows[0].map(h => h.replace(/^["']|["']$/g, '').trim());
        const cleanedHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

        const findColIdx = (keywords) => {
            for (const key of keywords) {
                const targetKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                const exactIdx = cleanedHeaders.indexOf(targetKey);
                if (exactIdx !== -1) return exactIdx;
            }
            for (const key of keywords) {
                const targetKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (targetKey.length < 2) continue;
                const fuzzyIdx = cleanedHeaders.findIndex(h => h.includes(targetKey));
                if (fuzzyIdx !== -1) return fuzzyIdx;
            }
            return -1;
        };

        const colTicket     = findColIdx(['notikettiara', 'ticketnumber', 'tiaraid', 'idtiara', 'ticketid', 'norpm', 'notiket', 'ticket', 'notikettiaramain']);
        const colSiteCode   = findColIdx(['siteoperatorcode', 'siteid', 'kodetower', 'sitecode', 'kodesite', 'siteoperator_code']);
        const colSiteName   = findColIdx(['siteoperatorname', 'sitename', 'namasite', 'namatower', 'siteoperator_name', 'nama_site']);
        const colReg        = findColIdx(['siteareareg', 'regional', 'region', 'rtp']);
        const colTo         = findColIdx(['siteareato', 'toarea', 'to', 'area']);
        const colCompany    = findColIdx(['companyname', 'mitra', 'vendor', 'namamitra', 'company']);
        const colType       = findColIdx(['maintenancetypename', 'maintenancetype', 'jenispekerjaan', 'tipepekerjaan']);
        const colDate       = findColIdx(['maintenancedate', 'tanggalselesai', 'completedate', 'tgldone', 'tglmaintenance']);
        const colStatus     = findColIdx(['ticketstatusname', 'statustiara', 'status', 'statuspekerjaan']);

        const rows = [];
        for (let i = 1; i < rawRows.length; i++) {
            const cells = rawRows[i];
            if (!cells || cells.length === 0) continue;

            let ticketNumber = colTicket !== -1 ? (cells[colTicket] ?? '') : '';
            ticketNumber = ticketNumber.replace(/^["']|["']$/g, '').trim().slice(0, 100);

            let siteCode = colSiteCode !== -1 ? (cells[colSiteCode] ?? '') : '';
            siteCode = siteCode.replace(/^["']|["']$/g, '').trim().slice(0, 100);

            if (!ticketNumber && !siteCode) continue;

            const rawSiteName = colSiteName !== -1 ? (cells[colSiteName] ?? '') : '';
            const siteName = rawSiteName !== '' ? rawSiteName : siteCode;

            rows.push({
                ticket_number: ticketNumber || siteCode,
                siteoperator_code: siteCode,
                siteoperator_name: siteName.replace(/^["']|["']$/g, '').trim().slice(0, 255),
                sitearea_reg: (cells[colReg] ?? '').replace(/^["']|["']$/g, '').trim().toUpperCase().slice(0, 100),
                sitearea_to: (cells[colTo] ?? '').replace(/^["']|["']$/g, '').trim().toUpperCase().slice(0, 100),
                company_name: (cells[colCompany] ?? '').replace(/^["']|["']$/g, '').trim().slice(0, 255),
                maintenancetype_name: (cells[colType] ?? '').replace(/^["']|["']$/g, '').trim().slice(0, 255),
                maintenance_date: (cells[colDate] ?? '').replace(/^["']|["']$/g, '').trim().slice(0, 50),
                ticket_statusname: (cells[colStatus] ?? 'PENDING').replace(/^["']|["']$/g, '').trim().slice(0, 100),
            });
        }
        return rows;
    };

    const handleProcessTiara = async (e) => {
        e.preventDefault();
        if (!canWrite || !fileTiara) return;

        setProcessingTiara(true);
        setTiaraProgress(0);
        setTiaraStats(null);
        setTiaraError(null);
        setPreviewData([]);
        setTiaraSteps({ parse: 'processing', filter: 'idle', clean: 'idle', xlookup: 'idle', detectNa: 'idle' });

        try {
            setTiaraStatusText('Membaca & mem-parsing file CSV TIARA...');
            setTiaraProgress(10);
            await new Promise(r => setTimeout(r, 180));
            const text = await fileTiara.text();
            const rawRows = parseCSVQuoteAware(text);

            setTiaraSteps(prev => ({ ...prev, parse: 'done', filter: 'processing' }));
            setTiaraProgress(25);
            setTiaraStatusText('Ekstraksi 10 kolom inti TIARA...');

            const rows = parseTiaraRows(rawRows);
            if (rows.length === 0) {
                showToast('error', 'Gagal Membaca File', 'Kolom "No. Tiket TIARA" atau "Site ID" tidak ditemukan di file CSV.');
                setProcessingTiara(false);
                return;
            }

            setTiaraSteps(prev => ({ ...prev, filter: 'done', clean: 'done', xlookup: 'processing' }));
            setTiaraProgress(40);
            setTiaraStatusText('Menjalankan XLOOKUP bergelombang...');

            const targetUrl = typeof route === 'function' 
                ? route('maintenance.data-management.process-tiara-batch') 
                : '/maintenance/data-management/process-tiara-batch';

            const previewBatchSize = 5000;
            let allProcessedRows = [];

            for (let i = 0; i < rows.length; i += previewBatchSize) {
                const chunk = rows.slice(i, i + previewBatchSize);
                const res = await axios.post(targetUrl, { rows: chunk, preview_only: true });
                if (res.data && Array.isArray(res.data.rows)) {
                    allProcessedRows.push(...res.data.rows);
                }
                const currentPct = 40 + Math.round(((i + chunk.length) / rows.length) * 45);
                setTiaraProgress(currentPct);
            }

            setTiaraSteps(prev => ({ ...prev, xlookup: 'done', detectNa: 'processing' }));
            setTiaraProgress(88);
            setTiaraStatusText('Menyaring baris data baru (#N/A)...');

            const newOnly = allProcessedRows.filter(r => 
                r.is_new === true || 
                r.is_new === 1 || 
                r.status_xlookup === '#N/A'
            );

            setPreviewData(newOnly);
            setTiaraStats({
                total: rows.length,
                newCount: newOnly.length,
            });

            if (newOnly.length === 0) {
                showToast(
                    'info', 
                    'Engine Selesai', 
                    `Seluruh data di CSV (${rows.length.toLocaleString('id-ID')} baris) sudah ada di Master Data TIARA.`
                );
            } else {
                showToast(
                    'success',
                    'Pratinjau Siap',
                    `Terdeteksi ${newOnly.length.toLocaleString('id-ID')} data baru (#N/A) yang siap dimasukkan ke Master Data.`
                );
            }

            setTiaraSteps(prev => ({ ...prev, detectNa: 'done' }));
            setTiaraProgress(100);
            setTiaraStatusText('Pratinjau data RPM (TIARA) siap!');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Gagal memproses berkas TIARA.';
            setTiaraError(msg);
            showToast('error', 'Gagal Memproses Berkas', msg);
            setTiaraStatusText('Gagal memproses berkas.');
        } finally {
            setProcessingTiara(false);
        }
    };

    const handleConfirmSaveMaster = async () => {
        if (previewData.length === 0) return;
        setIsSavingMaster(true);
        setSaveProgressPercent(0);

        try {
            const batchSize = 3000;
            const totalData = previewData.length;
            let processed = 0;

            const targetUrl = typeof route === 'function' 
                ? route('maintenance.data-management.process-tiara-batch') 
                : '/maintenance/data-management/process-tiara-batch';

            for (let i = 0; i < totalData; i += batchSize) {
                const chunk = previewData.slice(i, i + batchSize);
                await axios.post(targetUrl, { rows: chunk, preview_only: false });
                
                processed += chunk.length;
                const percent = Math.min(Math.round((processed / totalData) * 100), 100);
                setSaveProgressPercent(percent);
            }

            showToast(
                'success', 
                'Penyimpanan Berhasil', 
                `Berhasil menyimpan ${totalData.toLocaleString('id-ID')} data baru ke Master Data RPM (TIARA)!`
            );

            setPreviewData([]);
            setFileTiara(null);
            if (fileTiaraInputRef.current) fileTiaraInputRef.current.value = '';

            // ME-REFRESH PROPS INERTIA RELEVAN AGAR TABEL & COUNTER KANAN LANGSUNG TERUPDATE
            router.reload({ only: ['tiaraMasters', 'summary', 'rpmMasters', 'smartkeyMasters'] });
        } catch (err) {
            showToast('error', 'Gagal Menyimpan', 'Terjadi kendala saat menyimpan data ke database.');
        } finally {
            setIsSavingMaster(false);
            setSaveProgressPercent(0);
        }
    };

    const handleCancelPreview = () => {
        setPreviewData([]);
        setFileTiara(null);
        if (fileTiaraInputRef.current) fileTiaraInputRef.current.value = '';
        setTiaraSteps({ parse: 'idle', filter: 'idle', clean: 'idle', xlookup: 'idle', detectNa: 'idle' });
    };

    const clearFile = () => {
        setFileTiara(null);
        if (fileTiaraInputRef.current) fileTiaraInputRef.current.value = '';
        setPreviewData([]);
        setTiaraSteps({ parse: 'idle', filter: 'idle', clean: 'idle', xlookup: 'idle', detectNa: 'idle' });
    };

    return {
        fileTiara,
        setFileTiara,
        isDragging,
        setIsDragging,
        processingTiara,
        tiaraProgress,
        tiaraStatusText,
        tiaraStats,
        tiaraError,
        tiaraSteps,
        previewData,
        isSavingMaster,
        saveProgressPercent,
        toast,
        closeToast,
        fileTiaraInputRef,
        handleProcessTiara,
        handleConfirmSaveMaster,
        handleCancelPreview,
        clearFile,
    };
}
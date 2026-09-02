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

    // State 3 Langkah Check-list SmartKey
    const [skSteps, setSkSteps] = useState({
        read: 'idle',       // idle | processing | done
        matching: 'idle',   // idle | processing | done
        sync: 'idle',       // idle | processing | done
    });

    const handleProcessSmartkey = async (e) => {
        e.preventDefault();
        if (!canWrite || !fileSmartkey) return;

        setProcessingSmartkey(true);
        setSkProgress(0);
        setSkStats(null);
        setSkError(null);
        setSkSteps({
            read: 'processing',
            matching: 'idle',
            sync: 'idle',
        });

        try {
            // TAHAP 1: Membaca berkas
            setSkStatusText('Membaca berkas Lock History...');
            setSkProgress(12);
            await new Promise(r => setTimeout(r, 200));

            const text = await fileSmartkey.text();
            const rawRows = parseCSVQuoteAware(text);

            if (rawRows.length <= 1) {
                alert('File CSV Smart Key kosong atau tidak memiliki baris data.');
                setProcessingSmartkey(false);
                return;
            }

            setSkSteps(prev => ({ ...prev, read: 'done', matching: 'processing' }));
            setSkProgress(25);

            // TAHAP 2: Parsing & Ekstraksi Serial Number
            setSkStatusText('Mencocokkan Lock ID dengan Master...');
            await new Promise(r => setTimeout(r, 200));

            const rows = [];
            for (let i = 1; i < rawRows.length; i++) {
                const cells = rawRows[i];
                const sn = (cells[0] ?? '').replace(/^["']|["']$/g, '').trim().slice(0, 100);
                if (!sn) continue;
                rows.push({
                    serial_number: sn,
                    status_aktifitas: (cells[1] || 'LOCKED').replace(/^["']|["']$/g, '').trim().slice(0, 100),
                    long_lat: (cells[2] || '').replace(/^["']|["']$/g, '').trim().slice(0, 255)
                });
            }

            setSkSteps(prev => ({ ...prev, matching: 'done', sync: 'processing' }));

            // TAHAP 3: Batch Synchronization
            const totalRows = rows.length;
            const batchSize = 1000;
            let totalSynced = 0;
            const targetUrl = typeof route === 'function' ? route('maintenance.data-management.process-smartkey-batch') : '/maintenance/data-management/process-smartkey-batch';

            for (let i = 0; i < totalRows; i += batchSize) {
                const chunk = rows.slice(i, i + batchSize);
                const currentCount = Math.min(i + batchSize, totalRows);
                const currentPct = 25 + Math.round((currentCount / totalRows) * 73);

                setSkStatusText(`Sinkronisasi status gembok (${currentCount.toLocaleString('id-ID')} / ${totalRows.toLocaleString('id-ID')})...`);

                const response = await axios.post(targetUrl, { rows: chunk });
                if (response.data) {
                    totalSynced += response.data.synced || 0;
                }
                setSkProgress(currentPct);
            }

            setSkSteps(prev => ({ ...prev, sync: 'done' }));
            setSkProgress(100);
            setSkStatusText('Sinkronisasi Smart Key Berhasil!');
            setSkStats({
                total: totalRows,
                synced: totalSynced,
            });

            setFileSmartkey(null);
            if (fileSmartkeyInputRef.current) fileSmartkeyInputRef.current.value = '';
            router.reload({ only: ['smartkeyMasters', 'summary'] });
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Terjadi kesalahan sistem saat memproses berkas Smart Key.';
            setSkError(msg);
            setSkStatusText('Gagal memproses berkas Smart Key.');
        } finally {
            setProcessingSmartkey(false);
        }
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
        fileSmartkeyInputRef,
        handleProcessSmartkey,
        clearFile,
    };
}
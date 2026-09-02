import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

export const parseCSVQuoteAware = (text) => {
    const cleanText = text.replace(/^\uFEFF/, '');
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    const firstLineEnd = cleanText.indexOf('\n');
    const firstLine = firstLineEnd !== -1 ? cleanText.slice(0, firstLineEnd) : cleanText;
    const delimiter = firstLine.includes(';') ? ';' : (firstLine.includes('\t') ? '\t' : ',');

    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const nextChar = cleanText[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === delimiter && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentCell.trim());
            if (currentRow.some(cell => cell.length > 0)) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell.length > 0)) rows.push(currentRow);
    }
    return rows;
};

export default function useTabTarikanRpmControl(canWrite) {
    const [fileRpm, setFileRpm] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [processingRpm, setProcessingRpm] = useState(false);
    const [rpmProgress, setRpmProgress] = useState(0);
    const [rpmStatusText, setRpmStatusText] = useState('');
    const [rpmStats, setRpmStats] = useState(null);
    const [rpmError, setRpmError] = useState(null);

    // State Khusus Data Baru (#N/A)
    const [previewData, setPreviewData] = useState([]);
    const [isSavingMaster, setIsSavingMaster] = useState(false);
    const fileRpmInputRef = useRef(null);

    const [rpmSteps, setRpmSteps] = useState({
        parse: 'idle',
        filterYear: 'idle',
        cleanRtp: 'idle',
        xlookup: 'idle',
        detectNa: 'idle',
    });

    const processRawRowsRPM = (rawRows) => {
        if (!rawRows || rawRows.length <= 1) return { rows: [], totalRaw: 0, preSkipped: 0 };

        const headers = rawRows[0].map(h => 
            h.replace(/^["']|["']$/g, '').toLowerCase().replace(/[\s_/]/g, '')
        );

        const findColIdx = (keys, def) => {
            for (const k of keys) {
                const idx = headers.indexOf(k);
                if (idx !== -1) return idx;
            }
            return def;
        };

        const colRpmId   = findColIdx(['rpmid', 'idrpm'], 0);
        const colSiteId  = findColIdx(['siteid', 'site_id'], 1);
        const colRtp     = findColIdx(['rtp', 'region'], 2);
        const colMitra   = findColIdx(['mitra', 'vendor'], 3);
        const colBulan   = findColIdx(['bulan', 'month'], 4);
        const colTahun   = findColIdx(['tahun', 'year'], 5);
        const colTglSub  = findColIdx(['tanggalsubmit', 'tglsubmit', 'tanggalsubn'], 6);
        const colTglApp  = findColIdx(['tanggalapprove', 'tglapprove', 'tanggalappr'], 7);
        const colApprove = findColIdx(['approve', 'statusapprove', 'status'], 8);

        const validRows = [];
        let totalRaw = 0;
        let preSkipped = 0;

        for (let i = 1; i < rawRows.length; i++) {
            const cells = rawRows[i];
            if (!cells || cells.length === 0) continue;
            totalRaw++;

            const rpmId = (cells[colRpmId] ?? '').replace(/^["']|["']$/g, '').trim().slice(0, 100);
            if (!rpmId) {
                preSkipped++;
                continue;
            }

            let tahun = (cells[colTahun] ?? '').replace(/^["']|["']$/g, '').trim();
            if (tahun === '20205' || tahun === '20250') tahun = '2025';

            if (tahun !== '2025' && tahun !== '2026') {
                preSkipped++;
                continue;
            }

            let rtp = (cells[colRtp] ?? '').replace(/^["']|["']$/g, '').replace(/\s+/g, '').toUpperCase();
            if (rtp.includes('JAKARTA')) {
                preSkipped++;
                continue;
            }

            let siteId = (cells[colSiteId] ?? '').replace(/^["']|["']$/g, '').replace(/\s+/g, '').slice(0, 100);
            if (!siteId) siteId = rpmId;

            validRows.push({
                rpm_id: rpmId,
                site_id: siteId,
                rtp: rtp.slice(0, 255),
                mitra: (cells[colMitra] ?? '').replace(/^["']|["']$/g, '').trim().slice(0, 255),
                bulan: (cells[colBulan] ?? '').replace(/^["']|["']$/g, '').trim().slice(0, 50),
                tahun: tahun.slice(0, 50),
                tanggal_submit: (cells[colTglSub] ?? '').replace(/^["']|["']$/g, '').trim().slice(0, 100),
                tanggal_approve: (cells[colTglApp] ?? '').replace(/^["']|["']$/g, '').trim().slice(0, 100),
                approve: ((cells[colApprove] ?? '').replace(/^["']|["']$/g, '').trim() || 'BELUM APPROVED').slice(0, 100)
            });
        }
        return { rows: validRows, totalRaw, preSkipped };
    };

    const handleProcessRPM = async (e) => {
        e.preventDefault();
        if (!canWrite || !fileRpm) return;

        setProcessingRpm(true);
        setRpmProgress(0);
        setRpmStats(null);
        setRpmError(null);
        setPreviewData([]);

        setRpmSteps({
            parse: 'processing',
            filterYear: 'idle',
            cleanRtp: 'idle',
            xlookup: 'idle',
            detectNa: 'idle',
        });

        try {
            // 1. Parsing
            setRpmStatusText('Membaca & mem-parsing berkas CSV...');
            setRpmProgress(8);
            await new Promise(r => setTimeout(r, 180));
            const text = await fileRpm.text();
            const rawRows = parseCSVQuoteAware(text);

            setRpmSteps(prev => ({ ...prev, parse: 'done', filterYear: 'processing' }));
            setRpmProgress(18);

            // 2. Filter Tahun
            setRpmStatusText('Menyaring tahun 2025 & 2026...');
            await new Promise(r => setTimeout(r, 200));
            setRpmSteps(prev => ({ ...prev, filterYear: 'done', cleanRtp: 'processing' }));
            setRpmProgress(30);

            // 3. Normalisasi RTP
            setRpmStatusText('Normalisasi RTP & penghapusan spasi...');
            await new Promise(r => setTimeout(r, 180));
            const { rows, totalRaw, preSkipped } = processRawRowsRPM(rawRows);
            const totalValid = rows.length;

            if (totalValid === 0) {
                alert('Tidak ada baris data valid periode 2025 & 2026 yang ditemukan.');
                setProcessingRpm(false);
                return;
            }

            setRpmSteps(prev => ({ ...prev, cleanRtp: 'done', xlookup: 'processing' }));

            // 4 & 5. XLOOKUP dan Ekstraksi Khusus Data Baru (#N/A)
            const batchSize = 2500;
            let totalInserted = 0;
            let totalUpdated = 0;
            let newRowsOnly = [];
            const targetUrl = typeof route === 'function' ? route('maintenance.data-management.process-rpm-batch') : '/maintenance/data-management/process-rpm-batch';

            for (let i = 0; i < totalValid; i += batchSize) {
                const chunk = rows.slice(i, i + batchSize);
                const currentCount = Math.min(i + batchSize, totalValid);
                const currentPct = 30 + Math.round((currentCount / totalValid) * 65);

                setRpmStatusText(`XLOOKUP Master Data (${currentCount.toLocaleString('id-ID')} / ${totalValid.toLocaleString('id-ID')})...`);

                const res = await axios.post(targetUrl, {
                    rows: chunk,
                    preview_only: true,
                });

                if (res.data) {
                    totalInserted += res.data.inserted || 0;
                    totalUpdated += res.data.updated || 0;
                    if (Array.isArray(res.data.rows)) {
                        // Filter langsung HANYA data baru (#N/A)
                        const filteredBatchNew = res.data.rows.filter(r => r.is_new);
                        newRowsOnly.push(...filteredBatchNew);
                    }
                }
                setRpmProgress(currentPct);
            }

            setRpmSteps(prev => ({ ...prev, xlookup: 'done', detectNa: 'processing' }));
            await new Promise(r => setTimeout(r, 200));
            setRpmSteps(prev => ({ ...prev, detectNa: 'done' }));

            setRpmProgress(100);
            setRpmStatusText(`Selesai! Ditemukan ${newRowsOnly.length.toLocaleString('id-ID')} data baru.`);
            
            // Simpan HANYA baris data baru ke tabel preview
            setPreviewData(newRowsOnly);

            setRpmStats({
                totalRaw,
                valid: totalValid,
                inserted: totalInserted,
                updated: totalUpdated,
                skipped: preSkipped,
            });
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Gagal menjalankan engine XLOOKUP.';
            setRpmError(msg);
            setRpmStatusText('Gagal memproses berkas.');
        } finally {
            setProcessingRpm(false);
        }
    };

    // Tombol Konfirmasi: Memasukkan Seluruh Data Baru (#N/A) ke Master Data
    const handleConfirmSaveMaster = async () => {
        if (previewData.length === 0) return;
        setIsSavingMaster(true);

        try {
            const batchSize = 2500;
            const targetUrl = typeof route === 'function' ? route('maintenance.data-management.process-rpm-batch') : '/maintenance/data-management/process-rpm-batch';

            for (let i = 0; i < previewData.length; i += batchSize) {
                const chunk = previewData.slice(i, i + batchSize);
                await axios.post(targetUrl, { 
                    rows: chunk,
                    preview_only: false
                });
            }

            alert(`Berhasil memasukkan ${previewData.length.toLocaleString('id-ID')} data baru ke Master Data RPM!`);
            setPreviewData([]);
            setFileRpm(null);
            setRpmStats(null);
            if (fileRpmInputRef.current) fileRpmInputRef.current.value = '';
            router.reload({ only: ['rpmMasters', 'summary'] });
        } catch (err) {
            alert('Terjadi kesalahan saat menyimpan data baru ke database.');
        } finally {
            setIsSavingMaster(false);
        }
    };

    const handleCancelPreview = () => {
        setPreviewData([]);
        setFileRpm(null);
        setRpmStats(null);
        if (fileRpmInputRef.current) fileRpmInputRef.current.value = '';
        setRpmSteps({ parse: 'idle', filterYear: 'idle', cleanRtp: 'idle', xlookup: 'idle', detectNa: 'idle' });
    };

    const clearFile = () => {
        setFileRpm(null);
        if (fileRpmInputRef.current) fileRpmInputRef.current.value = '';
        setRpmSteps({ parse: 'idle', filterYear: 'idle', cleanRtp: 'idle', xlookup: 'idle', detectNa: 'idle' });
        setPreviewData([]);
    };

    return {
        fileRpm,
        setFileRpm,
        isDragging,
        setIsDragging,
        processingRpm,
        rpmProgress,
        rpmStatusText,
        rpmStats,
        rpmError,
        rpmSteps,
        previewData,
        isSavingMaster,
        fileRpmInputRef,
        handleProcessRPM,
        handleConfirmSaveMaster,
        handleCancelPreview,
        clearFile,
    };
}
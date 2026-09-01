import React, { useState, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import axios from 'axios';
import { 
    Wand2, 
    DatabaseZap, 
    CheckCircle2, 
    ArrowRightLeft, 
    FileSpreadsheet, 
    Lock, 
    Loader2,
    Activity,
    FileCheck,
    Zap,
    AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TabDataTarikan() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role || 'view';
    const canWrite = userRole === 'admin' || userRole === 'staff';

    // State RPM
    const [fileRpm, setFileRpm] = useState(null);
    const [processingRpm, setProcessingRpm] = useState(false);
    const [rpmProgress, setRpmProgress] = useState(0);
    const [rpmStatusText, setRpmStatusText] = useState('');
    const [rpmStats, setRpmStats] = useState(null);
    const [rpmError, setRpmError] = useState(null);
    const fileRpmInputRef = useRef(null);

    // State SmartKey
    const [fileSmartkey, setFileSmartkey] = useState(null);
    const [processingSmartkey, setProcessingSmartkey] = useState(false);
    const [skProgress, setSkProgress] = useState(0);
    const [skStatusText, setSkStatusText] = useState('');
    const [skStats, setSkStats] = useState(null);
    const [skError, setSkError] = useState(null);
    const fileSmartkeyInputRef = useRef(null);

    // Parser CSV Presisi (Quote-Aware & Anti-Pecah Baris Enter)
    const parseCSVQuoteAware = (text) => {
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
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                currentRow.push(currentCell.trim());
                if (currentRow.some(cell => cell.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }

        if (currentCell.length > 0 || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(cell => cell.length > 0)) {
                rows.push(currentRow);
            }
        }

        return rows;
    };

    // Pre-Filtering & Cleansing RPM (Hapus Spasi RTP + Filter 2025/2026)
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

            // ATURAN TAHUN KETAT: Hanya simpan 2025 dan 2026
            if (tahun !== '2025' && tahun !== '2026') {
                preSkipped++;
                continue;
            }

            // STANDARISASI RTP: Hapus seluruh spasi & jadikan huruf kapital (Anti Duplikat)
            let rtp = (cells[colRtp] ?? '').replace(/^["']|["']$/g, '').replace(/\s+/g, '').toUpperCase();

            // Filter wilayah Jakarta
            if (rtp.includes('JAKARTA')) {
                preSkipped++;
                continue;
            }

            // Trim spasi Site ID
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

    // --- PROSES TARIKAN RPM DENGAN TAHAPAN STATUS DINAMIS ---
    const handleProcessRPM = async (e) => {
        e.preventDefault();
        if (!canWrite || !fileRpm) return;

        setProcessingRpm(true);
        setRpmProgress(0);
        setRpmStats(null);
        setRpmError(null);

        try {
            // TAHAP 1: Membaca File
            setRpmStatusText('Tahap 1/3: Membaca & mem-parsing file CSV...');
            setRpmProgress(5);
            await new Promise(r => setTimeout(r, 150));

            const text = await fileRpm.text();

            // TAHAP 2: Cleansing & Filter
            setRpmStatusText('Tahap 2/3: Membersihkan tahun (2025/2026) & standarisasi RTP...');
            setRpmProgress(12);
            await new Promise(r => setTimeout(r, 150));

            const rawRows = parseCSVQuoteAware(text);
            const { rows, totalRaw, preSkipped } = processRawRowsRPM(rawRows);
            const totalValid = rows.length;

            if (totalValid === 0) {
                alert('Tidak ada data valid tahun 2025 & 2026 yang ditemukan.');
                setProcessingRpm(false);
                return;
            }

            // TAHAP 3: Eksekusi VLOOKUP & XLOOKUP
            const batchSize = 1000;
            let totalInserted = 0;
            let totalUpdated = 0;
            const targetUrl = typeof route === 'function' ? route('maintenance.data-management.process-rpm-batch') : '/maintenance/data-management/process-rpm-batch';

            for (let i = 0; i < totalValid; i += batchSize) {
                const chunk = rows.slice(i, i + batchSize);
                const currentCount = Math.min(i + batchSize, totalValid);
                const currentPct = 12 + Math.round((currentCount / totalValid) * 85);

                setRpmStatusText(`Tahap 3/3: Menjalankan VLOOKUP & XLOOKUP (${currentCount.toLocaleString('id-ID')} / ${totalValid.toLocaleString('id-ID')} data)...`);

                const response = await axios.post(targetUrl, {
                    rows: chunk
                });

                if (response.data) {
                    totalInserted += response.data.inserted || 0;
                    totalUpdated += response.data.updated || 0;
                }

                setRpmProgress(currentPct);
            }

            setRpmProgress(100);
            setRpmStatusText('Sinkronisasi Master Data RPM Selesai!');
            setRpmStats({
                totalRaw,
                valid: totalValid,
                inserted: totalInserted,
                updated: totalUpdated,
                skipped: preSkipped,
            });

            setFileRpm(null);
            if (fileRpmInputRef.current) fileRpmInputRef.current.value = '';
            router.reload({ only: ['rpmMasters', 'summary'] });
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Terjadi kesalahan saat memproses data RPM.';
            setRpmError(msg);
            setRpmStatusText('Gagal memproses data.');
        } finally {
            setProcessingRpm(false);
        }
    };

    // --- PROSES SMART KEY DENGAN TAHAPAN STATUS DINAMIS ---
    const handleProcessSmartkey = async (e) => {
        e.preventDefault();
        if (!canWrite || !fileSmartkey) return;

        setProcessingSmartkey(true);
        setSkProgress(0);
        setSkStats(null);
        setSkError(null);

        try {
            setSkStatusText('Tahap 1/2: Membaca file Lock History...');
            setSkProgress(8);
            await new Promise(r => setTimeout(r, 150));

            const text = await fileSmartkey.text();
            const rawRows = parseCSVQuoteAware(text);
            if (rawRows.length <= 1) {
                alert('File CSV Smart Key kosong.');
                setProcessingSmartkey(false);
                return;
            }

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

            const totalRows = rows.length;
            const batchSize = 1000;
            let totalSynced = 0;
            const targetUrl = typeof route === 'function' ? route('maintenance.data-management.process-smartkey-batch') : '/maintenance/data-management/process-smartkey-batch';

            for (let i = 0; i < totalRows; i += batchSize) {
                const chunk = rows.slice(i, i + batchSize);
                const currentCount = Math.min(i + batchSize, totalRows);
                const currentPct = 8 + Math.round((currentCount / totalRows) * 90);

                setSkStatusText(`Tahap 2/2: Sinkronisasi status gembok (${currentCount.toLocaleString('id-ID')} / ${totalRows.toLocaleString('id-ID')} unit)...`);

                const response = await axios.post(targetUrl, {
                    rows: chunk
                });

                if (response.data) {
                    totalSynced += response.data.synced || 0;
                }

                setSkProgress(currentPct);
            }

            setSkProgress(100);
            setSkStatusText('Sinkronisasi Smart Key Selesai!');
            setSkStats({
                total: totalRows,
                synced: totalSynced,
            });

            setFileSmartkey(null);
            if (fileSmartkeyInputRef.current) fileSmartkeyInputRef.current.value = '';
            router.reload({ only: ['smartkeyMasters', 'summary'] });
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Terjadi kesalahan saat memproses Smart Key.';
            setSkError(msg);
            setSkStatusText('Gagal memproses Smart Key.');
        } finally {
            setProcessingSmartkey(false);
        }
    };

    return (
        <div className="space-y-4">
            {!canWrite && (
                <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 py-3">
                    <Lock className="w-4 h-4 shrink-0" />
                    <AlertDescription className="text-xs font-medium ml-2">
                        Akun Anda memiliki hak akses <strong>Viewer</strong>. Fitur eksekusi Engine Auto-Report hanya dapat dijalankan oleh <strong>Admin</strong> atau <strong>Staff</strong>[cite: 1].
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PANEL TARIKAN RPM */}
                <form onSubmit={handleProcessRPM} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-blue-50/50 dark:bg-blue-500/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                                    <DatabaseZap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Upload & Olah Tarikan RPM</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cleansing Otomatis + Auto VLOOKUP & XLOOKUP ke Master Data[cite: 3].</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    File Tarikan RPM (.csv):
                                </label>
                                <input
                                    ref={fileRpmInputRef}
                                    type="file"
                                    accept=".csv,.txt"
                                    disabled={!canWrite || processingRpm}
                                    onChange={(e) => setFileRpm(e.target.files[0] || null)}
                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-blue-400 cursor-pointer disabled:opacity-50"
                                />
                                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                                    Mendukung file besar 300.000+ baris dengan auto-cleansing instan.
                                </p>
                            </div>

                            {/* PROGRESS BAR & STATUS DINAMIS */}
                            {processingRpm && (
                                <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2.5 animate-in fade-in">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                                            <span className="truncate">{rpmStatusText}</span>
                                        </span>
                                        <span className="font-mono font-bold text-blue-800 dark:text-blue-200 shrink-0 ml-2">
                                            {rpmProgress}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-blue-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${rpmProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ERROR MESSAGE */}
                            {rpmError && (
                                <Alert className="bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 py-2.5">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <AlertDescription className="text-xs font-medium ml-2">
                                        {rpmError}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* SUMMARY HASIL (3 KARTU RINGKAS SESUAI REQUEST) */}
                            {rpmStats && !processingRpm && (
                                <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                        <FileCheck className="w-4 h-4" />
                                        <span>Hasil Olah Data:</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                                            <span className="text-[10px] text-slate-500 block">Total Baris File</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm font-mono mt-0.5 block">{rpmStats.totalRaw.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                                            <span className="text-[10px] text-slate-500 block">Lolos Filter (2025 & 2026)</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm font-mono mt-0.5 block">{rpmStats.valid.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                                            <span className="text-[10px] text-slate-500 block">Data Baru (#N/A)</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono mt-0.5 block">+{rpmStats.inserted.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
                                <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                    Optimasi Engine:
                                </h3>
                                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        <span>Hanya simpan tahun 2025 & 2026 + Hapus spasi RTP ganda[cite: 3]</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                        <span>Direct Bulk Upsert di Aiven PostgreSQL (bebas timeout Vercel)[cite: 3]</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
                        <button
                            type="submit"
                            disabled={!canWrite || !fileRpm || processingRpm}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {processingRpm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            {processingRpm ? 'Sedang Memproses...' : 'Proses Tarikan RPM'}
                        </button>
                    </div>
                </form>

                {/* PANEL TARIKAN SMART KEY */}
                <form onSubmit={handleProcessSmartkey} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-emerald-50/50 dark:bg-emerald-500/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                                    <ArrowRightLeft className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Upload & Sinkron Smart Key</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Batch Sync Lock History ke Master Smart Key[cite: 3].</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    File Lock History (.csv):
                                </label>
                                <input
                                    ref={fileSmartkeyInputRef}
                                    type="file"
                                    accept=".csv,.txt"
                                    disabled={!canWrite || processingSmartkey}
                                    onChange={(e) => setFileSmartkey(e.target.files[0] || null)}
                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-slate-800 dark:file:text-emerald-400 cursor-pointer disabled:opacity-50"
                                />
                                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                                    Simpan file Excel Anda sebagai format <strong>CSV (Comma delimited)</strong> sebelum upload.
                                </p>
                            </div>

                            {/* PROGRESS BAR & STATUS DINAMIS */}
                            {processingSmartkey && (
                                <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2.5 animate-in fade-in">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
                                            <span className="truncate">{skStatusText}</span>
                                        </span>
                                        <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200 shrink-0 ml-2">
                                            {skProgress}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-emerald-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-600 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${skProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ERROR MESSAGE */}
                            {skError && (
                                <Alert className="bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 py-2.5">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <AlertDescription className="text-xs font-medium ml-2">
                                        {skError}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* SUMMARY HASIL */}
                            {skStats && !processingSmartkey && (
                                <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                        <FileCheck className="w-4 h-4" />
                                        <span>Hasil Sinkronisasi:</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 text-center">
                                        <span className="text-[11px] text-slate-500 block">Total Unit Disinkronkan</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">{skStats.synced.toLocaleString('id-ID')} / {skStats.total.toLocaleString('id-ID')} Unit</span>
                                    </div>
                                </div>
                            )}

                            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
                                <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aturan Engine Otomatis:</h3>
                                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>Match Lock ID dengan Serial Number Master[cite: 3]</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>Sinkronisasi Status Aktifitas & Geolokasi Long Lat[cite: 3]</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
                        <button
                            type="submit"
                            disabled={!canWrite || !fileSmartkey || processingSmartkey}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {processingSmartkey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            {processingSmartkey ? 'Sedang Memproses...' : 'Proses Tarikan Smart Key'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
import React from 'react';
import { 
    UploadCloud, 
    X, 
    FileText, 
    Activity, 
    AlertCircle, 
    FileCheck, 
    Loader2, 
    Sparkles,
    Check,
    Terminal
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useTabTarikanRpmControl from './TabTarikanRpmControl';

export default function TabTarikanRpm({ canWrite, control }) {
    const internalControl = useTabTarikanRpmControl(canWrite);
    const {
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
        fileRpmInputRef,
        handleProcessRPM,
        clearFile,
    } = control || internalControl;

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <form 
            onSubmit={handleProcessRPM} 
            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700/80"
        >
            <div>
                {/* Header Modul (Tanpa Kotak Ikon) */}
                <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Auto-Engine Log RPM
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Penyaringan otomatis, normalisasi area, dan penyesuaian master data.
                    </p>
                </div>

                {/* Konten Form */}
                <div className="p-5 sm:p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Berkas Tarikan RPM (.csv):
                        </label>

                        <input
                            ref={fileRpmInputRef}
                            type="file"
                            accept=".csv,.txt"
                            disabled={!canWrite || processingRpm || previewData.length > 0}
                            onChange={(e) => setFileRpm(e.target.files[0] || null)}
                            className="hidden"
                        />

                        {!fileRpm && previewData.length === 0 ? (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files?.[0]) setFileRpm(e.dataTransfer.files[0]);
                                }}
                                onClick={() => canWrite && !processingRpm && fileRpmInputRef.current?.click()}
                                className="group relative border-2 border-dashed border-slate-300/80 dark:border-slate-800 rounded-xl p-6 text-center transition-all cursor-pointer select-none hover:border-blue-500/60 hover:bg-slate-50/60 dark:hover:bg-slate-950/30"
                            >
                                <div className="w-10 h-10 mx-auto mb-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-transform group-hover:scale-110">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Tarik berkas ke sini atau <span className="text-blue-600 dark:text-blue-400 underline underline-offset-2">pilih file</span>
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                                    Mendukung format .csv atau .txt (hingga 300.000+ baris)
                                </p>
                            </div>
                        ) : fileRpm ? (
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/25 animate-in fade-in">
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                    <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {fileRpm.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            {formatFileSize(fileRpm.size)} • Siap diproses
                                        </p>
                                    </div>
                                </div>
                                {!processingRpm && previewData.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={clearFile}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Live Progress Bar */}
                    {processingRpm && (
                        <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 min-w-0">
                                    <Activity className="w-4 h-4 animate-spin shrink-0" />
                                    <span className="font-semibold truncate">{rpmStatusText}</span>
                                </div>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 ml-2 shrink-0">
                                    {rpmProgress}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${rpmProgress}%` }} />
                            </div>
                        </div>
                    )}

                    {rpmError && (
                        <Alert className="bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 py-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <AlertDescription className="text-xs font-medium ml-2">{rpmError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Kotak Hitam Konsol: Pipeline Status */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 shadow-inner space-y-3 font-mono">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-900">
                            <span className="flex items-center gap-1.5 font-bold text-slate-300">
                                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                                <span>Status Pipeline Engine</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                                {processingRpm ? 'RUNNING' : previewData.length > 0 ? 'READY TO SAVE' : 'STANDBY'}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs">
                            {/* 1. Parsing */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {rpmSteps.parse === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
                                    ) : rpmSteps.parse === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={rpmSteps.parse === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>Quote-Aware CSV Parsing</span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    {rpmSteps.parse === 'done' ? 'Selesai' : rpmSteps.parse === 'processing' ? 'Membaca...' : 'Siap'}
                                </span>
                            </div>

                            {/* 2. Filter Tahun */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {rpmSteps.filterYear === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
                                    ) : rpmSteps.filterYear === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={rpmSteps.filterYear === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>Filter Tahun (2025 & 2026)</span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    {rpmSteps.filterYear === 'done' ? 'Selesai' : rpmSteps.filterYear === 'processing' ? 'Menyaring...' : 'Menunggu'}
                                </span>
                            </div>

                            {/* 3. Normalisasi RTP */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {rpmSteps.cleanRtp === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
                                    ) : rpmSteps.cleanRtp === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={rpmSteps.cleanRtp === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>Normalisasi RTP & Trim Spasi</span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    {rpmSteps.cleanRtp === 'done' ? 'Selesai' : rpmSteps.cleanRtp === 'processing' ? 'Cleansing...' : 'Menunggu'}
                                </span>
                            </div>

                            {/* 4. Auto XLOOKUP */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {rpmSteps.xlookup === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
                                    ) : rpmSteps.xlookup === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={rpmSteps.xlookup === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>Auto VLOOKUP dan XLOOKUP ke Master Data</span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    {rpmSteps.xlookup === 'done' ? 'Selesai' : rpmSteps.xlookup === 'processing' ? 'Matching...' : 'Menunggu'}
                                </span>
                            </div>

                            {/* 5. Deteksi Data Baru (#N/A) */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {rpmSteps.detectNa === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
                                    ) : rpmSteps.detectNa === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={rpmSteps.detectNa === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>Ekstraksi Khusus Data Baru (#N/A)</span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    {rpmSteps.detectNa === 'done' ? 'Selesai' : rpmSteps.detectNa === 'processing' ? 'Mengekstrak...' : 'Menunggu'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tombol Eksekusi Awal */}
            {previewData.length === 0 && (
                <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                    <button
                        type="submit"
                        disabled={!canWrite || !fileRpm || processingRpm}
                        className="w-full h-10 flex items-center justify-center gap-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                        {processingRpm ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Menjalankan Engine XLOOKUP dan VLOOKUP...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span>Jalankan Engine Tarikan RPM</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </form>
    );
}
import React from 'react';
import { 
    UploadCloud, 
    X, 
    FileSpreadsheet, 
    Activity, 
    AlertCircle, 
    ShieldCheck, 
    Loader2, 
    Sparkles,
    Check,
    Terminal
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useTabTarikanSmartkeyControl from './TabTarikanSmartkeyControl';

export default function TabTarikanSmartkey({ canWrite, control }) {
    const internalControl = useTabTarikanSmartkeyControl(canWrite);
    const {
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
        previewData = [],
        fileSmartkeyInputRef,
        handleProcessSmartkey,
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
            onSubmit={handleProcessSmartkey} 
            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700/80"
        >
            <div>
                {/* Header Modul */}
                <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Sinkronisasi IoT SmartKey
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Rekonsiliasi status gembok aktif dan koordinat geospasial.
                    </p>
                </div>

                {/* Konten Form */}
                <div className="p-5 sm:p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Berkas Lock History (.csv):
                        </label>
                        <input
                            ref={fileSmartkeyInputRef}
                            type="file"
                            accept=".csv,.txt"
                            disabled={!canWrite || processingSmartkey || previewData.length > 0}
                            onChange={(e) => setFileSmartkey(e.target.files[0] || null)}
                            className="hidden"
                        />
                        {!fileSmartkey && previewData.length === 0 ? (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files?.[0]) setFileSmartkey(e.dataTransfer.files[0]);
                                }}
                                onClick={() => canWrite && !processingSmartkey && fileSmartkeyInputRef.current?.click()}
                                className={`group relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer select-none ${
                                    isDragging
                                        ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                                        : 'border-slate-300/80 dark:border-slate-800 hover:border-emerald-500/60 hover:bg-slate-50/60 dark:hover:bg-slate-950/30'
                                } ${(!canWrite || processingSmartkey) ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="w-10 h-10 mx-auto mb-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Tarik berkas ke sini atau <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">pilih file</span>
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                                    Format CSV (Comma/Semicolon Delimited) dari portal gembok
                                </p>
                            </div>
                        ) : fileSmartkey ? (
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 animate-in fade-in">
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                    <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                        <FileSpreadsheet className="w-5 h-5" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {fileSmartkey.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            {formatFileSize(fileSmartkey.size)} — Siap diproses
                                        </p>
                                    </div>
                                </div>
                                {!processingSmartkey && previewData.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={clearFile}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        title="Hapus berkas terpilih"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Progress Bar */}
                    {processingSmartkey && (
                        <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 min-w-0">
                                    <Activity className="w-4 h-4 animate-spin shrink-0" />
                                    <span className="font-semibold truncate">{skStatusText}</span>
                                </div>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 ml-2 shrink-0">
                                    {skProgress}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-300 ease-out rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                                    style={{ width: `${skProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Error Alert */}
                    {skError && (
                        <Alert className="bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 py-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <AlertDescription className="text-xs font-medium ml-2">{skError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Kotak Hitam Konsol: Pipeline Status */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 shadow-inner space-y-3 font-mono">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-900">
                            <span className="flex items-center gap-1.5 font-bold text-slate-300">
                                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Status Pipeline Engine</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                                {processingSmartkey ? 'RUNNING' : previewData.length > 0 ? 'READY TO SAVE' : 'STANDBY'}
                            </span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {skSteps.read === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                            <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                    ) : skSteps.read === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={skSteps.read === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>
                                        Baca Log & Quote Parsing
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    {skSteps.read === 'done' ? 'Selesai' : skSteps.read === 'processing' ? 'Membaca...' : 'Siap'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {skSteps.matching === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                            <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                    ) : skSteps.matching === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={skSteps.matching === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>
                                        Matching Lock ID & Serial Number
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    {skSteps.matching === 'done' ? 'Selesai' : skSteps.matching === 'processing' ? 'Matching...' : 'Menunggu'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {skSteps.sync === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                            <Check className="w-3 h-3 stroke-[3]" />
                                        </div>
                                    ) : skSteps.sync === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={skSteps.sync === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>
                                        Sinkron Status Kunci & Long Lat
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                    {skSteps.sync === 'done' ? 'Selesai' : skSteps.sync === 'processing' ? 'Menyimpan...' : 'Menunggu'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            {previewData.length === 0 && (
                <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                    <button
                        type="submit"
                        disabled={!canWrite || !fileSmartkey || processingSmartkey}
                        className="w-full h-10 flex items-center justify-center gap-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                        {processingSmartkey ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Memproses Batch Telemetry...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span>Jalankan Engine SmartKey</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </form>
    );
}
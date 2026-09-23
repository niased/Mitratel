import React from 'react';
import { UploadCloud, X, FileText, Activity, AlertCircle, Loader2, Sparkles, Check, Terminal } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useTabTarikanTiaraControl from './TabTarikanTiaraControl';

export default function TabTarikanTiara({ canWrite, control }) {
    const internalControl = useTabTarikanTiaraControl(canWrite);
    const {
        fileTiara,
        setFileTiara,
        isDragging,
        setIsDragging,
        processingTiara,
        tiaraProgress,
        tiaraStatusText,
        tiaraError,
        tiaraSteps,
        previewData,
        fileTiaraInputRef,
        handleProcessTiara,
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
            onSubmit={handleProcessTiara}
            className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700/80"
        >
            <div>
                <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Auto-Engine Tarikan RPM (TIARA)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Pemrosesan log pekerjaan infrastruktur menara & sinkronisasi aset TIARA.
                    </p>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Berkas Tarikan RPM TIARA (.csv):
                        </label>
                        <input
                            ref={fileTiaraInputRef}
                            type="file"
                            accept=".csv,.txt"
                            disabled={!canWrite || processingTiara || previewData.length > 0}
                            onChange={(e) => setFileTiara(e.target.files[0] || null)}
                            className="hidden"
                        />
                        {!fileTiara && previewData.length === 0 ? (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files?.[0]) setFileTiara(e.dataTransfer.files[0]);
                                }}
                                onClick={() => canWrite && !processingTiara && fileTiaraInputRef.current?.click()}
                                className="group relative border-2 border-dashed border-slate-300/80 dark:border-slate-800 rounded-xl p-6 text-center transition-all cursor-pointer select-none hover:border-purple-500/60 hover:bg-slate-50/60 dark:hover:bg-slate-950/30"
                            >
                                <div className="w-10 h-10 mx-auto mb-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-transform group-hover:scale-110">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Tarik berkas ke sini atau <span className="text-purple-600 dark:text-purple-400 underline underline-offset-2">pilih file</span>
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                                    Mendukung format .csv atau .txt dari portal TIARA
                                </p>
                            </div>
                        ) : fileTiara ? (
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/25 animate-in fade-in">
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                    <div className="p-2 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {fileTiara.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            {formatFileSize(fileTiara.size)} • Siap diproses
                                        </p>
                                    </div>
                                </div>
                                {!processingTiara && previewData.length === 0 && (
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

                    {processingTiara && (
                        <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 min-w-0">
                                    <Activity className="w-4 h-4 animate-spin shrink-0" />
                                    <span className="font-semibold truncate">{tiaraStatusText}</span>
                                </div>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 ml-2 shrink-0">
                                    {tiaraProgress}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-600 transition-all duration-300 rounded-full" style={{ width: `${tiaraProgress}%` }} />
                            </div>
                        </div>
                    )}

                    {tiaraError && (
                        <Alert className="bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 py-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <AlertDescription className="text-xs font-medium ml-2">{tiaraError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Konsol Status Pipeline */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 shadow-inner space-y-3 font-mono">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-900">
                            <span className="flex items-center gap-1.5 font-bold text-slate-300">
                                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                                <span>Status Pipeline TIARA</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                                {processingTiara ? 'RUNNING' : previewData.length > 0 ? 'READY TO SAVE' : 'STANDBY'}
                            </span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {tiaraSteps.parse === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
                                    ) : tiaraSteps.parse === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={tiaraSteps.parse === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>CSV Quote-Aware Parsing</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    {tiaraSteps.xlookup === 'done' ? (
                                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Check className="w-3 h-3 stroke-[3]" /></div>
                                    ) : tiaraSteps.xlookup === 'processing' ? (
                                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                                    )}
                                    <span className={tiaraSteps.xlookup === 'done' ? 'text-slate-200 font-medium' : 'text-slate-400'}>XLOOKUP Master Data RPM (TIARA)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {previewData.length === 0 && (
                <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                    <button
                        type="submit"
                        disabled={!canWrite || !fileTiara || processingTiara}
                        className="w-full h-10 flex items-center justify-center gap-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                        {processingTiara ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Menjalankan Engine RPM (TIARA)...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span>Jalankan Engine Tarikan TIARA</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </form>
    );
}
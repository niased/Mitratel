import React, { useState, useRef, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import Icon from '@/components/Icon';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import TabTarikanRpm from './TabTarikanRpm';
import TabTarikanTiara from './TabTarikanTiara';
import TabTarikanSmartkey from './TabTarikanSmartkey';

import PreviewTableRpm from './PreviewTableRpm';
import PreviewTableTiara from './PreviewTableTiara';
import PreviewTableSmartkey from './PreviewTableSmartkey';

import useTabTarikanRpmControl from './TabTarikanRpmControl';
import useTabTarikanTiaraControl from './TabTarikanTiaraControl';
import useTabTarikanSmartkeyControl from './TabTarikanSmartkeyControl';

import { Toast } from '@/components/ui/Notifikasi';

export default function TabDataTarikan() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role || 'view';
    const canWrite = userRole === 'admin' || userRole === 'staff';

    const [engineRpmType, setEngineRpmType] = useState('ant');
    const [isRpmDropdownOpen, setIsRpmDropdownOpen] = useState(false);
    const rpmDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (rpmDropdownRef.current && !rpmDropdownRef.current.contains(event.target)) {
                setIsRpmDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const rpmControl = useTabTarikanRpmControl(canWrite);
    const tiaraControl = useTabTarikanTiaraControl(canWrite);
    const smartkeyControl = useTabTarikanSmartkeyControl(canWrite);

    return (
        <div className="space-y-6">
            {!canWrite && (
                <Alert className="bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 py-3 rounded-xl shadow-xs">
                    <Icon name="lock" size={16} fill="#F59E0B" />
                    <AlertDescription className="text-xs font-medium ml-2">
                        Akun Anda memiliki izin akses <strong>Viewer</strong>. Fitur eksekusi Engine Auto-Report hanya dapat dijalankan oleh <strong>Administrator</strong> atau <strong>Staff Operasional</strong>.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Engine Log RPM
                        </span>

                        <div className="relative" ref={rpmDropdownRef}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsRpmDropdownOpen(prev => !prev)}
                                className={`h-8 px-1 text-xs font-bold gap-2 border-0 shadow-none bg-transparent hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent transition-all ${
                                    engineRpmType === 'ant'
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-purple-600 dark:text-purple-400'
                                }`}
                            >
                                {engineRpmType === 'ant' ? (
                                    <>
                                        <Icon name="chart" size={14} fill="#3B82F6" />
                                        <span>RPM (ANT)</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="chart" size={14} fill="#A855F7" />
                                        <span>RPM (TIARA)</span>
                                    </>
                                )}

                                <Icon
                                    name="chevronDown"
                                    size={14}
                                    fill={engineRpmType === 'ant' ? '#3B82F6' : '#A855F7'}
                                    className={`transition-transform duration-200 ${
                                        isRpmDropdownOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </Button>

                            {isRpmDropdownOpen && (
                                <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEngineRpmType('ant');
                                            setIsRpmDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                                            engineRpmType === 'ant'
                                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon name="chart" size={14} fill="#3B82F6" />
                                            RPM (ANT)
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEngineRpmType('tiara');
                                            setIsRpmDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                                            engineRpmType === 'tiara'
                                                ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-bold'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon name="chart" size={14} fill="#A855F7" />
                                            RPM (TIARA)
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {engineRpmType === 'ant' ? (
                        <TabTarikanRpm
                            canWrite={canWrite}
                            control={rpmControl}
                        />
                    ) : (
                        <TabTarikanTiara
                            canWrite={canWrite}
                            control={tiaraControl}
                        />
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1 h-8">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Engine IoT SmartKey
                        </span>
                    </div>

                    <TabTarikanSmartkey
                        canWrite={canWrite}
                        control={smartkeyControl}
                    />
                </div>
            </div>

            {engineRpmType === 'ant' && !rpmControl.processingRpm && (
                <PreviewTableRpm
                    previewData={rpmControl.previewData}
                    isSavingMaster={rpmControl.isSavingMaster}
                    onConfirmSave={rpmControl.handleConfirmSaveMaster}
                    onCancel={rpmControl.handleCancelPreview}
                />
            )}

            {engineRpmType === 'tiara' && !tiaraControl.processingTiara && (
                <PreviewTableTiara
                    previewData={tiaraControl.previewData}
                    isSavingMaster={tiaraControl.isSavingMaster}
                    saveProgressPercent={tiaraControl.saveProgressPercent}
                    onConfirmSave={tiaraControl.handleConfirmSaveMaster}
                    onCancel={tiaraControl.handleCancelPreview}
                />
            )}

            {!smartkeyControl.processingSmartkey && (
                <PreviewTableSmartkey
                    previewData={smartkeyControl.previewData}
                    isSavingMaster={smartkeyControl.isSavingMaster}
                    onConfirmSave={smartkeyControl.handleConfirmSaveMaster}
                    onCancel={smartkeyControl.handleCancelPreview}
                />
            )}

            <Toast
                isOpen={tiaraControl.toast.isOpen}
                type={tiaraControl.toast.type}
                title={tiaraControl.toast.title}
                message={tiaraControl.toast.message}
                onClose={tiaraControl.closeToast}
            />
        </div>
    );
}
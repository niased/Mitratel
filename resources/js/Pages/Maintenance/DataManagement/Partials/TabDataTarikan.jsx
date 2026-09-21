import React from 'react';
import { usePage } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import TabTarikanRpm from './TabTarikanRpm';
import TabTarikanSmartkey from './TabTarikanSmartkey';
import PreviewTableRpm from './PreviewTableRpm';
import PreviewTableSmartkey from './PreviewTableSmartkey';

import useTabTarikanRpmControl from './TabTarikanRpmControl';
import useTabTarikanSmartkeyControl from './TabTarikanSmartkeyControl';

export default function TabDataTarikan() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role || 'view';
    const canWrite = userRole === 'admin' || userRole === 'staff';

    // Control Hooks
    const rpmControl = useTabTarikanRpmControl(canWrite);
    const smartkeyControl = useTabTarikanSmartkeyControl(canWrite);

    return (
        <div className="space-y-6">
            {!canWrite && (
                <Alert className="bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 py-3 rounded-xl shadow-xs">
                    <Lock className="w-4 h-4 shrink-0 text-amber-500" />
                    <AlertDescription className="text-xs font-medium ml-2">
                        Akun Anda memiliki izin akses <strong>Viewer</strong>. Fitur eksekusi Engine Auto-Report hanya dapat dijalankan oleh <strong>Administrator</strong> atau <strong>Staff Operasional</strong>.
                    </AlertDescription>
                </Alert>
            )}

            {/* Dua Kartu Engine Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <TabTarikanRpm canWrite={canWrite} control={rpmControl} />
                <TabTarikanSmartkey canWrite={canWrite} control={smartkeyControl} />
            </div>

            {/* Tabel Pratinjau RPM */}
            {!rpmControl.processingRpm && (
                <PreviewTableRpm
                    previewData={rpmControl.previewData}
                    isSavingMaster={rpmControl.isSavingMaster}
                    onConfirmSave={rpmControl.handleConfirmSaveMaster}
                    onCancel={rpmControl.handleCancelPreview}
                />
            )}

            {/* Tabel Pratinjau SmartKey */}
            {!smartkeyControl.processingSmartkey && (
                <PreviewTableSmartkey
                    previewData={smartkeyControl.previewData}
                    isSavingMaster={smartkeyControl.isSavingMaster}
                    onConfirmSave={smartkeyControl.handleConfirmSaveMaster}
                    onCancel={smartkeyControl.handleCancelPreview}
                />
            )}
        </div>
    );
}
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RotateCcw 
} from 'lucide-react';

export default function StatistikRpm({ summary = {} }) {
  // Extract Summary KPI
  const totalSite = summary.totalSite || summary.total_site || 0;
  const totalApproved = summary.totalApproved || summary.total_approved || 0;
  const rawPending = summary.totalPending || summary.total_pending || summary.totalBelum || summary.total_belum || 0;
  const rawTidakOm = summary.totalTidakOm || summary.total_tidak_om || 0;
  const totalPending = rawPending + rawTidakOm;
  const totalReject = summary.totalReject || summary.total_reject || 0;
  const totalReturn = summary.totalReturn || summary.total_return || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Site */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Site RPM</CardTitle>
          <Activity className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{totalSite.toLocaleString('id-ID')}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Unit terdaftar</p>
        </CardContent>
      </Card>

      {/* 2. Approved */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Approved</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 tracking-tight">{totalApproved.toLocaleString('id-ID')}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Dokumen disetujui</p>
        </CardContent>
      </Card>

      {/* 3. Pending */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Pending</CardTitle>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-500 tracking-tight">{totalPending.toLocaleString('id-ID')}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Belum/Tidak OM/Reviewed/Waiting/New</p>
        </CardContent>
      </Card>

      {/* 4. Reject */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Reject</CardTitle>
          <XCircle className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-500 tracking-tight">{totalReject.toLocaleString('id-ID')}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Dokumen ditolak</p>
        </CardContent>
      </Card>

      {/* 5. Return */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
          <CardTitle className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Return</CardTitle>
          <RotateCcw className="h-4 w-4 text-sky-500" />
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 tracking-tight">{totalReturn.toLocaleString('id-ID')}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Perlu perbaikan</p>
        </CardContent>
      </Card>
    </div>
  );
}
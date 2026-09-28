import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon 
} from 'lucide-react';
import { 
  ComposedChart, Bar, Line, PieChart, Pie, Cell, 
  LineChart, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList
} from 'recharts';

// Custom Tooltip untuk Composed Chart (Bar Volume + Line % OK)
const CustomComposedTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md text-white min-w-[170px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {data.fullMonth || data.name}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Bln {data.monthNum || ''}
          </span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
              <span className="text-slate-300 font-medium">Total Site</span>
            </div>
            <span className="font-bold text-slate-100">
              {(data.total || 0).toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-300 font-medium">% OK (Approved)</span>
            </div>
            <span className="font-bold text-emerald-400">
              {data.pctOk ?? 0}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip untuk Line Chart Persentase 4 Status
const CustomLinePercentTooltip = ({ active, payload, label, activeStatus }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md text-white min-w-[200px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Bulan: {data.fullMonth || label}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
             {(data.total || 0).toLocaleString('id-ID')} Site
          </span>
        </div>
        <div className="space-y-1.5 text-xs">
          {activeStatus.OK && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-300 font-medium">OK (Approved):</span>
              </div>
              <span className="font-bold text-emerald-400">
                {(data.OK || 0).toLocaleString('id-ID')} <span className="text-[10px] text-slate-400 font-normal">({data.pctOK}%)</span>
              </span>
            </div>
          )}
          {activeStatus.Belum && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-slate-300 font-medium">Belum (Pending):</span>
              </div>
              <span className="font-bold text-amber-400">
                {(data.Belum || 0).toLocaleString('id-ID')} <span className="text-[10px] text-slate-400 font-normal">({data.pctBelum}%)</span>
              </span>
            </div>
          )}
          {activeStatus.Reject && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-slate-300 font-medium">Reject:</span>
              </div>
              <span className="font-bold text-rose-400">
                {(data.Reject || 0).toLocaleString('id-ID')} <span className="text-[10px] text-slate-400 font-normal">({data.pctReject}%)</span>
              </span>
            </div>
          )}
          {activeStatus.Return && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                <span className="text-slate-300 font-medium">Return:</span>
              </div>
              <span className="font-bold text-sky-400">
                {(data.Return || 0).toLocaleString('id-ID')} <span className="text-[10px] text-slate-400 font-normal">({data.pctReturn}%)</span>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function GrafikRpm({ summary = {} }) {
  // State Filter Interaktif Legend 4 Status
  const [activeStatus, setActiveStatus] = useState({
    OK: true,
    Belum: true,
    Reject: true,
    Return: true,
  });

  const toggleStatus = (key) => {
    setActiveStatus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const totalSite = summary.totalSite || summary.total_site || 0;
  const totalApproved = summary.totalApproved || summary.total_approved || 0;
  const rawPending = summary.totalPending || summary.total_pending || summary.totalBelum || summary.total_belum || 0;
  const rawTidakOm = summary.totalTidakOm || summary.total_tidak_om || 0;
  const totalPending = rawPending + rawTidakOm;
  const totalReject = summary.totalReject || summary.total_reject || 0;
  const totalReturn = summary.totalReturn || summary.total_return || 0;

  // 1. Data Composed Chart
  const chartData = useMemo(() => {
    const rawChartData = summary.chartData || [];
    const monthlyPivot = summary.monthlyPivot || {};
    const monthPct = monthlyPivot.monthPct || [];
    const okCounts = monthlyPivot.counts?.OK || monthlyPivot.counts?.ok || [];

    return rawChartData.map((item, index) => {
      const ok = item.ok ?? okCounts[index] ?? 0;
      const pctOk = item.pctOk ?? monthPct[index] ?? (item.total > 0 ? Math.round((ok / item.total) * 100) : 0);
      
      return {
        ...item,
        ok,
        pctOk
      };
    });
  }, [summary.chartData, summary.monthlyPivot]);

  // 2. Data Donut Chart
  const donutData = useMemo(() => {
    const raw = [
      { name: 'Approved (OK)', value: totalApproved, color: '#10b981', badgeClass: 'bg-emerald-500' },
      { name: 'Pending (Belum)', value: totalPending, color: '#f59e0b', badgeClass: 'bg-amber-500' },
      { name: 'Reject', value: totalReject, color: '#f43f5e', badgeClass: 'bg-rose-500' },
      { name: 'Return', value: totalReturn, color: '#38bdf8', badgeClass: 'bg-sky-500' },
    ];
    return raw.map(item => ({
      ...item,
      pct: totalSite > 0 ? ((item.value / totalSite) * 100).toFixed(1) : '0.0'
    }));
  }, [totalApproved, totalPending, totalReject, totalReturn, totalSite]);

  // 3. Data Line Chart Persentase 4 Status Bulanan
  const linePersentaseData = useMemo(() => {
    const monthlyPivot = summary.monthlyPivot || {};
    const counts = monthlyPivot.counts || {};
    const chartData = summary.chartData || [];

    return chartData.map((item, idx) => {
      const ok = counts.OK?.[idx] ?? counts.ok?.[idx] ?? item.ok ?? 0;
      const belum = (counts.Belum?.[idx] ?? counts.belum?.[idx] ?? item.belum ?? 0) + 
                    (counts['Tidak OM']?.[idx] ?? counts.tidak_om?.[idx] ?? 0);
      const reject = counts.Reject?.[idx] ?? counts.reject?.[idx] ?? item.reject ?? 0;
      const returnVal = counts.Return?.[idx] ?? counts.return?.[idx] ?? item.return ?? 0;
      const total = ok + belum + reject + returnVal;

      return {
        name: item.name || `Bln ${idx + 1}`,
        fullMonth: item.fullMonth || item.name,
        total,
        OK: ok,
        Belum: belum,
        Reject: reject,
        Return: returnVal,
        pctOK: total > 0 ? Number(((ok / total) * 100).toFixed(1)) : 0,
        pctBelum: total > 0 ? Number(((belum / total) * 100).toFixed(1)) : 0,
        pctReject: total > 0 ? Number(((reject / total) * 100).toFixed(1)) : 0,
        pctReturn: total > 0 ? Number(((returnVal / total) * 100).toFixed(1)) : 0,
      };
    });
  }, [summary.chartData, summary.monthlyPivot]);

  // Skala Ticks Y Line Chart: 0, 25, 50, 75, 100
  const lineChartYConfig = useMemo(() => {
    if (activeStatus.OK) {
      return {
        domain: [0, 100],
        ticks: [0, 25, 50, 75, 100]
      };
    }
    let maxVal = 0;
    linePersentaseData.forEach(d => {
      if (activeStatus.Belum && d.pctBelum > maxVal) maxVal = d.pctBelum;
      if (activeStatus.Reject && d.pctReject > maxVal) maxVal = d.pctReject;
      if (activeStatus.Return && d.pctReturn > maxVal) maxVal = d.pctReturn;
    });
    if (maxVal === 0) return { domain: [0, 10], ticks: [0, 2.5, 5, 7.5, 10] };
    const upperLimit = Math.min(100, Math.ceil(maxVal * 1.3));
    return {
      domain: [0, upperLimit],
      ticks: [0, Math.round(upperLimit * 0.25), Math.round(upperLimit * 0.5), Math.round(upperLimit * 0.75), upperLimit]
    };
  }, [activeStatus, linePersentaseData]);

  const legendConfig = [
    { key: 'OK', label: '% OK (Approved)', color: 'bg-emerald-500', stroke: '#10b981' },
    { key: 'Belum', label: '% Belum (Pending)', color: 'bg-amber-500', stroke: '#f59e0b' },
    { key: 'Reject', label: '% Reject', color: 'bg-rose-500', stroke: '#f43f5e' },
    { key: 'Return', label: '% Return', color: 'bg-sky-500', stroke: '#38bdf8' },
  ];

  return (
    <div className="space-y-5">
      {/* SEKSI 1: COMPOSED CHART & DONUT CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* COMPOSED CHART BULANAN */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-600" />
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Grafik Volume & Persentase OK Bulanan
                </CardTitle>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-600" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Total Site</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500 rounded-full" />
                  <span className="text-slate-600 dark:text-slate-300 font-medium">% OK</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <div className="w-full h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 25 }}>
                  <CartesianGrid 
                    yAxisId="left"
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke="#94a3b8" 
                    opacity={0.35} 
                  />
                  
                  {/* SUMBU X: NAMA BULAN & TOTAL SITE DI BAWAHNYA */}
                  <XAxis 
                    dataKey="name" 
                    interval={0}
                    tickLine={false} 
                    axisLine={false} 
                    padding={{ left: 10, right: 10 }}
                    tick={({ x, y, payload }) => {
                      const item = chartData[payload.index] || chartData.find(d => d.name === payload.value);
                      const totalVal = item?.total ?? 0;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={0} y={0} dy={12} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={600}>
                            {payload.value}
                          </text>
                          <text x={0} y={0} dy={26} textAnchor="middle" fill="#e11d48" fontSize={10} fontWeight={800}>
                            {totalVal > 0 ? totalVal.toLocaleString('id-ID') : '-'}
                          </text>
                        </g>
                      );
                    }}
                  />
                  
                  <YAxis 
                    yAxisId="left" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                    tickCount={5}
                  />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} />
                  
                  <Tooltip cursor={{ fill: 'rgba(225, 29, 72, 0.05)' }} wrapperStyle={{ zIndex: 50, outline: 'none' }} content={<CustomComposedTooltip />} />
                  
                  <Bar yAxisId="left" dataKey="total" name="Total Site" barSize={32} radius={[5, 5, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.total > 0 ? '#e11d48' : '#94a3b8'} />
                    ))}
                  </Bar>

                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="pctOk" 
                    name="% Approved (OK)" 
                    stroke="#10b981" 
                    strokeWidth={2.8} 
                    dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#ffffff' }} 
                    activeDot={{ r: 6, strokeWidth: 2 }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* DONUT CHART */}
        <Card className="lg:col-span-1 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Distribusi Persentase Status
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 flex-1 flex flex-col justify-center items-center">
            <div className="relative w-full h-[180px] flex items-center justify-center">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center z-0">
                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">
                  {totalSite.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                  Total Site
                </span>
              </div>

              <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={58} outerRadius={78} paddingAngle={3} minAngle={6} dataKey="value" stroke="none">
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ zIndex: 50, outline: 'none' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', color: '#f8fafc', padding: '8px 12px' }} formatter={(value, name) => [`${value.toLocaleString('id-ID')} unit (${totalSite > 0 ? ((value/totalSite)*100).toFixed(1) : 0}%)`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              {donutData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.badgeClass}`} />
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">{item.name.split(' ')[0]}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 block leading-none">{item.value.toLocaleString('id-ID')}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">{item.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* =========================================================================
       * SEKSI 2: LINE CHART PERSENTASE (LEGENDA FILTER FLAT TANPA CARD/BORDER TEBAL)
       * ========================================================================= */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LineChartIcon className="w-4 h-4 text-emerald-500" />
              <div>
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Grafik Tren Persentase Status Bulanan (% Line Chart)
                </CardTitle>
              </div>
            </div>

            {/* 👉 LEGENDA FILTER FLAT (HANYA TITIK + TEKS TANPA KOTAK CARD) */}
            <div className="flex flex-wrap items-center gap-3">
              {legendConfig.map((item) => {
                const isActive = activeStatus[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleStatus(item.key)}
                    className={`flex items-center gap-1.5 text-xs transition-all duration-150 cursor-pointer select-none ${
                      isActive
                        ? 'text-slate-700 dark:text-slate-200 font-semibold opacity-100'
                        : 'text-slate-400 dark:text-slate-500 line-through opacity-40'
                    }`}
                    title={`Klik untuk ${isActive ? 'menyembunyikan' : 'menampilkan'} garis ${item.label}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${isActive ? item.color : 'bg-slate-400 dark:bg-slate-600'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="w-full h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={linePersentaseData} margin={{ top: 22, right: 15, left: -20, bottom: 65 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.25} />
                
                {/* SUMBU X DINAMIS: NAMA BULAN & ANGKA STATUS RATA KIRI */}
                <XAxis 
                  dataKey="name" 
                  interval={0}
                  tickLine={false} 
                  axisLine={false} 
                  padding={{ left: 10, right: 10 }}
                  tick={({ x, y, payload }) => {
                    const item = linePersentaseData[payload.index] || linePersentaseData.find(d => d.name === payload.value);
                    if (!item) return null;

                    const activeLines = [];
                    if (activeStatus.OK) activeLines.push({ key: 'OK', val: item.OK, pct: item.pctOK, color: '#10b981' });
                    if (activeStatus.Belum) activeLines.push({ key: 'Belum', val: item.Belum, pct: item.pctBelum, color: '#f59e0b' });
                    if (activeStatus.Reject) activeLines.push({ key: 'Reject', val: item.Reject, pct: item.pctReject, color: '#f43f5e' });
                    if (activeStatus.Return) activeLines.push({ key: 'Return', val: item.Return, pct: item.pctReturn, color: '#38bdf8' });

                    return (
                      <g transform={`translate(${x},${y})`}>
                        {/* Baris 1: Nama Bulan Tetap di Tengah Kolom */}
                        <text x={0} y={0} dy={12} textAnchor="middle" fill="#64748b" fontSize={11} fontWeight={700}>
                          {payload.value}
                        </text>
                        {/* Baris 2..N: Angka Rincian RATA KIRI */}
                        {activeLines.map((l, i) => (
                          <text 
                            key={l.key} 
                            x={-22} 
                            y={0} 
                            dy={25 + (i * 12)} 
                            textAnchor="start" 
                            fill={l.color} 
                            fontSize={8.5} 
                            fontWeight={800}
                          >
                            {`${(l.val || 0).toLocaleString('id-ID')} (${l.pct}%)`}
                          </text>
                        ))}
                      </g>
                    );
                  }}
                />

                {/* SUMBU Y DENGAN RANGE 0, 25, 50, 75, 100 */}
                <YAxis 
                  domain={lineChartYConfig.domain} 
                  ticks={lineChartYConfig.ticks} 
                  unit="%" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                />
                
                <Tooltip 
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} 
                  wrapperStyle={{ zIndex: 50, outline: 'none' }} 
                  content={<CustomLinePercentTooltip activeStatus={activeStatus} />} 
                />

                {/* 1. GARIS % OK */}
                {activeStatus.OK && (
                  <Line 
                    type="monotone" 
                    dataKey="pctOK" 
                    name="% OK" 
                    stroke="#10b981" 
                    strokeWidth={2.8} 
                    dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#ffffff' }} 
                    activeDot={{ r: 6, strokeWidth: 2 }} 
                  >
                    <LabelList 
                      dataKey="pctOK" 
                      position="top" 
                      offset={8} 
                      fill="#059669" 
                      fontSize={10} 
                      fontWeight={800} 
                      className="dark:fill-emerald-400"
                      formatter={(val) => (val > 0 ? `${val}%` : '')} 
                    />
                  </Line>
                )}

                {/* 2. GARIS % BELUM */}
                {activeStatus.Belum && (
                  <Line 
                    type="monotone" 
                    dataKey="pctBelum" 
                    name="% Belum" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5} 
                    dot={{ fill: '#f59e0b', r: 3.5, strokeWidth: 1.5, stroke: '#ffffff' }} 
                    activeDot={{ r: 5, strokeWidth: 2 }} 
                  >
                    <LabelList 
                      dataKey="pctBelum" 
                      position="top" 
                      offset={8} 
                      fill="#d97706" 
                      fontSize={10} 
                      fontWeight={800} 
                      className="dark:fill-amber-400"
                      formatter={(val) => (val > 0 ? `${val}%` : '')} 
                    />
                  </Line>
                )}

                {/* 3. GARIS % REJECT */}
                {activeStatus.Reject && (
                  <Line 
                    type="monotone" 
                    dataKey="pctReject" 
                    name="% Reject" 
                    stroke="#f43f5e" 
                    strokeWidth={2.5} 
                    dot={{ fill: '#f43f5e', r: 3.5, strokeWidth: 1.5, stroke: '#ffffff' }} 
                    activeDot={{ r: 5, strokeWidth: 2 }} 
                  >
                    <LabelList 
                      dataKey="pctReject" 
                      position="top" 
                      offset={8} 
                      fill="#e11d48" 
                      fontSize={10} 
                      fontWeight={800} 
                      className="dark:fill-rose-400"
                      formatter={(val) => (val > 0 ? `${val}%` : '')} 
                    />
                  </Line>
                )}

                {/* 4. GARIS % RETURN */}
                {activeStatus.Return && (
                  <Line 
                    type="monotone" 
                    dataKey="pctReturn" 
                    name="% Return" 
                    stroke="#38bdf8" 
                    strokeWidth={2.5} 
                    dot={{ fill: '#38bdf8', r: 3.5, strokeWidth: 1.5, stroke: '#ffffff' }} 
                    activeDot={{ r: 5, strokeWidth: 2 }} 
                  >
                    <LabelList 
                      dataKey="pctReturn" 
                      position="top" 
                      offset={8} 
                      fill="#0284c7" 
                      fontSize={10} 
                      fontWeight={800} 
                      className="dark:fill-sky-400"
                      formatter={(val) => (val > 0 ? `${val}%` : '')} 
                    />
                  </Line>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
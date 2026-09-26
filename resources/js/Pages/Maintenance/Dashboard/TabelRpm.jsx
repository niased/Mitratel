import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Calendar, LayoutList, Building2 } from 'lucide-react';

export default function TabelRpm({ monthlyPivot = {}, rtpPivot = [], regionalPivot = [] }) {
  const monthNumbers = Array.from({ length: 12 }, (_, i) => i + 1);

  // Helper agar nilai 0 / null / undefined diformat dengan aman
  const formatCell = (val, emptyAsDash = false) => {
    if (val === null || val === undefined || val === '') {
      return emptyAsDash ? '-' : '';
    }
    if (val === 0) {
      return emptyAsDash ? '-' : 0;
    }
    return typeof val === 'number' ? val.toLocaleString('id-ID') : val;
  };

  // --- DATA 1: PIVOT BULANAN ---
  const {
    counts = {},
    monthTotals = Array(12).fill(0),
    monthPct = Array(12).fill(0),
    rowTotals = {},
    overallTotal = 0,
    overallPct = 0
  } = monthlyPivot;

  const okCounts     = counts.OK || counts.ok || Array(12).fill(0);
  const rawBelum     = counts.BELUM || counts.belum || counts.Belum || Array(12).fill(0);
  const rawTidakOm   = counts.TIDAK_OM || counts.tidak_om || counts.tidakOm || Array(12).fill(0);
  const rejectCounts = counts.REJECT || counts.reject || counts.Reject || Array(12).fill(0);
  const returnCounts = counts.RETURN || counts.return || counts.Return || counts.returnVal || Array(12).fill(0);

  const belumCounts = rawBelum.map((val, idx) => (val || 0) + (rawTidakOm[idx] || 0));
  const okRowTotal     = rowTotals.OK ?? rowTotals.ok ?? 0;
  const belumRowTotal  = (rowTotals.BELUM ?? rowTotals.belum ?? 0) + (rowTotals.TIDAK_OM ?? rowTotals.tidak_om ?? rowTotals.tidakOm ?? 0);
  const rejectRowTotal = rowTotals.REJECT ?? rowTotals.reject ?? 0;
  const returnRowTotal = rowTotals.RETURN ?? rowTotals.return ?? rowTotals.returnVal ?? 0;

  // --- DATA 2: PIVOT REGIONAL BULANAN (PARSER ULTRA ROBUST) ---
  const processedRegionalRows = useMemo(() => {
    let rawList = [];

    if (Array.isArray(regionalPivot)) {
      rawList = regionalPivot;
    } else if (regionalPivot && typeof regionalPivot === 'object') {
      if (Array.isArray(regionalPivot.data)) {
        rawList = regionalPivot.data;
      } else if (Array.isArray(regionalPivot.rows)) {
        rawList = regionalPivot.rows;
      } else {
        // Parsing jika data dikirim dalam bentuk Object { "REG 12": [100, 200, ...], "REG 3": [...] }
        rawList = Object.keys(regionalPivot).map((key) => ({
          regional: key,
          counts: regionalPivot[key],
        }));
      }
    }

    if (rawList.length === 0) return [];

    return rawList.map((row) => {
      const regName = row.regional || row.reg || row.sitearea_reg || row.region || row.name || 'Unassigned';
      let monthCounts = Array(12).fill(0);

      const rawCounts = row.counts || row.months || row.values || row.monthly || row;

      if (Array.isArray(rawCounts)) {
        monthCounts = monthNumbers.map((m, idx) => Number(rawCounts[idx] || 0));
      } else if (rawCounts && typeof rawCounts === 'object') {
        monthCounts = monthNumbers.map((m) => {
          return Number(rawCounts[m] ?? rawCounts[`m${m}`] ?? rawCounts[`month_${m}`] ?? rawCounts[`bulan_${m}`] ?? 0);
        });
      }

      const total = row.total ?? row.GrandTotal ?? monthCounts.reduce((a, b) => a + b, 0);

      return {
        regional: regName,
        counts: monthCounts,
        total,
      };
    });
  }, [regionalPivot]);

  const grandTotalRegional = useMemo(() => {
    const monthSums = Array(12).fill(0);
    let overall = 0;

    processedRegionalRows.forEach((row) => {
      row.counts.forEach((val, idx) => {
        monthSums[idx] += val;
      });
      overall += row.total;
    });

    return { monthSums, overall };
  }, [processedRegionalRows]);

  // --- DATA 3: PIVOT RTP ---
  const grandTotalRtpRow = useMemo(() => {
    let ok = 0, belum = 0, reject = 0, returnVal = 0, total = 0;
    
    rtpPivot.forEach(row => {
      const rOk     = row.ok ?? row.OK ?? 0;
      const rBelum  = (row.belum ?? row.BELUM ?? 0) + (row.tidak_om ?? row.tidakOm ?? row.TIDAK_OM ?? 0);
      const rReject = row.reject ?? row.REJECT ?? 0;
      const rReturn = row.returnVal ?? row.return ?? row.RETURN ?? row.return_val ?? 0;
      const rTotal  = row.total ?? row.TOTAL ?? (rOk + rBelum + rReject + rReturn);
      ok += rOk;
      belum += rBelum;
      reject += rReject;
      returnVal += rReturn;
      total += rTotal;
    });
    const pct = total > 0 ? Math.round((ok / total) * 100) : 0;
    return { ok, belum, reject, returnVal, total, pct };
  }, [rtpPivot]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      
      {/* KOLOM KIRI: STATUS PER BULAN & REGIONAL PER BULAN (STACKED) */}
      <div className="space-y-4 w-full">
        
        {/* 1. TABEL PIVOT STATUS PER BULAN */}
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tabel Pivot Status per Bulan
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full no-scrollbar overflow-x-auto">
              <Table className="w-full text-center border-collapse">
                <TableHeader className="bg-slate-100 dark:bg-slate-950/90">
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead rowSpan={2} className="text-[9px] font-bold text-slate-700 dark:text-slate-200 px-1 py-1 border-r border-slate-200 dark:border-slate-800/80 align-middle text-center w-[15%]">
                      Row Labels
                    </TableHead>
                    <TableHead colSpan={12} className="text-[9px] font-bold text-center text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80 py-0.5 border-b border-slate-200 dark:border-slate-800">
                      Bulan
                    </TableHead>
                    <TableHead rowSpan={2} className="text-[9px] font-bold text-center text-slate-700 dark:text-slate-200 align-middle px-1 py-1 w-[12%]">
                      Grand Total
                    </TableHead>
                  </TableRow>
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    {monthNumbers.map(m => (
                      <TableHead key={m} className="text-[9px] font-semibold text-center text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/40 px-0 py-0.5">
                        {m}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* BARIS OK */}
                  <TableRow className="border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400 text-[9px] text-center px-0.5 py-1 border-r border-slate-100 dark:border-slate-800/30">OK</TableCell>
                    {monthNumbers.map((m, idx) => (
                      <TableCell key={m} className="text-center text-emerald-600 dark:text-emerald-400 text-[9px] px-0 py-1 border-r border-slate-100 dark:border-slate-800/30">
                        {formatCell(okCounts[idx])}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-400 text-[9px] px-0.5 py-1">{formatCell(okRowTotal)}</TableCell>
                  </TableRow>
                  {/* BARIS BELUM */}
                  <TableRow className="border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <TableCell className="font-semibold text-amber-600 dark:text-amber-400 text-[9px] text-center px-0.5 py-1 border-r border-slate-100 dark:border-slate-800/30">Belum</TableCell>
                    {monthNumbers.map((m, idx) => (
                      <TableCell key={m} className="text-center text-amber-600 dark:text-amber-400 text-[9px] px-0 py-1 border-r border-slate-100 dark:border-slate-800/30">
                        {formatCell(belumCounts[idx])}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-amber-600 dark:text-amber-400 text-[9px] px-0.5 py-1">{formatCell(belumRowTotal)}</TableCell>
                  </TableRow>
                  {/* BARIS REJECT */}
                  <TableRow className="border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <TableCell className="font-semibold text-rose-600 dark:text-rose-400 text-[9px] text-center px-0.5 py-1 border-r border-slate-100 dark:border-slate-800/30">Reject</TableCell>
                    {monthNumbers.map((m, idx) => (
                      <TableCell key={m} className="text-center text-rose-600 dark:text-rose-400 text-[9px] px-0 py-1 border-r border-slate-100 dark:border-slate-800/30">
                        {formatCell(rejectCounts[idx])}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-rose-600 dark:text-rose-400 text-[9px] px-0.5 py-1">{formatCell(rejectRowTotal)}</TableCell>
                  </TableRow>
                  {/* BARIS RETURN */}
                  <TableRow className="border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <TableCell className="font-semibold text-sky-600 dark:text-sky-400 text-[9px] text-center px-0.5 py-1 border-r border-slate-100 dark:border-slate-800/30">Return</TableCell>
                    {monthNumbers.map((m, idx) => (
                      <TableCell key={m} className="text-center text-sky-600 dark:text-sky-400 text-[9px] px-0 py-1 border-r border-slate-100 dark:border-slate-800/30">
                        {formatCell(returnCounts[idx])}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold text-sky-600 dark:text-sky-400 text-[9px] px-0.5 py-1">{formatCell(returnRowTotal)}</TableCell>
                  </TableRow>
                </TableBody>
                <TableFooter className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                  {/* GRAND TOTAL */}
                  <TableRow>
                    <TableCell className="text-[9px] font-bold text-slate-800 dark:text-slate-100 text-center px-0.5 py-1 border-r border-slate-200 dark:border-slate-800">Grand Total</TableCell>
                    {monthNumbers.map((m, idx) => (
                      <TableCell key={m} className="text-center text-[9px] font-bold text-slate-800 dark:text-slate-100 px-0 py-1 border-r border-slate-200 dark:border-slate-800">
                        {formatCell(monthTotals[idx])}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-[9px] font-bold text-slate-800 dark:text-slate-100 px-0.5 py-1">{formatCell(overallTotal)}</TableCell>
                  </TableRow>
                  {/* PERSENTASE OK */}
                  <TableRow className="border-t border-slate-200 dark:border-slate-800/80">
                    <TableCell className="text-[9px] font-bold text-slate-800 dark:text-slate-100 text-center px-0.5 py-1 border-r border-slate-200 dark:border-slate-800">Persentase OK</TableCell>
                    {monthNumbers.map((m, idx) => (
                      <TableCell key={m} className="text-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400 px-0 py-1 border-r border-slate-200 dark:border-slate-800">
                        {monthTotals[idx] > 0 ? `${monthPct[idx]}%` : '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400 px-0.5 py-1">
                      {overallTotal > 0 ? `${overallPct}%` : '-'}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 2. TABEL PIVOT REGIONAL PER BULAN */}
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-rose-500" />
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tabel Pivot Regional (Bulanan)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full no-scrollbar overflow-x-auto">
              <Table className="w-full text-center border-collapse">
                <TableHeader className="bg-slate-100 dark:bg-slate-950/90">
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead rowSpan={2} className="text-[9px] font-bold text-slate-700 dark:text-slate-200 px-1 py-1 border-r border-slate-200 dark:border-slate-800/80 align-middle text-left pl-3 w-[18%]">
                      Row Labels
                    </TableHead>
                    <TableHead colSpan={12} className="text-[9px] font-bold text-center text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80 py-0.5 border-b border-slate-200 dark:border-slate-800">
                      Bulan
                    </TableHead>
                    <TableHead rowSpan={2} className="text-[9px] font-bold text-center text-slate-700 dark:text-slate-200 align-middle px-1 py-1 w-[12%]">
                      Grand Total
                    </TableHead>
                  </TableRow>
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    {monthNumbers.map(m => (
                      <TableHead key={m} className="text-[9px] font-semibold text-center text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800/40 px-0 py-0.5">
                        {m}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRegionalRows.length > 0 ? (
                    processedRegionalRows.map((row, rIdx) => (
                      <TableRow key={row.regional || rIdx} className="border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200 text-[9px] text-left pl-3 py-1.5 border-r border-slate-100 dark:border-slate-800/30 truncate max-w-[100px]">
                          {row.regional}
                        </TableCell>
                        {monthNumbers.map((m, idx) => (
                          <TableCell key={m} className="text-center text-slate-700 dark:text-slate-300 text-[9px] px-0 py-1.5 border-r border-slate-100 dark:border-slate-800/30">
                            {formatCell(row.counts[idx], true)}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-bold text-slate-900 dark:text-slate-100 text-[9px] px-0.5 py-1.5">
                          {formatCell(row.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-6 text-xs text-slate-400">
                        Tidak ada data Regional tersedia
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                  <TableRow>
                    <TableCell className="text-[9px] font-bold text-slate-800 dark:text-slate-100 text-left pl-3 py-1.5 border-r border-slate-200 dark:border-slate-800">
                      Grand Total
                    </TableCell>
                    {monthNumbers.map((m, idx) => (
                      <TableCell key={m} className="text-center text-[9px] font-bold text-slate-800 dark:text-slate-100 px-0 py-1.5 border-r border-slate-200 dark:border-slate-800">
                        {formatCell(grandTotalRegional.monthSums[idx])}
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-[9px] font-bold text-slate-900 dark:text-slate-100 px-0.5 py-1.5">
                      {formatCell(grandTotalRegional.overall)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* KOLOM KANAN: TABEL PIVOT STATUS PER RTP */}
      <div className="w-full">
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2">
              <LayoutList className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tabel Pivot Status per RTP
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto no-scrollbar">
              <Table className="w-full text-center border-collapse">
                <TableHeader className="bg-slate-100 dark:bg-slate-950/90">
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold text-slate-700 dark:text-slate-200 px-3 py-2 text-left">RTP / Region</TableHead>
                    <TableHead className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-2">OK</TableHead>
                    <TableHead className="text-[10px] font-bold text-amber-600 dark:text-amber-400 px-2 py-2">Belum</TableHead>
                    <TableHead className="text-[10px] font-bold text-rose-600 dark:text-rose-400 px-2 py-2">Reject</TableHead>
                    <TableHead className="text-[10px] font-bold text-sky-600 dark:text-sky-400 px-2 py-2">Return</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-700 dark:text-slate-200 px-2 py-2">Grand Total</TableHead>
                    <TableHead className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-2">Persentase OK</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rtpPivot.length > 0 ? (
                    rtpPivot.map((row, idx) => {
                      const rOk        = row.ok ?? row.OK ?? 0;
                      const totalBelum = (row.belum ?? row.BELUM ?? 0) + (row.tidak_om ?? row.tidakOm ?? row.TIDAK_OM ?? 0);
                      const rReject    = row.reject ?? row.REJECT ?? 0;
                      const rReturn    = row.returnVal ?? row.return ?? row.RETURN ?? row.return_val ?? 0;
                      const rTotal     = row.total ?? row.TOTAL ?? (rOk + totalBelum + rReject + rReturn);
                      const rPct       = row.pct ?? (rTotal > 0 ? Math.round((rOk / rTotal) * 100) : 0);
                      return (
                        <TableRow key={row.rtp || idx} className="border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20 text-[10px]">
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-200 text-left px-3 py-1.5">{row.rtp}</TableCell>
                          <TableCell className="text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1.5">{formatCell(rOk, true)}</TableCell>
                          <TableCell className="text-amber-600 dark:text-amber-400 font-medium px-2 py-1.5">{formatCell(totalBelum, true)}</TableCell>
                          <TableCell className="text-rose-600 dark:text-rose-400 font-medium px-2 py-1.5">{formatCell(rReject, true)}</TableCell>
                          <TableCell className="text-sky-600 dark:text-sky-400 font-medium px-2 py-1.5">{formatCell(rReturn, true)}</TableCell>
                          <TableCell className="font-bold text-slate-800 dark:text-slate-100 px-2 py-1.5">{formatCell(rTotal)}</TableCell>
                          <TableCell className="font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1.5">{rPct}%</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-xs text-slate-400">
                        Tidak ada data RTP tersedia
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-[10px]">
                  <TableRow>
                    <TableCell className="text-left font-bold text-slate-800 dark:text-slate-100 px-3 py-2">Grand Total</TableCell>
                    <TableCell className="text-emerald-600 dark:text-emerald-400 px-2 py-2">{formatCell(grandTotalRtpRow.ok)}</TableCell>
                    <TableCell className="text-amber-600 dark:text-amber-400 px-2 py-2">{formatCell(grandTotalRtpRow.belum)}</TableCell>
                    <TableCell className="text-rose-600 dark:text-rose-400 px-2 py-2">{formatCell(grandTotalRtpRow.reject)}</TableCell>
                    <TableCell className="text-sky-600 dark:text-sky-400 px-2 py-2">{formatCell(grandTotalRtpRow.returnVal)}</TableCell>
                    <TableCell className="text-slate-800 dark:text-slate-100 px-2 py-2">{formatCell(grandTotalRtpRow.total)}</TableCell>
                    <TableCell className="text-emerald-600 dark:text-emerald-400 px-2 py-2">{grandTotalRtpRow.pct}%</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
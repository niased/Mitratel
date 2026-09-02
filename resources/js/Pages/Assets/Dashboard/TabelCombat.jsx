import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    TableProperties, 
    Clock, 
    AlertTriangle, 
    Building2, 
    MapPin, 
    Search, 
    ChevronLeft, 
    ChevronRight 
} from 'lucide-react';

// HELPER: Parse tanggal format Indonesia (Mendukung DD/MM/YYYY, DD-Mon, YYYY-MM-DD)
const parseIndonesianDate = (dateStr) => {
    if (!dateStr || dateStr === '-' || dateStr === 'N/A' || dateStr === 'Belum Kembali' || dateStr === 'null' || dateStr === '?') {
        return null;
    }
    if (dateStr instanceof Date) return dateStr;
    
    // Bersihkan karakter escaped slash seperti "21\/12\/2024"
    let str = String(dateStr).trim().replace(/\\/g, '');

    // 1. Format DD/MM/YYYY atau DD-MM-YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (ddmmyyyy) {
        let year = parseInt(ddmmyyyy[3], 10);
        if (year < 100) year += 2000;
        return new Date(year, parseInt(ddmmyyyy[2], 10) - 1, parseInt(ddmmyyyy[1], 10));
    }

    // 2. Format DD-Mon atau DD-Mon-YYYY (contoh: 13-Jul, 25-Jan-26)
    const monthMap = {
        jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
        jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
    };
    const ddMon = str.match(/^(\d{1,2})[\s\/\-]([a-zA-Z]{3,})([\s\/\-](\d{2,4}))?/);
    if (ddMon) {
        const day = parseInt(ddMon[1], 10);
        const monStr = ddMon[2].toLowerCase().slice(0, 3);
        const month = monthMap[monStr] ?? 0;
        let year = ddMon[4] ? parseInt(ddMon[4], 10) : new Date().getFullYear();
        if (year < 100) year += 2000;
        return new Date(year, month, day);
    }

    // 3. Format YYYY-MM-DD
    const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmdd) {
        return new Date(parseInt(yyyymmdd[1], 10), parseInt(yyyymmdd[2], 10) - 1, parseInt(yyyymmdd[3], 10));
    }

    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
};

export default function TabelCombat({ tableData = [] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const rawData = useMemo(() => {
        if (Array.isArray(tableData)) return tableData;
        if (tableData && Array.isArray(tableData.data)) return tableData.data;
        return [];
    }, [tableData]);

    const getValueByPattern = (item, regexPatterns) => {
        if (!item || typeof item !== 'object') return null;
        const keys = Object.keys(item);
        for (const pattern of regexPatterns) {
            const foundKey = keys.find(k => pattern.test(k.trim()));
            if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null) {
                const val = String(item[foundKey]).trim();
                if (val !== '') return val;
            }
        }
        return null;
    };

    const normalizeStatusLabel = (rawVal) => {
        if (!rawVal) return 'Unassigned';
        const str = String(rawVal).toUpperCase().trim();
        if (str.includes('ONSITE') || str.startsWith('2.')) return 'On-Site';
        if (str.includes('READY') || str.startsWith('5.')) return 'Ready To Use';
        if (str.includes('BROKEN') || str.includes('INOP') || str.startsWith('6.')) return 'Broken / Inop';
        return 'Unassigned';
    };

    const getHeight = (item) => {
        const val = item.ketinggian_combat || item.ketinggian || getValueByPattern(item, [/ketinggian[\s_]*combat/i, /ketinggian/i]);
        if (!val) return 'N/A';
        let str = String(val).trim();
        if (str === '' || str.toUpperCase() === 'NULL') return 'N/A';
        if (!str.toUpperCase().endsWith('M') && !isNaN(parseFloat(str))) {
            str = `${parseFloat(str)} M`;
        }
        return str;
    };

    const getStatus = (item) => {
        const val = item.status_combat || item.status || getValueByPattern(item, [/status[\s_]*combat/i, /^status$/i]);
        return normalizeStatusLabel(val);
    };

    const STATUS_ORDER = ['On-Site', 'Ready To Use', 'Broken / Inop', 'Unassigned'];

    // 1. PIVOT TABLE STATUS BERDASARKAN KETINGGIAN
    const pivotKetinggian = useMemo(() => {
        if (!rawData.length) return { cols: [], rows: [], grandTotals: {}, totalAll: 0 };

        const colSet = new Set();
        rawData.forEach((item) => {
            colSet.add(getHeight(item));
        });

        const cols = Array.from(colSet).sort((a, b) => {
            if (a === 'N/A') return -1;
            if (b === 'N/A') return 1;
            return (parseFloat(a) || 0) - (parseFloat(b) || 0);
        });

        const rowGroup = {};
        rawData.forEach((item) => {
            const status = getStatus(item);
            const height = getHeight(item);
            if (!rowGroup[status]) rowGroup[status] = { status, counts: {}, rowTotal: 0 };
            rowGroup[status].counts[height] = (rowGroup[status].counts[height] || 0) + 1;
            rowGroup[status].rowTotal += 1;
        });

        const grandTotals = {};
        cols.forEach((col) => {
            grandTotals[col] = Object.values(rowGroup).reduce((acc, curr) => acc + (curr.counts[col] || 0), 0);
        });

        const rows = Object.values(rowGroup).sort((a, b) => {
            const idxA = STATUS_ORDER.indexOf(a.status);
            const idxB = STATUS_ORDER.indexOf(b.status);
            return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
        });

        return { cols, rows, grandTotals, totalAll: rawData.length };
    }, [rawData]);

    // 2. TABEL INSIGHT DURASI
    const allUsageInsight = useMemo(() => {
        if (!rawData.length) return [];
        const now = new Date();

        const calculated = rawData.map((item) => {
            const tglAmbilRaw = item.tanggal_ambil || getValueByPattern(item, [/tanggal[\s_]*ambil/i, /tgl[\s_]*ambil/i, /tanggal[\s_]*deploy/i]);
            const tglKembaliRaw = item.tanggal_kembali || getValueByPattern(item, [/tanggal[\s_]*kembali/i, /tgl[\s_]*kembali/i]);

            // Fallback nama site agar tidak muncul tanda "-" saja
            const rawSite = (item.nama_site || getValueByPattern(item, [/nama[\s_]*site/i]) || '').trim();
            const rawAsset = (item.asset_name || getValueByPattern(item, [/asset[\s_]*name/i]) || '').trim();
            const siteName = (rawSite && rawSite !== '-' && rawSite !== '?') 
                ? rawSite 
                : (rawAsset && rawAsset !== '-' ? rawAsset : 'Unit COMBAT');

            const type = item.type_combat || getValueByPattern(item, [/type[\s_]*combat/i, /tipe[\s_]*combat/i]) || '-';
            const status = getStatus(item);

            const startDate = parseIndonesianDate(tglAmbilRaw);
            const endDate = parseIndonesianDate(tglKembaliRaw);

            const hasAmbil = !!startDate;
            const hasKembali = !!endDate;

            let locationCategory = 'On-Site';
            if (hasKembali) {
                locationCategory = 'Gudang (WH)';
            } else if (status === 'Broken / Inop') {
                locationCategory = 'Repair / INOP';
            } else {
                locationCategory = 'On-Site';
            }

            // Hitung Hari Mengendap
            let targetDate = null;
            if (endDate) {
                targetDate = endDate;
            } else if (startDate) {
                targetDate = startDate;
            }

            let days = null;
            if (targetDate) {
                const diffTime = now.getTime() - targetDate.getTime();
                days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
            }

            return {
                id: item.id || Math.random(),
                siteName,
                type,
                sn: item.sn || item.serial_number || item.sn_combat || '-',
                tglAmbil: hasAmbil ? String(tglAmbilRaw).replace(/\\/g, '') : '-',
                tglKembali: hasKembali ? String(tglKembaliRaw).replace(/\\/g, '') : '-',
                status,
                locationCategory,
                durationDays: days,
            };
        });

        return calculated.sort((a, b) => (b.durationDays ?? -1) - (a.durationDays ?? -1));
    }, [rawData]);

    const uniqueTypes = useMemo(() => {
        const types = new Set(allUsageInsight.map(item => item.type).filter(t => t && t !== '-'));
        return ['ALL', ...Array.from(types)];
    }, [allUsageInsight]);

    const filteredUsageInsight = useMemo(() => {
        return allUsageInsight.filter((item) => {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = (item.siteName || '').toLowerCase().includes(searchLower) ||
                              (item.sn || '').toLowerCase().includes(searchLower) ||
                              (item.type || '').toLowerCase().includes(searchLower);
            const typeMatch = selectedTypeFilter === 'ALL' || item.type === selectedTypeFilter;
            return nameMatch && typeMatch;
        });
    }, [allUsageInsight, searchTerm, selectedTypeFilter]);

    const totalPages = Math.ceil(filteredUsageInsight.length / itemsPerPage) || 1;
    const paginatedUsageInsight = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredUsageInsight.slice(start, start + itemsPerPage);
    }, [filteredUsageInsight, currentPage, itemsPerPage]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
            {/* TABEL STATUS BERDASARKAN KETINGGIAN */}
            <Card className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-sm flex flex-col overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <TableProperties className="w-4 h-4 text-red-600" />
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Tabel Status COMBAT Berdasarkan Ketinggian
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                    <Table className="w-full text-xs border-collapse">
                        <TableHeader className="bg-slate-100/90 dark:bg-slate-950/90">
                            <TableRow className="border-slate-200 dark:border-slate-800">
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 py-2.5 px-3">
                                    Status COMBAT
                                </TableHead>
                                {pivotKetinggian.cols.map((col) => (
                                    <TableHead key={col} className="font-bold text-center text-slate-700 dark:text-slate-200 py-2.5 px-2 whitespace-nowrap">
                                        {col}
                                    </TableHead>
                                ))}
                                <TableHead className="font-bold text-center text-slate-900 dark:text-white py-2.5 px-3 bg-slate-200/40 dark:bg-slate-800/40">
                                    Total
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pivotKetinggian.rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={pivotKetinggian.cols.length + 2} className="text-center py-6 text-slate-400">
                                        Tidak ada data terdeteksi
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pivotKetinggian.rows.map((row, idx) => (
                                    <TableRow key={idx} className="border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200 py-2 px-3">
                                            {row.status}
                                        </TableCell>
                                        {pivotKetinggian.cols.map((col) => {
                                            const val = row.counts[col] || 0;
                                            return (
                                                <TableCell key={col} className={`text-center py-2 px-2 ${val > 0 ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'}`}>
                                                    {val > 0 ? val : '-'}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="text-center font-bold text-red-600 dark:text-red-400 py-2 px-3 bg-slate-100/30 dark:bg-slate-800/20">
                                            {row.rowTotal}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-700 font-bold">
                            <TableRow>
                                <TableCell className="py-2.5 px-3 uppercase text-slate-800 dark:text-slate-100">Grand Total</TableCell>
                                {pivotKetinggian.cols.map((col) => (
                                    <TableCell key={col} className="text-center py-2.5 px-2 text-slate-800 dark:text-slate-100">
                                        {pivotKetinggian.grandTotals[col] || 0}
                                    </TableCell>
                                ))}
                                <TableCell className="text-center py-2.5 px-3 text-red-600 dark:text-red-400 text-xs">
                                    {pivotKetinggian.totalAll}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            {/* TABEL INSIGHT DURASI DEPLOYMENT */}
            <Card className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-sm flex flex-col overflow-hidden">
                <CardHeader className="pb-3 pt-3 px-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                            Insight Durasi
                        </CardTitle>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Cari Site / SN..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-8 pr-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 h-8 w-28 sm:w-36"
                            />
                        </div>
                        <Select 
                            value={selectedTypeFilter} 
                            onValueChange={(val) => {
                                setSelectedTypeFilter(val);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 text-xs w-[130px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                                <SelectValue placeholder="Tipe COMBAT" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                {uniqueTypes.map((t) => (
                                    <SelectItem key={t} value={t} className="text-xs">
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col justify-between">
                    <Table className="w-full text-xs border-collapse">
                        <TableHeader className="bg-slate-100/90 dark:bg-slate-950/90">
                            <TableRow className="border-slate-200 dark:border-slate-800">
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 py-2.5 px-3">
                                    Nama Site / Asset
                                </TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 py-2.5 px-2">
                                    Status
                                </TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-200 py-2.5 px-2">
                                    Tanggal
                                </TableHead>
                                <TableHead className="font-bold text-center text-slate-700 dark:text-slate-200 py-2.5 px-2">
                                    Durasi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedUsageInsight.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                                        Tidak ada data yang cocok
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedUsageInsight.map((row) => (
                                    <TableRow key={row.id} className="border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <TableCell className="py-2 px-3">
                                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                                                {row.siteName}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                {row.type} | SN: {row.sn}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2 px-2">
                                            {row.locationCategory === 'On-Site' ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                    <MapPin className="w-2.5 h-2.5" /> On-Site
                                                </span>
                                            ) : row.locationCategory === 'Gudang (WH)' ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                                    <Building2 className="w-2.5 h-2.5" /> Gudang
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> Repair
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 px-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            <div className="text-[11px] text-slate-700 dark:text-slate-300">
                                                <span className="text-slate-400 text-[9px] uppercase">A:</span> {row.tglAmbil}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                <span className="text-slate-500 text-[9px] uppercase">K:</span> {row.tglKembali}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2 px-2 text-center">
                                            {row.durationDays !== null && row.durationDays !== undefined ? (
                                                <span className={`inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                                                    row.durationDays > 90 
                                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                }`}>
                                                    {row.durationDays > 90 && <AlertTriangle className="w-3 h-3" />}
                                                    {row.durationDays} Hari
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-600 text-[11px]">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex items-center justify-between p-2.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/20 text-[11px] text-slate-400">
                        <span>
                            {filteredUsageInsight.length} asset terdeteksi
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-1.5 font-medium text-slate-700 dark:text-slate-200">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from 'lucide-react';

export default function Tabel({
    data = [],
    columns = [],
    selectedIds = [],
    onSelectAll,
    onSelectRow,
    onEditRow,
    getItemId = (item) => item?.id,
    getRowNumber,
    isProcessing = false,
    emptyMessage = "Belum ada data.",
    showCheckbox = true,
    selectable = true,
    showAction = true,
}) {
    // Otomatis sembunyikan kolom aksi jika tidak ada seleksi dan tidak ada tombol edit
    const hasSelection = Boolean(showCheckbox && selectable && (onSelectRow || onSelectAll));
    const hasRowAction = Boolean(showAction && onEditRow);
    const hasActionCol = hasSelection || hasRowAction;

    const isAllSelected = data.length > 0 && data.every(item => selectedIds.includes(getItemId(item)));

    return (
        <div className="relative overflow-x-auto rounded-b-xl border border-slate-200 dark:border-slate-800">
            {/* OVERLAY LOADING */}
            {isProcessing && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] z-30 flex items-center justify-center">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Memuat data...</span>
                    </div>
                </div>
            )}

            <Table>
                <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80">
                    <TableRow>
                        {/* KOLOM AKSI & CHECKBOX */}
                        {hasActionCol && (
                            <TableHead className="w-20 text-center sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-center gap-2">
                                    {hasSelection && (
                                        <Checkbox checked={isAllSelected} onCheckedChange={onSelectAll} />
                                    )}
                                    <span>Aksi</span>
                                </div>
                            </TableHead>
                        )}

                        {/* KOLOM NOMOR */}
                        <TableHead className="w-12 text-center">No</TableHead>

                        {/* KOLOM DINAMIS */}
                        {columns.map((col) => (
                            <TableHead key={col.key} className="font-semibold text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                {col.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.length > 0 ? (
                        data.map((item, index) => {
                            const itemId = getItemId(item) || `row-${index}`;
                            const isSelected = selectedIds.includes(itemId);

                            return (
                                <TableRow key={itemId} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    {/* CELL AKSI & CHECKBOX */}
                                    {hasActionCol && (
                                        <TableCell className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-100/90 dark:group-hover:bg-slate-800/90 border-r border-slate-200 dark:border-slate-800 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {hasSelection && (
                                                    <Checkbox checked={isSelected} onCheckedChange={() => onSelectRow?.(itemId)} />
                                                )}
                                                
                                                {hasRowAction && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                                        onClick={() => onEditRow(item)}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* CELL NOMOR */}
                                    <TableCell className="font-mono text-xs text-slate-400 text-center font-bold">
                                        {getRowNumber ? getRowNumber(index) : index + 1}
                                    </TableCell>

                                    {/* CELL ISI DATA */}
                                    {columns.map((col) => (
                                        <React.Fragment key={col.key}>
                                            {col.render ? (
                                                <TableCell className="whitespace-nowrap">
                                                    {col.render(item)}
                                                </TableCell>
                                            ) : (
                                                <TableCell className="whitespace-nowrap">
                                                    {item[col.key] !== undefined && item[col.key] !== null ? String(item[col.key]) : '-'}
                                                </TableCell>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length + (hasActionCol ? 2 : 1)} className="h-24 text-center text-slate-400 dark:text-slate-500">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
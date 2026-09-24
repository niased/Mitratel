import React, { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import Icon from '@/Components/Icon';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Toolbar from '@/components/Toolbar';
import CrudTable from './CrudTable';
import { useConfirm } from '@/Layouts/AuthenticatedLayout';

const safeRoute = (name, params) => {
    if (typeof window !== 'undefined' && typeof window.route === 'function') return window.route(name, params);
    if (typeof route === 'function') return route(name, params);
    return '#';
};

// MENDUKUNG TICKET_NUMBER DARI RPM (TIARA)
const getItemId = (item) => item?.id || item?.ticket_number || item?.rpm_id || item?.tiara_id || item?.serial_number;

export default function TabMasterData({ rpmMasters, smartkeyMasters, tiaraMasters, filters }) {
    // DETEKSI ROLE USER DARI INERTIA AUTH
    const { auth } = usePage().props;
    const userRole = auth?.user?.role || 'view';
    const isAdmin = userRole === 'admin';

    const confirm = useConfirm();
    const [subTab, setSubTab] = useState(filters?.tab || 'rpm');

    // State Dropdown Master RPM
    const [isRpmDropdownOpen, setIsRpmDropdownOpen] = useState(false);
    const rpmDropdownRef = useRef(null);

    // Close Dropdown saat klik di luar area
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (rpmDropdownRef.current && !rpmDropdownRef.current.contains(event.target)) {
                setIsRpmDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // State Filter & Pagination
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [sortOrder, setSortOrder] = useState(filters?.order || 'asc');
    const [perPage, setPerPage] = useState(filters?.per_page || 10);
    const [perPageInput, setPerPageInput] = useState(filters?.per_page || 10);
    const [isProcessing, setIsProcessing] = useState(false);

    // State Row Checkboxes
    const [selectedIds, setSelectedIds] = useState([]);

    const currentPagination = subTab === 'rpm'
        ? rpmMasters
        : subTab === 'smartkey'
            ? smartkeyMasters
            : tiaraMasters;

    const dataList = currentPagination?.data || [];

    // --- FITUR DEBOUNCE PENCARIAN ---
    const isMounted = useRef(false);

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        const timer = setTimeout(() => {
            fetchFilteredData(searchTerm, sortOrder, perPage, subTab, 1);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (filters?.per_page) {
            setPerPage(filters.per_page);
            setPerPageInput(filters.per_page);
        }
    }, [filters?.per_page]);

    const handlePerPageSubmit = () => {
        let val = parseInt(perPageInput, 10);

        if (isNaN(val) || val < 1) {
            val = 10;
        } else if (val > 100) {
            val = 100;
        }

        setPerPageInput(val);

        if (val !== perPage) {
            setPerPage(val);
            fetchFilteredData(searchTerm, sortOrder, val, subTab, 1);
        }
    };

    const fetchFilteredData = (newSearch, newOrder, newPerPage, targetTab = subTab, page = 1) => {
        setSelectedIds([]);

        router.get(
            safeRoute('maintenance.data-management.index'),
            {
                tab: targetTab,
                search: newSearch,
                order: newOrder,
                per_page: newPerPage,
                page: page
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsProcessing(true),
                onFinish: () => setIsProcessing(false)
            }
        );
    };

    const handleSubTabSwitch = (tab) => {
        if (tab === subTab) return;

        setSubTab(tab);
        setSelectedIds([]);
        fetchFilteredData(searchTerm, sortOrder, perPage, tab, 1);
    };

    const getRowNumber = (index) => {
        if (!currentPagination) return index + 1;

        const currentPage = currentPagination.current_page || 1;
        const limit = currentPagination.per_page || 10;

        return (currentPage - 1) * limit + index + 1;
    };

    const toggleSort = () => {
        const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';

        setSortOrder(nextOrder);
        fetchFilteredData(searchTerm, nextOrder, perPage, subTab, 1);
    };

    const handlePageChange = (url) => {
        if (url) {
            setSelectedIds([]);

            router.get(
                url,
                {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onStart: () => setIsProcessing(true),
                    onFinish: () => setIsProcessing(false)
                }
            );
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            const allIds = dataList.map(item => getItemId(item)).filter(Boolean);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const handleExportData = () => {
        const routeName = subTab === 'rpm'
            ? 'maintenance.data-management.export-rpm'
            : subTab === 'smartkey'
                ? 'maintenance.data-management.export-smartkey'
                : 'maintenance.data-management.export-tiara';

        const exportUrl = safeRoute(routeName);

        if (exportUrl !== '#') {
            window.open(exportUrl, '_blank');
        }
    };

    const getTabDisplayName = () => {
        if (subTab === 'rpm') return 'RPM (ANT)';
        if (subTab === 'tiara') return 'RPM (TIARA)';
        return 'SMART KEY';
    };

    // --- HANDLE HAPUS DATA TERPILIH (HANYA ADMIN) ---
    const handleDeleteSelected = () => {
        if (!isAdmin || selectedIds.length === 0) return;

        confirm({
            title: `Hapus Data Master ${getTabDisplayName()}`,
            message: `Apakah Anda yakin ingin MENGHAPUS ${selectedIds.length} data terpilih? Data yang dihapus tidak dapat dikembalikan.`,
            variant: 'danger',
            confirmText: 'Ya, Hapus Data',
            cancelText: 'Batal',
            onConfirm: () => {
                const routeName = subTab === 'rpm'
                    ? 'maintenance.data-management.destroy-rpm'
                    : subTab === 'smartkey'
                        ? 'maintenance.data-management.destroy-smartkey'
                        : 'maintenance.data-management.destroy-tiara';

                router.delete(
                    safeRoute(routeName),
                    {
                        data: { ids: selectedIds },
                        preserveScroll: true,
                        onStart: () => setIsProcessing(true),
                        onSuccess: () => setSelectedIds([]),
                        onFinish: () => setIsProcessing(false)
                    }
                );
            }
        });
    };

    // --- HANDLE RESET TABLE (HANYA ADMIN) ---
    const handleResetTable = () => {
        if (!isAdmin) return;

        confirm({
            title: `Kosongkan Master Data ${getTabDisplayName()}`,
            message: `Apakah Anda yakin ingin MENGOSONGKAN SELURUH data Master ${getTabDisplayName()}? Tindakan ini akan menghapus semua data di tabel ini.`,
            variant: 'danger',
            confirmText: 'Ya, Kosongkan',
            cancelText: 'Batal',
            onConfirm: () => {
                const routeName = subTab === 'rpm'
                    ? 'maintenance.data-management.reset-rpm'
                    : subTab === 'smartkey'
                        ? 'maintenance.data-management.reset-smartkey'
                        : 'maintenance.data-management.reset-tiara';

                router.post(
                    safeRoute(routeName),
                    {},
                    {
                        preserveScroll: true,
                        onStart: () => setIsProcessing(true),
                        onSuccess: () => setSelectedIds([]),
                        onFinish: () => setIsProcessing(false)
                    }
                );
            }
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* TOOLBAR */}
            <Toolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSearchClear={() => setSearchTerm('')}
                sortOrder={sortOrder}
                onToggleSort={toggleSort}
                selectedCount={selectedIds.length}
                onDeleteSelected={isAdmin ? handleDeleteSelected : undefined}
                onReset={isAdmin ? handleResetTable : undefined}
                onExport={handleExportData}
                isProcessing={isProcessing}
                leftContent={
                    <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-fit items-center gap-1">
                        {/* DROPDOWN MASTER RPM */}
                        <div className="relative" ref={rpmDropdownRef}>
                            <Button
                                type="button"
                                variant={(subTab === 'rpm' || subTab === 'tiara') ? 'default' : 'ghost'}
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => setIsRpmDropdownOpen(prev => !prev)}
                                className={`text-xs font-bold gap-1.5 transition-all ${
                                    subTab === 'rpm'
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                        : subTab === 'tiara'
                                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <Icon
                                    name="chart"
                                    size={18}
                                    fill={subTab === 'rpm' ? '#FFFFFF' : '#A855F7'}
                                />
                                <span>
                                    Master RPM {subTab === 'tiara' ? '(TIARA)' : '(ANT)'} (
                                    {subTab === 'tiara' ? (tiaraMasters?.total || 0) : (rpmMasters?.total || 0)}
                                )
                                </span>
                                <Icon
                                    name="chevronDown"
                                    size={16}
                                    fill={subTab === 'rpm' ? '#FFFFFF' : '#A855F7'}
                                    className={`transition-transform duration-200 ${isRpmDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </Button>

                            {isRpmDropdownOpen && (
                                <div className="absolute left-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95">
                                    {/* RPM ANT */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleSubTabSwitch('rpm');
                                            setIsRpmDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                                            subTab === 'rpm'
                                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon name="chart" size={18} fill="#3B82F6" />
                                            RPM (ANT)
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">
                                            {rpmMasters?.total || 0}
                                        </span>
                                    </button>

                                    {/* RPM TIARA */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleSubTabSwitch('tiara');
                                            setIsRpmDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                                            subTab === 'tiara'
                                                ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-bold'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon name="chart" size={18} fill="#A855F7" />
                                            RPM (TIARA)
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">
                                            {tiaraMasters?.total || 0}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* MASTER SMART KEY */}
                        <Button
                            type="button"
                            variant={subTab === 'smartkey' ? 'default' : 'ghost'}
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => {
                                handleSubTabSwitch('smartkey');
                                setIsRpmDropdownOpen(false);
                            }}
                            className={`text-xs font-bold gap-2 transition-all ${
                                subTab === 'smartkey'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            <Icon
                                name="lock"
                                size={18}
                                fill={subTab === 'smartkey' ? '#FFFFFF' : '#10B981'}
                            />
                            <span>
                                Master Smart Key ({smartkeyMasters?.total || 0})
                            </span>
                        </Button>
                    </div>
                }
            />

            {/* AREA TABEL CRUD */}
            <div className="w-full overflow-x-auto relative">
                <CrudTable
                    dataList={dataList}
                    subTab={subTab}
                    selectedIds={selectedIds}
                    onSelectAll={handleSelectAll}
                    onSelectRow={handleSelectRow}
                    getRowNumber={getRowNumber}
                />
            </div>

            {/* PAGINATION CONTROLS */}
            {currentPagination && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <span>Tampilkan</span>

                        <Input
                            type="number"
                            min={1}
                            max={100}
                            value={perPageInput}
                            disabled={isProcessing}
                            onChange={(e) => {
                                const val = e.target.value;

                                if (val !== '' && Number(val) > 100) {
                                    setPerPageInput(100);
                                } else {
                                    setPerPageInput(val);
                                }
                            }}
                            onBlur={handlePerPageSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handlePerPageSubmit();
                                }
                            }}
                            className="h-8 w-16 text-center text-xs font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        <span>
                            data per halaman
                            <span className="text-[10px] text-slate-400 font-normal">(Maks. 100)</span>
                        </span>
                    </div>

                    <div className="text-slate-500">
                        Menampilkan{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {currentPagination.from || 0}
                        </span>
                        {' - '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {currentPagination.to || 0}
                        </span>
                        {' dari '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {currentPagination.total || 0}
                        </span>
                        {' data'}
                    </div>

                    <div className="flex items-center gap-1">
                        {currentPagination.links?.map((link, index) => {
                            let label = link.label;

                            if (label.includes('Previous') || label.includes('&laquo;')) {
                                label = <Icon name="chevronLeft" size={16} fill="#64748B" />;
                            } else if (label.includes('Next') || label.includes('&raquo;')) {
                                label = <Icon name="chevronRight" size={16} fill="#64748B" />;
                            }

                            return (
                                <Button
                                    key={`pagination-link-${index}`}
                                    type="button"
                                    variant={link.active ? "default" : "outline"}
                                    size="sm"
                                    disabled={!link.url || isProcessing}
                                    onClick={() => handlePageChange(link.url)}
                                    className={`h-8 min-w-[32px] px-2 text-xs font-semibold dark:border-slate-800 ${
                                        link.active
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {label}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
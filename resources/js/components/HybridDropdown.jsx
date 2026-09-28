import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export default function HybridDropdown({
    value = '',
    options = [],
    onChange,
    placeholder = 'Ketik atau pilih...',
    searchPlaceholder = 'Cari opsi...',
    disabled = false,
    inputClassName = '',
    className = '',
    direction = 'down',
    renderOption = null,
    allowCustom = true // true: bisa ketik bebas (hybrid), false: wajib pilih dari list (select murni)
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const searchInputRef = useRef(null);

    // Normalisasi opsi universal (mendukung string biasa maupun object dengan label/subLabel)
    const normalizedOptions = useMemo(() => {
        return (options || []).map((opt) => {
            if (typeof opt === 'object' && opt !== null) {
                const val = String(opt.value ?? opt.id ?? '');
                const labelText = typeof opt.label === 'string' 
                    ? opt.label 
                    : (typeof opt.name === 'string' ? opt.name : val);

                return {
                    value: val,
                    label: opt.label ?? opt.name ?? val,
                    labelText: labelText,
                    subLabel: opt.subLabel ?? null,
                    raw: opt
                };
            }
            const str = String(opt);
            return {
                value: str,
                label: str,
                labelText: str,
                subLabel: null,
                raw: opt
            };
        });
    }, [options]);

    // Filter daftar opsi berdasarkan input pencarian
    const filteredOptions = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return normalizedOptions;
        return normalizedOptions.filter((opt) =>
            opt.labelText.toLowerCase().includes(query) ||
            opt.value.toLowerCase().includes(query)
        );
    }, [normalizedOptions, searchQuery]);

    // Tutup dropdown saat klik di luar
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-focus ke input search saat popover terbuka jika opsi > 3
    useEffect(() => {
        if (isOpen && normalizedOptions.length > 3) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen, normalizedOptions.length]);

    const handleInputChange = (e) => {
        if (!allowCustom) return; // Mencegah input ketik manual jika allowCustom = false
        if (onChange) onChange(e.target.value);
        if (!isOpen) setIsOpen(true);
    };

    const handleSelectOption = (opt) => {
        if (onChange) onChange(opt.value, opt.raw || opt);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (onChange) onChange('');
        setSearchQuery('');
        if (allowCustom) {
            inputRef.current?.focus();
        }
    };

    const showSearch = normalizedOptions.length > 3;
    const displayValue = useMemo(() => {
        if (typeof value === 'object' && value !== null) {
            return value.label || value.value || '';
        }
        if (!allowCustom) {
            const found = normalizedOptions.find((o) => o.value.toLowerCase() === String(value).toLowerCase());
            if (found) return found.labelText;
        }
        return value || '';
    }, [value, allowCustom, normalizedOptions]);

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            <div className="relative flex items-center">
                {/* Kotak Input Teks Universal */}
                <input
                    ref={inputRef}
                    type="text"
                    disabled={disabled}
                    readOnly={!allowCustom}
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (!disabled && allowCustom) setIsOpen(true);
                    }}
                    onClick={() => {
                        if (!disabled && !allowCustom) {
                            setIsOpen((prev) => !prev);
                            if (isOpen) setSearchQuery('');
                        }
                    }}
                    placeholder={placeholder}
                    className={`w-full h-8 pl-3 pr-14 rounded-lg border bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                        !allowCustom ? 'cursor-pointer select-none' : ''
                    } ${
                        isOpen 
                            ? 'border-blue-500 ring-1 ring-blue-500' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    } ${inputClassName}`}
                />

                {/* Tombol Clear & Chevron Dropdown */}
                <div className="absolute right-1.5 flex items-center gap-0.5">
                    {displayValue && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={disabled}
                        tabIndex={-1}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!disabled) {
                                setIsOpen((prev) => !prev);
                                if (!isOpen) setSearchQuery('');
                            }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Menu Pop-up Dropdown */}
            {isOpen && !disabled && (
                <div
                    className={`absolute left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 text-xs transition-all ${
                        direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
                    }`}
                >
                    {/* Kotak Search Otomatis */}
                    {showSearch && (
                        <div className="p-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                            <div className="relative flex items-center">
                                <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full h-7 pl-7 pr-6 text-[11px] rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSearchQuery('');
                                            searchInputRef.current?.focus();
                                        }}
                                        className="absolute right-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Render Daftar Pilihan */}
                    <div className="overflow-y-auto max-h-56 py-0.5 space-y-0.5">
                        {filteredOptions.length === 0 ? (
                            allowCustom ? (
                                <div className="py-2.5 px-3 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                    Tekan simpan untuk menggunakan: <strong>"{searchQuery || displayValue}"</strong>
                                </div>
                            ) : (
                                <div className="py-2.5 px-3 text-[11px] text-slate-400 text-center font-medium">
                                    Tidak ada opsi yang cocok.
                                </div>
                            )
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = String(displayValue).toLowerCase() === opt.value.toLowerCase();
                                return (
                                    <button
                                        key={`${opt.value}-${idx}`}
                                        type="button"
                                        onClick={() => handleSelectOption(opt)}
                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        {renderOption ? (
                                            renderOption(opt.raw, isSelected)
                                        ) : opt.subLabel ? (
                                            <div className="flex flex-col items-start min-w-0 pr-2 leading-tight">
                                                <span className="truncate font-mono">{opt.label}</span>
                                                <div className="mt-0.5">{opt.subLabel}</div>
                                            </div>
                                        ) : (
                                            <span className="truncate">{opt.label}</span>
                                        )}
                                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1.5 stroke-[2.5]" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
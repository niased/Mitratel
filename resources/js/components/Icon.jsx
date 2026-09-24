import { useEffect, useState } from 'react';
import { Icon as Iconify } from '@iconify/react';
import IconPark from '@icon-park/react/es/all';
import '@icon-park/react/styles/index.css';

// =====================================================
// ICON LIBRARY
// =====================================================
// Fluent Emoji → colorful / 3D / ilustratif
// Icon Park    → modern / UI / action
//
// IconPark bisa langsung dipanggil menggunakan nama
// icon dari website IconPark:
//
// <Icon name="ChartHistogram" />
// <Icon name="Lock" />
// <Icon name="Shopping" />
// <Icon name="DataSheet" />
//
// Bisa juga menggunakan format kebab-case:
//
// <Icon name="chart-histogram" />
// <Icon name="data-sheet" />
// <Icon name="shopping" />
//
// Alias lama tetap didukung:
//
// <Icon name="project" />
// <Icon name="chart" />
// <Icon name="lock" />
// =====================================================

const icons = {
    // =================================================
    // DASHBOARD
    // =================================================
    dashboard: { type: 'Dashboard', park: true },
    home: { type: 'HomeTwo', park: true },

    // =================================================
    // MASTER DATA
    // =================================================
    project: 'fluent-emoji:office-building',
    pekerjaan: 'fluent-emoji:hammer-and-wrench',
    barang: 'fluent-emoji:package',
    gudang: 'fluent-emoji:warehouse',
    users: 'fluent-emoji:people-holding-hands',
    user: 'fluent-emoji:person',

    // =================================================
    // MONITORING
    // =================================================
    rpm: { type: 'DashboardCar', park: true },
    lock: { type: 'Lock', park: true },
    unlock: { type: 'Unlock', park: true },
    chart: { type: 'ChartHistogram', park: true },
    database: { type: 'Database', park: true },

    // =================================================
    // CRUD
    // =================================================
    add: { type: 'Add', park: true },
    edit: { type: 'Edit', park: true },
    delete: { type: 'Delete', park: true },
    search: { type: 'Search', park: true },
    filter: { type: 'Filter', park: true },
    view: { type: 'PreviewOpen', park: true },
    download: { type: 'Download', park: true },
    upload: { type: 'Upload', park: true },
    refresh: { type: 'Refresh', park: true },

    // =================================================
    // ACTION
    // =================================================
    close: { type: 'Close', park: true },
    check: { type: 'Check', park: true },

    // =================================================
    // CHEVRON
    // =================================================
    chevronDown: { type: 'Down', park: true },
    chevronUp: { type: 'Up', park: true },
    chevronLeft: { type: 'Left', park: true },
    chevronRight: { type: 'Right', park: true },

    // =================================================
    // GENERAL
    // =================================================
    calendar: 'fluent-emoji:calendar',
    location: 'fluent-emoji:round-pushpin',
    file: { type: 'FileText', park: true },
    folder: 'fluent-emoji:file-folder',
    archive: 'fluent-emoji:file-cabinet',
    clock: 'fluent-emoji:alarm-clock',

    // =================================================
    // STATUS
    // =================================================
    alert: 'fluent-emoji:warning',
    success: 'fluent-emoji:check-mark-button',
    error: 'fluent-emoji:cross-mark-button',
    info: { type: 'Info', park: true },

    // =================================================
    // MORE
    // =================================================
    more: { type: 'More', park: true },
    moreHorizontal: { type: 'MoreApp', park: true },

    // =================================================
    // SYSTEM
    // =================================================
    settings: { type: 'Setting', park: true },
};

// =====================================================
// ICON COLORS
// =====================================================

const ICON_COLORS = {
    red: '#D0021B',
    blue: '#3B82F6',
    purple: '#A855F7',
    green: '#10B981',
    amber: '#F59E0B',
    orange: '#F97316',
    yellow: '#EAB308',
    pink: '#EC4899',
    cyan: '#06B6D4',
    teal: '#14B8A6',
    indigo: '#6366F1',
    violet: '#8B5CF6',
    slate: '#64748B',
    gray: '#6B7280',
    white: '#FFFFFF',
    black: '#000000',
};

// =====================================================
// THEME COLORS
// =====================================================

const ICON_THEME_COLORS = {
    light: '#D0021B',
    dark: '#FFFFFF',
};

// =====================================================
// ICON PARK DEFAULT COLOR
// =====================================================

const ICON_PARK_DEFAULT_COLOR = 'red';

// =====================================================
// GET CURRENT THEME
// =====================================================

function getCurrentTheme() {
    if (typeof document === 'undefined') {
        return 'light';
    }

    return document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light';
}

// =====================================================
// NORMALIZE ICON PARK NAME
// =====================================================

function normalizeIconParkName(name) {
    if (!name || typeof name !== 'string') {
        return null;
    }

    // Sudah PascalCase:
    // DataSheet
    // ChartHistogram
    // DashboardCar
    // Shopping
    if (/^[A-Z]/.test(name)) {
        return name;
    }

    // Kebab-case:
    // data-sheet → DataSheet
    // chart-histogram → ChartHistogram
    // dashboard-car → DashboardCar
    // shopping → Shopping
    return name
        .split('-')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

// =====================================================
// UNIVERSAL ICON COMPONENT
// =====================================================

export default function Icon({
    name,
    size = 20,
    className = '',
    theme = 'filled',
    fill = ICON_PARK_DEFAULT_COLOR,
    strokeWidth = 4,
    ...props
}) {
    // =================================================
    // THEME STATE
    // =================================================

    const [currentTheme, setCurrentTheme] = useState(getCurrentTheme);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const observer = new MutationObserver(() => {
            setCurrentTheme(getCurrentTheme());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    // =================================================
    // RESOLVE ICON
    // =================================================

    const aliasIcon = icons[name];

    // Kalau bukan alias, anggap sebagai nama IconPark
    const directIconParkType = !aliasIcon
        ? normalizeIconParkName(name)
        : null;

    // =================================================
    // ICON TIDAK DITEMUKAN
    // =================================================

    if (!aliasIcon && !directIconParkType) {
        console.warn(
            `Icon "${name}" tidak ditemukan. Gunakan alias di Icon.jsx atau nama icon resmi IconPark.`
        );
        return null;
    }

    // =================================================
    // RESOLVE COLOR
    // =================================================

    const iconColor =
        fill === 'theme'
            ? ICON_THEME_COLORS[currentTheme]
            : ICON_COLORS[fill] || fill;

    // =================================================
    // DIRECT ICON PARK
    // =================================================

    if (directIconParkType) {
        return (
            <IconPark
                type={directIconParkType}
                theme={theme}
                size={size}
                fill={iconColor}
                strokeWidth={strokeWidth}
                className={className}
                {...props}
            />
        );
    }

    // =================================================
    // ALIAS ICON PARK
    // =================================================

    if (typeof aliasIcon === 'object' && aliasIcon.park) {
        return (
            <IconPark
                type={aliasIcon.type}
                theme={theme}
                size={size}
                fill={iconColor}
                strokeWidth={strokeWidth}
                className={className}
                {...props}
            />
        );
    }

    // =================================================
    // FLUENT EMOJI / ICONIFY
    // =================================================

    return (
        <Iconify
            icon={aliasIcon}
            width={size}
            height={size}
            className={className}
            {...props}
        />
    );
}
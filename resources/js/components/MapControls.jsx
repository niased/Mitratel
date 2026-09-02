import React from 'react';
import { Globe, Layers } from 'lucide-react';

export const MAP_STYLES = {
    dark: {
        name: 'Dark Mode',
        style: {
            version: 8,
            sources: {
                'esri-dark': {
                    type: 'raster',
                    tiles: [
                        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
                    ],
                    tileSize: 256,
                    maxzoom: 16,
                    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
                },
                'esri-dark-labels': {
                    type: 'raster',
                    tiles: [
                        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
                    ],
                    tileSize: 256,
                    maxzoom: 16,
                },
            },
            layers: [
                { id: 'esri-dark-layer', type: 'raster', source: 'esri-dark' },
                { id: 'esri-dark-labels-layer', type: 'raster', source: 'esri-dark-labels' },
            ],
        },
    },
    satellite: {
        name: 'Satelit',
        style: {
            version: 8,
            sources: {
                'esri-sat': {
                    type: 'raster',
                    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                    tileSize: 256,
                    maxzoom: 18,
                    attribution: '&copy; Esri',
                },
                'esri-labels': {
                    type: 'raster',
                    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
                    tileSize: 256,
                    maxzoom: 18,
                    attribution: '&copy; Esri',
                },
            },
            layers: [
                { id: 'esri-sat-layer', type: 'raster', source: 'esri-sat' },
                { id: 'esri-labels-layer', type: 'raster', source: 'esri-labels' },
            ],
        },
    },
    streets: {
        name: 'Streets',
        style: {
            version: 8,
            sources: {
                'osm-tiles': {
                    type: 'raster',
                    tiles: [
                        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    ],
                    tileSize: 256,
                    maxzoom: 19,
                    attribution: '&copy; OpenStreetMap',
                },
            },
            layers: [{ id: 'osm-layer', type: 'raster', source: 'osm-tiles' }],
        },
    },
};

export const DEFAULT_INDONESIA_CENTER = [117.8888, -2.4833];
export const DEFAULT_INDONESIA_ZOOM = 4.5;

// ==========================================
// PARSER KOORDINAT UNIVERSAL
// ==========================================
export function parseCoordinates(item) {
    if (!item) return null;

    if (Array.isArray(item) && item.length >= 2) {
        const p1 = parseFloat(item[0]);
        const p2 = parseFloat(item[1]);
        if (!isNaN(p1) && !isNaN(p2) && !(p1 === 0 && p2 === 0)) {
            if (Math.abs(p1) <= 90 && Math.abs(p2) <= 180 && (Math.abs(p2) > 90 || Math.abs(p1) < Math.abs(p2))) {
                return { lng: p2, lat: p1, text: `${p1.toFixed(5)}, ${p2.toFixed(5)}` };
            }
            return { lng: p1, lat: p2, text: `${p2.toFixed(5)}, ${p1.toFixed(5)}` };
        }
    }

    if (typeof item !== 'object') return null;

    const target = item.properties || item.combat || item;

    let combined = null;
    const possibleKeys = [
        'long_lat', 'Long Lat', 'Long Lat ', 'long lat', 'LONG LAT',
        'Long_Lat', 'LONG_LAT', 'Lat Long', 'Lat Long ', 'lat long',
        'LAT LONG', 'lat_long', 'latlong', 'coordinat', 'coordinates', 'location'
    ];

    for (const k of possibleKeys) {
        if (target[k] !== undefined && target[k] !== null && target[k] !== '') {
            combined = String(target[k]).trim();
            break;
        }
        if (item[k] !== undefined && item[k] !== null && item[k] !== '') {
            combined = String(item[k]).trim();
            break;
        }
    }

    if (!combined) {
        let lat = parseFloat(target.latitude ?? target.lat ?? target.Lat ?? target.LAT ?? item.latitude ?? item.lat ?? item.Lat);
        let lng = parseFloat(target.longitude ?? target.lng ?? target.Long ?? target.LONGITUDE ?? item.longitude ?? item.lng ?? item.Long);

        if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return { lng, lat, text: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
        }
        return null;
    }

    if (combined.includes('#N/A') || combined.includes('N/A') || combined.toUpperCase() === 'NA') {
        return null;
    }
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    if (months.some((m) => combined.toUpperCase().includes(m))) {
        return null;
    }

    const parts = combined
        .split(/[\s,;/]+/)
        .map((p) => parseFloat(p.replace(',', '.').trim()))
        .filter((n) => !isNaN(n));

    if (parts.length >= 2) {
        let p1 = parts[0];
        let p2 = parts[1];

        let latVal = p1;
        let lngVal = p2;

        if (Math.abs(p1) > 50 && Math.abs(p2) <= 90) {
            lngVal = p1;
            latVal = p2;
        } else if (Math.abs(p2) > 50 && Math.abs(p1) <= 90) {
            latVal = p1;
            lngVal = p2;
        }

        if (latVal >= -90 && latVal <= 90 && lngVal >= -180 && lngVal <= 180 && !(latVal === 0 && lngVal === 0)) {
            return { lng: lngVal, lat: latVal, text: `${latVal.toFixed(5)}, ${lngVal.toFixed(5)}` };
        }
    }

    return null;
}

export default function MapControls({
    currentStyle = 'dark',
    onChangeStyle,
    onResetView,
    isClustered = true,
    onToggleCluster,
    selectedStatus = 'ALL',
    onSelectStatus,
    statusCounts = {},
    statusConfig = {},
}) {
    return (
        <>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* KONTROL ATAS: MODE PETA, ZOOM GLOBE, CLUSTER ON/OFF */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 max-w-[calc(100vw-80px)] flex-wrap">
                
                {/* 1. Mode Gaya Peta */}
                <div className="bg-slate-950/90 dark:bg-slate-950/95 backdrop-blur-md p-1 rounded-xl border border-slate-800/90 shadow-2xl flex items-center gap-1">
                    {Object.keys(MAP_STYLES).map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onChangeStyle && onChangeStyle(key)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                                currentStyle === key
                                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            }`}
                        >
                            {MAP_STYLES[key].name}
                        </button>
                    ))}
                </div>

                {/* 2. Tombol Reset View Indonesia */}
                <button
                    type="button"
                    onClick={onResetView}
                    title="Zoom Out ke Peta Indonesia"
                    className="p-2 rounded-xl bg-slate-950/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all duration-200 shadow-2xl flex items-center justify-center cursor-pointer active:scale-95"
                >
                    <Globe className="w-4 h-4" />
                </button>

                {/* 3. Tombol Cluster ON/OFF */}
                <button
                    type="button"
                    onClick={onToggleCluster}
                    title={isClustered ? "Matikan Clustering" : "Aktifkan Clustering"}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border backdrop-blur-md transition-all duration-200 flex items-center gap-2 shadow-2xl cursor-pointer active:scale-95 ${
                        isClustered
                            ? 'bg-slate-950/95 border-slate-700/90 text-white hover:bg-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.6)]'
                            : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                    }`}
                >
                    <Layers className={`w-3.5 h-3.5 ${isClustered ? 'text-white' : 'text-slate-400'}`} />
                    <span className="tracking-wide">{isClustered ? 'Cluster ON' : 'Cluster OFF'}</span>
                    {isClustered && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                    )}
                </button>
            </div>

            {/* STATUS BAR BAWAH */}
            {Object.keys(statusConfig).length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 max-w-[90vw] overflow-x-auto no-scrollbar py-1 px-2">
                    {Object.entries(statusConfig)
                        .filter(([key]) => key !== '#N/A' && key !== 'N/A' && key !== 'NA') 
                        .map(([key, cfg]) => {
                            const count = statusCounts[key] || 0;
                            const isSelected = selectedStatus === key;
                            const color = cfg.color || '#3b82f6';

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => onSelectStatus && onSelectStatus(isSelected ? 'ALL' : key)}
                                    style={{
                                        backgroundColor: isSelected ? cfg.bg || 'rgba(59,130,246,0.3)' : 'rgba(15, 23, 42, 0.88)',
                                        borderColor: isSelected ? color : 'rgba(255, 255, 255, 0.12)',
                                        color: isSelected ? '#ffffff' : '#94a3b8',
                                    }}
                                    className="px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-xl transition-all shadow-lg flex items-center gap-2 whitespace-nowrap cursor-pointer"
                                >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span>{cfg.label || key}</span>
                                    <span className="px-1.5 py-0.5 rounded-full bg-black/50 text-[10px] text-white font-mono">
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                </div>
            )}
        </>
    );
}
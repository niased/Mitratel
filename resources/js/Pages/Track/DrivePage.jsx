import React, { useMemo } from 'react';
import { Head } from '@inertiajs/react';
import { 
    Navigation, 
    CheckCircle2, 
    ShieldCheck, 
    RotateCcw, 
    Loader2, 
    Eye,
    Lock,
    AlertTriangle,
    MapPin, 
    Truck, 
    ArrowRight, 
    ExternalLink,
    Compass
} from 'lucide-react';
import Map from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

import useDriverTracker, { calculateDistanceKm, getJenisPergerakanInfo } from './DriverTracker';
import DriverTelemetry from './DriverTelemetry';

const DRIVER_MAP_CONFIG = {
    'DRIVER': {
        label: 'Posisi Driver',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.35)',
    },
    'DESTINATION': {
        label: 'Tujuan Site',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.35)',
    },
};

export default function DrivePage({ trip }) {
    const {
        status,
        gpsError,
        isSubmitting,
        currentCoords,
        speedHistory,
        isAuthorizedDriver,
        isAppInBackground,
        isNavigatingMaps,
        startGpsWatcher,
        handleStartTrip,
        handleCompleteTrip,
        handleOpenGoogleMapsClick
    } = useDriverTracker(trip);

    const combat = trip?.combat || {};
    const jenisInfo = useMemo(() => getJenisPergerakanInfo(trip), [trip]);

    const mapMarkers = useMemo(() => {
        const list = [];
        if (trip?.destination_lat && trip?.destination_lng) {
            list.push({
                id: 'destination',
                latitude: parseFloat(trip.destination_lat),
                longitude: parseFloat(trip.destination_lng),
                is_destination: true,
                status: 'DESTINATION',
                title: `Tujuan: ${trip.destination_name}`
            });
        }
        if (currentCoords?.latitude && currentCoords?.longitude) {
            list.push({
                id: 'driver',
                latitude: currentCoords.latitude,
                longitude: currentCoords.longitude,
                is_driver: true,
                status: 'DRIVER',
                title: isAuthorizedDriver ? 'Posisi Anda Saat Ini' : `Posisi Supir (${trip?.pic_name || 'Driver'})`
            });
        }
        return list;
    }, [trip?.destination_lat, trip?.destination_lng, trip?.destination_name, currentCoords, isAuthorizedDriver, trip?.pic_name]);

    const activeRouteHistory = useMemo(() => {
        if (currentCoords?.latitude && currentCoords?.longitude && trip?.destination_lat && trip?.destination_lng) {
            return [
                [currentCoords.longitude, currentCoords.latitude],
                [parseFloat(trip.destination_lng), parseFloat(trip.destination_lat)]
            ];
        }
        return [];
    }, [currentCoords, trip?.destination_lat, trip?.destination_lng]);

    const mapInitialCenter = useMemo(() => {
        if (currentCoords) return [currentCoords.longitude, currentCoords.latitude];
        if (trip?.destination_lng && trip?.destination_lat) return [parseFloat(trip.destination_lng), parseFloat(trip.destination_lat)];
        return [106.8456, -6.2088];
    }, [currentCoords, trip?.destination_lng, trip?.destination_lat]);

    const remainingDistanceKm = useMemo(() => {
        if (!currentCoords || !trip?.destination_lat || !trip?.destination_lng) return '-';
        return calculateDistanceKm(
            currentCoords.latitude,
            currentCoords.longitude,
            parseFloat(trip.destination_lat),
            parseFloat(trip.destination_lng)
        ) || '-';
    }, [currentCoords, trip?.destination_lat, trip?.destination_lng]);

    const googleMapsNavUrl = useMemo(() => {
        if (trip?.destination_lat && trip?.destination_lng) {
            return `https://www.google.com/maps/dir/?api=1&origin=${currentCoords ? `${currentCoords.latitude},${currentCoords.longitude}` : ''}&destination=${trip.destination_lat},${trip.destination_lng}&travelmode=driving`;
        }
        if (trip?.destination_name) {
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination_name)}`;
        }
        return '#';
    }, [trip?.destination_lat, trip?.destination_lng, trip?.destination_name, currentCoords]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between selection:bg-red-500 selection:text-white">
            <Head title={`Tracking Driver - ${combat.asset_name || 'COMBAT'}`} />

            <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600 flex items-center justify-center font-black text-sm sm:text-base text-white shrink-0 shadow-md shadow-red-600/20">
                            M
                        </div>
                        <div className="truncate">
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-xs sm:text-sm text-white truncate">
                                    {combat.asset_name || 'Unit COMBAT'}
                                </h1>
                                <span className="text-[10px] sm:text-xs text-slate-400 font-mono">
                                    ({combat.sn || '-'})
                                </span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                                Driver: <span className="text-slate-200 font-medium">{trip?.pic_name || 'PIC'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                        {status === 'ASSIGNED' && (
                            <Button 
                                type="button" 
                                onClick={handleStartTrip} 
                                disabled={isSubmitting} 
                                className="bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold px-4 py-2 h-auto rounded-xl shadow-md active:scale-95 gap-1.5 cursor-pointer"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                <span>Mulai Perjalanan</span>
                            </Button>
                        )}
                        {status === 'IN_TRANSIT' && isAuthorizedDriver && (
                            <Button 
                                type="button" 
                                onClick={handleCompleteTrip} 
                                disabled={isSubmitting} 
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-4 py-2 h-auto rounded-xl shadow-md active:scale-95 gap-1.5 cursor-pointer"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                <span>Tiba di Lokasi</span>
                            </Button>
                        )}
                        {status === 'IN_TRANSIT' && !isAuthorizedDriver && (
                            <Badge variant="outline" className="bg-sky-500/10 border-sky-500/30 text-sky-400 text-[11px] font-bold px-3 py-1.5 rounded-lg gap-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                <span>Mode Pantau</span>
                            </Badge>
                        )}
                        {status === 'COMPLETED' && (
                            <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-3 py-1.5 rounded-lg gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Perjalanan Selesai</span>
                            </Badge>
                        )}
                    </div>
                </div>
            </header>

            {status === 'IN_TRANSIT' && (isNavigatingMaps || isAppInBackground) && isAuthorizedDriver && (
                <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 sm:px-6 py-2.5">
                    <div className="max-w-7xl mx-auto flex items-center gap-2 text-amber-300 text-xs sm:text-sm">
                        <Compass className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                        <p className="leading-tight text-[11px] sm:text-xs font-medium">
                            <strong>Mode Navigasi Google Maps Aktif:</strong> GPS tetap melacak di latar belakang. Kembali ke tab ini setelah tiba di lokasi.
                        </p>
                    </div>
                </div>
            )}

            {status === 'IN_TRANSIT' && !isAuthorizedDriver && (
                <div className="bg-sky-950/80 border-b border-sky-800/80 px-4 sm:px-6 py-2.5">
                    <div className="max-w-7xl mx-auto flex items-center gap-2 text-sky-300 text-xs sm:text-sm">
                        <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                        <p className="leading-tight text-[11px] sm:text-xs">
                            <strong>Mode Pantau Aktif:</strong> Posisi GPS driver utama ({trip?.pic_name}) ditampilkan secara live tanpa menyalakan GPS perangkat ini.
                        </p>
                    </div>
                </div>
            )}

            <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
                    <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-3">
                        {gpsError && (
                            <Alert className="bg-rose-950/95 border-rose-800 text-rose-300 py-2.5 px-3.5 rounded-xl shadow-xl flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs truncate">
                                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                    <AlertDescription className="truncate font-medium">{gpsError}</AlertDescription>
                                </div>
                                {isAuthorizedDriver && (
                                    <Button 
                                        type="button" 
                                        size="icon" 
                                        onClick={startGpsWatcher} 
                                        className="h-7 w-7 rounded bg-rose-800 hover:bg-rose-700 text-white shrink-0 ml-2 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </Alert>
                        )}
                        <div className="w-full h-[320px] sm:h-[400px] lg:h-[580px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl relative">
                            <Map 
                                data={mapMarkers}
                                trackHistory={activeRouteHistory}
                                center={mapInitialCenter}
                                zoom={13}
                                height="h-full min-h-[320px] sm:min-h-[400px] lg:min-h-[580px]"
                                showControls={true}
                                statusKey={(item) => item.status || 'DRIVER'}
                                statusConfig={DRIVER_MAP_CONFIG}
                                getPopupData={(item, lat, lng) => ({
                                    title: item.title || (item.is_destination ? 'Lokasi Tujuan' : 'Posisi Driver'),
                                    details: [
                                        { label: 'Koordinat', value: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, isMonospace: true }
                                    ],
                                    statusText: item.status === 'DESTINATION' ? 'TUJUAN' : 'DRIVER'
                                })}
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-3.5 sm:gap-4">
                        <DriverTelemetry 
                            currentCoords={currentCoords}
                            remainingDistanceKm={remainingDistanceKm}
                            speedHistory={speedHistory}
                        />

                        <Card className="bg-slate-900 border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                            <CardContent className="p-4 space-y-3.5">
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${
                                            status === 'IN_TRANSIT' 
                                                ? (isAuthorizedDriver ? (isAppInBackground ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse') : 'bg-sky-400 animate-pulse') 
                                                : 'bg-slate-500'
                                        }`} />
                                        <span className="text-xs sm:text-sm font-bold text-slate-200">
                                            {status === 'IN_TRANSIT' 
                                                ? (isAuthorizedDriver ? (isAppInBackground ? 'Navigasi Google Maps (Background)' : 'GPS Pelacakan Aktif') : 'Memantau Live Posisi Driver') 
                                                : 'GPS Siap Transmisi'
                                            }
                                        </span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${jenisInfo?.badgeClass}`}>
                                        {jenisInfo?.label}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm py-1">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                                        <div className="truncate">
                                            <span className="text-[10px] text-slate-500 block">Titik Asal</span>
                                            <span className="text-slate-300 font-medium truncate block">{trip?.origin_name || 'Gudang / Basecamp'}</span>
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
                                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
                                        <div className="truncate">
                                            <span className="text-[10px] text-slate-500 block">Titik Tujuan</span>
                                            <span className="font-bold text-emerald-400 truncate block">{trip?.destination_name || 'Lokasi Tujuan'}</span>
                                        </div>
                                        <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                                    </div>
                                </div>

                                <Button 
                                    type="button" 
                                    onClick={() => handleOpenGoogleMapsClick(googleMapsNavUrl)}
                                    className="w-full py-3 h-auto bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>Buka Navigasi di Google Map</span>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
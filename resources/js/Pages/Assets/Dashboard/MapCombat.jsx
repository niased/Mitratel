import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
    History, Plus, ChevronDown, Route as RouteIcon, RotateCcw
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSearchInput
} from '@/components/ui/dropdown-menu';
import Map from '@/components/Map';
import ModalTrackingCombat from './ModalTrackingCombat';
import EditTrackCombat from './EditTrackCombat';
import { parseCoordinates } from '@/components/MapControls';
import { calculateBearing } from '@/lib/geoUtils';
import { createCombatTruckIcon } from '@/components/CombatMovingMarker';

export default function MapCombat({ 
    activeMapRaw = [], 
    activeTrip = null, 
    activeTripsRaw = [], 
    viewMode = 'dashboard', 
    setViewMode, 
    selectedTripInfo, 
    routeHistory, 
    validLocationCount, 
    totalCombat, 
    COMBAT_STATUS_CONFIG, 
    normalizeStatus, 
    getCombatPopupData, 
    combatList = []
}) {
    const [allTrips, setAllTrips] = useState(activeTripsRaw);
    const [searchTrip, setSearchTrip] = useState('');
    
    const [selectedTrip, setSelectedTrip] = useState(() => activeTrip || activeTripsRaw[0] || null);
    const [liveGpsCoords, setLiveGpsCoords] = useState([]);
    const [liveDriverMarker, setLiveDriverMarker] = useState(null);
    const [driverBearing, setDriverBearing] = useState(0);
    const lastDriverPosRef = useRef(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCreatingRoute, setIsCreatingRoute] = useState(false);
    const [isEditingRoute, setIsEditingRoute] = useState(false);
    const [draftLocation, setDraftLocation] = useState(null);
    const [draftSelectedCombat, setDraftSelectedCombat] = useState(null);
    const [showDetailCard, setShowDetailCard] = useState(true);

    const fetchTripsList = useCallback(async () => {
        try {
            const res = await axios.get('/combat-api/history?per_page=50');
            const data = res.data?.data || res.data || [];
            if (Array.isArray(data) && data.length > 0) {
                setAllTrips(data);
                
                setSelectedTrip(prev => {
                    if (!prev) return data[0];
                    const updated = data.find(t => t.id === prev.id);
                    return updated ? { ...prev, ...updated, combat: prev.combat || updated.combat } : prev;
                });
            }
        } catch (err) {
            console.error("Gagal memuat riwayat perjalanan:", err);
        }
    }, []);

    useEffect(() => {
        fetchTripsList();
    }, [viewMode, fetchTripsList]);

    const fetchGpsTrail = useCallback(async (trip) => {
        if (!trip?.id) {
            setLiveGpsCoords([]);
            setLiveDriverMarker(null);
            lastDriverPosRef.current = null;
            return;
        }
        try {
            const res = await axios.get(`/combat-api/trips/${trip.id}/route`);
            const coords = res.data?.data?.coordinates || [];
            setLiveGpsCoords(coords);

            if (coords.length > 0) {
                const last = coords[coords.length - 1];
                let initialBearing = 0;
                if (coords.length >= 2) {
                    const prev = coords[coords.length - 2];
                    initialBearing = calculateBearing(prev[1], prev[0], last[1], last[0]);
                    setDriverBearing(initialBearing);
                }
                lastDriverPosRef.current = { lat: last[1], lng: last[0] };
                setLiveDriverMarker({ 
                    latitude: last[1], 
                    longitude: last[0], 
                    speed: 0,
                    bearing: initialBearing 
                });
            }
        } catch (err) {
            setLiveGpsCoords([]);
        }
    }, []);

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchTripsList(),
                selectedTrip ? fetchGpsTrail(selectedTrip) : Promise.resolve()
            ]);
        } catch (err) {
            console.error("Gagal merefresh rute:", err);
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo) {
            const channel = window.Echo.channel('combat-tracking');

            channel.listen('.driver.location.updated', (event) => {
                const { trip_id, latitude, longitude, speed } = event;

                if (selectedTrip && Number(selectedTrip.id) === Number(trip_id)) {
                    let newBearing = driverBearing;

                    if (lastDriverPosRef.current) {
                        const calculated = calculateBearing(
                            lastDriverPosRef.current.lat,
                            lastDriverPosRef.current.lng,
                            latitude,
                            longitude
                        );
                        if (calculated !== 0) {
                            newBearing = calculated;
                            setDriverBearing(calculated);
                        }
                    }
                    lastDriverPosRef.current = { lat: latitude, lng: longitude };

                    setLiveDriverMarker({ 
                        latitude, 
                        longitude, 
                        speed, 
                        bearing: newBearing 
                    });
                    
                    setLiveGpsCoords((prevCoords) => {
                        const newCoord = [longitude, latitude];
                        return [...prevCoords, newCoord];
                    });
                }

                setAllTrips((prevTrips) => 
                    prevTrips.map((t) => {
                        if (Number(t.id) === Number(trip_id)) {
                            return {
                                ...t,
                                latest_coordinate: { latitude, longitude, speed }
                            };
                        }
                        return t;
                    })
                );
            });

            return () => {
                window.Echo.leaveChannel('combat-tracking');
            };
        }
    }, [selectedTrip, driverBearing]);

    const handleSelectTripFromDropdown = (trip) => {
        setIsCreatingRoute(false);
        setIsEditingRoute(false);
        setSelectedTrip(trip);
        setShowDetailCard(true);
        setDraftLocation(null);
        setDraftSelectedCombat(null);
        fetchGpsTrail(trip);
    };

    const handleNewTripCreated = (newTripData) => {
        setIsCreatingRoute(false);
        setIsEditingRoute(false);
        setDraftLocation(null);
        setDraftSelectedCombat(null);

        setSelectedTrip(newTripData);
        setShowDetailCard(true);

        setAllTrips((prev) => [newTripData, ...prev.filter(t => t.id !== newTripData.id)]);
        fetchTripsList();
    };

    const handleEditSuccess = (updatedData) => {
        setIsEditingRoute(false);
        setDraftLocation(null);

        setSelectedTrip(prev => ({
            ...prev,
            ...updatedData,
            combat: prev?.combat || updatedData?.combat
        }));

        setAllTrips(prev => prev.map(t => t.id === updatedData.id ? { 
            ...t, 
            ...updatedData,
            combat: t.combat || updatedData.combat 
        } : t));

        fetchTripsList();
    };

    const handleDeleteTrip = async (tripId) => {
        if (!confirm('Tindakan ini tidak dapat dibatalkan!\nApakah Anda yakin ingin menghapus data penugasan rute ini?')) return;
        try {
            await axios.delete(`/combat-api/trips/${tripId}`);
            alert('Penugasan rute berhasil dihapus!');
            
            setAllTrips(prev => prev.filter(t => t.id !== tripId));
            setSelectedTrip(null);
            setIsEditingRoute(false);
            setLiveGpsCoords([]);
            setLiveDriverMarker(null);
            lastDriverPosRef.current = null;
            fetchTripsList();
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal menghapus penugasan.');
        }
    };

    const handleMapClick = (lngLat) => {
        if (viewMode === 'rute' && (isCreatingRoute || isEditingRoute)) {
            setDraftLocation({ lat: lngLat.lat, lng: lngLat.lng });
        }
    };

    const finalMapData = useMemo(() => {
        if (viewMode === 'dashboard') {
            return [...activeMapRaw];
        }

        if (viewMode === 'rute') {
            let data = [];
            
            if (isCreatingRoute) {
                if (draftSelectedCombat) {
                    const originCoord = parseCoordinates(draftSelectedCombat);
                    if (originCoord) {
                        data.push({ 
                            ...draftSelectedCombat, 
                            id: 'draft-origin', 
                            latitude: originCoord.lat,
                            longitude: originCoord.lng,
                            is_origin: true,
                            properties: { 
                                ...(draftSelectedCombat.properties || {}), 
                                status_combat: 'IN TRANSIT', 
                                asset_name: `ASAL: ${draftSelectedCombat.asset_name || 'Unit COMBAT'}` 
                            } 
                        });
                    }
                }
                if (draftLocation) {
                    data.push({ 
                        id: 'draft-destination', 
                        latitude: draftLocation.lat, 
                        longitude: draftLocation.lng,
                        is_destination: true,
                        properties: { 
                            asset_name: 'Lokasi Tujuan', 
                            status_combat: 'IN TRANSIT' 
                        } 
                    });
                }
            } 
            else if (selectedTrip) {
                const originCoord = parseCoordinates(selectedTrip.combat || selectedTrip);
                if (originCoord) {
                    data.push({ 
                        ...(selectedTrip.combat || selectedTrip), 
                        id: 'selected-origin', 
                        latitude: originCoord.lat,
                        longitude: originCoord.lng,
                        is_origin: true,
                        properties: { 
                            ...(selectedTrip.combat?.properties || {}), 
                            status_combat: selectedTrip.status || 'IN TRANSIT', 
                            asset_name: `ASAL: ${selectedTrip.origin_name || selectedTrip.combat?.asset_name || 'Gudang'}` 
                        } 
                    });
                }

                const destLat = (isEditingRoute && draftLocation) ? draftLocation.lat : parseFloat(selectedTrip.destination_lat);
                const destLng = (isEditingRoute && draftLocation) ? draftLocation.lng : parseFloat(selectedTrip.destination_lng);

                if (!isNaN(destLat) && !isNaN(destLng)) {
                    data.push({ 
                        id: 'selected-destination', 
                        latitude: destLat, 
                        longitude: destLng,
                        is_destination: true,
                        properties: { 
                            asset_name: `TUJUAN: ${selectedTrip.destination_name}`, 
                            status_combat: selectedTrip.status || 'IN TRANSIT' 
                        } 
                    });
                }

                if (selectedTrip.status === 'IN_TRANSIT') {
                    let driverLat = liveDriverMarker?.latitude || null;
                    let driverLng = liveDriverMarker?.longitude || null;

                    if (!driverLat && liveGpsCoords.length > 0) {
                        const lastCoord = liveGpsCoords[liveGpsCoords.length - 1];
                        driverLng = lastCoord[0];
                        driverLat = lastCoord[1];
                    } else if (!driverLat && (selectedTrip.latest_coordinate || selectedTrip.latestCoordinate)) {
                        const c = selectedTrip.latest_coordinate || selectedTrip.latestCoordinate;
                        driverLat = parseFloat(c.latitude);
                        driverLng = parseFloat(c.longitude);
                    }

                    if (driverLat && driverLng) {
                        const currentBearing = liveDriverMarker?.bearing || driverBearing || 0;
                        const currentSpeed = parseFloat(liveDriverMarker?.speed || 0);

                        data.push({
                            id: 'selected-driver-live',
                            latitude: driverLat,
                            longitude: driverLng,
                            is_driver: true,
                            bearing: currentBearing,
                            speed: currentSpeed,
                            customIcon: createCombatTruckIcon({
                                bearing: currentBearing,
                                isMoving: currentSpeed > 0.5,
                                status: 'IN_TRANSIT',
                                assetName: selectedTrip.combat?.asset_name || 'Unit COMBAT'
                            }),
                            properties: {
                                asset_name: `POSISI DRIVER: ${selectedTrip.pic_name || 'Tim Pelaksana'}`,
                                status_combat: 'IN TRANSIT',
                                note: `Kecepatan: ${currentSpeed.toFixed(1)} km/h • Bearing: ${currentBearing}°`
                            }
                        });
                    }
                }
            }
            return data;
        }
        return [];
    }, [activeMapRaw, viewMode, isCreatingRoute, draftLocation, draftSelectedCombat, selectedTrip, isEditingRoute, liveGpsCoords, liveDriverMarker, driverBearing]);

    const activePolylineCoords = useMemo(() => {
        if (selectedTripInfo && Array.isArray(routeHistory) && routeHistory.length >= 2) {
            return routeHistory;
        }

        if (Array.isArray(liveGpsCoords) && liveGpsCoords.length >= 2) {
            return liveGpsCoords;
        }

        return [];
    }, [selectedTripInfo, routeHistory, liveGpsCoords]);

    const filteredDropdownTrips = useMemo(() => {
        if (!searchTrip.trim()) return allTrips;
        const q = searchTrip.toLowerCase();
        return allTrips.filter(t => 
            String(t.combat?.asset_name || '').toLowerCase().includes(q) ||
            String(t.destination_name || '').toLowerCase().includes(q) ||
            String(t.pic_name || '').toLowerCase().includes(q) ||
            String(t.combat?.sn || '').toLowerCase().includes(q)
        );
    }, [allTrips, searchTrip]);

    return (
        <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-xs relative">
            <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2.5 relative z-10">
                <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-lg">
                    <button 
                        onClick={() => { 
                            setViewMode('dashboard'); 
                            setIsCreatingRoute(false); 
                            setIsEditingRoute(false);
                            setDraftLocation(null); 
                            setDraftSelectedCombat(null); 
                        }} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer ${
                            viewMode === 'dashboard' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        Peta Dashboard
                    </button>

                    <button 
                        onClick={() => {
                            setViewMode('rute');
                            if (selectedTrip) {
                                handleSelectTripFromDropdown(selectedTrip);
                            } else if (allTrips.length > 0) {
                                handleSelectTripFromDropdown(allTrips[0]);
                            } else if (activeTrip) {
                                handleSelectTripFromDropdown(activeTrip);
                            } else {
                                setIsCreatingRoute(true);
                            }
                        }} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer ${
                            viewMode === 'rute' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        Mode Rute
                    </button>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                    {viewMode === 'rute' && (
                        <>
                            <button 
                                onClick={() => {
                                    setIsCreatingRoute(true);
                                    setIsEditingRoute(false);
                                    setSelectedTrip(null);
                                    setDraftLocation(null);
                                    setDraftSelectedCombat(null);
                                    setShowDetailCard(true);
                                }} 
                                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
                                    isCreatingRoute ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                                }`}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Buat Rute Baru</span>
                            </button>

                            <button 
                                type="button"
                                onClick={handleManualRefresh}
                                disabled={isRefreshing}
                                title="Refresh data rute dan jejak GPS supir"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-500' : ''}`} />
                                <span>Refresh</span>
                            </button>

                            <button 
                                onClick={() => setViewMode('history')} 
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                            >
                                <History className="w-3.5 h-3.5" />
                                <span>Riwayat Trip</span>
                            </button>

                            <DropdownMenu onOpenChange={(open) => { if (!open) setSearchTrip(''); }}>
                                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer outline-none max-w-[220px]">
                                    <RouteIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                    <span className="truncate">
                                        {selectedTrip ? `${selectedTrip.combat?.asset_name || selectedTrip.destination_name}` : `Pilih Rute (${allTrips.length})`}
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5 opacity-70" />
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end" className="w-80 max-h-80 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-1 shadow-2xl z-50 rounded-xl">
                                    <DropdownMenuSearchInput 
                                        value={searchTrip} 
                                        onChange={(e) => setSearchTrip(e.target.value)} 
                                        onKeyDown={(e) => e.stopPropagation()} 
                                        placeholder="Cari rute, unit, atau tujuan..." 
                                    />

                                    {filteredDropdownTrips.length === 0 ? (
                                        <div className="px-3 py-4 text-xs text-slate-400 text-center">Tidak ada rute ditemukan</div>
                                    ) : (
                                        filteredDropdownTrips.map((tripItem) => {
                                            const isSelected = selectedTrip?.id === tripItem.id;
                                            const st = tripItem.status || 'COMPLETED';

                                            return (
                                                <DropdownMenuItem 
                                                    key={tripItem.id}
                                                    onClick={() => handleSelectTripFromDropdown(tripItem)}
                                                    className={`cursor-pointer py-2 px-2.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                                        isSelected ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    <div className="flex flex-col text-left pr-2 truncate">
                                                        <span className="font-semibold text-xs truncate">{tripItem.combat?.asset_name || 'Unit COMBAT'}</span>
                                                        <span className="text-[10px] text-slate-400 truncate mt-0.5">Tujuan: {tripItem.destination_name} • PIC: {tripItem.pic_name}</span>
                                                    </div>
                                                    <span className={`shrink-0 px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border ${
                                                        st === 'IN_TRANSIT' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                        st === 'ASSIGNED' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                        {st}
                                                    </span>
                                                </DropdownMenuItem>
                                            );
                                        })
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}

                    {viewMode === 'dashboard' && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1 select-none">
                            <strong className="font-bold text-slate-700 dark:text-slate-200">{validLocationCount}</strong> / {totalCombat} Terdeteksi
                        </span>
                    )}
                </div>
            </div>

            {/* AREA RENDER PETA DAN MODAL */}
            <div className="p-0 relative">
                <Map 
                    onMapClick={handleMapClick}
                    data={finalMapData} 
                    trackHistory={activePolylineCoords}
                    statusKey={(item) => normalizeStatus(item.properties?.status_combat || item.status_combat || item.status_raw || item.status)}
                    statusConfig={COMBAT_STATUS_CONFIG}
                    getPopupData={getCombatPopupData}
                />

                {viewMode === 'rute' && isCreatingRoute && (
                    <ModalTrackingCombat 
                        mode="create"
                        combatList={combatList}
                        draftLocation={draftLocation}
                        onClose={() => { 
                            setIsCreatingRoute(false);
                            setDraftLocation(null); 
                            setDraftSelectedCombat(null); 
                        }}
                        onCombatSelect={(combat) => setDraftSelectedCombat(combat)}
                        onSuccess={handleNewTripCreated}
                    />
                )}

                {viewMode === 'rute' && selectedTrip && !isCreatingRoute && isEditingRoute && (
                    <EditTrackCombat 
                        trip={selectedTrip}
                        draftLocation={draftLocation}
                        onClose={() => {
                            setIsEditingRoute(false);
                            setDraftLocation(null);
                        }}
                        onSuccess={handleEditSuccess}
                    />
                )}

                {viewMode === 'rute' && selectedTrip && !isCreatingRoute && !isEditingRoute && showDetailCard && (
                    <ModalTrackingCombat 
                        mode="detail"
                        trip={selectedTrip}
                        onClose={() => setShowDetailCard(false)}
                        onStartEdit={() => {
                            setIsEditingRoute(true);
                            setDraftLocation(null);
                        }}
                        onDelete={handleDeleteTrip}
                    />
                )}
            </div>
        </div>
    );
}
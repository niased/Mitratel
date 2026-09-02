import L from 'leaflet';

/**
 * Generator Leaflet DivIcon khusus armada COMBAT
 * Mendukung rotasi bearing arah hadap, radar pulse, dan indikator status.
 */
export function createCombatTruckIcon({
    bearing = 0,
    isMoving = true,
    status = 'IN_TRANSIT',
    assetName = 'COMBAT',
} = {}) {
    const st = String(status || '').toUpperCase().trim();
    const isTransit = st.includes('TRANSIT') || st === 'IN_TRANSIT';
    const isOnsite = st.includes('ONSITE');
    const isReady = st.includes('READY');

    // Skema warna aksen marker
    const borderColor = isTransit
        ? '#38bdf8' // Sky Blue (Sedang Melaju)
        : isOnsite
        ? '#10b981' // Emerald (On-Site)
        : isReady
        ? '#06b6d4' // Cyan (Standby)
        : '#f43f5e'; // Rose (Broken / Inop)

    const html = `
        <div class="relative flex items-center justify-center w-12 h-12 select-none">
            <!-- Efek Gelombang Radar GPS Aktif -->
            ${isMoving && isTransit ? `
                <div class="absolute w-12 h-12 rounded-full bg-sky-500/25 radar-signal-wave pointer-events-none"></div>
                <div class="absolute w-7 h-7 rounded-full bg-sky-400/40 animate-pulse pointer-events-none"></div>
            ` : ''}

            <!-- Wadah Rotasi Berdasarkan Sudut Bearing -->
            <div class="combat-truck-rotator" style="transform: rotate(${bearing}deg);">
                <div 
                    class="w-9 h-9 rounded-xl bg-slate-900 border-2 flex items-center justify-center text-white shadow-xl"
                    style="border-color: ${borderColor}; box-shadow: 0 4px 14px ${borderColor}55;"
                    title="${assetName}"
                >
                    <!-- Ikon Truk COMBAT SVG -->
                    <svg class="w-5 h-5" style="color: ${borderColor};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                        <path d="M15 18H9"/>
                        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                        <circle cx="17" cy="18" r="2"/>
                        <circle cx="7" cy="18" r="2"/>
                    </svg>
                </div>

                <!-- Panah Penunjuk Arah Moncong Depan -->
                <div 
                    class="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px]"
                    style="border-bottom-color: ${borderColor};"
                ></div>
            </div>
        </div>
    `;

    return L.divIcon({
        className: 'smooth-moving-marker',
        html: html,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -22],
    });
}

export default createCombatTruckIcon;
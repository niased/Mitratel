/**
 * Helper Rumus Geospasial & Navigasi COMBAT Tracker
 */

/**
 * Menghitung sudut arah perjalanan (Bearing Angle) dalam derajat (0 - 360)
 * Digunakan untuk memutar moncong ikon armada mengikuti arah jalan.
 */
export function calculateBearing(startLat, startLng, endLat, endLng) {
    if (!startLat || !startLng || !endLat || !endLng) return 0;
    if (Number(startLat) === Number(endLat) && Number(startLng) === Number(endLng)) return 0;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;

    const lat1 = toRad(Number(startLat));
    const lat2 = toRad(Number(endLat));
    const dLng = toRad(Number(endLng) - Number(startLng));

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = toDeg(Math.atan2(y, x));
    return Math.round((bearing + 360) % 360);
}

/**
 * Menghitung jarak lurus dua titik koordinat (Rumus Haversine dalam KM)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius bumi dalam KM
    const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
    const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((Number(lat1) * Math.PI) / 180) *
            Math.cos((Number(lat2) * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
}

/**
 * Interpolasi titik koordinat di antara dua titik (untuk pergerakan bertahap)
 */
export function interpolatePosition(startLat, startLng, endLat, endLng, fraction = 0.5) {
    return {
        latitude: Number(startLat) + (Number(endLat) - Number(startLat)) * fraction,
        longitude: Number(startLng) + (Number(endLng) - Number(startLng)) * fraction,
    };
}
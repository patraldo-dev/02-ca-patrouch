/**
 * Geospatial utilities for Arbooty
 * Shared between client components and server-side capture validation
 */

// Haversine distance in meters between two lat/lng points
export function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Bearing in degrees [0, 360) from point 1 to point 2
export function calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Relative bearing [-180, 180] for projecting onto screen
// Negative = left of center, positive = right of center
export function relativeBearing(userHeading, targetBearing) {
    let rel = targetBearing - userHeading;
    if (rel > 180) rel -= 360;
    if (rel < -180) rel += 360;
    return rel;
}

/** Capture radius in meters */
export const CAPTURE_RADIUS_M = 55;

/** Max acceptable GPS accuracy for captures */
export const GPS_ACCURACY_THRESHOLD = 50;

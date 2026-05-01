/**
 * Geospatial utilities for Arbooty
 * Shared between client components and server-side capture validation
 */

const R_M = 6371000; // Earth radius in meters

/**
 * Haversine distance between two coordinates in meters
 */
export function haversine(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
        * Math.sin(dLon / 2) ** 2;
    return R_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Absolute bearing from point 1 to point 2 in degrees [0, 360)
 */
export function bearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
        - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

/**
 * Relative bearing from user heading to target.
 * Normalized to [-180, 180]: negative = left, positive = right.
 * Without normalization, markers "jump" when crossing 0°/360°.
 */
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

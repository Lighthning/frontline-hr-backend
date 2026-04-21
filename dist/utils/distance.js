"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWithinGeofence = exports.calculateDistance = void 0;
/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in meters
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
exports.calculateDistance = calculateDistance;
/**
 * Check if coordinates are within geofence radius
 * @param userLat User's latitude
 * @param userLng User's longitude
 * @param geofenceLat Geofence center latitude
 * @param geofenceLng Geofence center longitude
 * @param radiusMeters Geofence radius in meters
 * @returns true if within geofence
 */
const isWithinGeofence = (userLat, userLng, geofenceLat, geofenceLng, radiusMeters) => {
    const distance = (0, exports.calculateDistance)(userLat, userLng, geofenceLat, geofenceLng);
    return distance <= radiusMeters;
};
exports.isWithinGeofence = isWithinGeofence;
//# sourceMappingURL=distance.js.map
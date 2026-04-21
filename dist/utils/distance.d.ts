/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in meters
 */
export declare const calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
/**
 * Check if coordinates are within geofence radius
 * @param userLat User's latitude
 * @param userLng User's longitude
 * @param geofenceLat Geofence center latitude
 * @param geofenceLng Geofence center longitude
 * @param radiusMeters Geofence radius in meters
 * @returns true if within geofence
 */
export declare const isWithinGeofence: (userLat: number, userLng: number, geofenceLat: number, geofenceLng: number, radiusMeters: number) => boolean;
//# sourceMappingURL=distance.d.ts.map
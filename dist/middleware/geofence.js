"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGeofence = exports.getActiveGeofenceLocation = void 0;
const db_1 = __importDefault(require("../db"));
const distance_1 = require("../utils/distance");
const getActiveGeofenceLocation = async () => {
    const result = await db_1.default.query('SELECT * FROM geofence_locations WHERE is_active = true ORDER BY id LIMIT 1');
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};
exports.getActiveGeofenceLocation = getActiveGeofenceLocation;
const validateGeofence = async (userLat, userLng) => {
    const geofence = await (0, exports.getActiveGeofenceLocation)();
    if (!geofence) {
        // If no geofence configured, allow check-in/out
        return true;
    }
    return (0, distance_1.isWithinGeofence)(userLat, userLng, parseFloat(geofence.latitude.toString()), parseFloat(geofence.longitude.toString()), geofence.radius_meters);
};
exports.validateGeofence = validateGeofence;
//# sourceMappingURL=geofence.js.map
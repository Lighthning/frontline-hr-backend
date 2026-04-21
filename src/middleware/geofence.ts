import pool from '../db';
import { isWithinGeofence } from '../utils/distance';

export interface GeofenceLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export const getActiveGeofenceLocation = async (): Promise<GeofenceLocation | null> => {
  const result = await pool.query(
    'SELECT * FROM geofence_locations WHERE is_active = true ORDER BY id LIMIT 1'
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

export const validateGeofence = async (
  userLat: number,
  userLng: number
): Promise<boolean> => {
  const geofence = await getActiveGeofenceLocation();

  if (!geofence) {
    // If no geofence configured, allow check-in/out
    return true;
  }

  return isWithinGeofence(
    userLat,
    userLng,
    parseFloat(geofence.latitude.toString()),
    parseFloat(geofence.longitude.toString()),
    geofence.radius_meters
  );
};

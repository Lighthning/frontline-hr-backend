export interface GeofenceLocation {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    is_active: boolean;
}
export declare const getActiveGeofenceLocation: () => Promise<GeofenceLocation | null>;
export declare const validateGeofence: (userLat: number, userLng: number) => Promise<boolean>;
//# sourceMappingURL=geofence.d.ts.map
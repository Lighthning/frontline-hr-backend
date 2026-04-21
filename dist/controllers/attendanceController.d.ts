import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const checkIn: (req: AuthRequest, res: Response) => Promise<void>;
export declare const checkOut: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getTodayAttendance: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAttendanceHistory: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAttendanceStatus: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllAttendance: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAttendanceReport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getGeofence: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMyPolicy: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=attendanceController.d.ts.map
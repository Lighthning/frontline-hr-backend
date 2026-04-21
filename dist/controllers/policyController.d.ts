import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getEmployeePolicy: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMyPolicy: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateEmployeePolicy: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllGeofences: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createGeofence: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateGeofence: (req: AuthRequest, res: Response) => Promise<void>;
export declare const resetToDefault: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=policyController.d.ts.map
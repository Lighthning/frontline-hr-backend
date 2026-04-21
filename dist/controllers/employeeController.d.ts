import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getCurrentEmployee: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getEmployeeById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllEmployees: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createEmployee: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateEmployee: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteEmployee: (req: AuthRequest, res: Response) => Promise<void>;
export declare const toggleEmployeeActive: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateCurrentEmployee: (req: AuthRequest, res: Response) => Promise<void>;
export declare const uploadProfilePhoto: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=employeeController.d.ts.map
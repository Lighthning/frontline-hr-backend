import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const sendInvitation: (req: AuthRequest, res: Response) => Promise<void>;
export declare const validateInvitation: (req: Request, res: Response) => Promise<void>;
export declare const acceptInvitation: (req: Request, res: Response) => Promise<void>;
export declare const getAllInvitations: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=invitationController.d.ts.map
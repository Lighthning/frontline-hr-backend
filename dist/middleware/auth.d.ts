import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../utils/jwt';
export interface AuthRequest extends Request {
    user?: TokenPayload;
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (...allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map
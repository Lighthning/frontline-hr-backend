import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
export declare const uploadPhoto: multer.Multer;
export declare const compressPhoto: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const cleanupBuffer: (req: Request, res: Response, next: NextFunction) => void;
export declare const getStorageStats: () => {
    totalFiles: number;
    totalSizeMB: number;
    oldestFile: string | null;
};
export declare const uploadProfilePhoto: multer.Multer;
//# sourceMappingURL=upload.d.ts.map
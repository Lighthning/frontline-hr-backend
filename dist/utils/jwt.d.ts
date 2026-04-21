export interface TokenPayload {
    userId: number;
    email: string;
    role: string;
}
export declare const generateAccessToken: (payload: TokenPayload) => string;
export declare const generateRefreshToken: (payload: TokenPayload) => string;
export declare const verifyToken: (token: string) => TokenPayload;
export declare const getRefreshTokenExpiry: () => Date;
//# sourceMappingURL=jwt.d.ts.map
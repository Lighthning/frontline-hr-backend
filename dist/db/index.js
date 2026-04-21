"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
// Base pool configuration
const poolConfig = {
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
// Add SSL configuration for production (Railway PostgreSQL)
if (isProduction && databaseUrl) {
    poolConfig.ssl = {
        rejectUnauthorized: false,
    };
    console.log('Database: Production mode with SSL enabled');
}
else {
    console.log('Database: Development mode (local PostgreSQL)');
}
const pool = new pg_1.Pool(poolConfig);
pool.on('error', (err) => {
    console.error('Unexpected database pool error:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        timestamp: new Date().toISOString(),
    });
    process.exit(-1);
});
pool.on('connect', () => {
    console.log('Database connection established');
});
exports.default = pool;
//# sourceMappingURL=index.js.map
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

// Base pool configuration
const poolConfig: PoolConfig = {
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
} else {
  console.log('Database: Development mode (local PostgreSQL)');
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', {
    message: err.message,
    stack: err.stack,
    code: (err as any).code,
    timestamp: new Date().toISOString(),
  });
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('Database connection established');
});

export default pool;

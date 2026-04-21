import app from './app';
import pool from './db';
import { getStorageStats } from './middleware/upload';

const PORT = process.env.PORT || 5001;
const MEMORY_WARNING_MB = 400; // Warn if over 400MB RSS

// Environment validation - fail fast on startup
const validateEnvironment = (): void => {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Validate JWT_SECRET length (must be 32+ chars for security)
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    console.error(`❌ JWT_SECRET must be at least 32 characters (current: ${jwtSecret.length})`);
    process.exit(1);
  }

  console.log('✓ Environment validation passed');
};

// Graceful shutdown handler
const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close database pool
    await pool.end();
    console.log('✓ Database pool closed');

    console.log('✓ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  try {
    // Validate environment before starting
    validateEnvironment();

    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected successfully');

    const server = app.listen(PORT, () => {
      console.log('\n===========================================');
      console.log(`Frontline HR API v1.0`);
      console.log(`===========================================`);
      console.log(`Port:        ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Docs:        http://localhost:${PORT}/`);
      console.log(`===========================================\n`);

      // Log storage stats on startup
      const stats = getStorageStats();
      console.log(`[Storage] ${stats.totalFiles} photos, ${stats.totalSizeMB}MB used`);

      // Memory monitoring - check every minute
      setInterval(() => {
        const used = process.memoryUsage();
        const rssMB = Math.round(used.rss / 1024 / 1024);
        const heapMB = Math.round(used.heapUsed / 1024 / 1024);

        if (rssMB > MEMORY_WARNING_MB) {
          console.warn(`[Memory] ⚠️  High memory usage: RSS=${rssMB}MB, Heap=${heapMB}MB`);
        }
      }, 60000); // Check every minute
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

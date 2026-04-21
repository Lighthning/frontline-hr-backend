import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pool from '../db/index';

dotenv.config();

interface SeedResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Production seed script for Frontline HR System
 * Creates super admin account, default attendance policy, and main office geofence
 *
 * Required environment variables:
 * - SUPER_ADMIN_PASSWORD (min 16 chars)
 * Optional environment variables:
 * - SUPER_ADMIN_EMAIL (default: admin@frontline.sa)
 * - OFFICE_NAME (default: Frontline Solutions HQ)
 * - OFFICE_LAT (default: 24.7136)
 * - OFFICE_LNG (default: 46.6753)
 * - OFFICE_RADIUS (default: 200)
 */

async function seedProduction(): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('\n🚀 Starting production seed script...\n');

    // Step 1: Validate environment variables
    console.log('📋 Step 1: Validating environment variables...');
    const validationResult = validateEnvironment();
    if (!validationResult.success) {
      throw new Error(validationResult.message);
    }
    console.log('✅ Environment validation passed\n');

    // Get environment variables with defaults
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@frontline.sa';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD!;
    const officeName = process.env.OFFICE_NAME || 'Frontline Solutions HQ';
    const officeLat = parseFloat(process.env.OFFICE_LAT || '24.7136');
    const officeLng = parseFloat(process.env.OFFICE_LNG || '46.6753');
    const officeRadius = parseInt(process.env.OFFICE_RADIUS || '200', 10);

    // Start transaction
    await client.query('BEGIN');
    console.log('🔄 Transaction started\n');

    // Step 2: Create super admin account
    console.log('👤 Step 2: Creating super admin account...');
    const adminResult = await createSuperAdmin(client, {
      email: superAdminEmail,
      password: superAdminPassword,
    });
    if (adminResult.success) {
      console.log(`✅ ${adminResult.message}`);
      console.log(`   Email: ${superAdminEmail}`);
      console.log(`   Employee ID: SA001`);
      console.log(`   Role: admin\n`);
    } else {
      console.log(`ℹ️  ${adminResult.message}\n`);
    }

    // Step 3: Create default attendance policy for admin
    console.log('📝 Step 3: Creating default attendance policy for admin...');
    const policyResult = await createAttendancePolicy(client, adminResult.data.userId);
    if (policyResult.success) {
      console.log(`✅ ${policyResult.message}`);
      console.log(`   Geofence Override: remote`);
      console.log(`   Photo Required: false`);
      console.log(`   Allow Remote: true\n`);
    } else {
      console.log(`ℹ️  ${policyResult.message}\n`);
    }

    // Step 4: Create/update main office geofence
    console.log('📍 Step 4: Creating main office geofence...');
    const geofenceResult = await createGeofence(client, {
      name: officeName,
      latitude: officeLat,
      longitude: officeLng,
      radius: officeRadius,
    });
    if (geofenceResult.success) {
      console.log(`✅ ${geofenceResult.message}`);
      console.log(`   Name: ${officeName}`);
      console.log(`   Location: ${officeLat}, ${officeLng}`);
      console.log(`   Radius: ${officeRadius}m`);
      console.log(`   Branch Code: HQ001`);
      console.log(`   Address: Riyadh, Saudi Arabia\n`);
    } else {
      console.log(`ℹ️  ${geofenceResult.message}\n`);
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully\n');

    console.log('🎉 Production seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Super Admin: ${adminResult.success ? 'Created' : 'Already exists'}`);
    console.log(`   - Attendance Policy: ${policyResult.success ? 'Created' : 'Already exists'}`);
    console.log(`   - Main Office Geofence: ${geofenceResult.success ? 'Created/Updated' : 'Already exists'}`);
    console.log('\n');

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('\n❌ Error during production seed:', error);
    console.error('🔄 Transaction rolled back\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): SeedResult {
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!password) {
    return {
      success: false,
      message: 'SUPER_ADMIN_PASSWORD environment variable is required',
    };
  }

  if (password.length < 16) {
    return {
      success: false,
      message: 'SUPER_ADMIN_PASSWORD must be at least 16 characters long',
    };
  }

  return {
    success: true,
    message: 'Environment validation passed',
  };
}

/**
 * Create super admin account
 */
async function createSuperAdmin(
  client: any,
  data: { email: string; password: string }
): Promise<SeedResult> {
  try {
    // Check if admin already exists
    const existingAdmin = await client.query(
      'SELECT id, email, employee_id FROM users WHERE email = $1 OR employee_id = $2',
      [data.email, 'SA001']
    );

    if (existingAdmin.rows.length > 0) {
      return {
        success: false,
        message: 'Super admin already exists',
        data: { userId: existingAdmin.rows[0].id },
      };
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create super admin
    const result = await client.query(
      `INSERT INTO users (
        employee_id,
        full_name,
        email,
        password_hash,
        role,
        department,
        designation,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, employee_id`,
      [
        'SA001',
        'Super Admin',
        data.email,
        passwordHash,
        'admin',
        'Administration',
        'System Administrator',
        true,
      ]
    );

    return {
      success: true,
      message: 'Super admin created successfully',
      data: { userId: result.rows[0].id },
    };
  } catch (error) {
    throw new Error(`Failed to create super admin: ${(error as Error).message}`);
  }
}

/**
 * Create default attendance policy for admin
 */
async function createAttendancePolicy(
  client: any,
  userId: number
): Promise<SeedResult> {
  try {
    // Check if attendance_policies table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'attendance_policies'
      )
    `);

    if (!tableExists.rows[0].exists) {
      // Create attendance_policies table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS attendance_policies (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          geofence_override VARCHAR(20) DEFAULT 'required', -- required, optional, remote
          photo_required BOOLEAN DEFAULT true,
          allow_remote BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id)
        )
      `);
    }

    // Check if policy already exists for this user
    const existingPolicy = await client.query(
      'SELECT id FROM attendance_policies WHERE user_id = $1',
      [userId]
    );

    if (existingPolicy.rows.length > 0) {
      return {
        success: false,
        message: 'Attendance policy already exists for admin',
        data: { policyId: existingPolicy.rows[0].id },
      };
    }

    // Create attendance policy
    const result = await client.query(
      `INSERT INTO attendance_policies (
        user_id,
        geofence_override,
        photo_required,
        allow_remote
      ) VALUES ($1, $2, $3, $4)
      RETURNING id`,
      [userId, 'remote', false, true]
    );

    return {
      success: true,
      message: 'Default attendance policy created for admin',
      data: { policyId: result.rows[0].id },
    };
  } catch (error) {
    throw new Error(`Failed to create attendance policy: ${(error as Error).message}`);
  }
}

/**
 * Create or update main office geofence
 */
async function createGeofence(
  client: any,
  data: {
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  }
): Promise<SeedResult> {
  try {
    // Check if geofence_locations table needs additional columns
    const columnsExist = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'geofence_locations'
        AND column_name IN ('branch_code', 'address')
    `);

    // Add missing columns if needed
    if (columnsExist.rows.length < 2) {
      const hasbranchCode = columnsExist.rows.some((r: any) => r.column_name === 'branch_code');
      const hasAddress = columnsExist.rows.some((r: any) => r.column_name === 'address');

      if (!hasbranchCode) {
        await client.query(`
          ALTER TABLE geofence_locations
          ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20)
        `);
      }

      if (!hasAddress) {
        await client.query(`
          ALTER TABLE geofence_locations
          ADD COLUMN IF NOT EXISTS address TEXT
        `);
      }
    }

    // Check if geofence already exists (by branch_code)
    const existingGeofence = await client.query(
      'SELECT id FROM geofence_locations WHERE branch_code = $1',
      ['HQ001']
    );

    if (existingGeofence.rows.length > 0) {
      // Update existing geofence
      await client.query(
        `UPDATE geofence_locations
         SET name = $1,
             latitude = $2,
             longitude = $3,
             radius_meters = $4,
             address = $5,
             is_active = $6
         WHERE branch_code = $7`,
        [
          data.name,
          data.latitude,
          data.longitude,
          data.radius,
          'Riyadh, Saudi Arabia',
          true,
          'HQ001',
        ]
      );

      return {
        success: false,
        message: 'Main office geofence updated',
        data: { geofenceId: existingGeofence.rows[0].id },
      };
    }

    // Create new geofence
    const result = await client.query(
      `INSERT INTO geofence_locations (
        name,
        latitude,
        longitude,
        radius_meters,
        branch_code,
        address,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        data.name,
        data.latitude,
        data.longitude,
        data.radius,
        'HQ001',
        'Riyadh, Saudi Arabia',
        true,
      ]
    );

    return {
      success: true,
      message: 'Main office geofence created successfully',
      data: { geofenceId: result.rows[0].id },
    };
  } catch (error) {
    throw new Error(`Failed to create geofence: ${(error as Error).message}`);
  }
}

// Run the seed script
seedProduction();

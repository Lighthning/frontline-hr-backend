-- Frontline HR Database Schema
-- Phase 1: Attendance & Employee Profiles

-- Users / Employees
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(50),
  designation VARCHAR(100),
  role VARCHAR(20) DEFAULT 'employee', -- employee, manager, hr, admin
  profile_photo_url VARCHAR(255),
  date_of_joining DATE,
  iqama_number VARCHAR(20),
  iqama_expiry DATE,
  nationality VARCHAR(50),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  check_in_time TIMESTAMP,
  check_in_photo_url VARCHAR(255),
  check_in_lat DECIMAL(10, 8),
  check_in_lng DECIMAL(11, 8),
  check_in_within_geofence BOOLEAN DEFAULT false,
  check_out_time TIMESTAMP,
  check_out_photo_url VARCHAR(255),
  check_out_lat DECIMAL(10, 8),
  check_out_lng DECIMAL(11, 8),
  check_out_within_geofence BOOLEAN DEFAULT false,
  total_hours DECIMAL(4, 2),
  status VARCHAR(20) DEFAULT 'present', -- present, absent, late, half_day
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Geofence Locations (configurable by admin)
CREATE TABLE IF NOT EXISTS geofence_locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- Insert default geofence (Frontline HQ - Riyadh)
INSERT INTO geofence_locations (name, latitude, longitude, radius_meters)
VALUES ('Frontline Solutions HQ', 24.7136, 46.6753, 200)
ON CONFLICT DO NOTHING;

-- Insert default admin user
-- Password: Admin@123 (hashed with bcrypt)
INSERT INTO users (employee_id, full_name, email, password_hash, role, department, designation)
VALUES (
  'FL001',
  'System Admin',
  'admin@frontline.sa',
  '$2a$10$Vmvkh1LEbFfqdWFRMG/ZG.OOfmKb0aa7O/aDJBMLoS6UHqvhdBY9K',
  'admin',
  'IT',
  'System Administrator'
)
ON CONFLICT (employee_id) DO NOTHING;

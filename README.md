# Frontline HR Backend - Phase 1

Complete backend implementation for Frontline HR Attendance & Employee Management System.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Create PostgreSQL database
createdb frontline_hr

# Run schema
psql -U postgres -d frontline_hr -f src/db/schema.sql
```

### 3. Configure Environment
Copy `.env` and update if needed (default values are pre-configured).

### 4. Run Development Server
```bash
npm run dev
```

Server runs on `http://localhost:5001`

### 5. Build for Production
```bash
npm run build
npm start
```

## Default Admin Access

- **Email:** admin@frontline.sa
- **Password:** Admin@123

## Project Structure

```
backend/
├── src/
│   ├── app.ts                 # Express configuration
│   ├── server.ts              # Server entry point
│   ├── db/
│   │   ├── index.ts           # Database connection
│   │   └── schema.sql         # Schema & seed data
│   ├── middleware/
│   │   ├── auth.ts            # JWT & RBAC
│   │   ├── upload.ts          # File uploads
│   │   └── geofence.ts        # GPS validation
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── attendance.ts
│   │   ├── employees.ts
│   │   └── admin.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── attendanceController.ts
│   │   ├── employeeController.ts
│   │   └── adminController.ts
│   └── utils/
│       ├── jwt.ts             # Token management
│       └── distance.ts        # Geofence calculations
├── uploads/                   # File storage
├── dist/                      # Compiled JavaScript
└── API_DOCUMENTATION.md       # Complete API docs
```

## Key Features

### Authentication & Authorization
- JWT-based authentication (15min access, 7day refresh)
- Role-based access control (admin, hr, manager, employee)
- Rate limiting on login (5 attempts/15min)
- Secure password hashing (bcrypt)

### Attendance Management
- Photo-verified check-in/check-out
- GPS geofence validation (Haversine formula)
- Automatic status detection (present, late, half_day, absent)
- Total hours calculation
- Complete attendance history & reporting

### Employee Management
- Full CRUD operations
- Profile photo uploads
- Department & role management
- Soft delete (deactivation)
- Emergency contact information

### Admin Dashboard
- Real-time statistics
- Geofence configuration
- Department-wise attendance
- Comprehensive reporting

## API Endpoints

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/api/auth/login` | POST | Public | Login |
| `/api/auth/refresh` | POST | Public | Refresh token |
| `/api/auth/logout` | POST | Public | Logout |
| `/api/auth/me` | GET | Authenticated | Current user |
| `/api/attendance/check-in` | POST | Authenticated | Check in |
| `/api/attendance/check-out` | POST | Authenticated | Check out |
| `/api/attendance/today` | GET | Authenticated | Today's record |
| `/api/attendance/history` | GET | Authenticated | History |
| `/api/attendance/status` | GET | Authenticated | Check-in status |
| `/api/attendance/all` | GET | Admin/HR | All attendance |
| `/api/attendance/report` | GET | Admin/HR | Filtered report |
| `/api/employees/me` | GET | Authenticated | Current profile |
| `/api/employees/me` | PUT | Authenticated | Update profile |
| `/api/employees/me/photo` | POST | Authenticated | Upload photo |
| `/api/employees` | GET | Admin/HR | List all |
| `/api/employees` | POST | Admin/HR | Create employee |
| `/api/employees/:id` | GET | Admin/HR | Get employee |
| `/api/employees/:id` | PUT | Admin/HR | Update employee |
| `/api/employees/:id` | DELETE | Admin | Deactivate |
| `/api/admin/geofence` | GET | Admin/HR | Geofences |
| `/api/admin/geofence/:id` | PUT | Admin | Update geofence |
| `/api/admin/stats` | GET | Admin/HR | Dashboard stats |

## Technology Stack

- **Runtime:** Node.js 20+
- **Framework:** Express 4.18
- **Language:** TypeScript 5.3
- **Database:** PostgreSQL 14+
- **Authentication:** JWT (jsonwebtoken)
- **Password:** bcrypt
- **File Upload:** Multer
- **Security:** express-rate-limit, CORS

## Security Features

- Strict TypeScript mode (no `any` types)
- Parameterized SQL queries (SQL injection prevention)
- JWT token validation
- Role-based access control
- Rate limiting on auth endpoints
- File upload validation (type, size)
- Password hashing (bcrypt rounds=10)
- CORS configuration

## Attendance Logic

### Status Determination
- **Late:** Check-in after 9:30 AM
- **Half Day:** Total hours < 4
- **Present:** Normal attendance
- **Absent:** No check-in record

### Geofence Validation
- Default: 200m radius from HQ (24.7136, 46.6753)
- Uses Haversine formula for GPS distance
- Records within/outside geofence status
- Does not block attendance (logging only)

## File Uploads

### Attendance Photos
- Path: `/uploads/attendance/YYYY-MM/`
- Format: `{userId}_{timestamp}_{checkin|checkout}.jpg`
- Max size: 10MB
- Types: JPEG, PNG

### Profile Photos
- Path: `/uploads/profiles/`
- Format: `profile_{userId}_{timestamp}.jpg`
- Max size: 10MB
- Types: JPEG, PNG

## Database Schema

Tables:
- `users` - Employee profiles & authentication
- `attendance` - Daily check-in/out records
- `geofence_locations` - GPS validation zones
- `refresh_tokens` - Session management

All tables include proper indexes for performance.

## Development

```bash
# Install dependencies
npm install

# Run development server (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run production
npm start
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Update `.env` with production database URL
3. Build: `npm run build`
4. Start: `npm start`
5. Use process manager (PM2, systemd)
6. Setup reverse proxy (nginx)
7. Enable HTTPS
8. Configure CORS for production domains

## API Testing

See `API_DOCUMENTATION.md` for complete examples with curl commands.

## Contract Information

- **Project:** Frontline HR Management System
- **Phase:** 1 - Attendance & Employee Profiles
- **Contract Value:** 25,000 SAR
- **Delivery:** April 2026
- **Status:** Production Ready

## Support

For issues or questions, contact the development team.

---

**Built with production-grade code quality, security, and performance.**

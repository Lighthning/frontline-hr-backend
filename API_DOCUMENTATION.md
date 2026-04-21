# Frontline HR Backend API - Phase 1

## Overview
Production-ready Node.js/Express/TypeScript backend for Frontline HR Attendance & Employee Management System.

**Base URL:** `http://localhost:5001`
**Version:** 1.0.0

## Database Setup

```bash
# Initialize database
psql -U postgres -d frontline_hr -f src/db/schema.sql
```

**Default Admin Credentials:**
- Email: `admin@frontline.sa`
- Password: `Admin@123`

## Running the Server

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### Authentication (`/api/auth`)

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@frontline.sa",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": 1,
      "employeeId": "FL001",
      "fullName": "System Admin",
      "email": "admin@frontline.sa",
      "role": "admin",
      "department": "IT",
      "designation": "System Administrator"
    }
  }
}
```

**Rate Limit:** 5 attempts per 15 minutes

#### POST /api/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

#### POST /api/auth/logout
Invalidate refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

#### GET /api/auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <accessToken>
```

---

### Attendance (`/api/attendance`)

#### POST /api/attendance/check-in
Check in with selfie photo and GPS coordinates.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form Data:**
- `photo` (file): Selfie image (JPEG/PNG, max 10MB)
- `latitude` (number): GPS latitude
- `longitude` (number): GPS longitude

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "checkInTime": "2026-04-11T08:30:00.000Z",
    "withinGeofence": true,
    "status": "present"
  }
}
```

#### POST /api/attendance/check-out
Check out with selfie photo and GPS coordinates.

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form Data:**
- `photo` (file): Selfie image (JPEG/PNG, max 10MB)
- `latitude` (number): GPS latitude
- `longitude` (number): GPS longitude

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "checkOutTime": "2026-04-11T17:30:00.000Z",
    "totalHours": 9.0,
    "withinGeofence": true,
    "status": "present"
  }
}
```

#### GET /api/attendance/today
Get today's attendance record for current user.

#### GET /api/attendance/history
Get paginated attendance history for current user.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 30)

#### GET /api/attendance/status
Check if user is checked in today.

**Response:**
```json
{
  "success": true,
  "data": {
    "isCheckedIn": true,
    "isCheckedOut": false,
    "checkInTime": "2026-04-11T08:30:00.000Z",
    "checkOutTime": null
  }
}
```

#### GET /api/attendance/all (Admin/HR only)
Get all employees' attendance for a specific date.

**Query Parameters:**
- `date` (string, YYYY-MM-DD, default: today)

#### GET /api/attendance/report (Admin/HR only)
Get filtered attendance report.

**Query Parameters:**
- `startDate` (string, YYYY-MM-DD)
- `endDate` (string, YYYY-MM-DD)
- `department` (string)
- `status` (string: present, absent, late, half_day)

---

### Employees (`/api/employees`)

#### GET /api/employees/me
Get current employee's full profile.

#### PUT /api/employees/me
Update current employee's profile.

**Request:**
```json
{
  "phone": "+966501234567",
  "emergencyContactName": "John Doe",
  "emergencyContactPhone": "+966507654321"
}
```

#### POST /api/employees/me/photo
Upload profile photo.

**Headers:**
```
Content-Type: multipart/form-data
```

**Form Data:**
- `photo` (file): Profile image (JPEG/PNG, max 10MB)

#### GET /api/employees (Admin/HR only)
List all employees.

**Query Parameters:**
- `department` (string)
- `isActive` (boolean)

#### POST /api/employees (Admin/HR only)
Create new employee.

**Request:**
```json
{
  "employeeId": "FL002",
  "fullName": "Ahmed Ali",
  "email": "ahmed@frontline.sa",
  "password": "SecurePassword123",
  "phone": "+966501234567",
  "department": "Operations",
  "designation": "Field Manager",
  "role": "manager",
  "dateOfJoining": "2026-04-01",
  "iqamaNumber": "1234567890",
  "iqamaExpiry": "2028-12-31",
  "nationality": "Saudi Arabia"
}
```

#### GET /api/employees/:id (Admin/HR only)
Get single employee by ID.

#### PUT /api/employees/:id (Admin/HR only)
Update employee details.

#### DELETE /api/employees/:id (Admin only)
Deactivate employee (soft delete).

---

### Admin (`/api/admin`)

#### GET /api/admin/geofence (Admin/HR only)
Get all geofence locations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Frontline Solutions HQ",
      "latitude": 24.7136,
      "longitude": 46.6753,
      "radiusMeters": 200,
      "isActive": true,
      "createdAt": "2026-04-11T..."
    }
  ]
}
```

#### PUT /api/admin/geofence/:id (Admin only)
Update geofence location.

**Request:**
```json
{
  "name": "Frontline HQ - Updated",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "radiusMeters": 250,
  "isActive": true
}
```

#### GET /api/admin/stats (Admin/HR only)
Get dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEmployees": 50,
    "presentToday": 45,
    "absentToday": 5,
    "lateToday": 3,
    "checkedIn": 10,
    "checkedOut": 35,
    "departmentStats": [
      {
        "department": "Operations",
        "presentCount": 20
      }
    ]
  }
}
```

---

## Attendance Status Logic

- **Late:** Check-in after 9:30 AM
- **Half Day:** Total hours < 4 hours
- **Present:** Normal attendance
- **Absent:** No check-in record

## Geofence Validation

- Uses Haversine formula to calculate GPS distance
- Default geofence: 200 meters radius from HQ coordinates
- Records whether check-in/out was within geofence
- Does not block check-in/out if outside geofence (logs only)

## Photo Upload

### Attendance Photos
- **Path:** `/uploads/attendance/YYYY-MM/`
- **Naming:** `{userId}_{timestamp}_{checkin|checkout}.jpg`
- **Max Size:** 10MB
- **Allowed Types:** JPEG, PNG

### Profile Photos
- **Path:** `/uploads/profiles/`
- **Naming:** `profile_{userId}_{timestamp}.jpg`
- **Max Size:** 10MB
- **Allowed Types:** JPEG, PNG

## Authentication

- **Access Token:** JWT, 15 minutes expiry
- **Refresh Token:** JWT, 7 days expiry, stored in database
- **Header Format:** `Authorization: Bearer <token>`

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `400` Bad Request - Invalid input
- `401` Unauthorized - Missing or invalid token
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `413` Payload Too Large - File size exceeds limit
- `429` Too Many Requests - Rate limit exceeded
- `500` Internal Server Error

## Security Features

1. Password hashing with bcrypt (10 rounds)
2. JWT-based authentication
3. Role-based access control (RBAC)
4. Rate limiting on auth endpoints
5. SQL injection prevention (parameterized queries)
6. CORS enabled
7. File upload validation (MIME type, size)
8. Input validation at all endpoints

## Environment Variables

See `.env` file:
```
PORT=5001
DATABASE_URL=postgresql://postgres:password@localhost:5432/frontline_hr
JWT_SECRET=frontline_hr_jwt_secret_2026_super_secure
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
GEOFENCE_LAT=24.7136
GEOFENCE_LNG=46.6753
GEOFENCE_RADIUS=200
```

## File Structure

```
backend/src/
├── app.ts                    # Express app configuration
├── server.ts                 # Server entry point
├── db/
│   ├── index.ts              # PostgreSQL connection pool
│   └── schema.sql            # Database schema
├── middleware/
│   ├── auth.ts               # JWT verification & RBAC
│   ├── upload.ts             # Multer photo upload
│   └── geofence.ts           # Geofence validation
├── routes/
│   ├── auth.ts               # Auth routes
│   ├── attendance.ts         # Attendance routes
│   ├── employees.ts          # Employee routes
│   └── admin.ts              # Admin routes
├── controllers/
│   ├── authController.ts
│   ├── attendanceController.ts
│   ├── employeeController.ts
│   └── adminController.ts
└── utils/
    ├── jwt.ts                # JWT utilities
    └── distance.ts           # Haversine distance
```

## Development Notes

- TypeScript strict mode enabled
- All functions fully typed (no `any` types)
- Parameterized SQL queries prevent injection
- Error handling at all layers
- CORS enabled for all origins (development)
- Upload directories auto-created on first upload

## Testing the API

```bash
# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@frontline.sa","password":"Admin@123"}'

# Check-in
curl -X POST http://localhost:5001/api/attendance/check-in \
  -H "Authorization: Bearer <token>" \
  -F "photo=@selfie.jpg" \
  -F "latitude=24.7136" \
  -F "longitude=46.6753"
```

---

**Contract Value:** 25,000 SAR
**Phase:** 1 - Attendance & Employee Profiles
**Delivery Date:** April 2026

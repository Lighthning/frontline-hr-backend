# Deployment Checklist - Frontline HR Backend

## Pre-Deployment Verification

### 1. Database Setup
- [ ] PostgreSQL 14+ installed
- [ ] Database created: `frontline_hr`
- [ ] Schema executed: `psql -U postgres -d frontline_hr -f src/db/schema.sql`
- [ ] Default admin user created (FL001)
- [ ] Default geofence location created

### 2. Environment Configuration
- [ ] `.env` file exists
- [ ] `DATABASE_URL` points to correct database
- [ ] `JWT_SECRET` is secure and unique
- [ ] `PORT` is available (default: 5001)
- [ ] `GEOFENCE_LAT` and `GEOFENCE_LNG` set to office location
- [ ] `GEOFENCE_RADIUS` set appropriately (default: 200m)

### 3. Dependencies
- [ ] Node.js 20+ installed
- [ ] Dependencies installed: `npm install`
- [ ] No security vulnerabilities: `npm audit`

### 4. Build Verification
- [ ] TypeScript compiles: `npm run build`
- [ ] No TypeScript errors
- [ ] All 16 files compiled to JavaScript
- [ ] `dist/` directory created

### 5. File System
- [ ] `uploads/` directory writable
- [ ] `uploads/attendance/` auto-creates subdirectories
- [ ] `uploads/profiles/` directory accessible

## Testing Checklist

### 6. Authentication Testing
- [ ] Admin login works: `admin@frontline.sa` / `Admin@123`
- [ ] JWT tokens generated correctly
- [ ] Refresh token flow works
- [ ] Rate limiting enforces 5 attempts/15min
- [ ] Invalid credentials rejected

### 7. Attendance Testing
- [ ] Check-in with photo works
- [ ] GPS coordinates validated
- [ ] Geofence calculation correct
- [ ] Photo uploaded to correct path
- [ ] Check-out updates total hours
- [ ] Status determination correct (present/late/half_day)

### 8. Employee Management Testing
- [ ] Create new employee works
- [ ] Update employee profile works
- [ ] Upload profile photo works
- [ ] List all employees works
- [ ] Role-based access enforced (admin/hr/manager/employee)

### 9. Admin Features Testing
- [ ] Dashboard stats accurate
- [ ] Geofence update works
- [ ] Attendance reports filter correctly
- [ ] Department stats calculated

### 10. Security Testing
- [ ] Unauthorized requests rejected (401)
- [ ] Insufficient permissions blocked (403)
- [ ] SQL injection prevented (parameterized queries)
- [ ] File upload validates MIME types
- [ ] File size limit enforced (10MB)
- [ ] Passwords properly hashed (bcrypt)

## Production Deployment

### 11. Server Configuration
- [ ] `NODE_ENV=production` set
- [ ] Production database URL configured
- [ ] JWT secret changed from default
- [ ] CORS configured for production domain
- [ ] HTTPS enabled
- [ ] Reverse proxy configured (nginx/Apache)

### 12. Process Management
- [ ] PM2/systemd configured for auto-restart
- [ ] Log rotation configured
- [ ] Environment variables secured
- [ ] Server starts on boot

### 13. Performance
- [ ] Database connection pool configured
- [ ] Database indexes created
- [ ] Static file serving optimized
- [ ] Rate limiting configured

### 14. Monitoring
- [ ] Application logs captured
- [ ] Database logs monitored
- [ ] Error tracking configured
- [ ] Uptime monitoring enabled

### 15. Backup
- [ ] Database backup scheduled
- [ ] Upload files backed up
- [ ] Environment config backed up
- [ ] Recovery procedure documented

## Post-Deployment

### 16. Functional Verification
- [ ] API responds at production URL
- [ ] Admin login works
- [ ] Mobile app can connect
- [ ] Check-in/check-out works end-to-end
- [ ] Photo uploads successful
- [ ] Reports generate correctly

### 17. Load Testing
- [ ] Concurrent users tested
- [ ] Database performance acceptable
- [ ] API response times < 500ms
- [ ] Photo uploads don't block

### 18. Documentation
- [ ] API documentation shared with frontend team
- [ ] Admin credentials shared securely
- [ ] Database connection details documented
- [ ] Support contacts listed

## Quick Commands

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Database Reset (Development Only!)
```bash
psql -U postgres -d frontline_hr -f src/db/schema.sql
```

### Check Server Status
```bash
curl http://localhost:5001/
```

### Test Admin Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@frontline.sa","password":"Admin@123"}'
```

### Check Database Connection
```bash
psql -U postgres -d frontline_hr -c "SELECT COUNT(*) FROM users;"
```

## Environment Variables Reference

```env
PORT=5001
DATABASE_URL=postgresql://postgres:password@localhost:5432/frontline_hr
JWT_SECRET=frontline_hr_jwt_secret_2026_super_secure
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
GEOFENCE_LAT=24.7136
GEOFENCE_LNG=46.6753
GEOFENCE_RADIUS=200
```

## Default Credentials

**Admin Account:**
- Employee ID: FL001
- Email: admin@frontline.sa
- Password: Admin@123
- Role: admin

**Important:** Change admin password after first login in production!

## Support Contacts

- **Development Team:** [Contact Info]
- **Database Admin:** [Contact Info]
- **DevOps:** [Contact Info]

## Rollback Procedure

If issues occur:

1. Stop the server
2. Restore previous database backup
3. Restore previous code version
4. Restart server
5. Verify functionality
6. Investigate issue

## Success Criteria

- [ ] All API endpoints responding correctly
- [ ] No errors in logs
- [ ] Database connections stable
- [ ] Photo uploads working
- [ ] Geofence validation accurate
- [ ] Mobile app integration successful
- [ ] Admin dashboard functional
- [ ] Reports generating correctly

---

**Phase 1 Delivery Complete**
**Contract Value:** 25,000 SAR
**Status:** Production Ready ✓

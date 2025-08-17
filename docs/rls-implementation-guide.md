# RLS Implementation Guide for KH Therapy Database

## Overview
This guide will help you implement Row Level Security (RLS) on your KH Therapy database while maintaining all existing functionality. The implementation follows security best practices while ensuring your booking system continues to work seamlessly.

## 🛡️ Security Goals
- **Customers**: Can only access their own data
- **Admins**: Full access to all data
- **Anonymous Users**: Can create bookings and view public data only
- **Public Data**: Services, availability, and time slots remain accessible

## 📋 Pre-Implementation Checklist

### 1. Backup Your Database
```sql
-- Create a full backup before proceeding
pg_dump your_database > backup_before_rls.sql
```

### 2. Test Environment Setup
- Set up a staging environment with a copy of your production data
- Test the RLS implementation there first
- Verify all functionality works as expected

### 3. Current Database Analysis
Run the schema analysis script to understand your current setup:
```bash
node scripts/analyze-database-schema.js
```

## 🚀 Implementation Steps

### Step 1: Analyze Current Database State
```bash
# Run the analysis script to see current table access
node scripts/analyze-database-schema.js
```

**Expected Output:**
- List of all tables
- Current RLS status (should show all tables as accessible)
- Table structure analysis
- Recommendations for RLS implementation

### Step 2: Test Current Functionality
Before implementing RLS, test that your application works correctly:

1. **Test Booking Flow**:
   - Create a new booking from the website
   - Verify customer creation works
   - Check that booking data is stored correctly

2. **Test Admin Functions**:
   - Login to admin console
   - View bookings, customers, payments
   - Create invoices and payment requests

3. **Test Public Access**:
   - View services and availability without login
   - Ensure public pages load correctly

### Step 3: Implement RLS Policies
Run the RLS implementation script:

```sql
-- Execute this in your Supabase SQL editor
-- File: database/enable-rls-policies.sql
```

**What this script does:**
- Enables RLS on all sensitive tables
- Creates admin identification functions
- Implements role-based access policies
- Maintains existing functionality for anonymous booking creation
- Secures sensitive data while keeping public data accessible

### Step 4: Test RLS Implementation
Run the RLS testing script:
```bash
node scripts/test-rls-policies.js
```

**Expected Test Results:**
- ✅ Anonymous access to public tables (services, availability)
- ✅ Anonymous booking creation still works
- ✅ Protected tables deny anonymous access
- ✅ Service role has full access
- ✅ Complete booking flow works end-to-end

### Step 5: Verify Application Functionality

After implementing RLS, test all major functions:

#### A. Public Website Functions
- [ ] Home page loads correctly
- [ ] Services page shows all services
- [ ] Booking form allows new bookings
- [ ] Booking confirmation emails are sent

#### B. Admin Console Functions
- [ ] Admin login works
- [ ] Dashboard shows statistics
- [ ] Bookings tab displays all bookings
- [ ] Customer management works
- [ ] Invoice creation and management
- [ ] Payment request functionality
- [ ] Reports generation

#### C. User Portal Functions (if implemented)
- [ ] User registration and login
- [ ] Users can view only their own data
- [ ] Profile updates work correctly

## 🔍 Policy Details

### Table Access Matrix

| Table | Anonymous | Authenticated User | Admin |
|-------|-----------|-------------------|-------|
| `services` | ✅ Read | ✅ Read | ✅ All |
| `availability` | ✅ Read | ✅ Read | ✅ All |
| `services_time_slots` | ✅ Read | ✅ Read | ✅ All |
| `customers` | ✅ Insert only | ✅ Own data only | ✅ All |
| `bookings` | ✅ Insert only | ✅ Own bookings only | ✅ All |
| `invoices` | ❌ No access | ✅ Own invoices only | ✅ All |
| `payments` | ❌ No access | ✅ Own payments only | ✅ All |
| `payment_requests` | ❌ No access | ✅ Own requests only | ✅ All |
| `admins` | ❌ No access | ❌ No access | ✅ All |
| `payment_gateways` | ❌ No access | ❌ No access | ✅ All |

### Key Policy Features

1. **Admin Detection**: Uses JWT email to identify admin users
2. **User Context**: Links users to customers via `auth_user_id`
3. **Booking Flow**: Allows anonymous booking creation (existing functionality)
4. **Data Isolation**: Users can only see their own sensitive data
5. **Public Access**: Non-sensitive data remains publicly accessible

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### Issue: Anonymous booking creation fails
**Solution**: Check that the customer and booking insert policies allow anonymous access:
```sql
-- Verify these policies exist
SELECT * FROM pg_policies WHERE tablename IN ('customers', 'bookings') AND roles @> '{anon}';
```

#### Issue: Admin can't access data
**Solution**: Verify admin email is in the admins table and JWT contains correct email:
```sql
-- Check admin records
SELECT email FROM admins;

-- Test admin function
SELECT auth.is_admin();
```

#### Issue: Users can't see their own data
**Solution**: Check that `auth_user_id` is properly populated in customers table:
```sql
-- Check customer auth linking
SELECT id, email, auth_user_id FROM customers WHERE auth_user_id IS NOT NULL;
```

### Rollback Plan

If you need to disable RLS temporarily:
```sql
-- Disable RLS on all tables (emergency rollback)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests DISABLE ROW LEVEL SECURITY;
-- ... repeat for other tables
```

## 📊 Monitoring and Validation

### Post-Implementation Monitoring

1. **Application Logs**: Monitor for RLS-related errors
2. **User Reports**: Watch for access issues from users
3. **Performance**: Check if RLS impacts query performance
4. **Security**: Verify data isolation is working correctly

### Validation Queries

```sql
-- Check RLS status on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- List all policies
SELECT schemaname, tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Test admin function
SELECT auth.is_admin() as is_admin_user;

-- Check customer auth integration
SELECT COUNT(*) as total_customers, 
       COUNT(auth_user_id) as linked_to_auth 
FROM customers;
```

## ✅ Success Criteria

Your RLS implementation is successful when:

- [ ] All existing functionality continues to work
- [ ] Anonymous users can only access public data and create bookings
- [ ] Authenticated users can only see their own data
- [ ] Admins have full access to all data
- [ ] No unauthorized data access is possible
- [ ] Performance remains acceptable
- [ ] Test scripts pass completely

## 🔐 Security Benefits

After implementing RLS, your database will have:

1. **Data Isolation**: Users cannot access other users' sensitive data
2. **Admin Protection**: Admin data is only accessible to authenticated admins
3. **Principle of Least Privilege**: Each role has minimum necessary access
4. **Defense in Depth**: Database-level security beyond application logic
5. **Compliance Ready**: Supports GDPR and other privacy regulations

## 📞 Support

If you encounter issues during implementation:

1. Review the troubleshooting section
2. Check the test script results
3. Verify your admin user is properly configured
4. Test with the schema analysis script
5. Consider rolling back and trying again in staging

Remember: **Always test thoroughly in a staging environment before deploying to production!**

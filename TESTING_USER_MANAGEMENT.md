# User Management Testing Guide

## 🎯 **Understanding the User Flow**

### Current System:
1. **Customer Creation**: When someone submits a booking form, a customer record is automatically created in the `customers` table
2. **No Authentication**: Currently, customers are created without any authentication (no `auth_user_id`)
3. **No User Portal Access**: There's no way for customers to log in and view their information

### New User Management System:
1. **Supabase Auth Integration**: Customers can create accounts and log in
2. **Customer Linking**: Auth users are linked to existing customer records
3. **Self-Service Portal**: Users can view their invoices, payments, and bookings

## 🚀 **COMPLETED: Integration with Main App**

✅ **Added User Portal Route**: `/my-account`
✅ **Added Navigation**: "My Account" button in header (desktop & mobile)
✅ **Wrapped App**: `UserAuthProvider` context added to App.tsx

## � **IMPORTANT: Database Setup First**

### **Fix "admins table does not exist" Error**

If you get the error `ERROR: 42P01: relation "public.admins" does not exist`, run ONE of these solutions:

#### **Option A: Create Admins Table (Recommended)**
```sql
-- Run this in your Supabase SQL Editor
\i database/fix-admins-table.sql
```

#### **Option B: Remove Admin Policies (Simpler)**
```sql  
-- Run this in your Supabase SQL Editor
\i database/remove-admin-policies.sql
```

### **Then Run the Main Schema**
```sql
-- After fixing the admins issue, run:
\i database/create-user-management-tables.sql
```

## �📋 **How to Start Testing**

### **Option 1: Create Test Customer via Booking Form**
1. Go to `http://localhost:5173/booking`
2. Fill out the booking form with test data:
   ```
   First Name: John
   Last Name: Doe
   Email: john.doe@test.com
   Phone: +353 12 345 6789
   Service: Any service
   Notes: Test booking for user portal
   ```
3. Submit the form - this creates a customer record in the database

### **Option 2: Create Test Data Directly in Supabase**
1. Go to your Supabase project dashboard
2. Navigate to Table Editor > `customers`
3. Insert a new row:
   ```sql
   INSERT INTO customers (
     first_name, last_name, email, phone, is_active
   ) VALUES (
     'Jane', 'Smith', 'jane.smith@test.com', '+353 87 123 4567', true
   );
   ```

## 🔐 **Testing User Registration & Login**

### **Step 1: Access User Portal**
1. Navigate to `http://localhost:5173/my-account`
2. You should see the **UserLogin** component
3. The system will show login/register forms

### **Step 2: Register New User**
1. Click "Create Account" tab
2. Enter email that matches an existing customer (e.g., `john.doe@test.com`)
3. Enter password (minimum 6 characters)
4. Submit registration
5. **System will automatically link to existing customer record**

### **Step 3: Login**
1. Use the email and password you just created
2. Login to access the user portal
3. You should see the dashboard with your customer data

## 📊 **Testing Portal Features**

### **Dashboard Tab**
- Shows financial overview (outstanding, overdue, paid amounts)
- Recent activity feed
- Quick statistics

### **Profile Tab**
- Personal information editing
- Address management
- Password changes
- Emergency contact details

### **Invoices Tab**
- View all invoices
- Filter by status (paid, pending, overdue)
- See invoice details and line items
- Overdue payment tracking

### **Payments Tab**  
- Complete payment history
- Payment method tracking
- Transaction status and dates
- Filter and search functionality

### **Bookings Tab**
- View upcoming and past appointments
- Booking status (confirmed, pending, cancelled)
- Appointment details and notes
- Reschedule/cancel options (UI ready)

## 🛠️ **Creating More Test Data**

### **Add Test Invoices**
```sql
INSERT INTO invoices (
  customer_id, invoice_number, amount, due_date, status, description
) VALUES (
  1, 'INV-2025-001', 150.00, '2025-08-20', 'pending', 'Physiotherapy Session'
);
```

### **Add Test Payments**
```sql
INSERT INTO payments (
  customer_id, invoice_id, amount, payment_date, payment_method, status
) VALUES (
  1, 1, 150.00, '2025-08-13', 'card', 'completed'
);
```

### **Add Test Bookings**
```sql
INSERT INTO bookings (
  customer_id, package_name, booking_date, status, notes
) VALUES (
  1, 'Sports Injury Assessment', '2025-08-20 14:00:00', 'confirmed', 'Initial consultation'
);
```

## 🚨 **Important Notes**

### **User Creation Flow:**
1. **Customers are created first** (via booking form or admin)
2. **Users register later** with matching email
3. **System automatically links** auth user to existing customer
4. **If no customer exists**, registration will fail with helpful message

### **Database Requirements:**
- Run `database/create-user-management-tables.sql` first
- Ensure RLS policies are enabled
- Make sure Supabase Auth is configured

### **Testing Scenarios:**

#### ✅ **Successful Registration:**
- Email matches existing customer
- Password meets requirements
- Auto-linking works correctly

#### ❌ **Failed Registration:**
- Email doesn't match any customer
- Password too short
- Network/database errors

#### 🔄 **Login Flow:**
- Existing user can log in
- Session persistence works
- Dashboard loads customer data

## 🎉 **Expected Results**

When everything works correctly:

1. **Navigation**: "My Account" button visible in header
2. **Registration**: New users can register with existing customer email
3. **Login**: Registered users can log in successfully  
4. **Dashboard**: Shows financial overview and recent activity
5. **Profile**: Displays and allows editing of customer information
6. **Invoices**: Lists all invoices with filtering and status
7. **Payments**: Shows complete payment history
8. **Bookings**: Displays appointments with management options

## 🐛 **Troubleshooting**

### **Common Issues:**
1. **"Customer not found"** - Email doesn't match existing customer record
2. **Authentication errors** - Check Supabase configuration
3. **Empty dashboard** - No invoices/payments/bookings for the customer
4. **TypeScript errors** - Run `npm run build` to check compilation

### **Debug Steps:**
1. Check browser console for errors
2. Verify Supabase connection in Network tab
3. Check customer table for test data
4. Ensure RLS policies allow data access

---

## 🚀 **Ready to Test!**

The user management system is now fully integrated and ready for testing. Start with Option 1 (booking form) or Option 2 (direct database) to create test customers, then register and explore the portal features!

// Simple RLS implementation using manual SQL execution
// This script provides the SQL commands to implement RLS policies

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection and current RLS status...\n');
  
  try {
    // Test connection by checking a known table
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found" which is OK
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    return true;
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return false;
  }
}

async function testCurrentAccess() {
  console.log('\n🧪 Testing current database access patterns...\n');
  
  // Test anonymous access to sensitive tables
  const testTables = ['customers', 'bookings', 'payments', 'admins'];
  
  for (const table of testTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`🔒 ${table}: Access denied (${error.message})`);
      } else {
        console.log(`⚠️  ${table}: Full access available (${data?.length || 0} records accessible)`);
      }
    } catch (error) {
      console.log(`❌ ${table}: Error testing access - ${error.message}`);
    }
  }
}

function generateRLSCommands() {
  console.log('\n📝 SQL Commands to Implement RLS Policies');
  console.log('==========================================\n');
  
  console.log('Copy and paste these commands into your Supabase SQL Editor:\n');
  
  console.log(`-- Step 1: Create Helper Functions
-- ===================================

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the current user's email exists in the admins table        
    RETURN EXISTS (
        SELECT 1 FROM public.admins
        WHERE email = auth.jwt() ->> 'email'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's customer ID
CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS INTEGER AS $$
BEGIN
    -- Return the customer ID for the current authenticated user
    RETURN (
        SELECT id FROM public.customers
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;-- Step 2: Enable RLS on Tables
-- =============================

-- Enable RLS on sensitive tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies
-- ============================

-- Customers table policies
CREATE POLICY "Admin full access" ON public.customers
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users see own data" ON public.customers
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Anonymous can insert" ON public.customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users update own data" ON public.customers
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Bookings table policies  
CREATE POLICY "Admin full access" ON public.bookings
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users see own bookings" ON public.bookings
    FOR SELECT USING (
        customer_id = public.current_customer_id()
    );

CREATE POLICY "Anonymous can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users update own bookings" ON public.bookings
    FOR UPDATE USING (
        customer_id = public.current_customer_id()
    );

-- Invoices table policies
CREATE POLICY "Admin full access" ON public.invoices
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users see own invoices" ON public.invoices
    FOR SELECT USING (
        customer_id = public.current_customer_id()
    );

-- Invoice items table policies
CREATE POLICY "Admin full access" ON public.invoice_items
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users see own invoice items" ON public.invoice_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.customer_id = public.current_customer_id()
        )
    );

-- Payments table policies
CREATE POLICY "Admin full access" ON public.payments
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users see own payments" ON public.payments
    FOR SELECT USING (
        customer_id = public.current_customer_id()
    );

-- Payment requests table policies
CREATE POLICY "Admin full access" ON public.payment_requests
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users see own payment requests" ON public.payment_requests
    FOR SELECT USING (
        customer_id = public.current_customer_id()
    );

-- Admins table policies (admin only)
CREATE POLICY "Admin only access" ON public.admins
    FOR ALL USING (public.is_admin());

-- Payment gateways table policies (admin only)
CREATE POLICY "Admin only access" ON public.payment_gateways
    FOR ALL USING (public.is_admin());

-- Step 4: Verification Queries
-- =============================

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test admin function
SELECT public.is_admin() as is_admin;

-- Test customer ID function  
SELECT public.current_customer_id() as customer_id;
`);

  console.log('\n⚠️  IMPORTANT INSTRUCTIONS:');
  console.log('1. 🎯 Execute these commands in Supabase SQL Editor (not this script)');
  console.log('2. 📋 Copy entire sections at once for best results');
  console.log('3. ✅ Verify each step completes successfully before proceeding');
  console.log('4. 🧪 Test your application thoroughly after implementation');
  console.log('5. 📱 Ensure admin users exist in the admins table first\n');
}

async function main() {
  console.log('🛡️  RLS Implementation Guide for KH Therapy Database\n');
  
  // Check connection first
  const connected = await checkDatabaseConnection();
  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection');
    return;
  }
  
  // Test current access
  await testCurrentAccess();
  
  // Generate SQL commands
  generateRLSCommands();
  
  console.log('🚀 Ready to implement RLS! Follow the SQL commands above.');
}

main().catch(console.error);

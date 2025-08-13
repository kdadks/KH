-- Quick Fix for User Management System
-- Run this if you're getting "admins table does not exist" error

-- Method 1: Create the admins table
CREATE TABLE IF NOT EXISTS public.admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert your admin email (change this to your actual email)
INSERT INTO public.admins (email, full_name) VALUES 
('admin@khtherapy.ie', 'KH Therapy Admin')
ON CONFLICT (email) DO NOTHING;

-- Enable RLS on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy for admins
DROP POLICY IF EXISTS "Authenticated users can read admins" ON public.admins;
CREATE POLICY "Authenticated users can read admins" ON public.admins
    FOR SELECT 
    TO authenticated
    USING (true);

-- Verify the table was created
SELECT 'Admins table created with' || ' ' || COUNT(*) || ' records' as status FROM public.admins;

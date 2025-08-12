# Database Migration Guide

## Overview
This guide provides the SQL statements needed to create the new invoice management tables and migrate existing data.

## Step 1: Create New Tables

### Create customers table
```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    county VARCHAR(100),
    eircode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'Ireland',
    date_of_birth DATE,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    medical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(last_name, first_name);
```

### Create invoices table
```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 23.00,
    vat_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    payment_method VARCHAR(50),
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
```

### Create invoice_items table
```sql
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE RESTRICT,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(8,2) DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
```

## Step 2: Create Functions and Triggers

### Update timestamp function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Add triggers for updated_at
```sql
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Invoice number generation function
```sql
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := 'INV-' || 
                             EXTRACT(YEAR FROM NEW.invoice_date) || '-' ||
                             LPAD((
                                 SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
                                 FROM invoices 
                                 WHERE invoice_number LIKE ('INV-' || EXTRACT(YEAR FROM NEW.invoice_date) || '-%')
                             )::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();
```

## Step 3: Migrate Existing Data

### Parse and migrate customer data from bookings
```sql
-- Create customers from existing bookings
INSERT INTO customers (first_name, last_name, email, phone, created_at)
SELECT 
    CASE 
        WHEN position(' ' in customer_name) > 0 
        THEN substring(customer_name from 1 for position(' ' in customer_name) - 1)
        ELSE customer_name
    END as first_name,
    CASE 
        WHEN position(' ' in customer_name) > 0 
        THEN substring(customer_name from position(' ' in customer_name) + 1)
        ELSE ''
    END as last_name,
    customer_email,
    customer_phone,
    MIN(created_at) as created_at
FROM bookings
WHERE customer_email IS NOT NULL 
    AND customer_email != ''
    AND NOT EXISTS (
        SELECT 1 FROM customers c 
        WHERE c.email = bookings.customer_email
    )
GROUP BY customer_name, customer_email, customer_phone;
```

## Step 4: Add Foreign Key to Bookings

### Add customer_id column to bookings table
```sql
-- Add the column
ALTER TABLE bookings ADD COLUMN customer_id INTEGER;

-- Populate the customer_id based on email matching
UPDATE bookings 
SET customer_id = (
    SELECT c.id 
    FROM customers c 
    WHERE c.email = bookings.customer_email
    LIMIT 1
);

-- Add the foreign key constraint
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Create index for performance
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
```

## Step 5: Verification Queries

### Verify migration
```sql
-- Check customer count
SELECT COUNT(*) as customer_count FROM customers;

-- Check bookings with customer links
SELECT COUNT(*) as linked_bookings FROM bookings WHERE customer_id IS NOT NULL;

-- Check for orphaned bookings
SELECT COUNT(*) as orphaned_bookings FROM bookings WHERE customer_id IS NULL;

-- Sample customer data
SELECT id, first_name, last_name, email FROM customers LIMIT 5;
```

## Rollback Procedures

### If migration needs to be rolled back
```sql
-- Remove foreign key from bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS fk_bookings_customer;
ALTER TABLE bookings DROP COLUMN IF EXISTS customer_id;

-- Drop tables in correct order
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS customers;

-- Drop functions and triggers
DROP FUNCTION IF EXISTS generate_invoice_number();
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## Notes

1. **Run these in order**: Execute the steps sequentially to avoid dependency issues.
2. **Backup first**: Always backup your database before running migrations.
3. **Test environment**: Run on a test environment first.
4. **Monitor performance**: The migration queries may take time on large datasets.
5. **Data validation**: Verify data integrity after migration.

## Supabase Specific Notes

Since this is a Supabase project, you can run these migrations using:
1. Supabase Dashboard > SQL Editor
2. Or use the Supabase CLI: `supabase db push`
3. Remember to enable Row Level Security (RLS) policies for the new tables as needed.

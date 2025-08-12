# Supabase Migration Steps for Invoice Management

## Important Notice
**Before running these migrations, please backup your database!**

## Step 1: Create the customers table
Run this in your Supabase SQL Editor:

```sql
-- Create customers table
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

-- Create indexes for better performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_name ON customers(last_name, first_name);

-- Enable RLS (Row Level Security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to manage customers
CREATE POLICY "Authenticated users can manage customers" 
ON customers 
FOR ALL 
TO authenticated 
USING (true);
```

## Step 2: Create the invoices table
```sql
-- Create invoices table
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

-- Create indexes
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Authenticated users can manage invoices" 
ON invoices 
FOR ALL 
TO authenticated 
USING (true);
```

## Step 3: Create the invoice_items table
```sql
-- Create invoice_items table
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

-- Create index
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Authenticated users can manage invoice items" 
ON invoice_items 
FOR ALL 
TO authenticated 
USING (true);
```

## Step 4: Create functions for automatic updates
```sql
-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 5: Create invoice number generation function
```sql
-- Function to auto-generate invoice numbers
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

-- Add trigger for invoice number generation
CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();
```

## Step 6: Migrate existing customer data from bookings
```sql
-- Create customers from existing bookings (avoid duplicates)
INSERT INTO customers (first_name, last_name, email, phone, created_at)
SELECT 
    CASE 
        WHEN POSITION(' ' IN customer_name) > 0 
        THEN SUBSTRING(customer_name FROM 1 FOR POSITION(' ' IN customer_name) - 1)
        ELSE customer_name
    END as first_name,
    CASE 
        WHEN POSITION(' ' IN customer_name) > 0 
        THEN SUBSTRING(customer_name FROM POSITION(' ' IN customer_name) + 1)
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

## Step 7: Add customer_id to bookings table
```sql
-- Add customer_id column to bookings
ALTER TABLE bookings ADD COLUMN customer_id INTEGER;

-- Populate customer_id based on email matching
UPDATE bookings 
SET customer_id = (
    SELECT c.id 
    FROM customers c 
    WHERE c.email = bookings.customer_email
    LIMIT 1
);

-- Add foreign key constraint
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_customer 
FOREIGN KEY (customer_id) REFERENCES customers(id);

-- Create index
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
```

## Step 8: Verification
Run these queries to verify the migration:

```sql
-- Check customer count
SELECT COUNT(*) as customer_count FROM customers;

-- Check bookings with customer links
SELECT COUNT(*) as linked_bookings FROM bookings WHERE customer_id IS NOT NULL;

-- Check for orphaned bookings
SELECT COUNT(*) as orphaned_bookings FROM bookings WHERE customer_id IS NULL;

-- Sample data check
SELECT 
    c.first_name, 
    c.last_name, 
    c.email, 
    COUNT(b.id) as booking_count 
FROM customers c 
LEFT JOIN bookings b ON b.customer_id = c.id 
GROUP BY c.id, c.first_name, c.last_name, c.email 
LIMIT 5;
```

## Important Notes

1. **RLS Policies**: The created policies allow all authenticated users to manage customers, invoices, and invoice items. You may want to create more restrictive policies based on your security requirements.

2. **Data Backup**: Always backup your database before running migrations.

3. **Testing**: Test these migrations on a development database first.

4. **Rollback**: If you need to rollback, you can drop the tables in reverse order:
   ```sql
   DROP TABLE IF EXISTS invoice_items;
   DROP TABLE IF EXISTS invoices;
   ALTER TABLE bookings DROP COLUMN IF EXISTS customer_id;
   DROP TABLE IF EXISTS customers;
   ```

5. **Performance**: The indexes created will help with query performance, especially as your customer and invoice data grows.

## Next Steps

After running these migrations:
1. Test the invoice management interface in your admin console
2. Create a few test customers and invoices
3. Verify that the customer-booking relationship is working correctly
4. Set up any additional RLS policies as needed for your security requirements

-- Add an admin user for testing header functionality
INSERT INTO customers (
    first_name,
    last_name,
    email,
    phone,
    password,
    country,
    is_active
) VALUES (
    'Admin',
    'User',
    'admin@khtherapy.ie',
    '+353123456789',
    'admin123',
    'Ireland',
    true
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    password = EXCLUDED.password,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active;

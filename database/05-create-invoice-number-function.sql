-- Step 5: Create invoice number generation function
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

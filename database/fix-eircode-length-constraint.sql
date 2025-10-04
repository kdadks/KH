-- Fix eircode column length constraint for encrypted data
-- The current eircode field is CHARACTER VARYING(10) which is too short
-- Irish eircode format is typically 7 characters (3+space+3) but when encrypted
-- with AES, the result can be 50-100+ characters long
-- Setting to 255 characters to safely accommodate encrypted eircode data

ALTER TABLE public.customers 
ALTER COLUMN eircode TYPE CHARACTER VARYING(255);

-- Add comment for documentation
COMMENT ON COLUMN public.customers.eircode IS 'Irish postal code (encrypted) - original format like A12 B3C4 but stored encrypted, requires 255 chars';
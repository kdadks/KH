-- Debug Invoice Table Constraints
-- Run this to see what constraints exist on the invoices table

DO $$
DECLARE
    constraint_info record;
BEGIN
    RAISE NOTICE 'Invoice table constraints:';
    
    FOR constraint_info IN
        SELECT 
            conname as constraint_name,
            pg_get_constraintdef(oid) as constraint_definition
        FROM pg_constraint 
        WHERE conrelid = 'invoices'::regclass
        ORDER BY conname
    LOOP
        RAISE NOTICE '- %: %', constraint_info.constraint_name, constraint_info.constraint_definition;
    END LOOP;
    
    -- Also check if there are any enum types used
    RAISE NOTICE '';
    RAISE NOTICE 'Checking for enum types used in invoices table:';
    
    FOR constraint_info IN
        SELECT 
            column_name,
            data_type,
            udt_name
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND data_type = 'USER-DEFINED'
    LOOP
        RAISE NOTICE '- Column %: type %', constraint_info.column_name, constraint_info.udt_name;
        
        -- Show enum values if it's an enum
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = constraint_info.udt_name AND typtype = 'e') THEN
            DECLARE
                enum_vals text;
            BEGIN
                SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder) INTO enum_vals
                FROM pg_enum 
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = constraint_info.udt_name);
                
                RAISE NOTICE '  Allowed values: %', enum_vals;
            END;
        END IF;
    END LOOP;
END $$;

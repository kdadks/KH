-- Enhanced Availability Management Database Schema
-- This script creates tables for default schedules, templates, and schedule management

-- 1. Create availability_templates table for weekly schedule templates
CREATE TABLE IF NOT EXISTS public.availability_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create availability_template_slots table for template time slots
CREATE TABLE IF NOT EXISTS public.availability_template_slots (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES public.availability_templates(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 60, -- Duration in minutes
    break_duration INTEGER DEFAULT 0, -- Break between slots in minutes
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create default_availability_schedule table for weekly recurring schedule
CREATE TABLE IF NOT EXISTS public.default_availability_schedule (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 60, -- Duration in minutes
    break_duration INTEGER DEFAULT 0, -- Break between slots in minutes
    is_active BOOLEAN DEFAULT TRUE,
    template_id INTEGER REFERENCES public.availability_templates(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(day_of_week) -- Only one schedule per day of week
);

-- 4. Add new columns to existing availability table for enhanced functionality
DO $$
BEGIN
    -- Add template reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'availability' AND column_name = 'template_id') THEN
        ALTER TABLE public.availability ADD COLUMN template_id INTEGER REFERENCES public.availability_templates(id) ON DELETE SET NULL;
    END IF;
    
    -- Add schedule type (template-generated vs manual)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'availability' AND column_name = 'schedule_type') THEN
        ALTER TABLE public.availability ADD COLUMN schedule_type VARCHAR(20) DEFAULT 'manual' CHECK (schedule_type IN ('manual', 'template', 'override'));
    END IF;
    
    -- Add slot duration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'availability' AND column_name = 'slot_duration') THEN
        ALTER TABLE public.availability ADD COLUMN slot_duration INTEGER DEFAULT 60;
    END IF;
    
    -- Add override flag for template-generated slots
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'availability' AND column_name = 'is_override') THEN
        ALTER TABLE public.availability ADD COLUMN is_override BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add original template slot reference for overrides
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'availability' AND column_name = 'original_slot_id') THEN
        ALTER TABLE public.availability ADD COLUMN original_slot_id INTEGER REFERENCES public.availability(id) ON DELETE SET NULL;
    END IF;

    -- Ensure start_time column exists (legacy schemas used 'start')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'availability' AND column_name = 'start_time') THEN
        ALTER TABLE public.availability ADD COLUMN start_time TIME;
        -- Best-effort backfill from legacy 'start' if it exists
        BEGIN
            EXECUTE 'UPDATE public.availability SET start_time = start WHERE start_time IS NULL';
        EXCEPTION WHEN undefined_column THEN
            -- If legacy column "start" doesn't exist, ignore
            NULL;
        END;
    END IF;

    -- Ensure is_available column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'availability' AND column_name = 'is_available') THEN
        ALTER TABLE public.availability ADD COLUMN is_available BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 5. Create schedule_generation_history table for audit trail
CREATE TABLE IF NOT EXISTS public.schedule_generation_history (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES public.availability_templates(id) ON DELETE SET NULL,
    generation_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    slots_created INTEGER DEFAULT 0,
    admin_user_id INTEGER, -- Reference to admin who generated
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable Row Level Security
ALTER TABLE public.availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_availability_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_generation_history ENABLE ROW LEVEL SECURITY;
-- Ensure availability table has RLS enabled as well
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for availability_templates table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.availability_templates;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.availability_templates;

CREATE POLICY "Enable read access for all users" ON public.availability_templates FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.availability_templates 
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 8. Create policies for availability_template_slots table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.availability_template_slots;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.availability_template_slots;

CREATE POLICY "Enable read access for all users" ON public.availability_template_slots FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.availability_template_slots 
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 9. Create policies for default_availability_schedule table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.default_availability_schedule;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.default_availability_schedule;

CREATE POLICY "Enable read access for all users" ON public.default_availability_schedule FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.default_availability_schedule 
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 10. Create policies for schedule_generation_history table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.schedule_generation_history;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.schedule_generation_history;

CREATE POLICY "Enable read access for all users" ON public.schedule_generation_history FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.schedule_generation_history 
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_availability_templates_is_default ON public.availability_templates (is_default);
CREATE INDEX IF NOT EXISTS idx_availability_templates_is_active ON public.availability_templates (is_active);
CREATE INDEX IF NOT EXISTS idx_availability_template_slots_template_id ON public.availability_template_slots (template_id);
CREATE INDEX IF NOT EXISTS idx_availability_template_slots_day_of_week ON public.availability_template_slots (day_of_week);
CREATE INDEX IF NOT EXISTS idx_default_availability_schedule_day_of_week ON public.default_availability_schedule (day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_template_id ON public.availability (template_id);
CREATE INDEX IF NOT EXISTS idx_availability_schedule_type ON public.availability (schedule_type);
CREATE INDEX IF NOT EXISTS idx_schedule_generation_history_template_id ON public.schedule_generation_history (template_id);
CREATE INDEX IF NOT EXISTS idx_schedule_generation_history_generation_date ON public.schedule_generation_history (generation_date);

-- Availability table policies (to support RPC operations)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.availability;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.availability;

CREATE POLICY "Enable read access for all users" ON public.availability FOR SELECT USING (true);
CREATE POLICY "Enable all operations for authenticated users" ON public.availability 
    FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon')
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 12. Insert default availability template
INSERT INTO public.availability_templates (name, description, is_default, is_active) VALUES
('Standard Business Hours', 'Default Monday-Friday 9 AM to 5 PM schedule', true, true)
ON CONFLICT DO NOTHING;

-- Get the ID of the default template
DO $$
DECLARE
    default_template_id INTEGER;
BEGIN
    SELECT id INTO default_template_id 
    FROM public.availability_templates 
    WHERE is_default = true 
    LIMIT 1;
    
    IF default_template_id IS NOT NULL THEN
        -- Insert default template slots (Monday-Friday, 9 AM to 5 PM with 1-hour slots)
        INSERT INTO public.availability_template_slots (template_id, day_of_week, start_time, end_time, slot_duration) VALUES
        (default_template_id, 1, '09:00', '17:00', 60), -- Monday
        (default_template_id, 2, '09:00', '17:00', 60), -- Tuesday
        (default_template_id, 3, '09:00', '17:00', 60), -- Wednesday
        (default_template_id, 4, '09:00', '17:00', 60), -- Thursday
        (default_template_id, 5, '09:00', '17:00', 60)  -- Friday
        ON CONFLICT DO NOTHING;
        
        -- Insert default schedule
        INSERT INTO public.default_availability_schedule (day_of_week, start_time, end_time, slot_duration, template_id) VALUES
        (1, '09:00', '17:00', 60, default_template_id), -- Monday
        (2, '09:00', '17:00', 60, default_template_id), -- Tuesday
        (3, '09:00', '17:00', 60, default_template_id), -- Wednesday
        (4, '09:00', '17:00', 60, default_template_id), -- Thursday
        (5, '09:00', '17:00', 60, default_template_id)  -- Friday
        ON CONFLICT (day_of_week) DO NOTHING;
    END IF;
END $$;

-- 13. Create helper functions

-- Function to generate availability slots from template
DROP FUNCTION IF EXISTS public.generate_availability_from_template(integer, date, date);
CREATE OR REPLACE FUNCTION generate_availability_from_template(
    p_template_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
) RETURNS INTEGER AS $$
DECLARE
    template_slot RECORD;
    v_current_date DATE;
    slots_created INTEGER := 0;
    v_current_time TIME;
    slot_start TIME;
    slot_end TIME;
    slot_duration_minutes INTEGER;
BEGIN
    -- Loop through each day in the date range
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
        -- Get template slots for this day of week
        FOR template_slot IN 
            SELECT * FROM public.availability_template_slots 
            WHERE template_id = p_template_id 
            AND day_of_week = (EXTRACT(DOW FROM v_current_date))::int
            AND is_active = true
        LOOP
            -- Generate time slots based on slot duration
            slot_duration_minutes := COALESCE(template_slot.slot_duration, 60);
            v_current_time := template_slot.start_time;
            
            WHILE v_current_time + (slot_duration_minutes || ' minutes')::INTERVAL <= template_slot.end_time LOOP
                slot_start := v_current_time;
                slot_end := v_current_time + (slot_duration_minutes || ' minutes')::INTERVAL;
                
                -- Insert availability slot
                INSERT INTO public.availability (
                    date, 
                    start,
                    start_time, 
                    end_time, 
                    is_available, 
                    template_id, 
                    schedule_type, 
                    slot_duration
                ) VALUES (
                    v_current_date,
                    slot_start,
                    slot_start,
                    slot_end,
                    true,
                    p_template_id,
                    'template',
                    slot_duration_minutes
                ) ON CONFLICT DO NOTHING;
                
                slots_created := slots_created + 1;
                
                -- Move to next slot (including break duration)
                v_current_time := slot_end + (COALESCE(template_slot.break_duration, 0) || ' minutes')::INTERVAL;
            END LOOP;
        END LOOP;
        
        v_current_date := v_current_date + 1;
    END LOOP;
    
    -- Record generation history
    INSERT INTO public.schedule_generation_history (
        template_id,
        generation_date,
        start_date,
        end_date,
        slots_created
    ) VALUES (
        p_template_id,
        CURRENT_DATE,
        p_start_date,
        p_end_date,
        slots_created
    );
    
    RETURN slots_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply default schedule to date range
DROP FUNCTION IF EXISTS public.apply_default_schedule_to_range(date, date);
CREATE OR REPLACE FUNCTION apply_default_schedule_to_range(
    p_start_date DATE,
    p_end_date DATE
) RETURNS INTEGER AS $$
DECLARE
    schedule_day RECORD;
    v_current_date DATE;
    slots_created INTEGER := 0;
    v_current_time TIME;
    slot_start TIME;
    slot_end TIME;
    slot_duration_minutes INTEGER;
BEGIN
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
        -- Get default schedule for this day of week
        FOR schedule_day IN 
            SELECT * FROM public.default_availability_schedule 
            WHERE day_of_week = (EXTRACT(DOW FROM v_current_date))::int
            AND is_active = true
        LOOP
            slot_duration_minutes := COALESCE(schedule_day.slot_duration, 60);
            v_current_time := schedule_day.start_time;
            
            WHILE v_current_time + (slot_duration_minutes || ' minutes')::INTERVAL <= schedule_day.end_time LOOP
                slot_start := v_current_time;
                slot_end := v_current_time + (slot_duration_minutes || ' minutes')::INTERVAL;
                
                -- Insert availability slot
                INSERT INTO public.availability (
                    date, 
                    start,
                    start_time, 
                    end_time, 
                    is_available, 
                    template_id, 
                    schedule_type, 
                    slot_duration
                ) VALUES (
                    v_current_date,
                    slot_start,
                    slot_start,
                    slot_end,
                    true,
                    schedule_day.template_id,
                    'template',
                    slot_duration_minutes
                ) ON CONFLICT DO NOTHING;
                
                slots_created := slots_created + 1;
                
                -- Move to next slot (including break duration)
                v_current_time := slot_end + (COALESCE(schedule_day.break_duration, 0) || ' minutes')::INTERVAL;
            END LOOP;
        END LOOP;
        
        v_current_date := v_current_date + 1;
    END LOOP;
    
    RETURN slots_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.availability_templates TO authenticated;
GRANT ALL ON public.availability_template_slots TO authenticated;
GRANT ALL ON public.default_availability_schedule TO authenticated;
GRANT ALL ON public.schedule_generation_history TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- Availability direct table privileges, if functions do not bypass RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability TO authenticated, anon;
-- Grant function execute to client roles
GRANT EXECUTE ON FUNCTION public.generate_availability_from_template(integer, date, date) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.apply_default_schedule_to_range(date, date) TO authenticated, anon;

COMMENT ON TABLE public.availability_templates IS 'Templates for recurring availability schedules';
COMMENT ON TABLE public.availability_template_slots IS 'Time slots within availability templates';
COMMENT ON TABLE public.default_availability_schedule IS 'Default weekly availability schedule';
COMMENT ON TABLE public.schedule_generation_history IS 'Audit trail for schedule generation operations';

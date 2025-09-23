-- Fix manual availability slots missing start_time field
-- This script updates existing manual slots to have proper start_time values

-- Update manual availability slots where start_time is null but start is not null
UPDATE public.availability 
SET start_time = start
WHERE start_time IS NULL 
  AND start IS NOT NULL 
  AND (schedule_type = 'manual' OR schedule_type IS NULL);

-- Update schedule_type to 'manual' for slots that don't have schedule_type set
-- but were clearly created manually (no template_id)
UPDATE public.availability 
SET schedule_type = 'manual'
WHERE schedule_type IS NULL 
  AND template_id IS NULL;

-- Set default values for other missing fields in manual slots
UPDATE public.availability 
SET 
  is_available = COALESCE(is_available, true),
  slot_duration = COALESCE(slot_duration, 
    CASE 
      WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (end_time::time - start_time::time))/60
      ELSE 60
    END
  )
WHERE schedule_type = 'manual';

-- Display summary of fixes applied
SELECT 
  'Manual slots fixed' as operation,
  COUNT(*) as count
FROM public.availability 
WHERE schedule_type = 'manual' 
  AND start_time IS NOT NULL 
  AND is_available IS NOT NULL;

-- Display current availability summary by schedule type
SELECT 
  COALESCE(schedule_type, 'NULL') as schedule_type,
  COUNT(*) as total_slots,
  COUNT(CASE WHEN start_time IS NOT NULL THEN 1 END) as with_start_time,
  COUNT(CASE WHEN start_time IS NULL THEN 1 END) as missing_start_time
FROM public.availability 
GROUP BY schedule_type
ORDER BY schedule_type;
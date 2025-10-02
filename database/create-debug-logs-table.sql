-- Create debug logs table to capture function execution details
-- This will help us see what's happening during payments without console access

CREATE TABLE IF NOT EXISTS public.debug_logs (
    id SERIAL PRIMARY KEY,
    function_name VARCHAR(100) NOT NULL,
    execution_id VARCHAR(255) NOT NULL,
    log_level VARCHAR(20) DEFAULT 'INFO',
    message TEXT NOT NULL,
    details JSONB NULL,
    request_data JSONB NULL,
    response_data JSONB NULL,
    error_data JSONB NULL,
    user_agent TEXT NULL,
    ip_address INET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_debug_logs_function_name ON public.debug_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_debug_logs_execution_id ON public.debug_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON public.debug_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_debug_logs_log_level ON public.debug_logs(log_level);

-- Enable RLS
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (can be restricted later)
CREATE POLICY "Allow debug logs access" ON public.debug_logs
    FOR ALL USING (true);

-- Add comment
COMMENT ON TABLE public.debug_logs IS 'Debug logs table to capture function execution without console access';
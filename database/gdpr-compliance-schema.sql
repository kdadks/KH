-- GDPR Compliance Database Schema
-- This script creates tables and updates for GDPR compliance including
-- audit trails, consent management, and data retention policies

-- 1. Add GDPR compliance columns to customers table
DO $$
BEGIN
    -- Add missing last_login column if it doesn't exist (required for data retention)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'last_login') THEN
        ALTER TABLE public.customers ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add GDPR anonymization tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'gdpr_anonymized') THEN
        ALTER TABLE public.customers ADD COLUMN gdpr_anonymized BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'gdpr_anonymized_at') THEN
        ALTER TABLE public.customers ADD COLUMN gdpr_anonymized_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add privacy consent tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'privacy_consent_given') THEN
        ALTER TABLE public.customers ADD COLUMN privacy_consent_given BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'privacy_consent_date') THEN
        ALTER TABLE public.customers ADD COLUMN privacy_consent_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'marketing_consent') THEN
        ALTER TABLE public.customers ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'marketing_consent_date') THEN
        ALTER TABLE public.customers ADD COLUMN marketing_consent_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add data processing basis
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'data_processing_basis') THEN
        ALTER TABLE public.customers ADD COLUMN data_processing_basis VARCHAR(100) DEFAULT 'legitimate_interest';
    END IF;
    
    -- Add data subject request tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'last_data_export_request') THEN
        ALTER TABLE public.customers ADD COLUMN last_data_export_request TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'deletion_requested') THEN
        ALTER TABLE public.customers ADD COLUMN deletion_requested BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'deletion_request_date') THEN
        ALTER TABLE public.customers ADD COLUMN deletion_request_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add data encryption flags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'customers' AND column_name = 'pii_encrypted') THEN
        ALTER TABLE public.customers ADD COLUMN pii_encrypted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create GDPR audit log table
CREATE TABLE IF NOT EXISTS public.gdpr_audit_log (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES public.customers(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- 'EXPORT', 'ANONYMIZE', 'DELETE', 'CONSENT_GIVEN', 'CONSENT_WITHDRAWN'
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    admin_user_id INTEGER, -- For admin actions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for GDPR audit log
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_customer_id ON public.gdpr_audit_log (customer_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_action ON public.gdpr_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_timestamp ON public.gdpr_audit_log (timestamp);

-- 3. Create consent management table
CREATE TABLE IF NOT EXISTS public.consent_records (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL, -- 'privacy', 'marketing', 'cookies', 'data_processing'
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL,
    consent_withdrawn_date TIMESTAMP WITH TIME ZONE,
    consent_method VARCHAR(50), -- 'web_form', 'email', 'phone', 'in_person'
    ip_address INET,
    user_agent TEXT,
    legal_basis VARCHAR(100), -- 'consent', 'legitimate_interest', 'contract', 'legal_obligation'
    purpose TEXT, -- Description of why data is being processed
    data_categories TEXT[], -- Array of data categories this consent covers
    retention_period VARCHAR(50), -- How long data will be retained
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for consent records
CREATE INDEX IF NOT EXISTS idx_consent_customer_id ON public.consent_records (customer_id);
CREATE INDEX IF NOT EXISTS idx_consent_type ON public.consent_records (consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_date ON public.consent_records (consent_date);

-- 4. Create data subject requests table
CREATE TABLE IF NOT EXISTS public.data_subject_requests (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'access', 'portability', 'erasure', 'rectification', 'restriction', 'objection'
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected', 'cancelled'
    completion_date TIMESTAMP WITH TIME ZONE,
    request_details TEXT,
    response_details TEXT,
    admin_user_id INTEGER, -- Admin handling the request
    verification_method VARCHAR(50), -- How identity was verified
    exported_data_url TEXT, -- For data portability requests
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for data subject requests
CREATE INDEX IF NOT EXISTS idx_dsr_customer_id ON public.data_subject_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_dsr_type ON public.data_subject_requests (request_type);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON public.data_subject_requests (status);
CREATE INDEX IF NOT EXISTS idx_dsr_date ON public.data_subject_requests (request_date);

-- 5. Create data retention policy table
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
    id SERIAL PRIMARY KEY,
    data_category VARCHAR(100) NOT NULL, -- 'customer_data', 'booking_data', 'payment_data', 'session_data'
    retention_period_years INTEGER NOT NULL,
    legal_basis VARCHAR(100),
    description TEXT,
    auto_delete BOOLEAN DEFAULT FALSE, -- Whether to automatically delete after retention period
    auto_anonymize BOOLEAN DEFAULT TRUE, -- Whether to automatically anonymize after retention period
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO public.data_retention_policies (data_category, retention_period_years, legal_basis, description, auto_anonymize) VALUES
('customer_data', 7, 'legitimate_interest', 'Customer personal data retained for healthcare service continuity', TRUE),
('booking_data', 10, 'legal_obligation', 'Booking records retained for healthcare regulatory compliance', FALSE),
('payment_data', 7, 'legal_obligation', 'Payment records retained for tax and accounting purposes', FALSE),
('session_data', 1, 'legitimate_interest', 'User session logs for security and analytics', TRUE),
('marketing_data', 3, 'consent', 'Marketing preferences and communication history', TRUE)
ON CONFLICT DO NOTHING;

-- 6. Enable RLS on new tables
ALTER TABLE public.gdpr_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for GDPR tables

-- GDPR Audit Log Policies
DROP POLICY IF EXISTS "Admin users can read audit log" ON public.gdpr_audit_log;
CREATE POLICY "Admin users can read audit log" ON public.gdpr_audit_log
    FOR SELECT 
    TO authenticated
    USING (true); -- Only authenticated users (admins) can view audit logs

DROP POLICY IF EXISTS "System can insert audit log" ON public.gdpr_audit_log;
CREATE POLICY "System can insert audit log" ON public.gdpr_audit_log
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Consent Records Policies
DROP POLICY IF EXISTS "Users can view own consent records" ON public.consent_records;
CREATE POLICY "Users can view own consent records" ON public.consent_records
    FOR SELECT 
    TO authenticated
    USING (customer_id IN (
        SELECT id FROM public.customers 
        WHERE auth_user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert own consent records" ON public.consent_records;
CREATE POLICY "Users can insert own consent records" ON public.consent_records
    FOR INSERT 
    TO authenticated
    WITH CHECK (customer_id IN (
        SELECT id FROM public.customers 
        WHERE auth_user_id = auth.uid()
    ));

-- Data Subject Requests Policies
DROP POLICY IF EXISTS "Users can view own data requests" ON public.data_subject_requests;
CREATE POLICY "Users can view own data requests" ON public.data_subject_requests
    FOR SELECT 
    TO authenticated
    USING (customer_id IN (
        SELECT id FROM public.customers 
        WHERE auth_user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can create own data requests" ON public.data_subject_requests;
CREATE POLICY "Users can create own data requests" ON public.data_subject_requests
    FOR INSERT 
    TO authenticated
    WITH CHECK (customer_id IN (
        SELECT id FROM public.customers 
        WHERE auth_user_id = auth.uid()
    ));

-- Data Retention Policies (read-only for users)
DROP POLICY IF EXISTS "All users can read retention policies" ON public.data_retention_policies;
CREATE POLICY "All users can read retention policies" ON public.data_retention_policies
    FOR SELECT 
    TO authenticated
    USING (true);

-- 8. Create GDPR compliance functions

-- Function to log GDPR actions
CREATE OR REPLACE FUNCTION log_gdpr_action(
    p_customer_id INTEGER,
    p_action VARCHAR(50),
    p_details TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_admin_user_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.gdpr_audit_log (
        customer_id, action, details, ip_address, user_agent, admin_user_id
    ) VALUES (
        p_customer_id, p_action, p_details, p_ip_address, p_user_agent, p_admin_user_id
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record consent
CREATE OR REPLACE FUNCTION record_consent(
    p_customer_id INTEGER,
    p_consent_type VARCHAR(50),
    p_consent_given BOOLEAN,
    p_consent_method VARCHAR(50) DEFAULT 'web_form',
    p_legal_basis VARCHAR(100) DEFAULT 'consent',
    p_purpose TEXT DEFAULT NULL,
    p_data_categories TEXT[] DEFAULT NULL,
    p_retention_period VARCHAR(50) DEFAULT '7 years',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Insert new consent record
    INSERT INTO public.consent_records (
        customer_id, consent_type, consent_given, consent_date,
        consent_method, legal_basis, purpose, data_categories,
        retention_period, ip_address, user_agent
    ) VALUES (
        p_customer_id, p_consent_type, p_consent_given, NOW(),
        p_consent_method, p_legal_basis, p_purpose, p_data_categories,
        p_retention_period, p_ip_address, p_user_agent
    );
    
    -- Update customer table with consent status
    IF p_consent_type = 'privacy' THEN
        UPDATE public.customers 
        SET privacy_consent_given = p_consent_given,
            privacy_consent_date = CASE WHEN p_consent_given THEN NOW() ELSE privacy_consent_date END
        WHERE id = p_customer_id;
    ELSIF p_consent_type = 'marketing' THEN
        UPDATE public.customers 
        SET marketing_consent = p_consent_given,
            marketing_consent_date = CASE WHEN p_consent_given THEN NOW() ELSE marketing_consent_date END
        WHERE id = p_customer_id;
    END IF;
    
    -- Log the consent action
    PERFORM log_gdpr_action(
        p_customer_id, 
        CASE WHEN p_consent_given THEN 'CONSENT_GIVEN' ELSE 'CONSENT_WITHDRAWN' END,
        'Consent ' || CASE WHEN p_consent_given THEN 'given' ELSE 'withdrawn' END || ' for ' || p_consent_type,
        p_ip_address,
        p_user_agent
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create data subject request
CREATE OR REPLACE FUNCTION create_data_subject_request(
    p_customer_id INTEGER,
    p_request_type VARCHAR(50),
    p_request_details TEXT DEFAULT NULL,
    p_verification_method VARCHAR(50) DEFAULT 'email'
) RETURNS INTEGER AS $$
DECLARE
    request_id INTEGER;
BEGIN
    INSERT INTO public.data_subject_requests (
        customer_id, request_type, request_details, verification_method
    ) VALUES (
        p_customer_id, p_request_type, p_request_details, p_verification_method
    ) RETURNING id INTO request_id;
    
    -- Log the request
    PERFORM log_gdpr_action(
        p_customer_id,
        'DATA_SUBJECT_REQUEST',
        'Created ' || p_request_type || ' request (ID: ' || request_id || ')'
    );
    
    RETURN request_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check data retention compliance
CREATE OR REPLACE FUNCTION check_data_retention_compliance()
RETURNS TABLE(customer_id INTEGER, days_overdue INTEGER, recommended_action TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as customer_id,
        EXTRACT(DAYS FROM (NOW() - GREATEST(c.last_login, c.created_at)))::INTEGER as days_overdue,
        CASE 
            WHEN c.is_active = FALSE AND EXTRACT(DAYS FROM (NOW() - GREATEST(c.last_login, c.created_at))) > (7 * 365) THEN 'ANONYMIZE'
            WHEN c.is_active = FALSE AND EXTRACT(DAYS FROM (NOW() - GREATEST(c.last_login, c.created_at))) > (5 * 365) THEN 'REVIEW'
            ELSE 'RETAIN'
        END as recommended_action
    FROM public.customers c
    WHERE 
        c.gdpr_anonymized = FALSE
        AND (c.is_active = FALSE OR c.last_login < NOW() - INTERVAL '1 year')
    ORDER BY days_overdue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add comments for documentation
COMMENT ON TABLE public.gdpr_audit_log IS 'Audit trail for all GDPR-related actions and data processing activities';
COMMENT ON TABLE public.consent_records IS 'Records of all user consents for data processing';
COMMENT ON TABLE public.data_subject_requests IS 'Tracks GDPR data subject requests (access, erasure, portability, etc.)';
COMMENT ON TABLE public.data_retention_policies IS 'Defines data retention periods for different data categories';

COMMENT ON FUNCTION log_gdpr_action IS 'Logs GDPR-related actions for audit trail';
COMMENT ON FUNCTION record_consent IS 'Records user consent for data processing';
COMMENT ON FUNCTION create_data_subject_request IS 'Creates a new data subject request';
COMMENT ON FUNCTION check_data_retention_compliance IS 'Checks which customers are due for data retention actions';

-- Grant necessary permissions
GRANT ALL ON public.gdpr_audit_log TO authenticated;
GRANT ALL ON public.consent_records TO authenticated;
GRANT ALL ON public.data_subject_requests TO authenticated;
GRANT ALL ON public.data_retention_policies TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE gdpr_audit_log_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE consent_records_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE data_subject_requests_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE data_retention_policies_id_seq TO authenticated;

-- Update existing customers to have privacy consent (retroactive compliance)
UPDATE public.customers 
SET 
    privacy_consent_given = TRUE,
    privacy_consent_date = COALESCE(created_at, NOW()),
    data_processing_basis = 'legitimate_interest'
WHERE 
    privacy_consent_given IS NULL 
    OR privacy_consent_given = FALSE;

RAISE NOTICE 'GDPR compliance database schema created successfully';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Update application to encrypt sensitive customer data';
RAISE NOTICE '2. Implement consent collection in user registration';
RAISE NOTICE '3. Add data subject request handlers';
RAISE NOTICE '4. Set up automated data retention policy enforcement';

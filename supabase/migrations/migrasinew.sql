-- ============================================
-- ECOTRADE PASSWORD MANAGEMENT MIGRATION
-- ============================================
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD AUTH PROVIDER COLUMN
-- ============================================
-- Add auth_provider column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'auth_provider'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN auth_provider TEXT DEFAULT 'email' NOT NULL;
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.profiles.auth_provider IS 'Auth provider: email, google, github, etc';
  END IF;
END $$;

-- ============================================
-- 2. CREATE PASSWORD RESET LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.password_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT password_reset_logs_valid_expiry CHECK (expires_at > created_at)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_user_id 
  ON public.password_reset_logs(user_id);
  
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_token_hash 
  ON public.password_reset_logs(token_hash);
  
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_expires_at 
  ON public.password_reset_logs(expires_at);

-- Add comments
COMMENT ON TABLE public.password_reset_logs IS 'Tracks password reset requests for audit and security purposes';
COMMENT ON COLUMN public.password_reset_logs.token_hash IS 'SHA256 hash of the reset token (stored for security)';
COMMENT ON COLUMN public.password_reset_logs.expires_at IS 'Token expiration timestamp (typically 1 hour from creation)';
COMMENT ON COLUMN public.password_reset_logs.used_at IS 'When the token was actually used to reset password';

-- ============================================
-- 3. CREATE AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.password_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'password_changed', 'password_reset', 'password_reset_requested'
  auth_method TEXT, -- 'email', 'google', 'github'
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_password_change_audit_user_id 
  ON public.password_change_audit(user_id);
  
CREATE INDEX IF NOT EXISTS idx_password_change_audit_created_at 
  ON public.password_change_audit(created_at DESC);

-- Add comments
COMMENT ON TABLE public.password_change_audit IS 'Audit trail for all password-related changes';
COMMENT ON COLUMN public.password_change_audit.change_type IS 'Type of password change event';

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.password_reset_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_change_audit ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES FOR PASSWORD RESET LOGS
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own reset logs" ON public.password_reset_logs;
DROP POLICY IF EXISTS "Admins can view all reset logs" ON public.password_reset_logs;
DROP POLICY IF EXISTS "System can insert reset logs" ON public.password_reset_logs;

-- Users can view their own password reset logs
CREATE POLICY "Users can view own reset logs"
  ON public.password_reset_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all password reset logs
CREATE POLICY "Admins can view all reset logs"
  ON public.password_reset_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- System can insert reset logs (via function)
CREATE POLICY "System can insert reset logs"
  ON public.password_reset_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own logs (mark as used)
CREATE POLICY "Users can update own reset logs"
  ON public.password_reset_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. CREATE RLS POLICIES FOR PASSWORD CHANGE AUDIT
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.password_change_audit;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.password_change_audit;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.password_change_audit;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.password_change_audit FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.password_change_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.password_change_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- 7. CREATE FUNCTIONS FOR PASSWORD MANAGEMENT
-- ============================================

-- Function to get user auth provider
CREATE OR REPLACE FUNCTION public.get_user_auth_provider(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth_provider, 'email') 
  FROM public.profiles 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

COMMENT ON FUNCTION public.get_user_auth_provider IS 'Get the authentication provider for a specific user';

-- Function to check if user has password
CREATE OR REPLACE FUNCTION public.user_has_password(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT 
    CASE 
      WHEN (
        SELECT encrypted_password IS NOT NULL 
        FROM auth.users 
        WHERE id = _user_id
      ) THEN true
      ELSE false
    END
$$;

COMMENT ON FUNCTION public.user_has_password IS 'Check if user has a password set (true for email auth, false for OAuth)';

-- Function to get user password status
CREATE OR REPLACE FUNCTION public.get_user_password_status(_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  has_password BOOLEAN,
  auth_provider TEXT,
  is_google_user BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT 
    u.id,
    u.email,
    u.encrypted_password IS NOT NULL as has_password,
    COALESCE(p.auth_provider, 'email') as auth_provider,
    (COALESCE(p.auth_provider, 'email') = 'google' OR u.encrypted_password IS NULL) as is_google_user
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.user_id
  WHERE u.id = _user_id
$$;

COMMENT ON FUNCTION public.get_user_password_status IS 'Get comprehensive password status for a user';

-- Function to create password reset log
CREATE OR REPLACE FUNCTION public.create_password_reset_log(
  _user_id UUID,
  _email TEXT,
  _token_hash TEXT,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
  _expires_at TIMESTAMPTZ;
BEGIN
  -- Set expiration to 1 hour from now
  _expires_at := now() + INTERVAL '1 hour';
  
  -- Insert the reset log
  INSERT INTO public.password_reset_logs (
    user_id,
    email,
    token_hash,
    expires_at,
    ip_address,
    user_agent
  )
  VALUES (
    _user_id,
    _email,
    _token_hash,
    _expires_at,
    _ip_address,
    _user_agent
  )
  RETURNING id INTO _log_id;
  
  -- Log the event to audit table
  INSERT INTO public.password_change_audit (
    user_id,
    email,
    change_type,
    auth_method,
    ip_address,
    user_agent,
    success
  )
  VALUES (
    _user_id,
    _email,
    'password_reset_requested',
    public.get_user_auth_provider(_user_id),
    _ip_address,
    _user_agent,
    true
  );
  
  RETURN _log_id;
END;
$$;

COMMENT ON FUNCTION public.create_password_reset_log IS 'Create a password reset request log';

-- Function to verify and mark reset token as used
CREATE OR REPLACE FUNCTION public.verify_and_use_reset_token(_token_hash TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  user_id UUID,
  email TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
  _user_id UUID;
  _email TEXT;
BEGIN
  -- Find the reset log
  SELECT id, user_id, email INTO _log_id, _user_id, _email
  FROM public.password_reset_logs
  WHERE token_hash = _token_hash
  AND expires_at > now()
  AND used_at IS NULL
  LIMIT 1;
  
  IF _log_id IS NULL THEN
    RETURN QUERY SELECT 
      false as valid, 
      NULL::UUID as user_id, 
      NULL::TEXT as email, 
      'Token tidak valid atau sudah expired'::TEXT as error_message;
    RETURN;
  END IF;
  
  -- Mark token as used
  UPDATE public.password_reset_logs
  SET used_at = now()
  WHERE id = _log_id;
  
  RETURN QUERY SELECT 
    true as valid, 
    _user_id as user_id, 
    _email as email, 
    NULL::TEXT as error_message;
END;
$$;

COMMENT ON FUNCTION public.verify_and_use_reset_token IS 'Verify reset token validity and mark as used';

-- Function to log password change
CREATE OR REPLACE FUNCTION public.log_password_change(
  _user_id UUID,
  _email TEXT,
  _change_type TEXT,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _success BOOLEAN DEFAULT true,
  _error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _audit_id UUID;
BEGIN
  INSERT INTO public.password_change_audit (
    user_id,
    email,
    change_type,
    auth_method,
    ip_address,
    user_agent,
    success,
    error_message
  )
  VALUES (
    _user_id,
    _email,
    _change_type,
    public.get_user_auth_provider(_user_id),
    _ip_address,
    _user_agent,
    _success,
    _error_message
  )
  RETURNING id INTO _audit_id;
  
  RETURN _audit_id;
END;
$$;

COMMENT ON FUNCTION public.log_password_change IS 'Log password change events to audit trail';

-- Function to clean up expired reset tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted_count INTEGER;
BEGIN
  DELETE FROM public.password_reset_logs
  WHERE expires_at < now()
  AND used_at IS NULL;
  
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  
  RETURN _deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_reset_tokens IS 'Remove expired password reset tokens (should run periodically)';

-- ============================================
-- 8. CREATE TRIGGERS
-- ============================================

-- Trigger to update auth_provider when user is created via OAuth
CREATE OR REPLACE FUNCTION public.handle_oauth_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _provider TEXT;
BEGIN
  -- Determine provider from user metadata or email
  _provider := COALESCE(
    NEW.raw_app_meta_data->>'provider',
    'email'
  );
  
  -- Update profile with auth provider if profile exists
  UPDATE public.profiles
  SET auth_provider = _provider,
      updated_at = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_set_provider ON auth.users;

-- Create trigger for user creation
CREATE TRIGGER on_auth_user_created_set_provider
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_oauth_signup();

-- ============================================
-- 9. UPDATE EXISTING DATA
-- ============================================

-- Update existing Google OAuth users
UPDATE public.profiles 
SET auth_provider = 'google'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE raw_app_meta_data->>'provider' = 'google'
)
AND auth_provider IS NULL;

-- Update existing email users
UPDATE public.profiles 
SET auth_provider = 'email'
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE raw_app_meta_data->>'provider' IS NULL 
  OR raw_app_meta_data->>'provider' = 'email'
)
AND auth_provider IS NULL;

-- ============================================
-- 10. CREATE HELPER VIEWS
-- ============================================

-- View for user password status summary
CREATE OR REPLACE VIEW public.user_password_status_summary AS
SELECT 
  p.id as profile_id,
  p.user_id,
  p.full_name,
  p.username,
  p.email,
  p.auth_provider,
  u.encrypted_password IS NOT NULL as has_password,
  COALESCE(u.last_sign_in_at, u.created_at) as last_activity,
  u.created_at as account_created_at,
  u.email_confirmed_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.user_id = u.id;

COMMENT ON VIEW public.user_password_status_summary IS 'Summary view of all users and their password status';

-- View for recent password reset requests
CREATE OR REPLACE VIEW public.recent_password_resets AS
SELECT 
  prl.id,
  prl.user_id,
  prl.email,
  prl.created_at,
  prl.expires_at,
  prl.used_at,
  CASE 
    WHEN prl.used_at IS NOT NULL THEN 'used'
    WHEN prl.expires_at < now() THEN 'expired'
    ELSE 'pending'
  END as status,
  p.full_name,
  p.username
FROM public.password_reset_logs prl
LEFT JOIN public.profiles p ON prl.user_id = p.user_id
ORDER BY prl.created_at DESC;

COMMENT ON VIEW public.recent_password_resets IS 'View of recent password reset requests with status';

-- ============================================
-- 11. GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions on public functions
GRANT EXECUTE ON FUNCTION public.get_user_auth_provider TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_password TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_password_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_password_reset_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_use_reset_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_password_change TO authenticated;

-- Grant admin-only functions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reset_tokens TO authenticated;

-- Grant view access
GRANT SELECT ON public.user_password_status_summary TO authenticated;
GRANT SELECT ON public.recent_password_resets TO authenticated;

-- ============================================
-- 12. BACKUP: ROLLBACK MIGRATION
-- ============================================
/*
-- If you need to rollback this migration, uncomment and run:

-- Drop views
DROP VIEW IF EXISTS public.recent_password_resets;
DROP VIEW IF EXISTS public.user_password_status_summary;

-- Drop functions
DROP FUNCTION IF EXISTS public.cleanup_expired_reset_tokens();
DROP FUNCTION IF EXISTS public.log_password_change(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.verify_and_use_reset_token(TEXT);
DROP FUNCTION IF EXISTS public.create_password_reset_log(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_user_password_status(UUID);
DROP FUNCTION IF EXISTS public.user_has_password(UUID);
DROP FUNCTION IF EXISTS public.get_user_auth_provider(UUID);
DROP FUNCTION IF EXISTS public.handle_oauth_signup();

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created_set_provider ON auth.users;

-- Drop tables
DROP TABLE IF EXISTS public.password_change_audit;
DROP TABLE IF EXISTS public.password_reset_logs;

-- Drop column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS auth_provider;
*/

-- ============================================
-- 13. FINAL VERIFICATION
-- ============================================
-- Run these queries to verify the migration succeeded:

SELECT 'Tables Created' as check_point,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_logs') as password_reset_logs,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_change_audit') as password_change_audit
UNION ALL
SELECT 'Columns Added',
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'auth_provider'),
  NULL
UNION ALL
SELECT 'Functions Created',
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_auth_provider'),
  EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_password_status');
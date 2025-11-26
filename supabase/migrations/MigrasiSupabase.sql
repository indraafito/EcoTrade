-- ============================================
-- ECOTRADE COMPLETE DATABASE MIGRATION
-- Version: 2.0
-- Date: 2025
-- ============================================
-- This migration includes:
-- 1. Core tables (profiles, activities, locations, etc)
-- 2. Missions system with duration & expiry
-- 3. Password management & audit
-- 4. Ranking system
-- 5. Vouchers system
-- ============================================

-- ============================================
-- STEP 1: DROP EXISTING OBJECTS
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS auto_update_mission_progress ON activities;
DROP TRIGGER IF EXISTS set_mission_expiry_trigger ON mission_progress;
DROP TRIGGER IF EXISTS update_mission_progress_updated_at ON mission_progress;
DROP TRIGGER IF EXISTS update_missions_updated_at ON missions;
DROP TRIGGER IF EXISTS process_activity_trigger ON activities;
DROP TRIGGER IF EXISTS activity_mission_progress ON activities;
DROP TRIGGER IF EXISTS mission_completion_reward ON mission_progress;
DROP TRIGGER IF EXISTS on_auth_user_created_set_provider ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
DROP TRIGGER IF EXISTS update_vouchers_updated_at ON vouchers;
DROP TRIGGER IF EXISTS update_ranking_tiers_updated_at ON ranking_tiers;

-- Drop views
DROP VIEW IF EXISTS public.leaderboard_view;
DROP VIEW IF EXISTS public.mission_progress_view;
DROP VIEW IF EXISTS public.recent_password_resets;
DROP VIEW IF EXISTS public.user_password_status_summary;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_mission_progress_on_activity() CASCADE;
DROP FUNCTION IF EXISTS public.set_mission_expiry() CASCADE;
DROP FUNCTION IF EXISTS public.expire_old_missions() CASCADE;
DROP FUNCTION IF EXISTS public.claim_mission_reward(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.apply_ranking_bonus(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.process_activity() CASCADE;
DROP FUNCTION IF EXISTS public.update_mission_progress(UUID, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.verify_mission(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_all_missions() CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_all_rankings() CASCADE;
DROP FUNCTION IF EXISTS public.auto_reward_mission_completion() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.handle_oauth_signup() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_auth_provider(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_password(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_password_status(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_password_reset_log(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.verify_and_use_reset_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_password_change(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_reset_tokens() CASCADE;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.password_change_audit CASCADE;
DROP TABLE IF EXISTS public.password_reset_logs CASCADE;
DROP TABLE IF EXISTS public.mission_progress CASCADE;
DROP TABLE IF EXISTS public.missions CASCADE;
DROP TABLE IF EXISTS public.voucher_redemptions CASCADE;
DROP TABLE IF EXISTS public.vouchers CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.ranking_tiers CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop types
DROP TYPE IF EXISTS public.voucher_type CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.verify_method CASCADE;

-- ============================================
-- STEP 2: CREATE ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('user', 'admin');
CREATE TYPE public.voucher_type AS ENUM ('discount', 'food', 'credit');
CREATE TYPE public.verify_method AS ENUM ('auto', 'manual');

-- ============================================
-- STEP 3: CREATE CORE TABLES
-- ============================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  points INTEGER DEFAULT 0 NOT NULL,
  rank INTEGER DEFAULT 0 NOT NULL,
  total_bottles INTEGER DEFAULT 0 NOT NULL,
  total_weight_kg DECIMAL(10,2) DEFAULT 0 NOT NULL,
  city TEXT,
  auth_provider TEXT DEFAULT 'email' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON COLUMN public.profiles.auth_provider IS 'Auth provider: email, google, github, etc';

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  bottles_count INTEGER NOT NULL,
  weight_kg DECIMAL(10,2) NOT NULL,
  points_earned INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type voucher_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Voucher redemptions table
CREATE TABLE public.voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ranking tiers table
CREATE TABLE public.ranking_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  threshold_points INTEGER NOT NULL,
  bonus_points INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- STEP 4: CREATE MISSIONS TABLES
-- ============================================

-- Missions table with duration
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_type VARCHAR(50) NOT NULL, -- 'bottles', 'weight_kg', 'points', 'activities'
  target_value INTEGER NOT NULL,
  points_bonus INTEGER NOT NULL DEFAULT 0,
  mission_type VARCHAR(50) DEFAULT 'daily', -- 'daily', 'weekly', 'monthly', 'special'
  difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  duration_hours INTEGER DEFAULT 24, -- durasi misi dalam jam
  icon VARCHAR(50),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  max_completions INTEGER DEFAULT 1,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mission progress table with expiry
CREATE TABLE public.mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  progress_value INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'claimed', 'expired'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- ============================================
-- STEP 5: CREATE PASSWORD MANAGEMENT TABLES
-- ============================================

-- Password reset logs table
CREATE TABLE public.password_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT password_reset_logs_valid_expiry CHECK (expires_at > created_at)
);

COMMENT ON TABLE public.password_reset_logs IS 'Tracks password reset requests';
COMMENT ON COLUMN public.password_reset_logs.token_hash IS 'SHA256 hash of the reset token';

-- Password change audit table
CREATE TABLE public.password_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'password_changed', 'password_reset', 'password_reset_requested'
  auth_method TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- STEP 6: CREATE INDEXES
-- ============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX idx_missions_active ON public.missions(is_active, mission_type);
CREATE INDEX idx_missions_dates ON public.missions(start_date, end_date);
CREATE INDEX idx_mission_progress_user ON public.mission_progress(user_id);
CREATE INDEX idx_mission_progress_mission ON public.mission_progress(mission_id);
CREATE INDEX idx_mission_progress_status ON public.mission_progress(status);
CREATE INDEX idx_mission_progress_user_status ON public.mission_progress(user_id, status);
CREATE INDEX idx_password_reset_logs_user_id ON public.password_reset_logs(user_id);
CREATE INDEX idx_password_reset_logs_token_hash ON public.password_reset_logs(token_hash);
CREATE INDEX idx_password_reset_logs_expires_at ON public.password_reset_logs(expires_at);
CREATE INDEX idx_password_change_audit_user_id ON public.password_change_audit(user_id);
CREATE INDEX idx_password_change_audit_created_at ON public.password_change_audit(created_at DESC);

-- ============================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_change_audit ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 8: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$func$;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$func$;

-- ============================================
-- STEP 9: CREATE MISSIONS FUNCTIONS
-- ============================================

-- Function to set expires_at on mission progress
CREATE OR REPLACE FUNCTION public.set_mission_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  v_duration_hours INTEGER;
BEGIN
  SELECT duration_hours INTO v_duration_hours
  FROM missions WHERE id = NEW.mission_id;

  IF v_duration_hours IS NOT NULL THEN
    NEW.expires_at := NEW.started_at + (v_duration_hours || ' hours')::INTERVAL;
  END IF;

  RETURN NEW;
END;
$func$;

-- Function to expire old missions
CREATE OR REPLACE FUNCTION public.expire_old_missions()
RETURNS void
LANGUAGE plpgsql
AS $func$
BEGIN
  UPDATE mission_progress
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'in_progress'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$func$;

-- Function to auto-update mission progress
CREATE OR REPLACE FUNCTION public.update_mission_progress_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  -- Expire old missions first
  UPDATE mission_progress
  SET status = 'expired', updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND status = 'in_progress'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- Update progress for 'bottles' type
  UPDATE mission_progress mp
  SET progress_value = progress_value + NEW.bottles_count, updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.user_id = NEW.user_id
    AND mp.status = 'in_progress'
    AND (mp.expires_at IS NULL OR mp.expires_at > NOW())
    AND m.target_type = 'bottles'
    AND m.is_active = true;

  -- Update progress for 'weight_kg' type
  UPDATE mission_progress mp
  SET progress_value = progress_value + CAST(NEW.weight_kg AS INTEGER), updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.user_id = NEW.user_id
    AND mp.status = 'in_progress'
    AND (mp.expires_at IS NULL OR mp.expires_at > NOW())
    AND m.target_type = 'weight_kg'
    AND m.is_active = true;

  -- Update progress for 'points' type
  UPDATE mission_progress mp
  SET progress_value = progress_value + NEW.points_earned, updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.user_id = NEW.user_id
    AND mp.status = 'in_progress'
    AND (mp.expires_at IS NULL OR mp.expires_at > NOW())
    AND m.target_type = 'points'
    AND m.is_active = true;

  -- Update progress for 'activities' type
  UPDATE mission_progress mp
  SET progress_value = progress_value + 1, updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.user_id = NEW.user_id
    AND mp.status = 'in_progress'
    AND (mp.expires_at IS NULL OR mp.expires_at > NOW())
    AND m.target_type = 'activities'
    AND m.is_active = true;

  -- Auto-complete missions that reached target
  UPDATE mission_progress mp
  SET status = 'completed', completed_at = NOW(), updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.user_id = NEW.user_id
    AND mp.status = 'in_progress'
    AND mp.progress_value >= m.target_value;

  RETURN NEW;
END;
$func$;

-- Function to claim mission reward (optional - can also be done client-side)
CREATE OR REPLACE FUNCTION public.claim_mission_reward(mission_progress_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_user_id UUID;
  v_mission_id UUID;
  v_points_bonus INTEGER;
  v_status VARCHAR(20);
BEGIN
  SELECT user_id, mission_id, status
  INTO v_user_id, v_mission_id, v_status
  FROM mission_progress
  WHERE id = mission_progress_id;

  IF v_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mission belum selesai');
  END IF;

  SELECT points_bonus INTO v_points_bonus FROM missions WHERE id = v_mission_id;

  UPDATE profiles SET points = points + v_points_bonus WHERE user_id = v_user_id;

  UPDATE mission_progress
  SET status = 'claimed', claimed_at = NOW(), verified = true
  WHERE id = mission_progress_id;

  RETURN jsonb_build_object('success', true, 'points_earned', v_points_bonus);
END;
$func$;

-- ============================================
-- STEP 10: CREATE RANKING FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.apply_ranking_bonus(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $func$
DECLARE
  current_points INTEGER;
  current_rank INTEGER;
  new_rank INTEGER := 0;
  tier_record RECORD;
  total_bonus INTEGER := 0;
BEGIN
  SELECT points, rank INTO current_points, current_rank 
  FROM public.profiles WHERE user_id = _user_id;
  
  IF current_points IS NULL THEN RETURN; END IF;
  
  SELECT COALESCE(MAX(sort_order), 0) INTO new_rank
  FROM public.ranking_tiers
  WHERE threshold_points <= current_points AND is_active = true;
  
  IF new_rank > COALESCE(current_rank, 0) THEN
    FOR tier_record IN 
      SELECT bonus_points FROM public.ranking_tiers
      WHERE sort_order > COALESCE(current_rank, 0)
        AND sort_order <= new_rank
        AND is_active = true
      ORDER BY sort_order
    LOOP
      total_bonus := total_bonus + tier_record.bonus_points;
    END LOOP;
    
    UPDATE public.profiles
    SET rank = new_rank, points = points + total_bonus, updated_at = NOW()
    WHERE user_id = _user_id;
  END IF;
END;
$func$;

-- Function to process activity (update profile & missions)
CREATE OR REPLACE FUNCTION public.process_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  UPDATE public.profiles
  SET points = points + NEW.points_earned,
      total_bottles = total_bottles + NEW.bottles_count,
      total_weight_kg = total_weight_kg + NEW.weight_kg,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  PERFORM public.apply_ranking_bonus(NEW.user_id);
  
  RETURN NEW;
END;
$func$;

-- ============================================
-- STEP 11: CREATE PASSWORD MANAGEMENT FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_auth_provider(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $func$
  SELECT COALESCE(auth_provider, 'email') 
  FROM public.profiles WHERE user_id = _user_id LIMIT 1
$func$;

CREATE OR REPLACE FUNCTION public.user_has_password(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $func$
  SELECT CASE 
    WHEN (SELECT encrypted_password IS NOT NULL FROM auth.users WHERE id = _user_id) 
    THEN true ELSE false 
  END
$func$;

CREATE OR REPLACE FUNCTION public.handle_oauth_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  _provider TEXT;
BEGIN
  _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  
  UPDATE public.profiles
  SET auth_provider = _provider, updated_at = NOW()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$func$;

-- ============================================
-- STEP 12: CREATE TRIGGERS
-- ============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_set_provider
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_oauth_signup();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mission_progress_updated_at
  BEFORE UPDATE ON public.mission_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ranking_tiers_updated_at
  BEFORE UPDATE ON public.ranking_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_mission_expiry_trigger
  BEFORE INSERT ON public.mission_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_mission_expiry();

CREATE TRIGGER auto_update_mission_progress
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_mission_progress_on_activity();

CREATE TRIGGER process_activity_trigger
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.process_activity();

-- ============================================
-- STEP 13: CREATE RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Locations policies
CREATE POLICY "Anyone can view active locations" ON public.locations FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Activities policies
CREATE POLICY "Users can view own activities" ON public.activities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Missions policies
CREATE POLICY "Anyone can view active missions" ON public.missions FOR SELECT USING (is_active = true);

-- Mission progress policies
CREATE POLICY "Users can view their own mission progress" ON public.mission_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own mission progress" ON public.mission_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mission progress" ON public.mission_progress FOR UPDATE USING (auth.uid() = user_id);

-- Vouchers policies
CREATE POLICY "Users can view active vouchers" ON public.vouchers FOR SELECT TO authenticated USING (is_active = true);

-- Voucher redemptions policies
CREATE POLICY "Users can view own redemptions" ON public.voucher_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own redemptions" ON public.voucher_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Ranking tiers policies
CREATE POLICY "Users can view ranking tiers" ON public.ranking_tiers FOR SELECT TO authenticated USING (true);

-- Password logs policies
CREATE POLICY "Users can view own reset logs" ON public.password_reset_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own audit logs" ON public.password_change_audit FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- STEP 14: INSERT SAMPLE DATA
-- ============================================

-- Sample locations
INSERT INTO public.locations (name, address, latitude, longitude) VALUES
  ('EcoTrade Hub Central', 'Jl. Sudirman No. 123, Jakarta Pusat', -6.208763, 106.845599),
  ('EcoTrade Station North', 'Jl. Gatot Subroto No. 45, Jakarta Utara', -6.174465, 106.829376),
  ('EcoTrade Point South', 'Jl. TB Simatupang No. 78, Jakarta Selatan', -6.290632, 106.822395);

-- Sample vouchers
INSERT INTO public.vouchers (type, title, description, points_required, is_active) VALUES
  ('discount', 'Diskon 20% Belanja', 'Dapatkan diskon 20% untuk belanja di toko partner', 500, true),
  ('food', 'Gratis Burger Combo', 'Nikmati burger combo gratis di restoran partner', 800, true),
  ('credit', 'Pulsa 50K', 'Voucher pulsa senilai Rp 50.000', 1000, true);

-- Sample missions with duration
INSERT INTO public.missions (title, description, target_type, target_value, points_bonus, mission_type, difficulty, duration_hours, icon) VALUES
  ('Pemula Ramah Lingkungan', 'Setor 5 botol plastik pertamamu', 'bottles', 5, 50, 'daily', 'easy', 24, 'Recycle'),
  ('Penyelamat Harian', 'Setor 10 botol dalam sehari', 'bottles', 10, 100, 'daily', 'medium', 24, 'Trophy'),
  ('Master Daur Ulang', 'Setor 50 botol dalam seminggu', 'bottles', 50, 500, 'weekly', 'hard', 168, 'Award'),
  ('Kolektor Berat', 'Kumpulkan 5kg sampah plastik', 'weight_kg', 5, 200, 'weekly', 'medium', 168, 'Weight'),
  ('Pejuang Lingkungan', 'Lakukan 3 aktivitas daur ulang', 'activities', 3, 150, 'daily', 'easy', 24, 'Target'),
  ('Juara Mingguan', 'Kumpulkan 500 poin dalam seminggu', 'points', 500, 250, 'weekly', 'medium', 168, 'TrendingUp');

-- Sample ranking tiers
INSERT INTO public.ranking_tiers (name, threshold_points, bonus_points, sort_order, is_active) VALUES
  ('Bronze', 0, 0, 1, true),
  ('Silver', 500, 50, 2, true),
  ('Gold', 1500, 100, 3, true),
  ('Platinum', 3000, 200, 4, true),
  ('Diamond', 5000, 300, 5, true);

-- ============================================
-- STEP 15: CREATE VIEWS
-- ============================================

CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
  p.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.points,
  p.total_bottles,
  p.total_weight_kg,
  p.city,
  rt.name as rank_name,
  ROW_NUMBER() OVER (ORDER BY p.points DESC) as position
FROM public.profiles p
LEFT JOIN public.ranking_tiers rt ON rt.sort_order = p.rank
ORDER BY p.points DESC;


-- Create table for AI Analytics storage
CREATE TABLE IF NOT EXISTS ai_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    insights JSONB NOT NULL,
    last_analyzed TIMESTAMP WITH TIME ZONE NOT NULL,
    date_filter_type VARCHAR(50) NOT NULL,
    date_filter_start TIMESTAMP WITH TIME ZONE NOT NULL,
    date_filter_end TIMESTAMP WITH TIME ZONE NOT NULL,
    stats JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

--Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ai_analytics_created_at ON ai_analytics(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (adjust as needed)
CREATE POLICY "Users can manage their own AI analytics" ON ai_analytics
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Optional: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_analytics_updated_at 
    BEFORE UPDATE ON ai_analytics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Test insert to verify table works
INSERT INTO ai_analytics (insights, last_analyzed, date_filter_type, date_filter_start, date_filter_end, stats)
VALUES (
    '[{"type": "test", "title": "Test", "description": "Test", "confidence": 0.5, "impact": "low"}]',
    NOW(),
    'test',
    NOW(),
    NOW(),
    '{"totalBottles": 0, "totalUsers": 0, "totalActiveUsers": 0, "totalRedemptions": 0, "totalLocations": 0, "totalVouchers": 0}'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- User Roles policies (ADD THIS)
-- ============================================

-- Allow service role to insert roles for new users
CREATE POLICY "Service can insert user roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Users can view their own roles
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SAMPLE MISSION DATA
-- ============================================

-- Insert sample missions
INSERT INTO public.missions (title, description, target_type, target_value, points_bonus, mission_type, difficulty, duration_hours, icon, is_active, max_completions) VALUES
('Eco Warrior', 'Kumpulkan 10 botol untuk membantu lingkungan', 'bottles', 10, 50, 'daily', 'easy', 24, '🎯', true, 1),
('Point Master', 'Dapatkan 100 poin dari aktivitas recycling', 'points', 100, 25, 'daily', 'medium', 24, '⭐', true, 1),
('Weight Champion', 'Kumpulkan total 1kg berat botol', 'weight_kg', 1, 75, 'daily', 'medium', 24, '⚖️', true, 1),
('Weekly Streak', 'Lakukan recycling selama 7 hari berturut-turut', 'activities', 7, 100, 'weekly', 'hard', 168, '🔥', true, 1),
('Friend Referral', 'Ajak 3 teman untuk bergabung dengan EcoTrade', 'activities', 3, 150, 'special', 'medium', 72, '👥', true, 3),
('Monthly Hero', 'Kumpulkan 50 botol dalam sebulan', 'bottles', 50, 200, 'monthly', 'hard', 720, '🏆', true, 1),
('Green Starter', 'Lakukan recycling pertama kali', 'activities', 1, 10, 'daily', 'easy', 24, '🌱', true, 1),
('Heavy Lifter', 'Kumpulkan 5kg berat botol', 'weight_kg', 5, 125, 'weekly', 'medium', 168, '💪', true, 2)
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE RANKING TIERS DATA
-- ============================================

-- Insert sample ranking tiers (already exists in migration, but ensuring complete data)
INSERT INTO public.ranking_tiers (name, threshold_points, bonus_points, sort_order, is_active) VALUES
('Diamond', 5000, 300, 1, true),
('Platinum', 3000, 200, 2, true),
('Gold', 1500, 100, 3, true),
('Silver', 500, 50, 4, true),
('Bronze', 0, 0, 5, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- MIGRATION
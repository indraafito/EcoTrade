-- ============================================
-- EcoTrade Complete Database Schema
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- Create enum for voucher types
CREATE TYPE public.voucher_type AS ENUM ('discount', 'food', 'credit');

-- Create enum for verification methods
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verify_method') THEN
    CREATE TYPE public.verify_method AS ENUM ('auto', 'manual');
  END IF;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  points INTEGER DEFAULT 0 NOT NULL,
  rank INTEGER DEFAULT 0 NOT NULL,
  total_bottles INTEGER DEFAULT 0 NOT NULL,
  total_weight_kg DECIMAL(10,2) DEFAULT 0 NOT NULL,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create locations table for trash bin locations
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create activities table for bottle disposal history
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  bottles_count INTEGER NOT NULL,
  weight_kg DECIMAL(10,2) NOT NULL,
  points_earned INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type voucher_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create voucher_redemptions table
CREATE TABLE public.voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create missions table
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  points_bonus INTEGER NOT NULL DEFAULT 0,
  verify_method verify_method NOT NULL DEFAULT 'auto',
  target_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create mission progress table
CREATE TABLE IF NOT EXISTS public.mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE NOT NULL,
  progress_value INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, mission_id)
);

-- Create ranking tiers table
CREATE TABLE IF NOT EXISTS public.ranking_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  threshold_points INTEGER NOT NULL,
  bonus_points INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
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

-- ============================================
-- FUNCTIONS
-- ============================================

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create ranking bonus function
CREATE OR REPLACE FUNCTION public.apply_ranking_bonus(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  current_points INTEGER;
  current_rank INTEGER;
  new_rank INTEGER := 0;
  bonus_total INTEGER := 0;
  prev_bonus_total INTEGER := 0;
BEGIN
  SELECT points, rank INTO current_points, current_rank FROM public.profiles WHERE user_id = _user_id;
  IF current_points IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO new_rank FROM public.ranking_tiers WHERE threshold_points <= current_points;

  IF new_rank > COALESCE(current_rank, 0) THEN
    SELECT COALESCE(SUM(bonus_points), 0) INTO bonus_total FROM public.ranking_tiers WHERE sort_order <= new_rank;
    SELECT COALESCE(SUM(bonus_points), 0) INTO prev_bonus_total FROM public.ranking_tiers WHERE sort_order <= COALESCE(current_rank, 0);
    UPDATE public.profiles
      SET rank = new_rank,
          points = points + (bonus_total - prev_bonus_total),
          updated_at = now()
      WHERE user_id = _user_id;
  END IF;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ranking_tiers_updated_at
  BEFORE UPDATE ON public.ranking_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for locations
CREATE POLICY "Anyone can view active locations"
  ON public.locations FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage locations"
  ON public.locations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activities
CREATE POLICY "Users can view own activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for vouchers
CREATE POLICY "Users can view active vouchers"
  ON public.vouchers FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage vouchers"
  ON public.vouchers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for voucher_redemptions
CREATE POLICY "Users can view own redemptions"
  ON public.voucher_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions"
  ON public.voucher_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
  ON public.voucher_redemptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for missions
CREATE POLICY "Users can view missions"
  ON public.missions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage missions"
  ON public.missions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mission_progress
CREATE POLICY "Users can view own mission progress"
  ON public.mission_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own mission progress"
  ON public.mission_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all mission progress"
  ON public.mission_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ranking_tiers
CREATE POLICY "Users can view ranking tiers"
  ON public.ranking_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage ranking tiers"
  ON public.ranking_tiers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert sample locations
INSERT INTO public.locations (name, address, latitude, longitude) VALUES
  ('EcoTrade Hub Central', 'Jl. Sudirman No. 123, Jakarta Pusat', -6.208763, 106.845599),
  ('EcoTrade Station North', 'Jl. Gatot Subroto No. 45, Jakarta Utara', -6.174465, 106.829376),
  ('EcoTrade Point South', 'Jl. TB Simatupang No. 78, Jakarta Selatan', -6.290632, 106.822395);

-- Insert sample vouchers
INSERT INTO public.vouchers (type, title, description, points_required, is_active) VALUES
  ('discount', 'Diskon 20% Belanja', 'Dapatkan diskon 20% untuk belanja di toko partner', 500, true),
  ('food', 'Gratis Burger Combo', 'Nikmati burger combo gratis di restoran partner', 800, true),
  ('credit', 'Pulsa 50K', 'Voucher pulsa senilai Rp 50.000', 1000, true),
  ('discount', 'Diskon 50% Transportasi', 'Diskon 50% untuk perjalanan dengan transportasi online', 600, true),
  ('food', 'Gratis Kopi & Snack', 'Kopi dan snack gratis di kafe partner', 400, true);

-- ============================================
-- FUNCTION: Auto reward poin ketika misi selesai
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_reward_mission_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mission_bonus INTEGER;
  mission_verify TEXT;
BEGIN
  -- Cek apakah misi baru saja completed
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    -- Ambil info misi
    SELECT points_bonus, verify_method 
    INTO mission_bonus, mission_verify
    FROM public.missions 
    WHERE id = NEW.mission_id;
    
    -- Jika auto verify atau sudah verified, berikan poin
    IF mission_verify = 'auto' OR NEW.verified = true THEN
      -- Tambahkan poin ke profile user
      UPDATE public.profiles
      SET points = points + mission_bonus,
          updated_at = now()
      WHERE user_id = NEW.user_id;
      
      -- Cek apakah user naik rank (akan trigger ranking bonus function)
      PERFORM public.apply_ranking_bonus(NEW.user_id);
    END IF;
  END IF;
  
  -- Jika manual verify dan baru diverified, berikan poin
  IF NEW.verified = true AND OLD.verified = false AND NEW.completed_at IS NOT NULL THEN
    SELECT points_bonus INTO mission_bonus
    FROM public.missions 
    WHERE id = NEW.mission_id;
    
    UPDATE public.profiles
    SET points = points + mission_bonus,
        updated_at = now()
    WHERE user_id = NEW.user_id;
    
    -- Cek ranking bonus
    PERFORM public.apply_ranking_bonus(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- FUNCTION: Update ranking bonus yang lebih baik
-- ============================================

CREATE OR REPLACE FUNCTION public.apply_ranking_bonus(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points INTEGER;
  current_rank INTEGER;
  new_rank INTEGER := 0;
  bonus_to_add INTEGER := 0;
  tier_record RECORD;
BEGIN
  -- Ambil data user saat ini
  SELECT points, rank 
  INTO current_points, current_rank 
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  IF current_points IS NULL THEN
    RETURN;
  END IF;

  -- Hitung rank baru berdasarkan threshold
  SELECT COUNT(*) 
  INTO new_rank 
  FROM public.ranking_tiers 
  WHERE threshold_points <= current_points 
    AND is_active = true;

  -- Jika ada kenaikan rank
  IF new_rank > COALESCE(current_rank, 0) THEN
    -- Hitung bonus dari tier yang baru dicapai saja
    FOR tier_record IN 
      SELECT bonus_points, name
      FROM public.ranking_tiers
      WHERE sort_order > COALESCE(current_rank, 0)
        AND sort_order <= new_rank
        AND is_active = true
      ORDER BY sort_order
    LOOP
      bonus_to_add := bonus_to_add + tier_record.bonus_points;
    END LOOP;
    
    -- Update profile dengan rank baru dan bonus points
    IF bonus_to_add > 0 THEN
      UPDATE public.profiles
        SET rank = new_rank,
            points = points + bonus_to_add,
            updated_at = now()
        WHERE user_id = _user_id;
    ELSE
      -- Update rank saja tanpa bonus
      UPDATE public.profiles
        SET rank = new_rank,
            updated_at = now()
        WHERE user_id = _user_id;
    END IF;
  END IF;
END;
$$;

-- ============================================
-- FUNCTION: Update progress misi otomatis
-- ============================================

CREATE OR REPLACE FUNCTION public.update_mission_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mission_record RECORD;
BEGIN
  -- Loop semua misi aktif untuk user ini
  FOR mission_record IN 
    SELECT m.id, m.target_type, m.target_value, m.city
    FROM public.missions m
    WHERE m.is_active = true
      AND (m.city IS NULL OR m.city = (SELECT city FROM public.profiles WHERE user_id = NEW.user_id))
  LOOP
    -- Cek tipe misi dan update progress
    IF mission_record.target_type = 'bottles_count' THEN
      -- Insert or update mission progress
      INSERT INTO public.mission_progress (user_id, mission_id, progress_value)
      VALUES (
        NEW.user_id,
        mission_record.id,
        (SELECT COALESCE(SUM(bottles_count), 0) FROM public.activities WHERE user_id = NEW.user_id)
      )
      ON CONFLICT (user_id, mission_id) 
      DO UPDATE SET 
        progress_value = (SELECT COALESCE(SUM(bottles_count), 0) FROM public.activities WHERE user_id = NEW.user_id),
        completed_at = CASE 
          WHEN EXCLUDED.progress_value >= mission_record.target_value THEN now()
          ELSE mission_progress.completed_at
        END,
        verified = CASE
          WHEN EXCLUDED.progress_value >= mission_record.target_value THEN true
          ELSE mission_progress.verified
        END;
        
    ELSIF mission_record.target_type = 'weight_kg' THEN
      INSERT INTO public.mission_progress (user_id, mission_id, progress_value)
      VALUES (
        NEW.user_id,
        mission_record.id,
        (SELECT COALESCE(SUM(weight_kg), 0) FROM public.activities WHERE user_id = NEW.user_id)
      )
      ON CONFLICT (user_id, mission_id) 
      DO UPDATE SET 
        progress_value = (SELECT COALESCE(SUM(weight_kg), 0) FROM public.activities WHERE user_id = NEW.user_id),
        completed_at = CASE 
          WHEN EXCLUDED.progress_value >= mission_record.target_value THEN now()
          ELSE mission_progress.completed_at
        END,
        verified = CASE
          WHEN EXCLUDED.progress_value >= mission_record.target_value THEN true
          ELSE mission_progress.verified
        END;
        
    ELSIF mission_record.target_type = 'activities_count' THEN
      INSERT INTO public.mission_progress (user_id, mission_id, progress_value)
      VALUES (
        NEW.user_id,
        mission_record.id,
        (SELECT COUNT(*) FROM public.activities WHERE user_id = NEW.user_id)
      )
      ON CONFLICT (user_id, mission_id) 
      DO UPDATE SET 
        progress_value = (SELECT COUNT(*) FROM public.activities WHERE user_id = NEW.user_id),
        completed_at = CASE 
          WHEN EXCLUDED.progress_value >= mission_record.target_value THEN now()
          ELSE mission_progress.completed_at
        END,
        verified = CASE
          WHEN EXCLUDED.progress_value >= mission_record.target_value THEN true
          ELSE mission_progress.verified
        END;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger untuk auto reward ketika misi completed
CREATE TRIGGER mission_completion_reward
  AFTER UPDATE ON public.mission_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_reward_mission_completion();

-- Trigger untuk update progress misi otomatis ketika ada aktivitas baru
CREATE TRIGGER activity_mission_progress
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mission_progress();

-- ============================================
-- SAMPLE DATA: Ranking Tiers
-- ============================================

INSERT INTO public.ranking_tiers (name, threshold_points, bonus_points, sort_order, is_active) VALUES
  ('Pemula', 0, 0, 1, true),
  ('Perunggu', 500, 50, 2, true),
  ('Perak', 1000, 100, 3, true),
  ('Emas', 2000, 200, 4, true),
  ('Platinum', 5000, 500, 5, true),
  ('Diamond', 10000, 1000, 6, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- SAMPLE DATA: Missions
-- ============================================

INSERT INTO public.missions (title, description, points_bonus, verify_method, target_type, target_value, is_active) VALUES
  ('Pemula Ramah Lingkungan', 'Buang 10 botol plastik pertamamu', 100, 'auto', 'bottles_count', 10, true),
  ('Penyelamat Bumi', 'Kumpulkan 50 botol plastik', 300, 'auto', 'bottles_count', 50, true),
  ('Master Daur Ulang', 'Kumpulkan 100 botol plastik', 600, 'auto', 'bottles_count', 100, true),
  ('Pahlawan Lingkungan', 'Kumpulkan total 10kg plastik', 400, 'auto', 'weight_kg', 10, true),
  ('Konsisten Hijau', 'Lakukan 20 aktivitas daur ulang', 500, 'auto', 'activities_count', 20, true)
ON CONFLICT DO NOTHING;

-- Create default admin user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@ecotrade.com';
  
  -- If admin doesn't exist, create it
  IF admin_user_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@ecotrade.com',
      crypt('admin', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"admin","full_name":"Administrator"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_user_id;
    
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin');
    
    -- Insert profile
    INSERT INTO public.profiles (user_id, username, full_name)
    VALUES (admin_user_id, 'admin', 'Administrator');
  END IF;
END $

-- ============================================
-- EcoTrade - Fitur Tambahan: Misi & Rank Otomatis
-- File ini berisi penambahan untuk sistem otomatis
-- ============================================

-- ============================================
-- FUNGSI UNTUK AUTO UPDATE MISI
-- ============================================

-- Fungsi untuk update progress misi otomatis
CREATE OR REPLACE FUNCTION public.update_mission_progress(_user_id UUID, _target_type TEXT, _increment INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mission_record RECORD;
  current_progress INTEGER;
BEGIN
  -- Loop through semua misi aktif yang sesuai dengan target_type
  FOR mission_record IN 
    SELECT id, target_value, points_bonus, verify_method
    FROM public.missions
    WHERE is_active = true 
    AND target_type = _target_type
    AND (city IS NULL OR city IN (SELECT city FROM public.profiles WHERE user_id = _user_id))
  LOOP
    -- Cek apakah user sudah punya progress untuk misi ini
    SELECT progress_value INTO current_progress
    FROM public.mission_progress
    WHERE user_id = _user_id AND mission_id = mission_record.id;
    
    IF current_progress IS NULL THEN
      -- Buat progress baru
      INSERT INTO public.mission_progress (user_id, mission_id, progress_value)
      VALUES (_user_id, mission_record.id, _increment);
      current_progress := _increment;
    ELSE
      -- Update progress yang sudah ada
      UPDATE public.mission_progress
      SET progress_value = progress_value + _increment,
          updated_at = now()
      WHERE user_id = _user_id AND mission_id = mission_record.id;
      current_progress := current_progress + _increment;
    END IF;
    
    -- Cek apakah misi sudah selesai
    IF current_progress >= mission_record.target_value THEN
      -- Untuk auto verify
      IF mission_record.verify_method = 'auto' THEN
        -- Update status completed dan verified
        UPDATE public.mission_progress
        SET completed_at = now(),
            verified = true
        WHERE user_id = _user_id 
        AND mission_id = mission_record.id
        AND completed_at IS NULL;
        
        -- Berikan bonus points ke user
        UPDATE public.profiles
        SET points = points + mission_record.points_bonus,
            updated_at = now()
        WHERE user_id = _user_id;
        
        -- Trigger ranking bonus check
        PERFORM public.apply_ranking_bonus(_user_id);
      ELSE
        -- Untuk manual verify, hanya tandai sebagai completed
        UPDATE public.mission_progress
        SET completed_at = now()
        WHERE user_id = _user_id 
        AND mission_id = mission_record.id
        AND completed_at IS NULL;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Fungsi untuk verify manual mission (untuk admin)
CREATE OR REPLACE FUNCTION public.verify_mission(_user_id UUID, _mission_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mission_bonus INTEGER;
  is_completed BOOLEAN;
BEGIN
  -- Cek apakah misi sudah completed tapi belum verified
  SELECT completed_at IS NOT NULL AND NOT verified INTO is_completed
  FROM public.mission_progress
  WHERE user_id = _user_id AND mission_id = _mission_id;
  
  IF NOT is_completed THEN
    RETURN false;
  END IF;
  
  -- Get bonus points dari mission
  SELECT points_bonus INTO mission_bonus
  FROM public.missions
  WHERE id = _mission_id;
  
  -- Update verified status
  UPDATE public.mission_progress
  SET verified = true
  WHERE user_id = _user_id AND mission_id = _mission_id;
  
  -- Berikan bonus points
  UPDATE public.profiles
  SET points = points + mission_bonus,
      updated_at = now()
  WHERE user_id = _user_id;
  
  -- Trigger ranking bonus check
  PERFORM public.apply_ranking_bonus(_user_id);
  
  RETURN true;
END;
$$;

-- ============================================
-- TRIGGER UNTUK AUTO UPDATE ACTIVITIES
-- ============================================

-- Fungsi trigger untuk update profile dan mission saat ada aktivitas baru
CREATE OR REPLACE FUNCTION public.process_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile stats
  UPDATE public.profiles
  SET points = points + NEW.points_earned,
      total_bottles = total_bottles + NEW.bottles_count,
      total_weight_kg = total_weight_kg + NEW.weight_kg,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  
  -- Update mission progress untuk bottles_count
  PERFORM public.update_mission_progress(NEW.user_id, 'bottles', NEW.bottles_count);
  
  -- Update mission progress untuk weight_kg
  PERFORM public.update_mission_progress(NEW.user_id, 'weight', NEW.weight_kg::INTEGER);
  
  -- Update mission progress untuk activities count
  PERFORM public.update_mission_progress(NEW.user_id, 'activities', 1);
  
  -- Check ranking bonus
  PERFORM public.apply_ranking_bonus(NEW.user_id);
  
  RETURN NEW;
END;
$$;

-- Buat trigger untuk activities
DROP TRIGGER IF EXISTS process_activity_trigger ON public.activities;
CREATE TRIGGER process_activity_trigger
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.process_activity();

-- ============================================
-- FUNGSI RANKING YANG SUDAH DIPERBAIKI
-- ============================================

-- Update fungsi apply_ranking_bonus dengan sistem yang lebih baik
CREATE OR REPLACE FUNCTION public.apply_ranking_bonus(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  current_points INTEGER;
  current_rank INTEGER;
  new_rank INTEGER := 0;
  tier_record RECORD;
  total_bonus INTEGER := 0;
BEGIN
  -- Ambil data user
  SELECT points, rank INTO current_points, current_rank 
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  IF current_points IS NULL THEN
    RETURN;
  END IF;
  
  -- Hitung rank baru berdasarkan threshold
  SELECT COALESCE(MAX(sort_order), 0) INTO new_rank
  FROM public.ranking_tiers
  WHERE threshold_points <= current_points AND is_active = true;
  
  -- Jika rank naik
  IF new_rank > COALESCE(current_rank, 0) THEN
    -- Hitung total bonus untuk tier yang baru dicapai
    FOR tier_record IN 
      SELECT bonus_points, name
      FROM public.ranking_tiers
      WHERE sort_order > COALESCE(current_rank, 0)
      AND sort_order <= new_rank
      AND is_active = true
      ORDER BY sort_order
    LOOP
      total_bonus := total_bonus + tier_record.bonus_points;
    END LOOP;
    
    -- Update rank dan berikan bonus
    UPDATE public.profiles
    SET rank = new_rank,
        points = points + total_bonus,
        updated_at = now()
    WHERE user_id = _user_id;
  END IF;
END;
$$;

-- ============================================
-- FUNGSI HELPER UNTUK ADMIN
-- ============================================

-- Fungsi untuk recalculate semua mission progress
CREATE OR REPLACE FUNCTION public.recalculate_all_missions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  missions_updated INTEGER := 0;
BEGIN
  -- Loop semua user
  FOR user_record IN SELECT user_id, total_bottles, total_weight_kg FROM public.profiles
  LOOP
    -- Reset dan recalculate mission progress
    DELETE FROM public.mission_progress WHERE user_id = user_record.user_id;
    
    -- Update berdasarkan total bottles
    IF user_record.total_bottles > 0 THEN
      PERFORM public.update_mission_progress(user_record.user_id, 'bottles', user_record.total_bottles);
    END IF;
    
    -- Update berdasarkan total weight
    IF user_record.total_weight_kg > 0 THEN
      PERFORM public.update_mission_progress(user_record.user_id, 'weight', user_record.total_weight_kg::INTEGER);
    END IF;
    
    missions_updated := missions_updated + 1;
  END LOOP;
  
  RETURN missions_updated;
END;
$$;

-- Fungsi untuk recalculate semua ranking
CREATE OR REPLACE FUNCTION public.recalculate_all_rankings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  rankings_updated INTEGER := 0;
BEGIN
  -- Loop semua user dan recalculate ranking
  FOR user_record IN SELECT user_id FROM public.profiles
  LOOP
    PERFORM public.apply_ranking_bonus(user_record.user_id);
    rankings_updated := rankings_updated + 1;
  END LOOP;
  
  RETURN rankings_updated;
END;
$$;

-- ============================================
-- DATA SAMPLE UNTUK MISI DAN RANKING
-- ============================================

-- Insert sample missions
INSERT INTO public.missions (title, description, points_bonus, verify_method, target_type, target_value, is_active) VALUES
  ('Pemula Hijau', 'Kumpulkan 10 botol plastik pertamamu', 100, 'auto', 'bottles', 10, true),
  ('Pejuang Lingkungan', 'Kumpulkan 50 botol plastik', 300, 'auto', 'bottles', 50, true),
  ('Pahlawan Bumi', 'Kumpulkan 100 botol plastik', 500, 'auto', 'bottles', 100, true),
  ('Pecinta Alam', 'Kumpulkan total 10kg sampah plastik', 400, 'auto', 'weight', 10, true),
  ('Aktivis Rutin', 'Lakukan 10 kali aktivitas daur ulang', 250, 'auto', 'activities', 10, true),
  ('Kampanye Sosial', 'Bagikan kampanye EcoTrade di media sosial', 200, 'manual', 'social', 1, true),
  ('Event Organizer', 'Ikuti event pengumpulan sampah bersama', 500, 'manual', 'event', 1, true);

-- Insert ranking tiers
INSERT INTO public.ranking_tiers (name, threshold_points, bonus_points, sort_order, is_active) VALUES
  ('Bronze', 0, 0, 1, true),
  ('Silver', 500, 50, 2, true),
  ('Gold', 1500, 100, 3, true),
  ('Platinum', 3000, 200, 4, true),
  ('Diamond', 5000, 300, 5, true),
  ('Master', 10000, 500, 6, true),
  ('Grand Master', 20000, 1000, 7, true);

-- ============================================
-- VIEWS UNTUK KEMUDAHAN QUERY
-- ============================================

-- View untuk leaderboard dengan ranking tier
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
  rt.threshold_points,
  ROW_NUMBER() OVER (ORDER BY p.points DESC) as position
FROM public.profiles p
LEFT JOIN public.ranking_tiers rt ON rt.sort_order = p.rank
ORDER BY p.points DESC;

-- View untuk mission progress dengan detail
CREATE OR REPLACE VIEW public.mission_progress_view AS
SELECT 
  mp.id,
  mp.user_id,
  mp.mission_id,
  m.title as mission_title,
  m.description as mission_description,
  m.target_type,
  m.target_value,
  mp.progress_value,
  ROUND((mp.progress_value::DECIMAL / m.target_value::DECIMAL) * 100, 2) as progress_percentage,
  m.points_bonus,
  m.verify_method,
  mp.completed_at,
  mp.verified,
  CASE 
    WHEN mp.completed_at IS NOT NULL AND mp.verified THEN 'claimed'
    WHEN mp.completed_at IS NOT NULL AND NOT mp.verified THEN 'pending'
    ELSE 'in_progress'
  END as status
FROM public.mission_progress mp
JOIN public.missions m ON mp.mission_id = m.id
WHERE m.is_active = true;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute untuk semua authenticated users
GRANT EXECUTE ON FUNCTION public.update_mission_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_ranking_bonus TO authenticated;

-- Grant execute untuk admin functions
GRANT EXECUTE ON FUNCTION public.verify_mission TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_missions TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_rankings TO authenticated;

-- Grant select pada views
GRANT SELECT ON public.leaderboard_view TO authenticated;
GRANT SELECT ON public.mission_progress_view TO authenticated;
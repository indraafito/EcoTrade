


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'user',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."verify_method" AS ENUM (
    'auto',
    'manual'
);


ALTER TYPE "public"."verify_method" OWNER TO "postgres";


CREATE TYPE "public"."voucher_type" AS ENUM (
    'discount',
    'food',
    'credit'
);


ALTER TYPE "public"."voucher_type" OWNER TO "postgres";


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "bottles_count" integer NOT NULL,
    "weight_kg" numeric(10,2) NOT NULL,
    "points_earned" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "insights" "jsonb" NOT NULL,
    "last_analyzed" timestamp with time zone NOT NULL,
    "date_filter_type" character varying(50) NOT NULL,
    "date_filter_start" timestamp with time zone NOT NULL,
    "date_filter_end" timestamp with time zone NOT NULL,
    "stats" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text",
    "avatar_url" "text",
    "points" integer DEFAULT 0 NOT NULL,
    "rank" integer DEFAULT 0 NOT NULL,
    "total_bottles" integer DEFAULT 0 NOT NULL,
    "total_weight_kg" numeric(10,2) DEFAULT 0 NOT NULL,
    "city" "text",
    "auth_provider" "text" DEFAULT 'email'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "xp" integer DEFAULT 0 NOT NULL,
    "xp_month" integer DEFAULT EXTRACT(month FROM "now"()),
    "xp_year" integer DEFAULT EXTRACT(year FROM "now"())
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."auth_provider" IS 'Auth provider: email, google, github, etc';



CREATE TABLE IF NOT EXISTS "public"."ranking_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "threshold_points" integer NOT NULL,
    "bonus_points" integer DEFAULT 0 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ranking_tiers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."leaderboard_view" AS
 SELECT "p"."user_id",
    "p"."username",
    "p"."full_name",
    "p"."avatar_url",
    "p"."xp" AS "points",
    "p"."total_bottles",
    "p"."total_weight_kg",
    "p"."city",
    "rt"."name" AS "rank_name",
    "row_number"() OVER (ORDER BY "p"."xp" DESC, "p"."username") AS "position"
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."ranking_tiers" "rt" ON (("rt"."sort_order" = "p"."rank")))
  WHERE ("p"."xp" > 0)
  ORDER BY "p"."xp" DESC, "p"."username";


ALTER VIEW "public"."leaderboard_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_qr_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "qr_code_url" "text" NOT NULL,
    "qr_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."location_qr_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" NOT NULL,
    "latitude" numeric(10,8) NOT NULL,
    "longitude" numeric(11,8) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."locations_with_qr" AS
 SELECT "l"."id",
    "l"."name",
    "l"."address",
    "l"."latitude",
    "l"."longitude",
    "l"."is_active",
    "l"."created_at",
    "l"."updated_at",
    "lqc"."qr_code_url"
   FROM ("public"."locations" "l"
     LEFT JOIN "public"."location_qr_codes" "lqc" ON (("l"."id" = "lqc"."location_id")));


ALTER VIEW "public"."locations_with_qr" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mission_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "mission_id" "uuid" NOT NULL,
    "progress_value" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "verified" boolean DEFAULT false,
    "claimed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mission_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."missions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "target_type" character varying(50) NOT NULL,
    "target_value" integer NOT NULL,
    "points_bonus" integer DEFAULT 0 NOT NULL,
    "mission_type" character varying(50) DEFAULT 'daily'::character varying,
    "difficulty" character varying(20) DEFAULT 'medium'::character varying,
    "duration_hours" integer DEFAULT 24,
    "icon" character varying(50),
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "max_completions" integer DEFAULT 1,
    "city" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."missions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_leaderboard_winners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "position" integer NOT NULL,
    "xp" integer NOT NULL,
    "reward_points" integer NOT NULL,
    "rewarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."monthly_leaderboard_winners" OWNER TO "postgres";


COMMENT ON TABLE "public"."monthly_leaderboard_winners" IS 'Top 3 winners each month with rewards';



CREATE TABLE IF NOT EXISTS "public"."password_change_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "change_type" "text" NOT NULL,
    "auth_method" "text",
    "ip_address" "text",
    "user_agent" "text",
    "success" boolean DEFAULT true NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."password_change_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."password_reset_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "password_reset_logs_valid_expiry" CHECK (("expires_at" > "created_at"))
);


ALTER TABLE "public"."password_reset_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."password_reset_logs" IS 'Tracks password reset requests';



COMMENT ON COLUMN "public"."password_reset_logs"."token_hash" IS 'SHA256 hash of the reset token';



CREATE TABLE IF NOT EXISTS "public"."points_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" integer NOT NULL,
    "balance_after" integer NOT NULL,
    "source" "text" NOT NULL,
    "reference_id" "uuid",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."points_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."points_transactions" IS 'Audit trail for all points transactions';



CREATE OR REPLACE VIEW "public"."profile_points_view" AS
 SELECT "p"."user_id",
    "p"."username",
    COALESCE("sum"("a"."points_earned"), (0)::bigint) AS "total_points"
   FROM ("public"."profiles" "p"
     LEFT JOIN "public"."activities" "a" ON (("p"."user_id" = "a"."user_id")))
  GROUP BY "p"."user_id", "p"."username";


ALTER VIEW "public"."profile_points_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'user'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voucher_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "voucher_id" "uuid" NOT NULL,
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."voucher_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."voucher_type" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "points_required" integer NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."xp_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "total_xp" integer NOT NULL,
    "final_rank" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."xp_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."xp_history" IS 'Historical XP data per user per month';



CREATE TABLE IF NOT EXISTS "public"."xp_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" integer NOT NULL,
    "balance_after" integer NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "source" "text" NOT NULL,
    "reference_id" "uuid",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."xp_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."xp_transactions" IS 'Audit trail for all XP transactions';




CREATE OR REPLACE FUNCTION "public"."add_activity_and_update_profile"("p_user_id" "uuid", "p_location_id" "uuid", "p_bottles_count" integer, "p_weight_kg" numeric, "p_points_earned" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_activity_id UUID;
  v_result JSONB;
BEGIN
  -- Insert activity
  INSERT INTO activities (user_id, location_id, bottles_count, weight_kg, points_earned)
  VALUES (p_user_id, p_location_id, p_bottles_count, p_weight_kg, p_points_earned)
  RETURNING id INTO v_activity_id;
  
  -- Update profile
  PERFORM update_profile_from_activities(p_user_id);
  
  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'activity_id', v_activity_id,
    'message', 'Activity added and profile updated'
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to add activity'
  );
END;
$$;


ALTER FUNCTION "public"."add_activity_and_update_profile"("p_user_id" "uuid", "p_location_id" "uuid", "p_bottles_count" integer, "p_weight_kg" numeric, "p_points_earned" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_user_points_and_xp"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text") RETURNS TABLE("new_points" integer, "new_xp" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_points INTEGER;
  v_current_xp INTEGER;
  v_current_month INTEGER;
  v_current_year INTEGER;
  v_new_points INTEGER;
  v_new_xp INTEGER;
BEGIN
  -- Get current values
  SELECT points, xp, xp_month, xp_year 
  INTO v_current_points, v_current_xp, v_current_month, v_current_year
  FROM public.profiles 
  WHERE user_id = p_user_id;

  -- Check if month/year changed (reset XP if needed)
  IF v_current_month != EXTRACT(MONTH FROM NOW()) OR 
     v_current_year != EXTRACT(YEAR FROM NOW()) THEN
    -- Save old XP to history
    INSERT INTO public.xp_history (user_id, month, year, total_xp)
    VALUES (p_user_id, v_current_month, v_current_year, v_current_xp)
    ON CONFLICT (user_id, month, year) 
    DO UPDATE SET total_xp = EXCLUDED.total_xp;
    
    -- Reset XP
    v_current_xp := 0;
    
    UPDATE public.profiles 
    SET xp = 0,
        xp_month = EXTRACT(MONTH FROM NOW()),
        xp_year = EXTRACT(YEAR FROM NOW())
    WHERE user_id = p_user_id;
  END IF;

  -- Calculate new values
  v_new_points := v_current_points + p_amount;
  v_new_xp := v_current_xp + p_amount;

  -- Update profiles
  UPDATE public.profiles 
  SET 
    points = v_new_points,
    xp = v_new_xp,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record points transaction
  INSERT INTO public.points_transactions (
    user_id, type, amount, balance_after, source, reference_id, description
  ) VALUES (
    p_user_id, 'earn', p_amount, v_new_points, p_source, p_reference_id, p_description
  );

  -- Record XP transaction
  INSERT INTO public.xp_transactions (
    user_id, type, amount, balance_after, month, year, source, reference_id, description
  ) VALUES (
    p_user_id, 
    'earn', 
    p_amount, 
    v_new_xp, 
    EXTRACT(MONTH FROM NOW())::INTEGER,
    EXTRACT(YEAR FROM NOW())::INTEGER,
    p_source, 
    p_reference_id, 
    p_description
  );

  RETURN QUERY SELECT v_new_points, v_new_xp;
END;
$$;


ALTER FUNCTION "public"."add_user_points_and_xp"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_ranking_bonus"("_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."apply_ranking_bonus"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_mission_reward"("mission_progress_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."claim_mission_reward"("mission_progress_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deduct_user_points"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_points INTEGER;
  v_new_points INTEGER;
BEGIN
  -- Get current points
  SELECT points INTO v_current_points
  FROM public.profiles 
  WHERE user_id = p_user_id;

  -- Check if sufficient points
  IF v_current_points < p_amount THEN
    RAISE EXCEPTION 'Insufficient points. Current: %, Required: %', v_current_points, p_amount;
  END IF;

  -- Calculate new points
  v_new_points := v_current_points - p_amount;

  -- Update profiles
  UPDATE public.profiles 
  SET points = v_new_points, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO public.points_transactions (
    user_id, type, amount, balance_after, source, reference_id, description
  ) VALUES (
    p_user_id, 'redeem', -p_amount, v_new_points, p_source, p_reference_id, p_description
  );

  RETURN v_new_points;
END;
$$;


ALTER FUNCTION "public"."deduct_user_points"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_old_missions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE mission_progress
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'in_progress'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."expire_old_missions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_auth_provider"("_user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(auth_provider, 'email') 
  FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_auth_provider"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_activity_points"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_points INTEGER;
  v_result RECORD;
BEGIN
  -- Calculate points (contoh: 10 poin per botol)
  v_points := NEW.bottles_count * 10;
  
  -- Add points and XP using the new function
  SELECT * INTO v_result
  FROM public.add_user_points_and_xp(
    NEW.user_id,
    v_points,
    'activity',
    NEW.id,
    format('Setor %s botol', NEW.bottles_count)
  );
  
  -- Update activity record
  NEW.points_earned := v_points;
  
  -- Update user stats
  UPDATE public.profiles
  SET 
    total_bottles = total_bottles + NEW.bottles_count,
    total_weight_kg = total_weight_kg + COALESCE(NEW.weight_kg, 0),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_activity_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_oauth_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  _provider TEXT;
BEGIN
  _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  
  UPDATE public.profiles
  SET auth_provider = _provider, updated_at = NOW()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_oauth_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_activity_no_profile_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Hanya handle ranking bonus
  PERFORM public.apply_ranking_bonus(NEW.user_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_activity_no_profile_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_activity_safe"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only handle ranking, don't update profile
  -- Profile updates will be handled by the application
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_activity_safe"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_monthly_leaderboard_reset"() RETURNS TABLE("winners_count" integer, "total_rewards" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_last_month INTEGER;
  v_last_year INTEGER;
  v_winner RECORD;
  v_reward_amount INTEGER;
  v_winners_count INTEGER := 0;
  v_total_rewards INTEGER := 0;
BEGIN
  -- Calculate last month/year
  v_last_month := EXTRACT(MONTH FROM (NOW() - INTERVAL '1 month'))::INTEGER;
  v_last_year := EXTRACT(YEAR FROM (NOW() - INTERVAL '1 month'))::INTEGER;

  -- Get top 3 winners from last month
  FOR v_winner IN
    SELECT 
      user_id,
      xp,
      ROW_NUMBER() OVER (ORDER BY xp DESC) as position
    FROM public.profiles
    WHERE xp_month = v_last_month AND xp_year = v_last_year
    ORDER BY xp DESC
    LIMIT 3
  LOOP
    -- Determine reward amount
    CASE v_winner.position
      WHEN 1 THEN v_reward_amount := 1000;
      WHEN 2 THEN v_reward_amount := 500;
      WHEN 3 THEN v_reward_amount := 250;
      ELSE v_reward_amount := 0;
    END CASE;

    -- Add reward points
    UPDATE public.profiles 
    SET points = points + v_reward_amount
    WHERE user_id = v_winner.user_id;

    -- Record winner
    INSERT INTO public.monthly_leaderboard_winners (
      user_id, month, year, position, xp, reward_points
    ) VALUES (
      v_winner.user_id, v_last_month, v_last_year, 
      v_winner.position, v_winner.xp, v_reward_amount
    );

    -- Record points transaction
    INSERT INTO public.points_transactions (
      user_id, type, amount, balance_after, source, description
    ) VALUES (
      v_winner.user_id, 
      'reward', 
      v_reward_amount, 
      (SELECT points FROM public.profiles WHERE user_id = v_winner.user_id),
      'monthly_reward',
      format('Juara %s Leaderboard %s/%s', v_winner.position, v_last_month, v_last_year)
    );

    v_winners_count := v_winners_count + 1;
    v_total_rewards := v_total_rewards + v_reward_amount;
  END LOOP;

  -- Save XP history for all users
  INSERT INTO public.xp_history (user_id, month, year, total_xp)
  SELECT 
    user_id, 
    xp_month, 
    xp_year, 
    xp
  FROM public.profiles
  WHERE xp > 0 AND xp_month = v_last_month AND xp_year = v_last_year
  ON CONFLICT (user_id, month, year) 
  DO UPDATE SET total_xp = EXCLUDED.total_xp;

  -- Reset XP for all users
  UPDATE public.profiles 
  SET 
    xp = 0,
    xp_month = EXTRACT(MONTH FROM NOW())::INTEGER,
    xp_year = EXTRACT(YEAR FROM NOW())::INTEGER,
    updated_at = NOW();

  -- Record reset transactions
  INSERT INTO public.xp_transactions (
    user_id, type, amount, balance_after, month, year, source, description
  )
  SELECT 
    user_id,
    'reset',
    0,
    0,
    EXTRACT(MONTH FROM NOW())::INTEGER,
    EXTRACT(YEAR FROM NOW())::INTEGER,
    'monthly_reset',
    format('Reset XP bulan %s/%s', v_last_month, v_last_year)
  FROM public.profiles;

  RETURN QUERY SELECT v_winners_count, v_total_rewards;
END;
$$;


ALTER FUNCTION "public"."process_monthly_leaderboard_reset"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_mission_expiry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."set_mission_expiry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_points"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.profiles
    SET points = (
        SELECT COALESCE(SUM(points_earned),0)
        FROM public.activities
        WHERE user_id = NEW.user_id
    ) + (
        SELECT COALESCE(SUM(amount),0)
        FROM public.points_transactions
        WHERE user_id = NEW.user_id
    )
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_profile_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_location_qr_codes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_location_qr_codes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_mission_progress_on_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_mission_progress_on_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile_from_activities"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  activity_totals RECORD;
BEGIN
  -- Get totals from all activities
  SELECT 
    SUM(bottles_count) as total_bottles,
    SUM(points_earned) as total_points,
    SUM(weight_kg) as total_weight_kg,
    COUNT(*) as total_activities
  INTO activity_totals
  FROM activities 
  WHERE user_id = p_user_id;
  
  -- Update profile with calculated totals
  UPDATE profiles 
  SET 
    total_bottles = COALESCE(activity_totals.total_bottles, 0),
    points = COALESCE(activity_totals.total_points, 0),
    total_weight_kg = COALESCE(activity_totals.total_weight_kg, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RAISE LOG 'Profile updated for user %: bottles=%, points=%, weight=%', 
    p_user_id, 
    COALESCE(activity_totals.total_bottles, 0),
    COALESCE(activity_totals.total_points, 0),
    COALESCE(activity_totals.total_weight_kg, 0);
END;
$$;


ALTER FUNCTION "public"."update_profile_from_activities"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_profile_points"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.profiles
    SET points = points + NEW.points_earned
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_profile_points"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_password"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT CASE 
    WHEN (SELECT encrypted_password IS NOT NULL FROM auth.users WHERE id = _user_id) 
    THEN true ELSE false 
  END
$$;


ALTER FUNCTION "public"."user_has_password"("_user_id" "uuid") OWNER TO "postgres";


ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_analytics"
    ADD CONSTRAINT "ai_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_qr_codes"
    ADD CONSTRAINT "location_qr_codes_location_id_key" UNIQUE ("location_id");



ALTER TABLE ONLY "public"."location_qr_codes"
    ADD CONSTRAINT "location_qr_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mission_progress"
    ADD CONSTRAINT "mission_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mission_progress"
    ADD CONSTRAINT "mission_progress_user_id_mission_id_key" UNIQUE ("user_id", "mission_id");



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_leaderboard_winners"
    ADD CONSTRAINT "monthly_leaderboard_winners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_leaderboard_winners"
    ADD CONSTRAINT "monthly_leaderboard_winners_user_id_month_year_key" UNIQUE ("user_id", "month", "year");



ALTER TABLE ONLY "public"."password_change_audit"
    ADD CONSTRAINT "password_change_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_logs"
    ADD CONSTRAINT "password_reset_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."password_reset_logs"
    ADD CONSTRAINT "password_reset_logs_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."ranking_tiers"
    ADD CONSTRAINT "ranking_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."voucher_redemptions"
    ADD CONSTRAINT "voucher_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."xp_history"
    ADD CONSTRAINT "xp_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."xp_history"
    ADD CONSTRAINT "xp_history_user_id_month_year_key" UNIQUE ("user_id", "month", "year");



ALTER TABLE ONLY "public"."xp_transactions"
    ADD CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activities_created_at" ON "public"."activities" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activities_user_id" ON "public"."activities" USING "btree" ("user_id");



CREATE INDEX "idx_ai_analytics_created_at" ON "public"."ai_analytics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_location_qr_codes_location_id" ON "public"."location_qr_codes" USING "btree" ("location_id");



CREATE INDEX "idx_mission_progress_mission" ON "public"."mission_progress" USING "btree" ("mission_id");



CREATE INDEX "idx_mission_progress_status" ON "public"."mission_progress" USING "btree" ("status");



CREATE INDEX "idx_mission_progress_user" ON "public"."mission_progress" USING "btree" ("user_id");



CREATE INDEX "idx_mission_progress_user_status" ON "public"."mission_progress" USING "btree" ("user_id", "status");



CREATE INDEX "idx_missions_active" ON "public"."missions" USING "btree" ("is_active", "mission_type");



CREATE INDEX "idx_missions_dates" ON "public"."missions" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_monthly_winners_date" ON "public"."monthly_leaderboard_winners" USING "btree" ("year" DESC, "month" DESC);



CREATE INDEX "idx_password_change_audit_created_at" ON "public"."password_change_audit" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_password_change_audit_user_id" ON "public"."password_change_audit" USING "btree" ("user_id");



CREATE INDEX "idx_password_reset_logs_expires_at" ON "public"."password_reset_logs" USING "btree" ("expires_at");



CREATE INDEX "idx_password_reset_logs_token_hash" ON "public"."password_reset_logs" USING "btree" ("token_hash");



CREATE INDEX "idx_password_reset_logs_user_id" ON "public"."password_reset_logs" USING "btree" ("user_id");



CREATE INDEX "idx_points_transactions_user" ON "public"."points_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_profiles_xp" ON "public"."profiles" USING "btree" ("xp" DESC);



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE INDEX "idx_xp_history_date" ON "public"."xp_history" USING "btree" ("year" DESC, "month" DESC);



CREATE INDEX "idx_xp_history_user_date" ON "public"."xp_history" USING "btree" ("user_id", "year" DESC, "month" DESC);



CREATE INDEX "idx_xp_transactions_user" ON "public"."xp_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "on_activity_created" BEFORE INSERT ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION "public"."handle_activity_points"();



CREATE OR REPLACE TRIGGER "set_mission_expiry_trigger" BEFORE INSERT ON "public"."mission_progress" FOR EACH ROW EXECUTE FUNCTION "public"."set_mission_expiry"();



-- CREATE OR REPLACE TRIGGER "trg_sync_points_transactions" AFTER INSERT OR UPDATE ON "public"."points_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_points"();



CREATE OR REPLACE TRIGGER "update_location_qr_codes_updated_at" BEFORE UPDATE ON "public"."location_qr_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_location_qr_codes_updated_at"();



CREATE OR REPLACE TRIGGER "update_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mission_progress_updated_at" BEFORE UPDATE ON "public"."mission_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_missions_updated_at" BEFORE UPDATE ON "public"."missions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ranking_tiers_updated_at" BEFORE UPDATE ON "public"."ranking_tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vouchers_updated_at" BEFORE UPDATE ON "public"."vouchers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_qr_codes"
    ADD CONSTRAINT "location_qr_codes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mission_progress"
    ADD CONSTRAINT "mission_progress_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mission_progress"
    ADD CONSTRAINT "mission_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_leaderboard_winners"
    ADD CONSTRAINT "monthly_leaderboard_winners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."password_change_audit"
    ADD CONSTRAINT "password_change_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."password_reset_logs"
    ADD CONSTRAINT "password_reset_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."points_transactions"
    ADD CONSTRAINT "points_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voucher_redemptions"
    ADD CONSTRAINT "voucher_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voucher_redemptions"
    ADD CONSTRAINT "voucher_redemptions_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."xp_history"
    ADD CONSTRAINT "xp_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."xp_transactions"
    ADD CONSTRAINT "xp_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage all roles" ON "public"."user_roles" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can manage locations" ON "public"."locations" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all QR codes" ON "public"."location_qr_codes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admins can view all locations" ON "public"."locations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow insert for authenticated users" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Anyone can view active missions" ON "public"."missions" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Service can insert user roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can create own redemptions" ON "public"."voucher_redemptions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own mission progress" ON "public"."mission_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own activities" ON "public"."activities" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage location QR codes" ON "public"."location_qr_codes" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can manage their own AI analytics" ON "public"."ai_analytics" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own mission progress" ON "public"."mission_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view active locations" ON "public"."locations" FOR SELECT USING ((("is_active" = true) AND ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "Users can view active vouchers" ON "public"."vouchers" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Users can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view own activities" ON "public"."activities" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own audit logs" ON "public"."password_change_audit" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own redemptions" ON "public"."voucher_redemptions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own reset logs" ON "public"."password_reset_logs" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view ranking tiers" ON "public"."ranking_tiers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view their own mission progress" ON "public"."mission_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_qr_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mission_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."missions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_change_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_reset_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ranking_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voucher_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




GRANT ALL ON FUNCTION "public"."add_activity_and_update_profile"("p_user_id" "uuid", "p_location_id" "uuid", "p_bottles_count" integer, "p_weight_kg" numeric, "p_points_earned" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_activity_and_update_profile"("p_user_id" "uuid", "p_location_id" "uuid", "p_bottles_count" integer, "p_weight_kg" numeric, "p_points_earned" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_activity_and_update_profile"("p_user_id" "uuid", "p_location_id" "uuid", "p_bottles_count" integer, "p_weight_kg" numeric, "p_points_earned" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_user_points_and_xp"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_points_and_xp"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_points_and_xp"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_ranking_bonus"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_ranking_bonus"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_ranking_bonus"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_mission_reward"("mission_progress_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_mission_reward"("mission_progress_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_mission_reward"("mission_progress_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."deduct_user_points"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."deduct_user_points"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deduct_user_points"("p_user_id" "uuid", "p_amount" integer, "p_source" "text", "p_reference_id" "uuid", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_missions"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_missions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_missions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_auth_provider"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_auth_provider"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_auth_provider"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_activity_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_activity_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_activity_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_oauth_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_oauth_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_oauth_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_activity_no_profile_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_activity_no_profile_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_activity_no_profile_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_activity_safe"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_activity_safe"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_activity_safe"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_monthly_leaderboard_reset"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_monthly_leaderboard_reset"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_monthly_leaderboard_reset"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_mission_expiry"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_mission_expiry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_mission_expiry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_location_qr_codes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_location_qr_codes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_location_qr_codes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_mission_progress_on_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_mission_progress_on_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_mission_progress_on_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profile_from_activities"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_profile_from_activities"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profile_from_activities"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_profile_points"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_profile_points"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_profile_points"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_password"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_password"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_password"("_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."ai_analytics" TO "anon";
GRANT ALL ON TABLE "public"."ai_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."ranking_tiers" TO "anon";
GRANT ALL ON TABLE "public"."ranking_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."ranking_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard_view" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard_view" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard_view" TO "service_role";



GRANT ALL ON TABLE "public"."location_qr_codes" TO "anon";
GRANT ALL ON TABLE "public"."location_qr_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."location_qr_codes" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."locations_with_qr" TO "anon";
GRANT ALL ON TABLE "public"."locations_with_qr" TO "authenticated";
GRANT ALL ON TABLE "public"."locations_with_qr" TO "service_role";



GRANT ALL ON TABLE "public"."mission_progress" TO "anon";
GRANT ALL ON TABLE "public"."mission_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."mission_progress" TO "service_role";



GRANT ALL ON TABLE "public"."missions" TO "anon";
GRANT ALL ON TABLE "public"."missions" TO "authenticated";
GRANT ALL ON TABLE "public"."missions" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_leaderboard_winners" TO "anon";
GRANT ALL ON TABLE "public"."monthly_leaderboard_winners" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_leaderboard_winners" TO "service_role";



GRANT ALL ON TABLE "public"."password_change_audit" TO "anon";
GRANT ALL ON TABLE "public"."password_change_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."password_change_audit" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_logs" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_logs" TO "service_role";



GRANT ALL ON TABLE "public"."points_transactions" TO "anon";
GRANT ALL ON TABLE "public"."points_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."points_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."profile_points_view" TO "anon";
GRANT ALL ON TABLE "public"."profile_points_view" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_points_view" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";


GRANT ALL ON TABLE "public"."voucher_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."voucher_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."voucher_redemptions" TO "service_role";


GRANT ALL ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";


GRANT ALL ON TABLE "public"."xp_history" TO "anon";
GRANT ALL ON TABLE "public"."xp_history" TO "authenticated";
GRANT ALL ON TABLE "public"."xp_history" TO "service_role";


GRANT ALL ON TABLE "public"."xp_transactions" TO "anon";
GRANT ALL ON TABLE "public"."xp_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."xp_transactions" TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_set_provider AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_oauth_signup();

-- Fix RLS policies for missions table
-- Allow admin users to perform all CRUD operations on missions

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view active missions" ON "public"."missions";

-- Create comprehensive policies for missions table

-- 1. Anyone can view active missions (for regular users)
CREATE POLICY "Anyone can view active missions" ON "public"."missions" 
FOR SELECT USING (is_active = true);

-- 2. Admin users can view all missions (including inactive ones)
CREATE POLICY "Admin can view all missions" ON "public"."missions" 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 3. Admin users can insert missions
CREATE POLICY "Admin can insert missions" ON "public"."missions" 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 4. Admin users can update missions
CREATE POLICY "Admin can update missions" ON "public"."missions" 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 5. Admin users can delete missions
CREATE POLICY "Admin can delete missions" ON "public"."missions" 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Fix RLS policies for ranking_tiers table
-- Allow admin users to perform all CRUD operations on ranking_tiers

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view active ranking tiers" ON "public"."ranking_tiers";

-- Create comprehensive policies for ranking_tiers table

-- 1. Anyone can view active ranking tiers (for regular users)
CREATE POLICY "Anyone can view active ranking tiers" ON "public"."ranking_tiers" 
FOR SELECT USING (is_active = true);

-- 2. Admin users can view all ranking tiers (including inactive ones)
CREATE POLICY "Admin can view all ranking tiers" ON "public"."ranking_tiers" 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 3. Admin users can insert ranking tiers
CREATE POLICY "Admin can insert ranking tiers" ON "public"."ranking_tiers" 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 4. Admin users can update ranking tiers
CREATE POLICY "Admin can update ranking tiers" ON "public"."ranking_tiers" 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 5. Admin users can delete ranking tiers
CREATE POLICY "Admin can delete ranking tiers" ON "public"."ranking_tiers" 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Fix RLS policies for locations table
-- Allow admin users to perform all CRUD operations on locations

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view active locations" ON "public"."locations";

-- Create comprehensive policies for locations table

-- 1. Anyone can view active locations (for regular users)
CREATE POLICY "Anyone can view active locations" ON "public"."locations" 
FOR SELECT USING (is_active = true);

-- 2. Admin users can view all locations (including inactive ones)
CREATE POLICY "Admin can view all locations" ON "public"."locations" 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 3. Admin users can insert locations
CREATE POLICY "Admin can insert locations" ON "public"."locations" 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 4. Admin users can update locations
CREATE POLICY "Admin can update locations" ON "public"."locations" 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 5. Admin users can delete locations
CREATE POLICY "Admin can delete locations" ON "public"."locations" 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Fix RLS policies for vouchers table
-- Allow admin users to perform all CRUD operations on vouchers

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view active vouchers" ON "public"."vouchers";

-- Create comprehensive policies for vouchers table

-- 1. Anyone can view active vouchers (for regular users)
CREATE POLICY "Anyone can view active vouchers" ON "public"."vouchers" 
FOR SELECT USING (is_active = true);

-- 2. Admin users can view all vouchers (including inactive ones)
CREATE POLICY "Admin can view all vouchers" ON "public"."vouchers" 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 3. Admin users can insert vouchers
CREATE POLICY "Admin can insert vouchers" ON "public"."vouchers" 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 4. Admin users can update vouchers
CREATE POLICY "Admin can update vouchers" ON "public"."vouchers" 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- 5. Admin users can delete vouchers
CREATE POLICY "Admin can delete vouchers" ON "public"."vouchers" 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);
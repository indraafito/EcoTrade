-- Migration: Fix Point Duplication Issue
-- Date: 2025-11-27
-- Description: Drop trigger trg_sync_points_transactions yang menyebabkan duplikasi poin

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trg_sync_points_transactions ON public.points_transactions;

-- Optional: Drop the function if not used elsewhere
-- Uncomment jika function sync_profile_points tidak digunakan di tempat lain
-- DROP FUNCTION IF EXISTS public.sync_profile_points();

-- Add comment for documentation
COMMENT ON TABLE public.points_transactions IS 
'Audit trail for all points transactions. Points are managed by add_user_points_and_xp() function.';

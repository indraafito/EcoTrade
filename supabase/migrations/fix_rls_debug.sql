-- Temporary fix for RLS policies debugging
-- This will disable RLS temporarily and re-enable with proper policies

-- 1. Disable RLS temporarily
ALTER TABLE public.ranking_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active ranking tiers" ON public.ranking_tiers;
DROP POLICY IF EXISTS "Admin can view all ranking tiers" ON public.ranking_tiers;
DROP POLICY IF EXISTS "Admin can insert ranking tiers" ON public.ranking_tiers;
DROP POLICY IF EXISTS "Admin can update ranking tiers" ON public.ranking_tiers;
DROP POLICY IF EXISTS "Admin can delete ranking tiers" ON public.ranking_tiers;

DROP POLICY IF EXISTS "Anyone can view active locations" ON public.locations;
DROP POLICY IF EXISTS "Admin can view all locations" ON public.locations;
DROP POLICY IF EXISTS "Admin can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Admin can update locations" ON public.locations;
DROP POLICY IF EXISTS "Admin can delete locations" ON public.locations;

DROP POLICY IF EXISTS "Anyone can view active vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admin can view all vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admin can insert vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admin can update vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admin can delete vouchers" ON public.vouchers;

DROP POLICY IF EXISTS "Anyone can view active missions" ON public.missions;
DROP POLICY IF EXISTS "Admin can view all missions" ON public.missions;
DROP POLICY IF EXISTS "Admin can insert missions" ON public.missions;
DROP POLICY IF EXISTS "Admin can update missions" ON public.missions;
DROP POLICY IF EXISTS "Admin can delete missions" ON public.missions;

-- 3. Re-enable RLS with simplified policies
ALTER TABLE public.ranking_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- 4. Create simple policies - allow authenticated users full access temporarily
CREATE POLICY "Enable all for authenticated" ON public.ranking_tiers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated" ON public.locations
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated" ON public.vouchers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all for authenticated" ON public.missions
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Verify policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd 
FROM pg_policies 
WHERE tablename IN ('ranking_tiers', 'locations', 'vouchers', 'missions')
ORDER BY tablename, policyname;

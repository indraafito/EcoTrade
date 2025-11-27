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

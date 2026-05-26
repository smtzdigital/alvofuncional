
-- 1) points_history: block direct writes by users; only admin or SECURITY DEFINER triggers can insert
CREATE POLICY "admin manage points_history"
ON public.points_history
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Explicit deny for non-admin INSERT/UPDATE/DELETE (restrictive policies)
CREATE POLICY "block non-admin insert points"
ON public.points_history
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "block non-admin update points"
ON public.points_history
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "block non-admin delete points"
ON public.points_history
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- 2) students: remove permissive self-UPDATE; admins manage all changes via "admin manage students"
DROP POLICY IF EXISTS "student update own limited" ON public.students;

-- 3) teachers: restrict SELECT to admins and own teacher row
DROP POLICY IF EXISTS "auth read teachers" ON public.teachers;

CREATE POLICY "teachers select limited"
ON public.teachers
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR user_id = auth.uid());

-- 4) Public buckets: remove broad listing SELECT policies. Public files remain accessible
-- via the public CDN URL because the buckets are marked public; only listing is removed.
DROP POLICY IF EXISTS "branding public read" ON storage.objects;
DROP POLICY IF EXISTS "exercises public read" ON storage.objects;

-- 5) Restrict EXECUTE on SECURITY DEFINER functions that should not be callable from PostgREST
REVOKE EXECUTE ON FUNCTION public.tg_add_points_goal() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_add_points_checkin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_add_points_attendance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_student_id(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.student_plan_active(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;

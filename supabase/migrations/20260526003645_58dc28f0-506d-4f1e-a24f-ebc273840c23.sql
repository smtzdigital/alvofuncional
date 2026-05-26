
-- Drop remaining public listing policy on exercises bucket
DROP POLICY IF EXISTS "exercises bucket public read" ON storage.objects;

-- Revoke from PUBLIC (anon/authenticated inherit from PUBLIC)
REVOKE EXECUTE ON FUNCTION public.tg_add_points_goal() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_add_points_checkin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_add_points_attendance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_id(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.student_plan_active(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ranking(integer) FROM PUBLIC;

-- get_ranking is used by the public ranking page, allow anon+authenticated explicitly
GRANT EXECUTE ON FUNCTION public.get_ranking(integer) TO anon, authenticated;

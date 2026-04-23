
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'professor', 'aluno');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');
CREATE TYPE public.payment_method AS ENUM ('pix', 'dinheiro', 'cartao', 'transferencia', 'outro');
CREATE TYPE public.goal_status AS ENUM ('ativa', 'concluida', 'cancelada');

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================
-- USER ROLES (separate table for security)
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') $$;

-- =========================
-- PLANS
-- =========================
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  presential_per_week INTEGER NOT NULL DEFAULT 0,
  has_workouts BOOLEAN NOT NULL DEFAULT true,
  has_ranking BOOLEAN NOT NULL DEFAULT true,
  has_diet BOOLEAN NOT NULL DEFAULT false,
  has_goals BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- =========================
-- TEACHERS
-- =========================
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialty TEXT,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- =========================
-- STUDENTS
-- =========================
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  total_points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- helper: get student id from user
CREATE OR REPLACE FUNCTION public.get_student_id(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM public.students WHERE user_id = _user_id LIMIT 1 $$;

-- helper: plan active for student
CREATE OR REPLACE FUNCTION public.student_plan_active(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE user_id = _user_id
      AND is_active = true
      AND (plan_expires_at IS NULL OR plan_expires_at > now())
  )
$$;

-- =========================
-- PAYMENTS
-- =========================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pendente',
  method payment_method,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =========================
-- WORKOUTS (templates) and student assignments
-- =========================
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty TEXT,
  duration_minutes INTEGER,
  video_url TEXT,
  thumbnail_url TEXT,
  points_reward INTEGER NOT NULL DEFAULT 10,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- check-ins / completion log
CREATE TABLE public.workout_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_checkins ENABLE ROW LEVEL SECURITY;

-- =========================
-- DIETS (per student)
-- =========================
CREATE TABLE public.diets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diets ENABLE ROW LEVEL SECURITY;

-- =========================
-- GOALS
-- =========================
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  due_date DATE,
  status goal_status NOT NULL DEFAULT 'ativa',
  points_reward INTEGER NOT NULL DEFAULT 50,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- =========================
-- ATTENDANCE (presença em aulas presenciais)
-- =========================
CREATE TABLE public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  attended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  points_earned INTEGER NOT NULL DEFAULT 20,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- =========================
-- POINTS HISTORY (auditoria)
-- =========================
CREATE TABLE public.points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

-- =========================
-- TRIGGERS: updated_at
-- =========================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_teachers_updated BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_workouts_updated BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_diets_updated BEFORE UPDATE ON public.diets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- TRIGGER: criar profile + role aluno + cadastro student no signup
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'aluno');

  SELECT id INTO free_plan_id FROM public.plans WHERE name ILIKE 'free' AND is_active = true ORDER BY sort_order LIMIT 1;

  INSERT INTO public.students (user_id, plan_id, plan_started_at, plan_expires_at)
  VALUES (
    NEW.id,
    free_plan_id,
    now(),
    CASE WHEN free_plan_id IS NOT NULL THEN now() + INTERVAL '14 days' ELSE NULL END
  );

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- TRIGGER: somar pontos automaticamente
-- =========================
CREATE OR REPLACE FUNCTION public.tg_add_points_checkin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.students SET total_points = total_points + NEW.points_earned WHERE id = NEW.student_id;
  INSERT INTO public.points_history(student_id, points, reason, source_type, source_id)
  VALUES (NEW.student_id, NEW.points_earned, 'Check-in de treino', 'workout_checkin', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_checkin_points AFTER INSERT ON public.workout_checkins FOR EACH ROW EXECUTE FUNCTION public.tg_add_points_checkin();

CREATE OR REPLACE FUNCTION public.tg_add_points_attendance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.students SET total_points = total_points + NEW.points_earned WHERE id = NEW.student_id;
  INSERT INTO public.points_history(student_id, points, reason, source_type, source_id)
  VALUES (NEW.student_id, NEW.points_earned, 'Presença em treino', 'attendance', NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_attendance_points AFTER INSERT ON public.attendances FOR EACH ROW EXECUTE FUNCTION public.tg_add_points_attendance();

CREATE OR REPLACE FUNCTION public.tg_add_points_goal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'concluida' AND (OLD.status IS DISTINCT FROM 'concluida') THEN
    UPDATE public.students SET total_points = total_points + NEW.points_reward WHERE id = NEW.student_id;
    INSERT INTO public.points_history(student_id, points, reason, source_type, source_id)
    VALUES (NEW.student_id, NEW.points_reward, 'Meta concluída: ' || NEW.title, 'goal', NEW.id);
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_goal_points BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.tg_add_points_goal();

-- =========================
-- POLICIES
-- =========================

-- profiles
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin insert profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR id = auth.uid());

-- user_roles: only admin manages, users see own
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- plans: everyone authenticated can read; admin manages
CREATE POLICY "anyone read active plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage plans" ON public.plans FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- teachers: read for all auth; admin manages
CREATE POLICY "auth read teachers" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage teachers" ON public.teachers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- students: own row OR admin OR for ranking we expose minimal via view; here select own/admin
CREATE POLICY "students view own" ON public.students FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage students" ON public.students FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "student update own limited" ON public.students FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- payments: aluno vê os seus, admin tudo
CREATE POLICY "payments view own" ON public.payments FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR student_id = public.get_student_id(auth.uid())
);
CREATE POLICY "admin manage payments" ON public.payments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- workouts: aluno autenticado lê publicados; admin gerencia
CREATE POLICY "auth read workouts" ON public.workouts FOR SELECT TO authenticated USING (is_published = true OR public.is_admin(auth.uid()));
CREATE POLICY "admin manage workouts" ON public.workouts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- workout_checkins: aluno cria/lê os seus; admin tudo
CREATE POLICY "checkins view own" ON public.workout_checkins FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR student_id = public.get_student_id(auth.uid())
);
CREATE POLICY "checkins insert own" ON public.workout_checkins FOR INSERT TO authenticated WITH CHECK (
  student_id = public.get_student_id(auth.uid()) AND public.student_plan_active(auth.uid())
);
CREATE POLICY "admin manage checkins" ON public.workout_checkins FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- diets: aluno vê só as suas; admin gerencia
CREATE POLICY "diets view own" ON public.diets FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR student_id = public.get_student_id(auth.uid())
);
CREATE POLICY "admin manage diets" ON public.diets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- goals: aluno vê e edita as suas; admin tudo
CREATE POLICY "goals view own" ON public.goals FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR student_id = public.get_student_id(auth.uid())
);
CREATE POLICY "goals insert own" ON public.goals FOR INSERT TO authenticated WITH CHECK (
  public.is_admin(auth.uid()) OR student_id = public.get_student_id(auth.uid())
);
CREATE POLICY "goals update own" ON public.goals FOR UPDATE TO authenticated USING (
  public.is_admin(auth.uid()) OR student_id = public.get_student_id(auth.uid())
);
CREATE POLICY "goals delete own" ON public.goals FOR DELETE TO authenticated USING (
  public.is_admin(auth.uid()) OR student_id = public.get_student_id(auth.uid())
);

-- attendances: aluno vê as suas; admin gerencia
CREATE POLICY "attendances view own" ON public.attendances FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR student_id = public.get_student_id(auth.uid())
);
CREATE POLICY "admin manage attendances" ON public.attendances FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- points_history: aluno vê seu histórico
CREATE POLICY "points view own" ON public.points_history FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR student_id = public.get_student_id(auth.uid())
);

-- =========================
-- RANKING via SECURITY DEFINER (expor só o necessário)
-- =========================
CREATE OR REPLACE FUNCTION public.get_ranking(_limit INT DEFAULT 50)
RETURNS TABLE (
  student_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  total_points INTEGER,
  plan_name TEXT,
  rank BIGINT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, p.full_name, p.avatar_url, s.total_points, pl.name,
         RANK() OVER (ORDER BY s.total_points DESC) as rank
  FROM public.students s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.plans pl ON pl.id = s.plan_id
  WHERE s.is_active = true
  ORDER BY s.total_points DESC
  LIMIT _limit
$$;

-- =========================
-- SEED PLANS
-- =========================
INSERT INTO public.plans (name, description, price, duration_days, presential_per_week, has_workouts, has_ranking, has_diet, has_goals, sort_order) VALUES
('Free', 'Acesso à plataforma, treinos e ranking por 14 dias', 0, 14, 0, true, true, false, true, 1),
('Foco', 'Treinos online + 2x por semana presencial + dieta personalizada', 149.90, 30, 2, true, true, true, true, 2),
('Intensivo', 'Treinos online + 3x por semana presencial + dieta personalizada + acompanhamento total', 249.90, 30, 3, true, true, true, true, 3);

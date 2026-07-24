import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "professor" | "aluno";

export interface PlanInfo {
  id: string;
  name: string;
  has_workouts: boolean;
  has_ranking: boolean;
  has_diet: boolean;
  has_goals: boolean;
  presential_per_week: number;
}

export interface StudentInfo {
  id: string;
  total_points: number;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  plan: PlanInfo | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isProfessor: boolean;
  canAccessAdmin: boolean;
  student: StudentInfo | null;
  planActive: boolean;
  assessmentCompleted: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const loadedUserIdRef = useRef<string | null>(null);

  const loadRoles = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) return [] as AppRole[];

    const response = await fetch("/api/me/roles", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [] as AppRole[];

    const data = (await response.json()) as { roles?: AppRole[] };
    return data.roles ?? [];
  };

  const loadProfile = async (uid: string) => {
    const [rolesData, { data: studentData }, { data: profileData }] = await Promise.all([
      loadRoles(),
      supabase
        .from("students")
        .select("id,total_points,plan_started_at,plan_expires_at,plan:plans(id,name,has_workouts,has_ranking,has_diet,has_goals,presential_per_week)")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase.from("profiles").select("assessment_completed_at").eq("id", uid).maybeSingle(),
    ]);
    setRoles(rolesData);
    setStudent(studentData as unknown as StudentInfo | null);
    setAssessmentCompleted(!!profileData?.assessment_completed_at);
  };

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (!sess?.user) {
        loadedUserIdRef.current = null;
        setRoles([]);
        setStudent(null);
        setAssessmentCompleted(false);
        setLoading(false);
        return;
      }

      // Supabase can emit SIGNED_IN / TOKEN_REFRESHED when the browser tab regains focus.
      // Do not show the global loading screen or reload profile data unless the user changed.
      const uid = sess.user.id;
      const shouldReloadProfile = uid !== loadedUserIdRef.current || event === "USER_UPDATED";
      if (shouldReloadProfile) {
        loadedUserIdRef.current = uid;
        if (!student && roles.length === 0) setLoading(true);
        setTimeout(() => {
          loadProfile(uid).finally(() => {
            if (mounted) setLoading(false);
          });
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        loadedUserIdRef.current = sess.user.id;
        loadProfile(sess.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [roles.length, student]);


  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const isAdmin = roles.includes("admin");
  const isProfessor = roles.includes("professor");
  const canAccessAdmin = isAdmin || isProfessor;
  const planActive = !!student && (!student.plan_expires_at || new Date(student.plan_expires_at) > new Date());

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, isAdmin, isProfessor, canAccessAdmin, student, planActive, assessmentCompleted, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

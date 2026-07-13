// Server helper: verify caller is admin via Bearer token.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getAdminUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const { data: roleRow } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return roleRow ? user.id : null;
}

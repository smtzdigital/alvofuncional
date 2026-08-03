// Server-only. Sincroniza cliente (aluno) com a Pagar.me.
// Best-effort: retorna { synced, reason?, customer_id? } em vez de lançar.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { friendlyStoneError, getGatewayConfig, getPaymentGateway } from "./stone.server";

export interface CustomerSyncResult {
  synced: boolean;
  reason?: string;
  customer_id?: string;
}

export async function syncStudentCustomer(studentId: string, actor: string): Promise<CustomerSyncResult> {
  try {
    // Só tenta se gateway estiver configurado/habilitado
    let cfg;
    try { cfg = await getGatewayConfig(); } catch { return { synced: false, reason: "Gateway não configurado" }; }
    if (!cfg.enabled || !cfg.secret_key) return { synced: false, reason: "Gateway desabilitado" };

    const { data: student, error } = await supabaseAdmin
      .from("students")
      .select("id, stone_customer_id, profile:profiles!inner(full_name, email, phone, document)")
      .eq("id", studentId)
      .maybeSingle();
    if (error || !student) return { synced: false, reason: "Aluno não encontrado" };
    const s = student as unknown as {
      id: string;
      stone_customer_id: string | null;
      profile: { full_name: string; email: string | null; phone: string | null; document: string | null };
    };
    if (!s.profile?.email || !s.profile?.document) {
      return { synced: false, reason: "Email e CPF são obrigatórios para sincronizar com a Pagar.me" };
    }

    const gw = getPaymentGateway();
    if (s.stone_customer_id) {
      try {
        await gw.updateCustomer({
          customerId: s.stone_customer_id,
          name: s.profile.full_name,
          email: s.profile.email,
          document: s.profile.document,
          phone: s.profile.phone ?? undefined,
          actor,
        });
        return { synced: true, customer_id: s.stone_customer_id };
      } catch (e) {
        // Cliente não existe nesse ambiente (ex.: id criado no sandbox): recria.
        if (!(e instanceof StoneError) || (e.status !== 404 && e.status !== 400)) throw e;
        await supabaseAdmin.from("students").update({ stone_customer_id: null }).eq("id", studentId);
      }
    }

    const cust = await gw.createCustomer({
      name: s.profile.full_name,
      email: s.profile.email,
      document: s.profile.document,
      phone: s.profile.phone ?? undefined,
      actor,
    });
    await supabaseAdmin.from("students").update({ stone_customer_id: cust.id }).eq("id", studentId);
    return { synced: true, customer_id: cust.id };
  } catch (e) {
    return { synced: false, reason: friendlyStoneError(e) };
  }
}

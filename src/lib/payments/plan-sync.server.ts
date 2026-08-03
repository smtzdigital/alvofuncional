import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getPaymentGateway, StoneError } from "./stone.server";

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_interval: string;
  billing_interval_count: number;
  installments: number;
  trial_period_days: number | null;
  stone_plan_id: string | null;
  is_active: boolean;
};

export async function syncPlan(planId: string, actor: string) {
  const { data, error } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();
  if (error || !data) throw new Error("Plano não encontrado");
  const p = data as unknown as PlanRow;
  const gw = getPaymentGateway();
  const input = {
    name: p.name,
    description: p.description ?? undefined,
    amountCents: Math.round(Number(p.price) * 100),
    interval: p.billing_interval,
    intervalCount: p.billing_interval_count,
    installments: p.installments,
    trialPeriodDays: p.trial_period_days ?? 0,
    actor,
  };
  if (p.stone_plan_id) {
    try {
      await gw.updatePlan({ ...input, stonePlanId: p.stone_plan_id });
      return { stone_plan_id: p.stone_plan_id, action: "updated" as const };
    } catch (e) {
      if (!(e instanceof StoneError) || e.status !== 404) throw e;
      await supabaseAdmin.from("plans").update({ stone_plan_id: null }).eq("id", p.id);
    }
  }
  const created = await gw.createPlan(input);
  await supabaseAdmin.from("plans").update({ stone_plan_id: created.id }).eq("id", p.id);
  return { stone_plan_id: created.id, action: "created" as const };
}

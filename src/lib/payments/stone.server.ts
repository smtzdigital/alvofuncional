// Server-only. Never import in components/hooks.
// Camada de abstração PaymentGateway com implementação StonePaymentGateway (Pagar.me Core API v5).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STONE_API_URL = "https://api.pagar.me/core/v5";
const STONE_SANDBOX_API_URL = "https://sdx-api.pagar.me/core/v5";

export interface GatewayConfig {
  provider: string;
  environment: "sandbox" | "live";
  secret_key: string | null;
  public_key: string | null;
  webhook_user: string | null;
  webhook_password: string | null;
  enabled: boolean;
  whatsapp_template: string;
  link_expires_days: number;
}

let _configCache: { data: GatewayConfig; at: number } | null = null;

export async function getGatewayConfig(force = false): Promise<GatewayConfig> {
  if (!force && _configCache && Date.now() - _configCache.at < 30_000) return _configCache.data;
  const { data, error } = await supabaseAdmin.from("payment_gateway_config").select("*").eq("id", true).maybeSingle();
  if (error || !data) throw new Error("Configuração de pagamentos não encontrada");
  const config = data as unknown as GatewayConfig;
  _configCache = { data: config, at: Date.now() };
  return config;
}

export function invalidateConfigCache() { _configCache = null; }

// -------------------- HTTP client --------------------

interface StoneRequestInit {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  idempotencyKey?: string;
}

export class StoneError extends Error {
  status: number;
  code?: string;
  raw?: unknown;
  constructor(message: string, status: number, code?: string, raw?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.raw = raw;
  }
}

async function stoneRequest<T = unknown>(cfg: GatewayConfig, init: StoneRequestInit & { useSandboxHost?: boolean }): Promise<T> {
  if (!cfg.secret_key) throw new StoneError("Chave secreta da Stone não configurada", 400, "no_secret_key");
  const auth = "Basic " + btoa(`${cfg.secret_key}:`);
  const headers: Record<string, string> = {
    Authorization: auth,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  const baseUrl = init.useSandboxHost && cfg.environment === "sandbox" ? STONE_SANDBOX_API_URL : STONE_API_URL;
  const res = await fetch(`${baseUrl}${init.path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

  if (!res.ok) {
    const raw = payload as { message?: string; errors?: unknown; code?: string } | null;
    const msg = raw?.message ?? `Falha na Stone (${res.status})`;
    throw new StoneError(msg, res.status, raw?.code, raw);
  }
  return payload as T;
}

// Sanitize logs (never store PAN/CVV/secrets)
function sanitize(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase();
    if (key.includes("number") || key.includes("cvv") || key.includes("secret") || key.includes("password") || key === "authorization") {
      out[k] = "[REDACTED]";
    } else if (typeof v === "object") {
      out[k] = sanitize(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function logAudit(action: string, req: unknown, resp: unknown, error?: string, actor?: string | null) {
  try {
    await supabaseAdmin.from("payment_audit_logs").insert({
      actor_user_id: actor ?? null,
      action,
      request_summary: sanitize(req) as never,
      response_summary: sanitize(resp) as never,
      error: error ?? null,
    });
  } catch { /* ignore log failures */ }
}

// -------------------- DTOs --------------------

export interface StoneCustomer { id: string; name?: string; email?: string; document?: string }
export interface StoneCard { id: string; brand?: string; last_four_digits?: string; holder_name?: string; exp_month?: number; exp_year?: number }
export interface StoneSubscription { id: string; status: string; next_billing_at?: string; card?: StoneCard; plan?: { id: string } }
export interface StonePaymentLink { id: string; url: string; expires_at?: string; status?: string; amount?: number }
export interface StoneCharge { id: string; status: string; amount: number; paid_at?: string; last_transaction?: { acquirer_message?: string; acquirer_return_code?: string } }
export interface StonePlan { id: string; name: string; status?: string }

export interface PlanSyncInput {
  name: string;
  description?: string;
  amountCents: number;
  interval: string;
  intervalCount: number;
  installments: number;
  actor?: string;
}

// -------------------- Gateway interface --------------------

export interface PaymentGateway {
  createCustomer(input: { name: string; email: string; document: string; documentType?: "CPF" | "CNPJ"; phone?: string; actor?: string }): Promise<StoneCustomer>;
  updateCustomer(input: { customerId: string; name: string; email: string; document: string; documentType?: "CPF" | "CNPJ"; phone?: string; actor?: string }): Promise<StoneCustomer>;
  createCard(input: { customerId: string; cardToken: string; actor?: string }): Promise<StoneCard>;
  createSubscription(input: { customerId: string; cardId: string; planName: string; amountCents: number; interval: string; intervalCount: number; installments: number; actor?: string; metadata?: Record<string, string>; stonePlanId?: string | null }): Promise<StoneSubscription>;
  cancelSubscription(input: { subscriptionId: string; actor?: string }): Promise<{ ok: true }>;
  updateSubscriptionCard(input: { subscriptionId: string; cardId: string; actor?: string }): Promise<{ ok: true }>;
  createPaymentLink(input: { name: string; amountCents: number; expiresInSec: number; description?: string; installments?: number; metadata?: Record<string, string>; actor?: string }): Promise<StonePaymentLink>;
  createOneOffCharge(input: { customerId: string; cardId: string; amountCents: number; installments?: number; description?: string; actor?: string; metadata?: Record<string, string> }): Promise<StoneCharge>;
  createPlan(input: PlanSyncInput): Promise<StonePlan>;
  updatePlan(input: PlanSyncInput & { stonePlanId: string }): Promise<StonePlan>;
  deletePlan(input: { stonePlanId: string; actor?: string }): Promise<{ ok: true }>;
}

// -------------------- Stone impl --------------------

class StonePaymentGateway implements PaymentGateway {
  async createCustomer(input: { name: string; email: string; document: string; documentType?: "CPF" | "CNPJ"; phone?: string; actor?: string }) {
    const cfg = await getGatewayConfig();
    const body: Record<string, unknown> = {
      name: input.name,
      email: input.email,
      document: input.document.replace(/\D/g, ""),
      document_type: input.documentType ?? (input.document.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF"),
      type: (input.documentType ?? "CPF") === "CNPJ" ? "company" : "individual",
    };
    if (input.phone) {
      const digits = input.phone.replace(/\D/g, "");
      const area = digits.slice(-11, -9) || "11";
      const number = digits.slice(-9);
      body.phones = { mobile_phone: { country_code: "55", area_code: area, number } };
    }
    try {
      const res = await stoneRequest<StoneCustomer>(cfg, { method: "POST", path: "/customers", body, idempotencyKey: `cust-${input.email}` });
      await logAudit("createCustomer", body, { id: res.id }, undefined, input.actor);
      return res;
    } catch (e) {
      const err = e as StoneError;
      await logAudit("createCustomer", body, null, err.message, input.actor);
      throw err;
    }
  }

  async updateCustomer(input: { customerId: string; name: string; email: string; document: string; documentType?: "CPF" | "CNPJ"; phone?: string; actor?: string }) {
    const cfg = await getGatewayConfig();
    const body: Record<string, unknown> = {
      name: input.name,
      email: input.email,
      document: input.document.replace(/\D/g, ""),
      document_type: input.documentType ?? (input.document.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF"),
      type: (input.documentType ?? "CPF") === "CNPJ" ? "company" : "individual",
    };
    if (input.phone) {
      const digits = input.phone.replace(/\D/g, "");
      const area = digits.slice(-11, -9) || "11";
      const number = digits.slice(-9);
      body.phones = { mobile_phone: { country_code: "55", area_code: area, number } };
    }
    try {
      const res = await stoneRequest<StoneCustomer>(cfg, { method: "PUT", path: `/customers/${encodeURIComponent(input.customerId)}`, body });
      await logAudit("updateCustomer", { id: input.customerId, ...body }, { id: res.id }, undefined, input.actor);
      return res;
    } catch (e) {
      const err = e as StoneError;
      await logAudit("updateCustomer", { id: input.customerId }, null, err.message, input.actor);
      throw err;
    }
  }

  async createCard(input: { customerId: string; cardToken: string; actor?: string }) {
    const cfg = await getGatewayConfig();
    const body = { token: input.cardToken };
    try {
      const res = await stoneRequest<StoneCard>(cfg, {
        method: "POST",
        path: `/customers/${encodeURIComponent(input.customerId)}/cards`,
        body,
        idempotencyKey: `card-${input.cardToken.slice(0, 12)}`,
      });
      await logAudit("createCard", { customerId: input.customerId }, { id: res.id, brand: res.brand, last4: res.last_four_digits }, undefined, input.actor);
      return res;
    } catch (e) {
      const err = e as StoneError;
      await logAudit("createCard", { customerId: input.customerId }, null, err.message, input.actor);
      throw err;
    }
  }

  async createSubscription(input: { customerId: string; cardId: string; planName: string; amountCents: number; interval: string; intervalCount: number; installments: number; actor?: string; metadata?: Record<string, string>; stonePlanId?: string | null }) {
    const cfg = await getGatewayConfig();
    const usePlan = !!input.stonePlanId;
    const body: Record<string, unknown> = usePlan
      ? {
          customer_id: input.customerId,
          card_id: input.cardId,
          plan_id: input.stonePlanId,
          payment_method: "credit_card",
          installments: input.installments || 1,
          metadata: input.metadata ?? {},
        }
      : {
          customer_id: input.customerId,
          card_id: input.cardId,
          payment_method: "credit_card",
          installments: input.installments || 1,
          interval: input.interval,
          interval_count: input.intervalCount,
          billing_type: "prepaid",
          pricing_scheme: { scheme_type: "unit", price: input.amountCents },
          items: [{ description: input.planName, quantity: 1, pricing_scheme: { scheme_type: "unit", price: input.amountCents } }],
          metadata: input.metadata ?? {},
        };
    try {
      const res = await stoneRequest<StoneSubscription>(cfg, {
        method: "POST",
        path: "/subscriptions",
        body,
        idempotencyKey: `sub-${input.customerId}-${Date.now()}`,
      });
      await logAudit("createSubscription", { customerId: input.customerId, amount: input.amountCents, plan_id: input.stonePlanId ?? null }, { id: res.id, status: res.status }, undefined, input.actor);
      return res;
    } catch (e) {
      const err = e as StoneError;
      await logAudit("createSubscription", { customerId: input.customerId }, null, err.message, input.actor);
      throw err;
    }
  }

  async cancelSubscription(input: { subscriptionId: string; actor?: string }) {
    const cfg = await getGatewayConfig();
    try {
      await stoneRequest(cfg, { method: "DELETE", path: `/subscriptions/${encodeURIComponent(input.subscriptionId)}` });
      await logAudit("cancelSubscription", { id: input.subscriptionId }, { ok: true }, undefined, input.actor);
      return { ok: true as const };
    } catch (e) {
      const err = e as StoneError;
      await logAudit("cancelSubscription", { id: input.subscriptionId }, null, err.message, input.actor);
      throw err;
    }
  }

  async updateSubscriptionCard(input: { subscriptionId: string; cardId: string; actor?: string }) {
    const cfg = await getGatewayConfig();
    try {
      await stoneRequest(cfg, {
        method: "PATCH",
        path: `/subscriptions/${encodeURIComponent(input.subscriptionId)}/card`,
        body: { card_id: input.cardId },
      });
      await logAudit("updateSubscriptionCard", { id: input.subscriptionId }, { ok: true }, undefined, input.actor);
      return { ok: true as const };
    } catch (e) {
      const err = e as StoneError;
      await logAudit("updateSubscriptionCard", { id: input.subscriptionId }, null, err.message, input.actor);
      throw err;
    }
  }

  async createPaymentLink(input: { name: string; amountCents: number; expiresInSec: number; description?: string; installments?: number; metadata?: Record<string, string>; actor?: string }) {
    const cfg = await getGatewayConfig();
    const body = {
      name: input.name,
      is_building: false,
      expires_in: input.expiresInSec,
      payment_settings: {
        accepted_payment_methods: ["credit_card"],
        credit_card_settings: {
          operation_type: "auth_and_capture",
          installments: [{ number: input.installments ?? 1, total: input.amountCents }],
        },
      },
      cart_settings: {
        items: [{ amount: input.amountCents, name: input.name, description: input.description ?? input.name, default_quantity: 1 }],
      },
      metadata: input.metadata ?? {},
    };
    try {
      const res = await stoneRequest<StonePaymentLink>(cfg, { method: "POST", path: "/paymentlinks", body });
      await logAudit("createPaymentLink", { name: input.name, amount: input.amountCents }, { id: res.id, url: res.url }, undefined, input.actor);
      return res;
    } catch (e) {
      const err = e as StoneError;
      await logAudit("createPaymentLink", { name: input.name }, null, err.message, input.actor);
      throw err;
    }
  }

  async createOneOffCharge(input: { customerId: string; cardId: string; amountCents: number; installments?: number; description?: string; actor?: string; metadata?: Record<string, string> }) {
    const cfg = await getGatewayConfig();
    const body = {
      customer_id: input.customerId,
      items: [{ amount: input.amountCents, description: input.description ?? "Cobrança", quantity: 1 }],
      payments: [{ payment_method: "credit_card", credit_card: { card_id: input.cardId, installments: input.installments ?? 1, statement_descriptor: "MATRICULA" } }],
      metadata: input.metadata ?? {},
    };
    try {
      const order = await stoneRequest<{ id: string; charges: StoneCharge[] }>(cfg, {
        method: "POST",
        path: "/orders",
        body,
        idempotencyKey: `order-${input.customerId}-${Date.now()}`,
      });
      const charge = order.charges?.[0];
      if (!charge) throw new StoneError("Cobrança não retornada pela Stone", 502, "no_charge");
      await logAudit("createOneOffCharge", { customerId: input.customerId, amount: input.amountCents }, { id: charge.id, status: charge.status }, undefined, input.actor);
      return charge;
    } catch (e) {
      const err = e as StoneError;
      await logAudit("createOneOffCharge", { customerId: input.customerId }, null, err.message, input.actor);
      throw err;
    }
  }

  private planBody(input: PlanSyncInput) {
    return {
      name: input.name,
      description: input.description ?? input.name,
      interval: input.interval,
      interval_count: input.intervalCount,
      billing_type: "prepaid",
      payment_methods: ["credit_card"],
      installments: [input.installments || 1],
      pricing_scheme: { scheme_type: "unit", price: input.amountCents },
      items: [{ name: input.name, quantity: 1, pricing_scheme: { scheme_type: "unit", price: input.amountCents } }],
    };
  }

  async createPlan(input: PlanSyncInput) {
    const cfg = await getGatewayConfig();
    try {
      const res = await stoneRequest<StonePlan>(cfg, { method: "POST", path: "/plans", body: this.planBody(input), idempotencyKey: `plan-${input.name}-${input.amountCents}` });
      await logAudit("createPlan", { name: input.name, amount: input.amountCents }, { id: res.id }, undefined, input.actor);
      return res;
    } catch (e) {
      const err = e as StoneError;
      await logAudit("createPlan", { name: input.name }, null, err.message, input.actor);
      throw err;
    }
  }

  async updatePlan(input: PlanSyncInput & { stonePlanId: string }) {
    const cfg = await getGatewayConfig();
    try {
      // Pagar.me v5 PUT /plans/:id atualiza dados gerais; pricing_scheme via items
      const res = await stoneRequest<StonePlan>(cfg, {
        method: "PUT",
        path: `/plans/${encodeURIComponent(input.stonePlanId)}`,
        body: {
          name: input.name,
          description: input.description ?? input.name,
          installments: [input.installments || 1],
          payment_methods: ["credit_card"],
          statement_descriptor: input.name.slice(0, 13),
        },
      });
      await logAudit("updatePlan", { id: input.stonePlanId, name: input.name }, { id: res.id }, undefined, input.actor);
      return res;
    } catch (e) {
      const err = e as StoneError;
      await logAudit("updatePlan", { id: input.stonePlanId }, null, err.message, input.actor);
      throw err;
    }
  }

  async deletePlan(input: { stonePlanId: string; actor?: string }) {
    const cfg = await getGatewayConfig();
    try {
      await stoneRequest(cfg, { method: "DELETE", path: `/plans/${encodeURIComponent(input.stonePlanId)}` });
      await logAudit("deletePlan", { id: input.stonePlanId }, { ok: true }, undefined, input.actor);
      return { ok: true as const };
    } catch (e) {
      const err = e as StoneError;
      await logAudit("deletePlan", { id: input.stonePlanId }, null, err.message, input.actor);
      throw err;
    }
  }
}

let _gateway: PaymentGateway | null = null;
export function getPaymentGateway(): PaymentGateway {
  if (!_gateway) _gateway = new StonePaymentGateway();
  return _gateway;
}

// -------------------- Friendly error mapping --------------------

export function friendlyStoneError(err: unknown): string {
  if (err instanceof StoneError) {
    const raw = err.raw as { errors?: Array<{ message?: string }> } | null;
    const first = raw?.errors?.[0]?.message;
    if (first) return first;
    if (err.status === 401 || err.status === 403) return "Credenciais da Stone inválidas. Verifique as configurações.";
    if (err.status === 404) return "Recurso não encontrado na Stone.";
    if (err.status === 422) return err.message || "Dados inválidos.";
    if (err.status >= 500) return "Stone indisponível no momento. Tente novamente.";
    return err.message;
  }
  return err instanceof Error ? err.message : "Erro desconhecido";
}

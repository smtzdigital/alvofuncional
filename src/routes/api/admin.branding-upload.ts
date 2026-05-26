import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const allowedFields = new Set([
  "logo_url",
  "logo_icon_url",
  "favicon_url",
  "pwa_icon_192_url",
  "pwa_icon_512_url",
]);

async function getAdminUserId(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return null;
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleRow) {
    return null;
  }

  return user.id;
}

export const Route = createFileRoute("/api/admin/branding-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await getAdminUserId(request);

        if (!userId) {
          return Response.json({ error: "Acesso restrito a administradores" }, { status: 403 });
        }

        const formData = await request.formData();
        const field = formData.get("field");
        const file = formData.get("file");

        if (typeof field !== "string" || !allowedFields.has(field)) {
          return Response.json({ error: "Campo de upload inválido" }, { status: 400 });
        }

        if (!(file instanceof File)) {
          return Response.json({ error: "Arquivo inválido" }, { status: 400 });
        }

        const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
        const path = `${field}-${Date.now()}.${extension}`;

        const { error } = await supabaseAdmin.storage.from("branding").upload(path, file, {
          upsert: true,
          contentType: file.type || undefined,
        });

        if (error) {
          return Response.json({ error: "Não foi possível enviar a imagem" }, { status: 500 });
        }

        const { data } = supabaseAdmin.storage.from("branding").getPublicUrl(path);

        return Response.json({ success: true, publicUrl: data.publicUrl });
      },
    },
  },
});
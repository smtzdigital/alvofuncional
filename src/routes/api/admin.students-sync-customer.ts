import { createFileRoute } from "@tanstack/react-router";
import { getAdminUserId } from "@/lib/payments/admin-verify.server";
import { syncStudentCustomer } from "@/lib/payments/customer-sync.server";

export const Route = createFileRoute("/api/admin/students-sync-customer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const adminId = await getAdminUserId(request);
        if (!adminId) return Response.json({ error: "Acesso restrito" }, { status: 403 });
        const { student_id } = (await request.json()) as { student_id?: string };
        if (!student_id) return Response.json({ error: "student_id obrigatório" }, { status: 400 });
        const pagarme = await syncStudentCustomer(student_id, adminId);
        return Response.json({ success: true, pagarme });
      },
    },
  },
});

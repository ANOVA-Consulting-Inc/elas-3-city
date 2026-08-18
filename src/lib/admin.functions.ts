import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ───────────────── Admin: city_participations (NDA / participation records) ─────────────────

export const listParticipations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("city_participations")
      .select(
        "id, name, email, org, address, project, signature_name, ref, ip, user_agent, certificate_path, registered_at, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteParticipation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("participation-certificates").remove([`${data.id}.pdf`]);
    } catch (err) {
      console.error("[admin] certificate cleanup failed", err);
    }
    const { error } = await context.supabase.from("city_participations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCertificatePdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${data.id}.pdf`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("participation-certificates")
      .createSignedUrl(path, 3600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export const regenerateCertificatePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("city_participations")
      .select(
        "id, name, email, org, address, project, signature_name, ref, ip, user_agent, registered_at",
      )
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Not found");

    const { buildParticipationPdf } = await import("./participation-certificate.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const pdfBytes = await buildParticipationPdf({
      name: row.name,
      email: row.email,
      org: row.org ?? "",
      address: row.address ?? "",
      project: row.project ?? "",
      signature: row.signature_name ?? row.name,
      ref: row.ref ?? "",
      date: new Date(row.registered_at ?? new Date()).toISOString().slice(0, 10),
      ip: row.ip ?? null,
      userAgent: row.user_agent ?? null,
    });

    const path = `${row.id}.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("participation-certificates")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("city_participations")
      .update({ certificate_path: path })
      .eq("id", data.id);
    return { ok: true, path };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data, userId: context.userId };
  });

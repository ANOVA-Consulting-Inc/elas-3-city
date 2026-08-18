import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const participationSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    email: z.string().trim().email().max(320),
    org: z.string().trim().min(2).max(240),
    address: z.string().trim().min(5).max(500),
    project: z.string().trim().min(2).max(240),
    signature: z.string().trim().min(2).max(200),
    ref: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.signature.toLowerCase() === data.name.toLowerCase(), {
    message: "Signature must match legal name",
    path: ["signature"],
  });

async function generateAndStorePdf(params: {
  participationId: string;
  name: string;
  email: string;
  org: string;
  address: string;
  project: string;
  signature: string;
  ref: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<string | null> {
  try {
    const [{ supabaseAdmin }, { buildParticipationPdf }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("./participation-certificate.server"),
    ]);
    const pdfBytes = await buildParticipationPdf({
      name: params.name,
      email: params.email,
      org: params.org,
      address: params.address,
      project: params.project,
      signature: params.signature,
      ref: params.ref,
      date: new Date().toISOString().slice(0, 10),
      ip: params.ip,
      userAgent: params.userAgent,
    });
    const path = `${params.participationId}.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("participation-certificates")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      console.error("[participation-certificate] upload failed", upErr.message);
      return null;
    }
    await supabaseAdmin
      .from("city_participations")
      .update({ certificate_path: path })
      .eq("id", params.participationId);
    return path;
  } catch (err) {
    console.error("[participation-certificate] generation failed", err);
    return null;
  }
}

export const submitParticipation = createServerFn({ method: "POST" })
  .validator((input: unknown) => participationSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const ip = (() => {
      try {
        return getRequestIP({ xForwardedFor: true }) ?? null;
      } catch {
        return null;
      }
    })();
    const ua = (() => {
      try {
        return getRequestHeader("user-agent") ?? null;
      } catch {
        return null;
      }
    })();
    console.info("[submitParticipation] insert attempt", {
      nameLen: data.name.length,
      emailLen: data.email.length,
      orgLen: data.org.length,
      addressLen: data.address.length,
      projectLen: data.project.length,
      signatureLen: data.signature.length,
      sigMatches: data.signature.toLowerCase() === data.name.toLowerCase(),
      ref: data.ref ?? null,
    });
    const participationId = crypto.randomUUID();
    const { error } = await supabase.from("city_participations").insert({
      id: participationId,
      name: data.name,
      email: data.email,
      org: data.org,
      address: data.address,
      project: data.project,
      signature_name: data.signature,
      ref: data.ref ?? null,
      ip,
      user_agent: ua,
      registered_at: new Date().toISOString(),
    });
    if (error) {
      const e = error as { message?: string; code?: string; details?: string; hint?: string };
      console.error("[submitParticipation] insert failed", {
        message: e.message,
        code: e.code,
        details: e.details,
        hint: e.hint,
      });
      const detail = [e.message, e.details, e.hint].filter(Boolean).join(" — ");
      throw new Error(detail || "Database rejected the submission.");
    }

    // Best-effort PDF render + upload. Do not fail the user submission on PDF errors.
    await generateAndStorePdf({
      participationId,
      name: data.name,
      email: data.email,
      org: data.org,
      address: data.address,
      project: data.project,
      signature: data.signature,
      ref: data.ref ?? "",
      ip,
      userAgent: ua,
    });
    return { ok: true };
  });

export const lookupParticipant = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ email: z.string().trim().email().max(320) }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await (
      supabasePublic.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )("eoi_lookup_signer", { p_email: data.email });
    if (error) {
      console.error("[lookupParticipant] rpc failed", error.message);
      return { found: false, name: null as string | null };
    }
    const row = (Array.isArray(rows) ? rows[0] : rows) as
      { found?: boolean; name?: string | null } | null | undefined;
    return {
      found: !!row?.found,
      name: row?.name ?? null,
    };
  });

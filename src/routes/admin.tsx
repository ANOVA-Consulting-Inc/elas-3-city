import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listParticipations,
  deleteParticipation,
  checkIsAdmin,
  getCertificatePdfUrl,
  regenerateCertificatePdf,
} from "@/lib/admin.functions";
import { PdfPreview } from "@/components/admin/PdfPreview";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Ack = Awaited<ReturnType<typeof listParticipations>>[number];
type SortKey = "created_at" | "name" | "email" | "org" | "project" | "pdf";
type SortDir = "asc" | "desc";
type PdfFilter = "all" | "has" | "missing";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchList = useServerFn(listParticipations);
  const checkAdmin = useServerFn(checkIsAdmin);
  const removeAck = useServerFn(deleteParticipation);
  const getPdfUrl = useServerFn(getCertificatePdfUrl);
  const regenPdf = useServerFn(regenerateCertificatePdf);

  const [email, setEmail] = useState<string>("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [pdfFilter, setPdfFilter] = useState<PdfFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin() });

  const listQ = useQuery({
    queryKey: ["participations"],
    queryFn: () => fetchList(),
    enabled: adminQ.data?.isAdmin === true,
  });

  const del = useMutation({
    mutationFn: (id: string) => removeAck({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["participations"] });
      setSelectedId(null);
    },
  });

  const regen = useMutation({
    mutationFn: (id: string) => regenPdf({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["participations"] }),
  });

  async function openPdf(id: string) {
    setPdfBusy(id);
    try {
      const { url } = await getPdfUrl({ data: { id } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setPdfBusy(null);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const rows = listQ.data ?? [];

  const orgOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.org) set.add(r.org);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate + "T00:00:00Z").getTime() : null;
    const to = toDate ? new Date(toDate + "T23:59:59Z").getTime() : null;
    const out = rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      if (from && t < from) return false;
      if (to && t > to) return false;
      if (orgFilter && (r.org ?? "") !== orgFilter) return false;
      if (pdfFilter === "has" && !r.certificate_path) return false;
      if (pdfFilter === "missing" && r.certificate_path) return false;
      if (!q) return true;
      return [r.name, r.email, r.org, r.project].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
    const dir = sortDir === "asc" ? 1 : -1;
    const keyOf = (r: Ack): string | number => {
      switch (sortKey) {
        case "created_at": return new Date(r.created_at).getTime();
        case "pdf": return r.certificate_path ? 1 : 0;
        case "name": return (r.name ?? "").toLowerCase();
        case "email": return (r.email ?? "").toLowerCase();
        case "org": return (r.org ?? "").toLowerCase();
        case "project": return (r.project ?? "").toLowerCase();
      }
    };
    return [...out].sort((a, b) => {
      const ka = keyOf(a);
      const kb = keyOf(b);
      if (ka < kb) return -1 * dir;
      if (ka > kb) return 1 * dir;
      return 0;
    });
  }, [rows, search, fromDate, toDate, orgFilter, pdfFilter, sortKey, sortDir]);

  const selectedRows = useMemo(() => filtered.filter((r) => selectedIds.has(r.id)), [filtered, selectedIds]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const r of filtered) next.delete(r.id);
      } else {
        for (const r of filtered) next.add(r.id);
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setSearch(""); setFromDate(""); setToDate(""); setOrgFilter(""); setPdfFilter("all");
  }

  function setSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "created_at" || k === "pdf" ? "desc" : "asc");
    }
  }

  function csvFor(list: Ack[]) {
    const head = ["created_at", "name", "email", "org", "address", "project", "signature_name", "registered_at", "ref", "ip", "user_agent", "certificate_path"];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [head.join(",")].concat(list.map((r) => head.map((k) => esc((r as Record<string, unknown>)[k])).join(","))).join("\n");
  }

  function downloadCsv(list: Ack[], suffix = "") {
    const blob = new Blob([csvFor(list)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elas-3-city-participations${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function bulkDelete() {
    if (!selectedRows.length) return;
    if (!confirm(`Delete ${selectedRows.length} participation${selectedRows.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      for (const r of selectedRows) {
        await removeAck({ data: { id: r.id } });
      }
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["participations"] });
    } catch (e) {
      alert("Bulk delete failed: " + (e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  function copyEmails(list: Ack[]) {
    const v = list.map((r) => r.email).filter(Boolean).join(", ");
    navigator.clipboard.writeText(v).then(
      () => {},
      () => alert("Could not copy to clipboard."),
    );
  }

  function composeMail(list: Ack[]) {
    const bcc = list.map((r) => r.email).filter(Boolean).join(",");
    const subject = encodeURIComponent("ELAS-3-CITY — Expression of Interest");
    const body = encodeURIComponent("Dear signer,\n\nThank you for acknowledging the Bi-Lateral NDA for the ELAS-3-CITY EOI.\n\n— Anova Consulting");
    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
  }

  if (adminQ.isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">Loading…</div>;
  }

  if (!adminQ.data?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-5">
        <div className="max-w-md text-center border border-neutral-300 bg-white p-8">
          <h1 className="text-[20px] font-medium text-neutral-900">Access denied</h1>
          <p className="mt-2 text-[13px] text-neutral-600">
            Your account ({email}) is signed in but does not have admin privileges. Ask the project owner to grant the <code className="font-mono">admin</code> role to your user id:
          </p>
          <code className="mt-3 block break-all font-mono text-[11px] bg-neutral-100 p-2">{adminQ.data?.userId}</code>
          <div className="mt-5 flex gap-2 justify-center">
            <button onClick={signOut} className="border border-neutral-400 px-3 py-1.5 text-[12px] uppercase tracking-[0.15em]">Sign out</button>
            <Link to="/" className="bg-neutral-900 text-white px-3 py-1.5 text-[12px] uppercase tracking-[0.15em]">Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;
  const exportTargetCount = selectedRows.length || filtered.length;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-300 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">ELAS-3-CITY EOI · Restricted</p>
            <h1 className="text-[20px] font-medium tracking-tight text-neutral-900">Participation Registry</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-neutral-500 hidden sm:inline">{email}</span>
            <button onClick={() => downloadCsv(selectedRows.length ? selectedRows : filtered, selectedRows.length ? "-selection" : "")} disabled={!exportTargetCount} title={selectedRows.length ? `Export ${selectedRows.length} selected` : `Export ${filtered.length} filtered`} className="border border-neutral-400 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] hover:bg-neutral-100 disabled:opacity-50">Export CSV</button>
            <Link to="/" className="border border-neutral-400 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] hover:bg-neutral-100">NDA</Link>
            <button onClick={signOut} className="bg-neutral-900 text-white px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] hover:bg-neutral-700">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] items-end">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, organization, project" className="w-full border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-neutral-900" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">Organisation</label>
            <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="border border-neutral-300 bg-white px-3 py-2 text-[13px] min-w-[180px] outline-none focus:border-neutral-900">
              <option value="">All</option>
              {orgOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-neutral-900" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-neutral-900" />
          </div>
          <button onClick={clearFilters} className="border border-neutral-300 px-3 py-2 text-[11px] uppercase tracking-[0.15em] text-neutral-600 hover:bg-neutral-100">Clear</button>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">PDF</span>
            {(["all", "has", "missing"] as const).map((k) => (
              <button key={k} onClick={() => setPdfFilter(k)} className={`px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] border ${pdfFilter === k ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"}`}>
                {k === "all" ? "All" : k === "has" ? "Has PDF" : "Missing"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[12px] text-neutral-600">
              {listQ.isLoading ? "Loading…" : `${filtered.length} of ${rows.length}${selectedIds.size ? ` · ${selectedIds.size} selected` : ""}`}
            </p>
            <button onClick={() => qc.invalidateQueries({ queryKey: ["participations"] })} className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-900">Refresh</button>
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 border border-neutral-900 bg-neutral-900 px-3 py-2 text-white">
            <span className="text-[11px] uppercase tracking-[0.15em] mr-2">{selectedRows.length} selected</span>
            <button onClick={() => downloadCsv(selectedRows, "-selection")} className="border border-white/40 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] hover:bg-white/10">Export CSV</button>
            <button onClick={() => copyEmails(selectedRows)} className="border border-white/40 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] hover:bg-white/10">Copy emails</button>
            <button onClick={() => composeMail(selectedRows)} className="border border-white/40 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] hover:bg-white/10">Compose email</button>
            <button onClick={bulkDelete} disabled={bulkBusy} className="ml-auto border border-red-300 bg-red-700 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] hover:bg-red-600 disabled:opacity-50">{bulkBusy ? "Deleting…" : "Delete selected"}</button>
            <button onClick={() => setSelectedIds(new Set())} className="text-[11px] uppercase tracking-[0.14em] text-white/70 hover:text-white">Clear selection</button>
          </div>
        )}

        {listQ.error && (
          <div className="mb-4 border border-red-300 bg-red-50 p-3 text-[12px] text-red-800">{String((listQ.error as Error).message)}</div>
        )}

        <div className="border border-neutral-300 bg-white overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-neutral-300 bg-neutral-100 text-left uppercase tracking-[0.12em] text-[10px] text-neutral-600">
                <th className="px-3 py-2.5 w-px"><input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label="Select all" /></th>
                <SortTh label="When (UTC)" k="created_at" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
                <SortTh label="Name" k="name" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
                <SortTh label="Email" k="email" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
                <SortTh label="Org" k="org" sortKey={sortKey} sortDir={sortDir} onSort={setSort} className="hidden lg:table-cell" />
                <SortTh label="Project" k="project" sortKey={sortKey} sortDir={sortDir} onSort={setSort} className="hidden lg:table-cell" />
                <SortTh label="PDF" k="pdf" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
                <th className="px-3 py-2.5 font-medium w-px"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isChecked = selectedIds.has(r.id);
                return (
                  <tr key={r.id} onClick={() => setSelectedId(r.id)} className={`border-b border-neutral-200 last:border-0 cursor-pointer ${isChecked ? "bg-neutral-100" : "hover:bg-neutral-50"}`}>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={isChecked} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.email}`} /></td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-neutral-700 whitespace-nowrap">{new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19)}</td>
                    <td className="px-3 py-2.5 text-neutral-900">{r.name}</td>
                    <td className="px-3 py-2.5"><a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()} className="text-neutral-900 underline-offset-2 hover:underline">{r.email}</a></td>
                    <td className="px-3 py-2.5 text-neutral-700 hidden lg:table-cell">{r.org ?? "—"}</td>
                    <td className="px-3 py-2.5 text-neutral-700 hidden lg:table-cell">{r.project ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {r.certificate_path ? (
                        <button onClick={(e) => { e.stopPropagation(); openPdf(r.id); }} disabled={pdfBusy === r.id} className="text-[11px] uppercase tracking-[0.15em] text-neutral-900 hover:underline disabled:opacity-50">{pdfBusy === r.id ? "Opening…" : "Open"}</button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); regen.mutate(r.id); }} disabled={regen.isPending} className="text-[11px] uppercase tracking-[0.15em] text-amber-700 hover:underline disabled:opacity-50">Generate</button>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete participation from ${r.email}?`)) del.mutate(r.id); }} className="text-[11px] uppercase tracking-[0.15em] text-red-700 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && !listQ.isLoading && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-neutral-500">{rows.length ? "No matches for the current filters." : "No participations yet."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={() => setSelectedId(null)}>
          <aside onClick={(e) => e.stopPropagation()} className="w-full max-w-[960px] h-full bg-white shadow-xl overflow-y-auto border-l border-neutral-300">
            <div className="border-b border-neutral-200 px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Participation</p>
                <h2 className="text-[18px] font-medium text-neutral-900">{selected.name}</h2>
                <p className="text-[12px] text-neutral-500">{selected.email}</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-[11px] uppercase tracking-[0.15em] text-neutral-500 hover:text-neutral-900">Close</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 gap-3 text-[13px]">
              <DetailRow label="Organization" value={selected.org} />
              <DetailRow label="Address" value={selected.address} />
              <DetailRow label="Project (subject)" value={selected.project} />
              <DetailRow label="Electronic signature" value={selected.signature_name} />
              <DetailRow label="Reference" value={selected.ref} mono />
              <DetailRow label="Registered at (UTC)" value={selected.registered_at ? new Date(selected.registered_at).toISOString() : null} mono />
              <DetailRow label="Recorded at (UTC)" value={new Date(selected.created_at).toISOString()} mono />
              <DetailRow label="IP" value={selected.ip} mono />
              <DetailRow label="User agent" value={selected.user_agent} mono />
              <DetailRow label="PDF path" value={selected.certificate_path} mono />
            </div>
            <AckPdfPanel ackId={selected.id} hasPdf={!!selected.certificate_path} email={selected.email} onDelete={() => { if (confirm(`Delete participation from ${selected.email}?`)) del.mutate(selected.id); }} />
          </aside>
        </div>
      )}
    </div>
  );
}

function AckPdfPanel({ ackId, hasPdf, email, onDelete }: { ackId: string; hasPdf: boolean; email: string; onDelete: () => void }) {
  const qc = useQueryClient();
  const getUrl = useServerFn(getCertificatePdfUrl);
  const regen = useServerFn(regenerateCertificatePdf);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"load" | "regen" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadUrl() {
    setBusy("load"); setErr(null);
    try {
      const r = await getUrl({ data: { id: ackId } });
      setUrl(r.url);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(null); }
  }

  async function regenerate() {
    setBusy("regen"); setErr(null);
    try {
      await regen({ data: { id: ackId } });
      qc.invalidateQueries({ queryKey: ["participations"] });
      const r = await getUrl({ data: { id: ackId } });
      setUrl(r.url);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(null); }
  }

  useEffect(() => {
    setUrl(null);
    if (hasPdf) loadUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ackId, hasPdf]);

  return (
    <div className="px-5 py-4 border-t border-neutral-200">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mr-auto">Signed NDA / Certificate PDF</p>
        {url && <a href={url} target="_blank" rel="noopener" className="border border-neutral-400 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] hover:bg-neutral-100">Open in new tab</a>}
        {url && <a href={url} download={`nda-${ackId}.pdf`} className="bg-neutral-900 text-white px-3 py-1.5 text-[11px] uppercase tracking-[0.15em]">Download</a>}
        <button onClick={regenerate} disabled={busy !== null} className="border border-neutral-400 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] hover:bg-neutral-100 disabled:opacity-50">{busy === "regen" ? "Regenerating…" : hasPdf ? "Regenerate" : "Generate PDF"}</button>
        <button onClick={() => navigator.clipboard.writeText(email)} className="border border-neutral-400 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] hover:bg-neutral-100">Copy email</button>
        <button onClick={onDelete} className="border border-red-300 text-red-700 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] hover:bg-red-50">Delete</button>
      </div>
      {err && <p className="mb-2 text-[12px] text-red-700">{err}</p>}
      {hasPdf ? (
        <PdfPreview url={url} height={620} />
      ) : (
        <div className="border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-[13px] text-neutral-600">
          No PDF on file for this participation.<br />
          <span className="text-[11px] text-neutral-500">Click <em>Generate PDF</em> above to render and store one now.</span>
        </div>
      )}
    </div>
  );
}

function SortTh({ label, k, sortKey, sortDir, onSort, className }: { label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void; className?: string }) {
  const active = sortKey === k;
  return (
    <th className={`px-3 py-2.5 font-medium ${className ?? ""}`}>
      <button onClick={() => onSort(k)} className={`inline-flex items-center gap-1 uppercase tracking-[0.12em] ${active ? "text-neutral-900" : "text-neutral-600 hover:text-neutral-900"}`}>
        {label}
        <span aria-hidden className={active ? "opacity-100" : "opacity-30"}>{active ? (sortDir === "asc" ? "▲" : "▼") : "▾"}</span>
      </button>
    </th>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: Ack[keyof Ack] | string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={`mt-0.5 break-words ${mono ? "font-mono text-[12px]" : ""} text-neutral-900`}>
        {value == null || value === "" ? <span className="text-neutral-400">—</span> : String(value)}
      </div>
    </div>
  );
}

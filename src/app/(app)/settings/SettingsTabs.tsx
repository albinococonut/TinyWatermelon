"use client";

import { useState, useTransition } from "react";
import {
  actionUpdateOrg, actionCreateBillingType, actionUpdateBillingType, actionDeleteBillingType,
  actionUpdateRates, actionUpdateSmartOffer, actionChangeRole, actionRevokeMember,
  actionCreateInvite, actionRevokeInvite,
  actionCreateServiceType, actionUpdateServiceType, actionDeleteServiceType,
} from "./actions";
import { ROLES, RoleLabel, type Role } from "@/lib/types";

// ─── Types matching what the server page passes ────────────────────────────────
interface OrgData { id: string; name: string; baseAddress: string | null; smartOffersEnabled: boolean; smartOfferDelayMin: number; lastMinuteTriggerHours: number; maxOfferRecipients: number; }
interface BillingType { id: string; label: string; defaultRatePerHour: number | null; includesTravel: boolean; active: boolean; color: string | null; }
interface RateSetting { discipline: string; gpPerHour: number; }
interface Member { id: string; membershipId: string; name: string | null; email: string; role: string; revokedAt: Date | null; isSelf: boolean; }
interface Invite { id: string; role: string; note: string | null; expiresAt: Date; claimedAt: Date | null; }
interface AuditEntry { id: string; action: string; resourceType: string; occurredAt: Date; }
interface ServiceTypeRow { id: string; code: string; label: string; active: boolean; nickname: string | null; }

// ─── Shared UI primitives ──────────────────────────────────────────────────────
const inputCls = "w-full rounded-lg border border-seed-200 bg-white px-3 py-2 text-[15px] outline-none transition focus:border-melon-400 focus:ring-2 focus:ring-melon-100";
const btnPrimary = "rounded-xl bg-melon-500 px-4 py-2 text-[14px] font-semibold text-white hover:bg-melon-600 disabled:opacity-50 transition";
const btnSecondary = "rounded-xl bg-white px-3 py-2 text-[14px] font-medium text-seed-700 ring-1 ring-seed-200 hover:bg-seed-100 transition";
const btnDanger = "rounded-xl bg-white px-3 py-2 text-[14px] font-medium text-melon-700 ring-1 ring-melon-200 hover:bg-melon-50 transition";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-seed-500">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[12px] text-seed-400">{hint}</div>}
    </label>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 text-[13.5px] font-semibold ${ok ? "bg-rind-50 text-rind-700" : "bg-melon-50 text-melon-700"}`}>
      {ok ? "✓ " : "⚠ "}{msg}
    </div>
  );
}

// ─── Tab: Org Profile ─────────────────────────────────────────────────────────
function OrgTab({ org }: { org: OrgData }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="font-display text-[20px] font-medium text-seed-900">Organization profile</h2>
      <form action={(fd) => start(async () => { const r = await actionUpdateOrg(fd); setMsg({ text: r.ok ? "Saved" : (r.error ?? "Error"), ok: r.ok }); })} className="space-y-4">
        <Field label="Organization name"><input name="name" className={inputCls} defaultValue={org.name} required /></Field>
        <Field label="Base address" hint="Default start location for providers. Used for commute calculations.">
          <input name="baseAddress" className={inputCls} defaultValue={org.baseAddress ?? ""} placeholder="4761 Cass Street, San Diego, CA 92109" />
        </Field>
        {msg && <Toast msg={msg.text} ok={msg.ok} />}
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : "Save changes"}</button>
      </form>
    </div>
  );
}

// ─── Tab: Billing Types ───────────────────────────────────────────────────────
const BILLING_COLORS = [
  { hex: "#FF6B9D", name: "Pink" },
  { hex: "#FFE135", name: "Yellow" },
  { hex: "#7ED321", name: "Green" },
  { hex: "#00BFFF", name: "Blue" },
  { hex: "#FF8C42", name: "Orange" },
  { hex: "#B24BF3", name: "Purple" },
];

function BillingTab({ types }: { types: BillingType[] }) {
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[20px] font-medium text-seed-900">Billing types</h2>
        <button onClick={() => setAdding(v => !v)} className={btnPrimary}>+ Add type</button>
      </div>

      {adding && (
        <form className="rounded-2xl border border-melon-100 bg-melon-50/40 p-5 space-y-3"
          action={(fd) => start(async () => { const r = await actionCreateBillingType(fd); if (r.ok) setAdding(false); setMsg(r.ok ? null : (r.error ?? "Error")); })}>
          <Field label="Label"><input name="label" className={inputCls} placeholder="e.g. San Diego Regional Center" required /></Field>
          <Field label="Color">
            <div className="flex gap-2">
              {BILLING_COLORS.map(c => (
                <label key={c.hex} title={c.name} className="cursor-pointer">
                  <input type="radio" name="color" value={c.hex} defaultChecked={c.hex === "#FF6B9D"} className="sr-only" />
                  <div className="h-8 w-8 rounded-full ring-2 ring-white ring-offset-2 hover:scale-110 transition"
                    style={{ backgroundColor: c.hex }} />
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default rate ($/hr)" hint="Leave blank to use service-type rate">
              <input name="defaultRatePerHour" type="number" min="0" step="5" className={inputCls} placeholder="155" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" name="includesTravel" className="h-4 w-4 rounded border-seed-300 text-melon-600" />
            Includes travel billing
          </label>
          {msg && <Toast msg={msg} ok={false} />}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : "Add"}</button>
            <button type="button" onClick={() => setAdding(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {types.map((bt) => (
          <li key={bt.id} className="rounded-2xl border border-seed-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: bt.color ?? "#6B7280" }} />
                  <span className="text-[15px] font-semibold text-seed-900">{bt.label}</span>
                  {bt.includesTravel && <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700">+ travel</span>}
                  {!bt.active && <span className="rounded-md bg-seed-100 px-1.5 py-0.5 text-[11px] font-semibold text-seed-500">inactive</span>}
                </div>
                <div className="mt-0.5 text-[13px] text-seed-500">
                  {bt.defaultRatePerHour ? `$${bt.defaultRatePerHour}/hr default` : "Uses service-type rate"}
                </div>
              </div>
              <button
                onClick={() => start(async () => { await actionDeleteBillingType(bt.id); })}
                disabled={pending}
                className={btnDanger}
              >Delete</button>
            </div>
          </li>
        ))}
        {types.length === 0 && <li className="text-[14px] text-seed-500">No billing types yet. Add one above.</li>}
      </ul>
    </div>
  );
}

// ─── Tab: Rates ───────────────────────────────────────────────────────────────
function RatesTab({ rates }: { rates: RateSetting[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const rateMap = Object.fromEntries(rates.map(r => [r.discipline, r.gpPerHour]));
  const disciplines = [
    { code: "OT", label: "Occupational Therapy" },
    { code: "PT", label: "Physical Therapy" },
    { code: "SLP", label: "Speech-Language" },
    { code: "MT", label: "Music Therapy" },
    { code: "ABA", label: "ABA Therapy" },
  ];
  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="font-display text-[20px] font-medium text-seed-900">Default Rate $/hr by Service</h2>
      <p className="text-[14px] text-seed-500">Used to calculate recoverable revenue. Billing type rates override these for specific families.</p>
      <form action={(fd) => start(async () => { const r = await actionUpdateRates(fd); setMsg({ text: r.ok ? "Rates saved" : "Error", ok: r.ok }); })} className="space-y-3">
        {disciplines.map(({ code, label }) => (
          <div key={code} className="flex items-center gap-3 rounded-xl border border-seed-200 bg-seed-50 px-4 py-3">
            <div className="w-8 shrink-0">
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold uppercase text-seed-700 ring-1 ring-seed-200">{code}</span>
            </div>
            <span className="flex-1 text-[14px] font-medium text-seed-800">{label}</span>
            <div className="flex items-center gap-1">
              <span className="text-[15px] text-seed-500">$</span>
              <input name={code} type="number" min="0" step="5" defaultValue={rateMap[code] ?? ""} placeholder="0"
                className="w-20 rounded-lg border border-seed-200 bg-white px-2 py-1 text-right text-[15px] tabular-nums focus:border-melon-400 focus:outline-none" />
              <span className="text-[13px] text-seed-400">/hr</span>
            </div>
          </div>
        ))}
        {msg && <Toast msg={msg.text} ok={msg.ok} />}
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : "Save rates"}</button>
      </form>
    </div>
  );
}

// ─── Tab: Smart Offer Config ──────────────────────────────────────────────────
function SmartOfferTab({ org }: { org: OrgData }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="font-display text-[20px] font-medium text-seed-900">Smart Family Offers</h2>
      <form action={(fd) => start(async () => { const r = await actionUpdateSmartOffer(fd); setMsg({ text: r.ok ? "Saved" : "Error", ok: r.ok }); })} className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-seed-50 px-4 py-3">
          <div>
            <div className="text-[14.5px] font-semibold text-seed-900">Smart Family Offers enabled</div>
            <div className="text-[12.5px] text-seed-500">Auto-text eligible families when a provider opening becomes available</div>
          </div>
          <input type="checkbox" name="enabled" defaultChecked={org.smartOffersEnabled}
            className="h-5 w-5 rounded border-seed-300 text-melon-600 focus:ring-melon-500" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Delay after cancellation (min)" hint="Wait before sending">
            <input name="delayMin" type="number" min="0" max="120" defaultValue={org.smartOfferDelayMin} className={inputCls} />
          </Field>
          <Field label="Last-minute trigger (hrs before)" hint="Urgent text mode">
            <input name="lastMinuteHours" type="number" min="0" max="24" step="0.5" defaultValue={org.lastMinuteTriggerHours} className={inputCls} />
          </Field>
          <Field label="Max families per offer">
            <input name="maxRecipients" type="number" min="1" max="30" defaultValue={org.maxOfferRecipients} className={inputCls} />
          </Field>
        </div>
        <div className="rounded-xl bg-rind-50 px-3 py-2 text-[12.5px] text-rind-700">
          🔒 HIPAA-safe: outbound texts contain no PHI — visit details revealed only behind the authenticated magic-link portal.
        </div>
        {msg && <Toast msg={msg.text} ok={msg.ok} />}
        <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : "Save"}</button>
      </form>
    </div>
  );
}

const DISCIPLINES_LIST = ["OT", "PT", "SLP", "MT", "ABA"] as const;

// ─── Tab: Users & Roles ───────────────────────────────────────────────────────
function UsersTab({ members, invites, currentRole }: { members: Member[]; invites: Invite[]; currentRole: Role }) {
  const [pending, start] = useTransition();
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("ADMIN");
  const [alsoProvider, setAlsoProvider] = useState(false);
  const [providerDiscipline, setProviderDiscipline] = useState<string>("OT");
  const [providerCredentials, setProviderCredentials] = useState("");
  const [providerTitle, setProviderTitle] = useState("");

  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const roleColors: Record<string, string> = {
    OWNER: "bg-amber-50 text-amber-800",
    ADMIN: "bg-melon-50 text-melon-700",
    PROVIDER: "bg-rind-50 text-rind-800",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[20px] font-medium text-seed-900">Users & roles</h2>
      </div>

      {/* HIPAA role explanation */}
      <div className="rounded-2xl border border-seed-200 bg-seed-50 p-4 text-[13px] text-seed-700 space-y-1.5">
        <div className="font-semibold text-seed-900 mb-2">HIPAA §164.308(a)(4) — Minimum necessary access</div>
        {ROLES.map(r => (
          <div key={r} className="flex items-baseline gap-3">
            <span className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold shrink-0 ${roleColors[r]}`}>{r}</span>
            <span>{
              r === "OWNER" ? "Full access. Manages billing, users, and org settings. Requires MFA." :
              r === "ADMIN" ? "Full clinical access — dashboard, queue, families, schedule, messages. Can invite staff. Requires MFA." :
              "Own day view and assigned families only. Minimum necessary access."
            }</span>
          </div>
        ))}
      </div>

      {/* Active members */}
      <div>
        <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-seed-500">Active members</div>
        <ul className="space-y-2">
          {members.filter(m => !m.revokedAt).map(m => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl border border-seed-200 bg-white px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="truncate text-[14.5px] font-semibold text-seed-900">{m.name ?? m.email}</div>
                {m.name && <div className="text-[12.5px] text-seed-500">{m.email}</div>}
              </div>
              {canManage && !m.isSelf ? (
                <select
                  defaultValue={m.role}
                  onChange={(e) => start(async () => { await actionChangeRole(m.membershipId, e.target.value); })}
                  disabled={pending}
                  className="rounded-lg border border-seed-200 bg-white px-2 py-1 text-[13px] focus:border-melon-400 focus:outline-none"
                >
                  {ROLES.filter(r => currentRole === "OWNER" || r !== "OWNER").map(r => (
                    <option key={r} value={r}>{RoleLabel[r]}</option>
                  ))}
                </select>
              ) : (
                <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${roleColors[m.role] ?? roleColors.PROVIDER}`}>
                  {RoleLabel[m.role as Role] ?? m.role}{m.isSelf ? " (you)" : ""}
                </span>
              )}
              {canManage && !m.isSelf && (
                <button onClick={() => start(async () => { await actionRevokeMember(m.membershipId); })}
                  disabled={pending} className={btnDanger}>Revoke</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Invite */}
      {canManage && (
        <div>
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-seed-500">Invite someone</div>
          <form
            action={(fd) => {
              // Inject alsoProvider fields into form data
              if (alsoProvider && selectedRole === "ADMIN") {
                fd.set("alsoProvider", "true");
                fd.set("discipline", providerDiscipline);
                fd.set("credentials", providerCredentials);
                fd.set("providerTitle", providerTitle);
              }
              start(async () => {
                const r = await actionCreateInvite(fd);
                if (r.ok && r.url) setInviteResult({ url: r.url });
              });
            }}
            className="rounded-2xl border border-seed-200 bg-seed-50 p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role for invitee">
                <select name="role" className={inputCls} value={selectedRole}
                  onChange={e => { setSelectedRole(e.target.value); if (e.target.value !== "ADMIN") setAlsoProvider(false); }}>
                  {ROLES.filter(r => currentRole === "OWNER" || r !== "OWNER").map(r => (
                    <option key={r} value={r}>{RoleLabel[r]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Note (optional)" hint="e.g. 'For Sarah, new OT'">
                <input name="note" className={inputCls} placeholder="Who is this for?" />
              </Field>
            </div>
            {selectedRole === "ADMIN" && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[14px] cursor-pointer">
                  <input type="checkbox" checked={alsoProvider} onChange={e => setAlsoProvider(e.target.checked)}
                    className="h-4 w-4 rounded border-seed-300 text-melon-600" />
                  <span className="font-medium text-seed-800">Also create a provider profile for this admin</span>
                </label>
                {alsoProvider && (
                  <div className="ml-6 grid grid-cols-3 gap-3">
                    <Field label="Discipline">
                      <select className={inputCls} value={providerDiscipline} onChange={e => setProviderDiscipline(e.target.value)}>
                        {DISCIPLINES_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </Field>
                    <Field label="Credentials (optional)">
                      <input className={inputCls} value={providerCredentials} onChange={e => setProviderCredentials(e.target.value)} placeholder="OTR/L, BCBA…" />
                    </Field>
                    <Field label="Title (optional)">
                      <input className={inputCls} value={providerTitle} onChange={e => setProviderTitle(e.target.value)} placeholder="Lead OT" />
                    </Field>
                  </div>
                )}
              </div>
            )}
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? "Generating…" : "Generate invite link"}
            </button>
            {inviteResult && (
              <div className="rounded-xl border border-rind-100 bg-rind-50 p-3 space-y-2">
                <div className="text-[12.5px] font-semibold text-rind-700">✓ Link ready — valid for 72 hours</div>
                <div className="flex items-center gap-2">
                  <input readOnly value={inviteResult.url}
                    className="flex-1 rounded-lg border border-rind-200 bg-white px-2 py-1.5 text-[13px] text-seed-800 font-mono" />
                  <button type="button" onClick={() => copy(inviteResult.url)}
                    className="rounded-lg bg-rind-500 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-rind-600">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="text-[11.5px] text-rind-700">Paste this anywhere — Slack, email, text. No email sending required.</div>
              </div>
            )}
          </form>

          {/* Pending invites */}
          {invites.filter(i => !i.claimedAt && i.expiresAt > new Date()).length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-seed-500">Open invites</div>
              <ul className="space-y-1.5">
                {invites.filter(i => !i.claimedAt && i.expiresAt > new Date()).map(i => (
                  <li key={i.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-seed-200 text-[13.5px]">
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${roleColors[i.role] ?? ""}`}>
                      {RoleLabel[i.role as Role] ?? i.role}
                    </span>
                    <span className="flex-1 text-seed-700">{i.note ?? "No note"}</span>
                    <span className="text-[12px] text-seed-400">
                      Expires {new Date(i.expiresAt).toLocaleDateString()}
                    </span>
                    <button onClick={() => start(async () => { await actionRevokeInvite(i.id); })}
                      disabled={pending} className="text-[12px] text-melon-600 hover:text-melon-800">Revoke</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Audit Log ───────────────────────────────────────────────────────────
function AuditTab({ entries }: { entries: AuditEntry[] }) {
  const ACTION_COLOR: Record<string, string> = {
    READ: "bg-seed-100 text-seed-700",
    CREATE: "bg-rind-50 text-rind-700",
    UPDATE: "bg-sky-50 text-sky-700",
    DELETE: "bg-melon-50 text-melon-700",
    LOGIN: "bg-amber-50 text-amber-700",
    LOGOUT: "bg-seed-100 text-seed-700",
    SEND_SMS: "bg-emerald-50 text-emerald-700",
    SEND_EMAIL: "bg-emerald-50 text-emerald-700",
    EXPORT: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[20px] font-medium text-seed-900">Audit log</h2>
        <span className="text-[12px] text-seed-500">HIPAA §164.312(b) · retained 6 years · append-only</span>
      </div>
      <div className="rounded-2xl border border-seed-200 bg-white overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-6 text-center text-[14px] text-seed-500">No audit events yet.</div>
        ) : (
          <ul className="divide-y divide-seed-100">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${ACTION_COLOR[e.action] ?? ACTION_COLOR.READ}`}>
                  {e.action}
                </span>
                <span className="flex-1 text-[13.5px] text-seed-800">{e.resourceType}</span>
                <span className="text-[12px] tabular-nums text-seed-400">
                  {new Date(e.occurredAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Service Types ───────────────────────────────────────────────────────
function ServiceTypeRowItem({ st }: { st: ServiceTypeRow }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(st.label);

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-seed-200 bg-white p-4">
      <span className="rounded-md bg-seed-100 px-2 py-0.5 text-[12px] font-bold text-seed-700 font-mono">{st.nickname || st.code}</span>
      {editing ? (
        <input value={label} onChange={e => setLabel(e.target.value)}
          className="flex-1 rounded-lg border border-melon-300 bg-white px-2 py-1 text-[14px] focus:outline-none"
          onBlur={() => start(async () => {
            await actionUpdateServiceType(st.id, { label });
            setEditing(false);
          })}
          onKeyDown={e => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          autoFocus
        />
      ) : (
        <button onClick={() => setEditing(true)} className="flex-1 text-left text-[15px] font-semibold text-seed-900 hover:text-melon-600">
          {st.label} <span className="text-[11px] text-seed-400 font-normal">(click to rename)</span>
        </button>
      )}
      <button
        onClick={() => start(async () => { await actionUpdateServiceType(st.id, { active: !st.active }); })}
        disabled={pending}
        className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition ${st.active ? "bg-rind-50 text-rind-700 hover:bg-rind-100" : "bg-seed-100 text-seed-500 hover:bg-seed-200"}`}
      >
        {st.active ? "Active" : "Inactive"}
      </button>
      <button
        onClick={() => start(async () => { await actionDeleteServiceType(st.id); })}
        disabled={pending}
        className="rounded-md px-2 py-1 text-[12px] font-semibold text-melon-600 hover:bg-melon-50 transition"
      >
        Delete
      </button>
    </li>
  );
}

function ServiceTypesTab({ types }: { types: ServiceTypeRow[] }) {
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[20px] font-medium text-seed-900">Service types</h2>
        <button onClick={() => setAdding(v => !v)} className={btnPrimary}>+ Add type</button>
      </div>

      {adding && (
        <form className="rounded-2xl border border-melon-100 bg-melon-50/40 p-5 space-y-3"
          action={(fd) => start(async () => {
            const r = await actionCreateServiceType(fd);
            if (r.ok) setAdding(false);
            setMsg(r.ok ? null : (r.error ?? "Error"));
          })}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code (e.g. OT, SLP)" hint="Short identifier used internally">
              <input name="code" className={inputCls} placeholder="OT" maxLength={10} required />
            </Field>
            <Field label="Display label">
              <input name="label" className={inputCls} placeholder="Occupational Therapy" required />
            </Field>
          </div>
          <Field label="Nickname (2-3 chars)" hint="Short code shown in the UI, e.g. OT, SLP">
            <input name="nickname" className={inputCls} placeholder="OT" maxLength={4} style={{ width: "5rem" }} />
          </Field>
          {msg && <Toast msg={msg} ok={false} />}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Adding…" : "Add"}</button>
            <button type="button" onClick={() => setAdding(false)} className={btnSecondary}>Cancel</button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {types.map(st => (
          <ServiceTypeRowItem key={st.id} st={st} />
        ))}
        {types.length === 0 && <li className="text-[14px] text-seed-500">No service types yet.</li>}
      </ul>

      <p className="text-[12px] text-seed-500">
        Deactivating a service type hides it from new family setup but preserves existing appointment data.
      </p>
    </div>
  );
}

// ─── Main tabbed component ─────────────────────────────────────────────────────
const TABS = [
  { id: "org",            label: "Organization" },
  { id: "billing",        label: "Billing types" },
  { id: "rates",          label: "Rates" },
  { id: "service-types",  label: "Service Types" },
  { id: "offers",         label: "Smart Offers" },
  { id: "users",          label: "Users & Roles" },
  { id: "audit",          label: "Audit log" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function SettingsTabs({
  org, billingTypes, rates, members, invites, auditLog, currentRole, serviceTypes,
}: {
  org: OrgData;
  billingTypes: BillingType[];
  rates: RateSetting[];
  members: Member[];
  invites: Invite[];
  auditLog: AuditEntry[];
  currentRole: Role;
  serviceTypes: ServiceTypeRow[];
}) {
  const [tab, setTab] = useState<TabId>("org");
  const isAdmin = currentRole === "OWNER" || currentRole === "ADMIN";

  return (
    <div>
      {/* Tab pills */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-seed-200 pb-0">
        {TABS.filter(t => isAdmin || t.id === "audit").map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative px-4 py-2.5 text-[14px] font-medium transition ${tab === t.id ? "text-seed-900" : "text-seed-500 hover:text-seed-700"}`}>
            {t.label}
            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-melon-500" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "org"           && <OrgTab org={org} />}
      {tab === "billing"       && <BillingTab types={billingTypes} />}
      {tab === "rates"         && <RatesTab rates={rates} />}
      {tab === "service-types" && <ServiceTypesTab types={serviceTypes} />}
      {tab === "offers"        && <SmartOfferTab org={org} />}
      {tab === "users"         && <UsersTab members={members} invites={invites} currentRole={currentRole} />}
      {tab === "audit"         && <AuditTab entries={auditLog} />}
    </div>
  );
}

# Phase 1 — First paying customer

Running checklist. Goal: one real customer, signed BAA, real money. ~12 weeks realistic.

## ✅ Done

- [x] Scaffold Next.js + Tailwind app at `~/Desktop/Watermelon HIPAA App/`
- [x] Prisma schema — multi-tenant from day 1, every PHI table has `organizationId`
- [x] NextAuth magic-link auth (Nodemailer; dev console, prod SES)
- [x] Edge middleware protecting `/dashboard`, `/me`, `/settings`, `/app`, `/api/v1`
- [x] RBAC via `requireSession()` with Role enforcement
- [x] MFA enrollment gate for OWNER/ADMIN roles (placeholder UI)
- [x] AuditLog model + helper firing on every login, logout, and PHI-context read
- [x] Session timeouts: 15-min idle, 24-hour absolute
- [x] HIPAA-relevant security headers in `next.config.js` (HSTS, X-Frame-Options, etc.)
- [x] Deployed as separate Vercel project (https://watermelon-app-delta.vercel.app)
- [x] Demo project completely untouched

## 🟨 In progress / this week

- [ ] Provision Neon Postgres (see `docs/neon-setup.md`)
- [ ] Self-serve AWS BAA via Artifact (covers SES, S3, etc.)
- [ ] Request Neon BAA (after on Scale plan)
- [ ] Request Vercel Pro BAA
- [ ] Engage healthcare-startup lawyer for BAA template + ToS + Privacy Policy (see `docs/baa-outreach.md`)
- [ ] Buy a domain (e.g. `watermelon.app` — already taken per user note; alternatives: `wmln.app`, `watermelon-rx.com`, `getwatermelon.com`)

## 🟦 Phase 1 remaining engineering

- [ ] Swap Prisma datasource from SQLite to Postgres (after Neon is up)
- [ ] Convert app-level string enums to native Postgres enums
- [ ] Real TOTP MFA enrollment flow (`/mfa-setup`)
- [ ] Port matching/revenue/commute engines from demo into `src/lib/` (use the demo code as reference)
- [ ] Port the actual operational UI:
  - [ ] Visit Recovery Dashboard (`/dashboard`)
  - [ ] Visit Recovery Queue (`/marketplace`)
  - [ ] Providers (`/providers`)
  - [ ] Families & Children (`/families`)
  - [ ] Provider Day View (`/me`)
  - [ ] Family Messages (`/messages`)
  - [ ] Settings (`/settings`)
- [ ] CSV import wizard for onboarding the first customer's existing data
- [ ] Family magic-link portal at `wmln.app/o/:token` — what families land on when they tap the SMS link
- [ ] Real Twilio integration (standard account, no BAA needed — see `docs/baa-outreach.md` for rationale)
- [ ] Real Amazon SES sending (replace console transport in auth.ts)
- [ ] Inbound SMS webhook handler (Twilio → /api/v1/twilio/inbound)

## 🟪 Compliance documentation (non-code, all required before taking PHI)

- [ ] HIPAA Security Risk Analysis — use the free [HHS SRA Tool](https://www.healthit.gov/topic/privacy-security-and-hipaa/security-risk-assessment-tool)
- [ ] Written Information Security Policy (templates from Compliancy Group, $300)
- [ ] Workforce Sanction Policy
- [ ] Incident Response Plan (60-day breach notification process)
- [ ] Contingency Plan (DR runbook — what happens if Neon goes down)
- [ ] Workforce HIPAA training (annual; track in Vanta or spreadsheet)
- [ ] Named **Security Officer** + **Privacy Officer** (can be same person at this stage)
- [ ] Vendor risk assessment — keep a register of every vendor + BAA status

## 🟧 Go-to-market

- [ ] Sign a Letter of Intent with Includ(Ed) or first pilot customer
- [ ] Onboarding playbook (2-hour kickoff meeting agenda)
- [ ] First-week customer success check-in cadence
- [ ] Recovery Guarantee policy doc ("if you don't recover 3× fees in 90 days, refund")
- [ ] Pricing page on marketing site (use the Solo/Team/Practice tiers we discussed)
- [ ] Sales pipeline tool (HubSpot free is fine to start)

---

## What blocks "first paying customer can use this with real PHI today":

1. ✅ Code foundation built
2. ⏳ Neon Postgres provisioned + DATABASE_URL swapped
3. ⏳ All vendor BAAs signed (~2-4 weeks)
4. ⏳ Lawyer documents signed (~2-3 weeks)
5. ⏳ HIPAA Security Risk Analysis completed
6. ⏳ Operational UI ported from demo (~3-4 weeks of focused dev)
7. ⏳ Real SES + Twilio integrations
8. ⏳ Magic-link family portal functional
9. ⏳ MFA enrollment flow done
10. ⏳ Pilot customer signed BAA

**Realistic timeline: 8-12 weeks from today to a customer using it with real PHI.**

Engineering is the easy part. Vendor and legal paperwork is the long pole.

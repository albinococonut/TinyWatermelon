# BAA outreach — vendor email templates

Send these this week. BAA processes typically take 5–15 business days each. Start the clocks in parallel.

---

## Universal template (substitute the vendor name)

```
Subject: Business Associate Agreement request — Watermelon (HIPAA-eligible workload)

Hi [Vendor] team,

I'm setting up a new pediatric-therapy SaaS product, Watermelon. We help provider organizations recover cancelled therapy visits and coordinate with families.

We process Protected Health Information (PHI) and need to sign a Business Associate Agreement before going live. We're currently on the [Plan name] plan.

Could you send over your standard BAA, or let me know the steps to get one signed? If there's a sales contact who handles HIPAA accounts, happy to be introduced.

For context:
- Org: [Your legal entity name]
- Workload: low-volume during pilot (1 customer, ~20 staff users, ~500 records)
- Expected scale 12 months out: 10-30 customer organizations
- Production launch target: [date]

Thanks,
[Your name]
[Your title]
[Your email]
```

---

## Per-vendor specifics

### Neon (Postgres)

- **Email:** `legal@neon.tech` (or open a support ticket from the dashboard)
- **Plan required:** Scale (~$69/mo)
- **Notes:** Self-serve onboarding to Scale via dashboard; BAA is a separate document. Sign Scale plan first, then request BAA. Mention you're a Vercel customer if applicable.

### Vercel (Hosting)

- **Email:** `enterprise@vercel.com` (or use the in-product "Contact sales")
- **Plan required:** Pro plan ($20/seat/mo) — Pro signs a BAA for hosted workloads
- **Notes:** Mention you're already on Pro. Their BAA covers compute, edge functions, hosting; it does NOT cover their analytics product (disable that if storing PHI in URLs).

### Amazon Web Services (for SES)

- **Process:** AWS BAA is self-service via the AWS Artifact console (no email needed)
  1. Sign in to AWS Console as account root
  2. Search "Artifact" → AWS Artifact
  3. **Agreements** tab → **BAA** → **Accept**
  4. The BAA covers all HIPAA-eligible services including SES, S3, CloudWatch, etc.
- **Notes:** Free, instant. No business plan required. Make sure SES is in a HIPAA-eligible region (us-east-1, us-west-2 are fine).

### Sentry (errors — defer to month 6 per our plan)

- **Email:** `sales@sentry.io`
- **Plan required:** Business plan + HIPAA add-on (~$80–100/mo extra)
- **Skip for now** — Vercel function logs cover error visibility for Phase 1.

### GitHub (code repo)

- **Email:** GitHub sales via https://github.com/enterprise/contact
- **Plan required:** GitHub Enterprise Cloud with **Enterprise Managed Users (EMU)** — ~$21/user/mo
- **Notes:** Only needed if you'll store PHI in the repo (you won't — config + code only). For most BAs, GitHub Team is sufficient and BAA isn't required because no PHI hits the platform. **Verify with your lawyer before committing to Enterprise pricing.**

### Twilio (SMS) — NO BAA needed

- **Why not:** Our SMS bodies are PHI-free by design (see `src/lib/sms.ts` once ported from demo). Twilio's wire only carries a generic "make-up appointment available" notification + a magic-link URL.
- **Action:** Set Twilio account-level **message body retention to 0 days** in account settings so they don't log PHI families might self-disclose in replies.
- **Document this decision** in your risk assessment with that exact rationale.

### Cloudflare (CDN — optional)

- **Skip for now.** Vercel's built-in CDN is sufficient. Revisit when you're at multi-region scale.

---

## Legal counsel outreach

You also need a lawyer for three deliverables:
1. Master BAA template you'll sign WITH your customers (you're the BA, they're the CE)
2. Terms of Service for the platform
3. Privacy Policy (HIPAA-aware)

### Template email

```
Subject: HIPAA BA setup — small SaaS, three deliverables

Hi [Name],

I'm launching a SaaS product called Watermelon — visit recovery and scheduling for pediatric therapy organizations. We act as a Business Associate to our customers (who are covered entities).

I need three documents:

1. A Business Associate Agreement template I can sign with each customer organization
2. Terms of Service (B2B SaaS — annual contracts, no consumer-facing flow)
3. A Privacy Policy that acknowledges our BA role and minimum-necessary handling

Stack context: we run on Vercel (hosting), Neon (Postgres), AWS SES (email), Twilio (PHI-free SMS only). We've signed BAAs with all upstream vendors that touch PHI.

Could you quote your fee and turnaround? Targeting first paying customer in ~10 weeks.

Thanks,
[Your name]
```

### Lawyers worth reaching out to

- **Cooley Go** (https://cooleygo.com) — startup-friendly, big firm, healthcare experience
- **Wilson Sonsini** — similar tier, healthcare practice
- **Tarter Krinsky & Drogin** — NYC boutique, healthcare-startup focused, cheaper than top-tier firms
- **Local recommendation** — ask your most-trusted founder friend who also runs a healthcare SaaS

Expect $3–8k all-in for those three deliverables.

---

## Send these by [date 3 days from now]

| Vendor | Owner | Sent date |
|---|---|---|
| Neon | [you] | |
| Vercel | [you] | |
| AWS Artifact BAA | [you] | (self-serve, do this today) |
| Twilio account settings | [you] | (in-product setting) |
| Lawyer | [you] | |
| Sentry — skip | n/a | n/a |
| GitHub Enterprise — skip | n/a | n/a |

Update this checklist as replies come in.

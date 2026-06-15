# Neon Postgres setup — local + Vercel

End state: Watermelon HIPAA app uses Neon Postgres for both local dev and Vercel production, with a signed BAA on the production project.

---

## 0 · Why Neon (vs alternatives)

- **Signs a BAA** on the Scale plan ($69/mo + usage)
- **Free tier** for dev: 0.5 GB storage, generous compute
- **DB branching** built in — staging mirrors prod schema, never copies PHI
- **Point-in-time recovery** up to 7 days
- **Serverless-friendly** — auto-scales connections, no pgbouncer setup
- Pure Postgres — Prisma works unchanged

Alternatives if you'd rather: Supabase (also signs BAA), AWS RDS (cheaper at scale but more setup), Vercel Postgres (now Neon under the hood anyway).

---

## 1 · Create the account and project (~3 min)

1. Sign up at **https://neon.tech** (use the email that will own the company account — e.g. `founder@includ-ed.example.com`)
2. Create a project:
   - **Name:** `watermelon`
   - **Postgres version:** 16 (latest)
   - **Region:** US West (Oregon) — closest to Vercel's default
3. After creation you'll land on a project dashboard with a "Connection details" panel. Note the connection string. Format:
   ```
   postgresql://USER:PASSWORD@HOST/DB?sslmode=require
   ```

## 2 · Create a `dev` branch and a `production` branch

Neon's default project starts on the `main` branch. We treat `main` as production and create a `dev` branch:

1. In the Neon dashboard → **Branches** → **Create branch**
2. **Name:** `dev`
3. **Parent:** `main`
4. Copy the connection string for the `dev` branch — that goes in your local `.env`

You now have two isolated databases sharing zero rows. Production PHI never leaks into dev.

## 3 · Wire it up locally

Update `~/Desktop/Watermelon HIPAA App/.env`:

```bash
# Swap from SQLite to Neon dev branch
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-dev.us-west-2.aws.neon.tech/watermelon?sslmode=require"
```

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // was: "sqlite"
  url      = env("DATABASE_URL")
}
```

Reset the local DB to recreate everything against Postgres:

```bash
cd "~/Desktop/Watermelon HIPAA App"
rm prisma/migrations/*    # SQLite migrations don't translate cleanly
npm run db:migrate -- --name init_postgres
npm run db:seed
```

Verify:

```bash
npm run db:studio   # opens at localhost:5555
# you should see Organization, User, Membership tables w/ seeded rows
```

## 4 · Convert enums back to native Postgres enums (optional, recommended)

In the SQLite phase we stored enum values as strings. Postgres supports native enums and they're better (constraints enforced at DB level). To convert:

1. Edit `prisma/schema.prisma` — re-add `enum Role { OWNER ADMIN ... }` blocks, change `role String` to `role Role`, etc.
2. `npm run db:migrate -- --name native_enums`

This is optional. Strings work fine; enums add safety.

## 5 · Vercel: add the production connection string

1. In Vercel → `watermelon-app` project → **Settings** → **Environment Variables**
2. Add these for **Production** environment:

| Name | Value |
|---|---|
| `DATABASE_URL` | Connection string for Neon `main` branch (NOT `dev`) |
| `AUTH_SECRET` | Generated with `openssl rand -base64 32` |
| `AUTH_URL` | `https://watermelon-app-delta.vercel.app` (or your custom domain when set) |
| `EMAIL_TRANSPORT` | `ses` (once SES is set up) — keep `console` to disable real sends |
| `EMAIL_FROM` | `Watermelon <noreply@yourdomain.com>` |
| `SES_SMTP_HOST` | `email-smtp.us-west-2.amazonaws.com` (or your region) |
| `SES_SMTP_PORT` | `587` |
| `SES_SMTP_USER` | SES SMTP username (from SES Console → Account → SMTP credentials) |
| `SES_SMTP_PASS` | SES SMTP password |

Also add `DATABASE_URL` to **Preview** environment pointing at the Neon `dev` branch so PR previews don't touch production.

3. Trigger a redeploy: `vercel --prod` from the project directory (or push to main if connected to git)

## 6 · Request the Neon BAA

Once you're on a paid Scale plan:

1. Email Neon at **legal@neon.tech** or use the support portal
2. Subject: `BAA request for HIPAA-eligible Postgres workload`
3. Body template — see `docs/baa-outreach.md`

Typically signed within 5–10 business days. Once signed, you're cleared to put real PHI into the production branch.

## 7 · Lock down access

- Enable **2FA** on the Neon root account
- **Don't** share the database password — Neon supports passwordless connection via the SDK, and Prisma rotates connections automatically
- Enable **IP allowlisting** on the production project (Settings → IP Allow) — add Vercel's outbound IPs + your office
- **Backups**: Neon's point-in-time recovery is on by default. Verify the retention window is set to 7 days on the production project.

## 8 · Monitor

Neon has a metrics tab — keep an eye on:
- Connection count (should hover under 50; if it spikes, increase Prisma's connection pool)
- Query latency p99
- Storage growth (audit log will be the biggest table over time)

Set up an alert in Neon: storage > 80% of plan → email you.

---

## What happens after this is done

Once `DATABASE_URL` points at Neon prod and you redeploy:

- `/login` will stop showing "coming soon" and become functional
- The seed Owner user gets created in Neon — they can sign in via magic link (once SES is also wired)
- Audit log starts persisting real entries
- You can invite real teammates via Vercel-deployed signup

You're then technically able to take PHI — but **don't** until all BAAs are signed and a HIPAA risk assessment has been completed (see `docs/phase-1-checklist.md`).

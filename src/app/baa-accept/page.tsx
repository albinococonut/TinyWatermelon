import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { acceptBaa } from "./actions";

export default async function BaaAcceptPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, acceptedAt: { not: null }, revokedAt: null },
    select: { organization: { select: { name: true, baaSignedAt: true } } },
    orderBy: { invitedAt: "desc" },
  });

  if (!membership) redirect("/onboarding");
  if (membership.organization?.baaSignedAt) redirect("/dashboard");

  const orgName = membership.organization?.name ?? "your organization";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <img src="/logo-long.png" alt="tiny watermelon" className="h-10 w-auto" />

      <div className="mt-8 rounded-3xl border border-seed-200 bg-white shadow-card">
        <div className="border-b border-seed-100 px-8 py-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-melon-50 px-3 py-1 text-[12px] font-semibold uppercase tracking-wider text-melon-700">
            Required before accessing patient data
          </div>
          <h1 className="font-display mt-3 text-[26px] font-medium text-seed-900">
            Business Associate Agreement
          </h1>
          <p className="mt-1 text-[14.5px] text-seed-600">
            HIPAA requires <strong>{orgName}</strong> to sign this agreement before storing or accessing protected health information in Watermelon.
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-8 py-6 text-[13.5px] leading-relaxed text-seed-700">
          <p className="font-semibold text-seed-900">WATERMELON BUSINESS ASSOCIATE AGREEMENT</p>
          <p className="mt-3">This Business Associate Agreement (&ldquo;BAA&rdquo;) is entered into between Tiny Watermelon, LLC, a New Mexico limited liability company (&ldquo;Business Associate&rdquo;), and the therapy organization accepting this Agreement (&ldquo;Covered Entity&rdquo;).</p>

          <Section title="1. PURPOSE">
            <p>Covered Entity is a healthcare provider or healthcare organization subject to the Health Insurance Portability and Accountability Act of 1996 (&ldquo;HIPAA&rdquo;).</p>
            <p className="mt-2">Business Associate provides the Watermelon software platform and may receive, create, maintain, transmit, or process Protected Health Information (&ldquo;PHI&rdquo;) on behalf of Covered Entity.</p>
            <p className="mt-2">This Agreement governs Business Associate&rsquo;s use and protection of PHI.</p>
          </Section>

          <Section title="2. DEFINITIONS">
            <p>Terms not otherwise defined herein shall have the meanings assigned under HIPAA, HITECH, and applicable regulations.</p>
          </Section>

          <Section title="3. PERMITTED USES AND DISCLOSURES">
            <p>Business Associate may use and disclose PHI only:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>To provide the Watermelon platform and related services;</li>
              <li>To perform obligations under agreements with Covered Entity;</li>
              <li>As required by law;</li>
              <li>For proper management and administration of Business Associate, provided such use complies with HIPAA.</li>
            </ul>
            <p className="mt-2">Business Associate shall not use or disclose PHI in any manner that would violate HIPAA if done by Covered Entity.</p>
          </Section>

          <Section title="4. SAFEGUARDS">
            <p>Business Associate shall implement reasonable and appropriate administrative, technical, and physical safeguards to protect PHI.</p>
            <p className="mt-2">Safeguards include:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Encryption of data in transit using TLS</li>
              <li>Role-based access controls</li>
              <li>Multi-factor authentication</li>
              <li>Audit logging</li>
              <li>Session timeouts</li>
              <li>Encrypted storage of authentication secrets</li>
            </ul>
          </Section>

          <Section title="5. SUBCONTRACTORS">
            <p>Business Associate may engage subcontractors that have access to PHI. Business Associate shall ensure such subcontractors agree to restrictions and conditions at least as protective as those contained herein.</p>
            <p className="mt-2">Current subcontractors include: Amazon Web Services, Neon.</p>
          </Section>

          <Section title="6. REPORTING">
            <p>Business Associate shall report to Covered Entity any use or disclosure of PHI not permitted by this Agreement. Business Associate shall notify Covered Entity of any Security Incident or Breach involving unsecured PHI without unreasonable delay after discovery.</p>
          </Section>

          <Section title="7. ACCESS">
            <p>To the extent required by HIPAA, Business Associate shall make PHI available to Covered Entity so Covered Entity may fulfill its obligations regarding access requests.</p>
          </Section>

          <Section title="8. AMENDMENT">
            <p>Business Associate shall make reasonable efforts to amend PHI as directed by Covered Entity when required by HIPAA.</p>
          </Section>

          <Section title="9. ACCOUNTING OF DISCLOSURES">
            <p>Business Associate shall maintain information necessary for Covered Entity to respond to accounting requests as required by HIPAA.</p>
          </Section>

          <Section title="10. AVAILABILITY OF RECORDS">
            <p>Business Associate shall make its internal practices, books, and records relating to PHI available to the Secretary of Health and Human Services as required by law.</p>
          </Section>

          <Section title="11. TERM">
            <p>This Agreement shall become effective upon acceptance by Covered Entity and shall remain in effect until terminated.</p>
          </Section>

          <Section title="12. TERMINATION">
            <p>Covered Entity may terminate this Agreement if Business Associate materially breaches its obligations and fails to cure such breach within a reasonable period.</p>
          </Section>

          <Section title="13. RETURN OR DESTRUCTION OF PHI">
            <p>Upon termination of services, Business Associate shall delete PHI in its possession, except where retention is required by law or exists within standard system backups. Backup data shall continue to be protected in accordance with this Agreement until deletion through normal retention processes.</p>
          </Section>

          <Section title="14. OWNERSHIP OF DATA">
            <p>Covered Entity retains ownership of all PHI and customer data. Business Associate receives only the limited rights necessary to provide services.</p>
          </Section>

          <Section title="15. ELECTRONIC ACCEPTANCE">
            <p>Covered Entity may accept this Agreement electronically. Business Associate shall maintain records of acceptance including timestamp, user identifier, IP address, and agreement version.</p>
          </Section>

          <Section title="16. GOVERNING LAW">
            <p>This Agreement shall be governed by applicable federal HIPAA requirements and, to the extent not preempted, the laws of the State of New Mexico.</p>
            <p className="mt-3 text-seed-500">Tiny Watermelon, LLC · 13307 Cedarbrook Ave NE · Albuquerque, NM 87111</p>
          </Section>
        </div>

        <form action={acceptBaa} className="border-t border-seed-100 px-8 py-6 space-y-4">
          <div>
            <label className="block text-[12.5px] font-semibold uppercase tracking-wider text-seed-500">
              Your full name (authorized representative of {orgName})
            </label>
            <input
              type="text"
              name="signerName"
              required
              placeholder="Jane Smith"
              className="mt-1.5 w-full rounded-xl border border-seed-200 bg-seed-50 px-3.5 py-3 text-[15px] text-seed-900 placeholder:text-seed-400 focus:border-melon-400 focus:outline-none focus:ring-2 focus:ring-melon-200"
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="agreed" required className="mt-0.5 h-4 w-4 rounded border-seed-300 accent-melon-500" />
            <span className="text-[13.5px] text-seed-700">
              I have read this Business Associate Agreement and, as an authorized representative of <strong>{orgName}</strong>, I agree to its terms on behalf of the organization.
            </span>
          </label>
          <button
            type="submit"
            className="bg-melon-button w-full rounded-xl px-4 py-3 text-[15px] font-semibold text-white shadow-lift"
          >
            Accept Business Associate Agreement
          </button>
          <p className="text-center text-[11.5px] text-seed-400">
            Agreement version 2026-06-15 · Your acceptance is recorded with a timestamp and IP address per §15 above.
          </p>
        </form>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="font-semibold text-seed-900">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

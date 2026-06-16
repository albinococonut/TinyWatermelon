import Link from "next/link";

export const metadata = { title: "Privacy Policy · Watermelon" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-seed-50">
      <header className="border-b border-seed-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/">
            <img src="/logo-long.png" alt="tiny watermelon" className="h-8 w-auto" />
          </Link>
          <Link href="/login" className="text-[13px] font-medium text-seed-500 hover:text-seed-700">
            Sign in →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-seed-200 bg-white px-8 py-10 shadow-card">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-melon-600">Legal</p>
          <h1 className="font-display mt-2 text-[32px] font-medium text-seed-900">Privacy Policy</h1>
          <p className="mt-1 text-[14px] text-seed-500">Last Updated: June 15, 2026</p>

          <p className="mt-6 text-[15px] leading-relaxed text-seed-700">
            Tiny Watermelon, LLC (&ldquo;Tiny Watermelon,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) respects your privacy and is committed to protecting personal information entrusted to us. This Privacy Policy explains how information is collected, used, disclosed, stored, and protected when using the Watermelon platform and related services.
          </p>

          <DocSection title="1. Company Information">
            <p>Tiny Watermelon, LLC<br />13307 Cedarbrook Ave NE<br />Albuquerque, NM 87111</p>
            <p className="mt-2">Email: hi@tinywatermelon.com<br />Website: https://tinywatermelon.com</p>
          </DocSection>

          <DocSection title="2. Scope">
            <p>This Privacy Policy applies to the Watermelon software platform, customer organizations, authorized users, providers using the platform, parents and guardians receiving appointment offers, and website visitors. This Privacy Policy does not apply to third-party websites or services.</p>
          </DocSection>

          <DocSection title="3. HIPAA Notice">
            <p>Watermelon serves healthcare and therapy organizations. When Tiny Watermelon receives, stores, transmits, or processes Protected Health Information (&ldquo;PHI&rdquo;) on behalf of a healthcare organization, Tiny Watermelon acts as a Business Associate under HIPAA.</p>
            <p className="mt-2">In those situations, use and disclosure of PHI is governed by applicable law, HIPAA, and the applicable Business Associate Agreement. If a conflict exists between this Privacy Policy and HIPAA requirements, HIPAA controls.</p>
          </DocSection>

          <DocSection title="4. Information We Collect">
            <Subsection title="A. Customer Information">
              Organization name, contact names, email addresses, phone numbers, user roles, and authentication information.
            </Subsection>
            <Subsection title="B. Patient and Family Information">
              Customer organizations may store child names, parent or guardian names, addresses, contact information, appointment information, service authorization information, and scheduling information.
            </Subsection>
            <Subsection title="C. Provider Information">
              Provider names, disciplines, availability, schedule information, service regions, and commute zones.
            </Subsection>
            <Subsection title="D. Technical Information">
              IP addresses, browser information, device information, session information, authentication status, and audit log records.
            </Subsection>
          </DocSection>

          <DocSection title="5. Information We Do Not Collect">
            <p>Watermelon is not intended to collect or store credit card information, payment card data, clinical notes, diagnoses, treatment records, therapy session notes, or insurance billing records. If such information is inadvertently uploaded, customers should contact us immediately.</p>
          </DocSection>

          <DocSection title="6. How We Use Information">
            <p>We use information to provide services, authenticate users, manage schedules, send appointment offers, deliver transactional communications, maintain security, monitor system performance, maintain audit records, and comply with legal obligations.</p>
            <p className="mt-2 font-medium text-seed-900">We do not sell personal information.</p>
          </DocSection>

          <DocSection title="7. Email and Communications">
            <p>Watermelon sends transactional communications only — magic link authentication emails, appointment notifications, service-related notices, and administrative notices. We do not send marketing emails through the platform. Platform emails may be sent from noreply@tinywatermelon.com.</p>
          </DocSection>

          <DocSection title="8. Authentication">
            <p>Watermelon uses passwordless authentication. Administrative and provider users may be required to complete multi-factor authentication using an authenticator application. Authentication information may include magic-link tokens, MFA verification status, session identifiers, and security logs.</p>
          </DocSection>

          <DocSection title="9. Information Sharing">
            <Subsection title="A. With Service Providers">
              We use service providers that support operation of the platform: Amazon Web Services (hosting, email delivery, and infrastructure), Neon (database services), and Cloudflare (DNS services). These providers may receive information necessary to perform services on our behalf.
            </Subsection>
            <Subsection title="B. With Customer Organizations">
              Information entered into Watermelon is accessible to authorized personnel of the applicable customer organization.
            </Subsection>
            <Subsection title="C. Legal Requirements">
              We may disclose information when required by law, court order, subpoena, or governmental request.
            </Subsection>
            <Subsection title="D. Business Transfers">
              Information may be transferred in connection with a merger, acquisition, financing, reorganization, or sale of assets.
            </Subsection>
          </DocSection>

          <DocSection title="10. Data Security">
            <p>We implement commercially reasonable security measures including TLS encryption in transit, role-based access controls, multi-factor authentication, audit logging, session timeout controls, encrypted MFA secret storage, and secure cloud infrastructure. No method of transmission or storage can be guaranteed completely secure.</p>
          </DocSection>

          <DocSection title="11. Data Retention">
            <p>Information is retained while customer accounts remain active. Following termination, information may be retained for 30–90 days. Backup data may be retained for 30–180 days. Certain information may be retained longer where required by law.</p>
          </DocSection>

          <DocSection title="12. Data Deletion">
            <p>Subject to legal obligations and backup retention requirements, information will be deleted according to our retention practices following account termination. Covered Entities may request deletion of data through the contact information below.</p>
          </DocSection>

          <DocSection title="13. International Users">
            <p>Watermelon is intended for organizations located within the United States. Data is processed and stored within the United States.</p>
          </DocSection>

          <DocSection title="14. Children">
            <p>The platform is not intended for direct use by children. Children whose information is stored within the platform are patients of customer organizations. Any information relating to children is processed solely on behalf of customer organizations.</p>
          </DocSection>

          <DocSection title="15. California and Other State Privacy Rights">
            <p>Where applicable law grants privacy rights, individuals may have rights to request access, correction, or deletion, and to receive information about processing activities. Certain rights may be limited where HIPAA or other legal requirements apply. Requests may be submitted using the contact information below.</p>
          </DocSection>

          <DocSection title="16. AI Services">
            <p>Tiny Watermelon may use artificial intelligence tools to support business operations and platform development. Protected Health Information will not be disclosed to third-party AI providers except as expressly authorized, contractually permitted, and compliant with applicable law.</p>
          </DocSection>

          <DocSection title="17. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. Material changes may be communicated through the platform, email, or other reasonable methods. Continued use of the Services after such changes constitutes acceptance of the updated Privacy Policy.</p>
          </DocSection>

          <DocSection title="18. Contact Information">
            <p>Privacy questions: hi@tinywatermelon.com<br />Tiny Watermelon, LLC<br />13307 Cedarbrook Ave NE<br />Albuquerque, NM 87111</p>
          </DocSection>
        </div>
      </main>

      <footer className="border-t border-seed-200 bg-white px-6 py-6 text-center text-[12px] text-seed-400">
        <Link href="/terms" className="hover:text-seed-600">Terms of Service</Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-seed-600">Privacy Policy</Link>
        <span className="mx-2">·</span>
        © {new Date().getFullYear()} Tiny Watermelon, LLC
      </footer>
    </div>
  );
}

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="text-[16px] font-semibold text-seed-900">{title}</h2>
      <div className="mt-2 text-[14.5px] leading-relaxed text-seed-700">{children}</div>
    </div>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="font-medium text-seed-800">{title}</p>
      <p className="mt-1 text-seed-700">{children}</p>
    </div>
  );
}

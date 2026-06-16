import Link from "next/link";

export const metadata = { title: "Terms of Service · Watermelon" };

export default function TermsPage() {
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
          <h1 className="font-display mt-2 text-[32px] font-medium text-seed-900">Terms of Service</h1>
          <p className="mt-1 text-[14px] text-seed-500">Last Updated: June 15, 2026</p>

          <p className="mt-6 text-[15px] leading-relaxed text-seed-700">
            These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of the Watermelon platform and related services provided by Tiny Watermelon, LLC (&ldquo;Tiny Watermelon,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). By creating an account, accepting these Terms, executing an order form, or using the Services, Customer agrees to be bound by these Terms.
          </p>

          <DocSection title="1. Company Information">
            <p>Tiny Watermelon, LLC<br />13307 Cedarbrook Ave NE<br />Albuquerque, NM 87111<br />Email: tinywatermelontherapy@gmail.com<br />Website: tinywatermelon.com</p>
          </DocSection>

          <DocSection title="2. Services">
            <p>Watermelon is a software-as-a-service platform designed for therapy organizations. The Services may include appointment scheduling assistance, cancellation recovery workflows, appointment offer distribution, provider schedule management, authorization tracking, reporting tools, administrative tools, audit logging, and related software features. The Services are intended for use by therapy organizations and their authorized personnel.</p>
          </DocSection>

          <DocSection title="3. Eligibility">
            <p>Customer represents that it is legally authorized to enter into these Terms. Users must be at least eighteen (18) years old. The Services are not intended for direct use by children.</p>
          </DocSection>

          <DocSection title="4. Customer Accounts">
            <p>Customer is responsible for maintaining authorized users, restricting account access, ensuring account information remains accurate, and all activity occurring under Customer accounts. Tiny Watermelon may suspend access where unauthorized use, fraud, security risks, or legal concerns are identified.</p>
          </DocSection>

          <DocSection title="5. HIPAA">
            <p>Where Customer is a Covered Entity under HIPAA and Tiny Watermelon acts as a Business Associate, the parties shall be governed by a separate Business Associate Agreement. Customer shall not permit PHI to be entered into the Services until a Business Associate Agreement has been accepted.</p>
          </DocSection>

          <DocSection title="6. Customer Data">
            <p>Customer retains ownership of all Customer Data. Customer grants Tiny Watermelon a limited, non-exclusive license to host, store, process, transmit, and display Customer Data solely as necessary to provide the Services. Customer is solely responsible for the accuracy and legality of Customer Data and obtaining required consents and authorizations.</p>
          </DocSection>

          <DocSection title="7. Intellectual Property">
            <p>The Services, software, designs, workflows, user interfaces, documentation, trademarks, and related materials are owned exclusively by Tiny Watermelon. Except for the limited rights expressly granted herein, no rights are transferred to Customer. Customer shall not reverse engineer the Services, attempt to derive source code, modify or create derivative works, resell the Services without authorization, or remove proprietary notices.</p>
          </DocSection>

          <DocSection title="8. Acceptable Use">
            <p>Customer shall not violate applicable law, introduce malicious software, attempt unauthorized access, interfere with operation of the Services, use the Services to transmit unlawful content, or use the Services to compete with Tiny Watermelon.</p>
          </DocSection>

          <DocSection title="9. Security">
            <p>Tiny Watermelon will maintain commercially reasonable administrative, technical, and organizational safeguards designed to protect Customer Data, including multi-factor authentication, encryption in transit, role-based access controls, audit logging, and session management controls. No system can be guaranteed completely secure.</p>
          </DocSection>

          <DocSection title="10. Service Availability">
            <p>Tiny Watermelon will use commercially reasonable efforts to maintain availability of the Services. The Services may be unavailable due to scheduled maintenance, emergency maintenance, third-party service failures, internet disruptions, or circumstances beyond reasonable control. No specific uptime commitment is provided unless separately agreed in writing.</p>
          </DocSection>

          <DocSection title="11. Third-Party Services">
            <p>The Services may rely upon third-party providers, including hosting, infrastructure, communication, and database providers. Tiny Watermelon is not responsible for failures caused by third-party providers outside its reasonable control.</p>
          </DocSection>

          <DocSection title="12. Fees">
            <p>Customer agrees to pay all fees specified in applicable agreements, order forms, or subscription plans. Fees are non-refundable unless otherwise required by law. Failure to pay may result in suspension or termination of Services.</p>
          </DocSection>

          <DocSection title="13. Term">
            <p>These Terms remain effective while Customer uses the Services.</p>
          </DocSection>

          <DocSection title="14. Termination">
            <p>Either party may terminate the relationship in accordance with any applicable subscription agreement. Tiny Watermelon may suspend or terminate access immediately if Customer materially breaches these Terms, creates security risks, or continued access may violate law.</p>
          </DocSection>

          <DocSection title="15. Effect of Termination">
            <p>Upon termination, Customer access will cease, Customer Data will be retained pursuant to applicable retention policies, and outstanding payment obligations survive.</p>
          </DocSection>

          <DocSection title="16. Disclaimer of Warranties">
            <p className="uppercase text-[13.5px]">The services are provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the maximum extent permitted by law, Tiny Watermelon disclaims all warranties, including merchantability, fitness for a particular purpose, non-infringement, uninterrupted operation, and error-free operation.</p>
          </DocSection>

          <DocSection title="17. Limitation of Liability">
            <p className="uppercase text-[13.5px]">To the maximum extent permitted by law, Tiny Watermelon shall not be liable for indirect, incidental, special, consequential, or punitive damages, or lost profits, revenue, or business opportunities. The aggregate liability of Tiny Watermelon arising out of or relating to the Services shall not exceed the fees paid by Customer during the six (6) months preceding the event giving rise to the claim.</p>
          </DocSection>

          <DocSection title="18. Indemnification">
            <p>Customer shall defend, indemnify, and hold harmless Tiny Watermelon and its officers, employees, and affiliates from claims arising from Customer Data, Customer&rsquo;s use of the Services, Customer&rsquo;s violation of law, or Customer&rsquo;s breach of these Terms.</p>
          </DocSection>

          <DocSection title="19. Dispute Resolution">
            <p>The parties agree to attempt good-faith resolution of disputes before initiating formal proceedings. Any dispute arising from these Terms shall be resolved through binding arbitration. Either party may bring qualifying claims in small claims court.</p>
          </DocSection>

          <DocSection title="20. Governing Law">
            <p>These Terms shall be governed by the laws of the State of New Mexico without regard to conflict-of-law principles.</p>
          </DocSection>

          <DocSection title="21. Changes">
            <p>Tiny Watermelon may modify these Terms from time to time. Material changes may be communicated through the platform, email, or other reasonable means. Continued use of the Services after changes become effective constitutes acceptance of the revised Terms.</p>
          </DocSection>

          <DocSection title="22. Contact">
            <p>Questions regarding these Terms may be directed to:<br />Tiny Watermelon, LLC<br />tinywatermelontherapy@gmail.com<br />13307 Cedarbrook Ave NE<br />Albuquerque, NM 87111</p>
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

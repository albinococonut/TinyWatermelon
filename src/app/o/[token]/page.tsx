// Family magic-link portal — /o/:token
//
// This is what families see when they tap the PHI-free SMS link.
// The token is short-lived + signed (see lib/tokens.ts).
// Only after the token is verified do we show any visit details.
// PHI is revealed here because the family explicitly requested it.

import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyPortalToken } from "@/lib/tokens";
import { prisma } from "@/lib/db";
import { PortalConfirmButton } from "./ConfirmButton";

export const dynamic = "force-dynamic";

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function PortalPage({
  params,
}: {
  params: { token: string };
}) {
  const payload = verifyPortalToken(params.token);
  if (!payload) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <img src="/logo-long.png" alt="Watermelon" className="h-10 w-auto mix-blend-multiply" />
        <div className="mt-8 w-full rounded-3xl border border-melon-100 bg-white p-8 shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-melon-50 text-2xl">⏱</div>
          <h1 className="font-display mt-4 text-[22px] font-medium text-seed-900">This link has expired</h1>
          <p className="mt-2 text-[14px] text-seed-600">
            Visit offer links expire after 24 hours. Please contact Watermelon Therapy if you still need this appointment.
          </p>
        </div>
      </main>
    );
  }

  // Load the slot + child details (PHI — only shown here behind token auth)
  const [appointment, child, existingOffer] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id: payload.slotId },
      include: { provider: { select: { name: true, discipline: true, credentials: true } } },
    }),
    prisma.child.findUnique({
      where: { id: payload.childId },
      select: { firstName: true, lastName: true, family: { select: { primaryContactName: true } } },
    }),
    prisma.smartOffer.findFirst({
      where: { appointmentId: payload.slotId, status: "LIVE" },
      select: { id: true },
    }),
  ]);

  if (!appointment || !child) notFound();

  const alreadyFilled = appointment.status === "FILLED_MAKEUP";
  const isOpen = appointment.status === "OPEN_SLOT";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <Link href="/" aria-label="Watermelon home" className="flex flex-col items-center gap-1">
        <img src="/logo-long.png" alt="Watermelon" className="h-10 w-auto mix-blend-multiply" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-seed-400">TinyWatermelon</span>
      </Link>

      <div className="mt-8 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-melon-600">
          Visit opening
        </p>
        <h1 className="font-display mt-1 text-[26px] font-medium leading-tight text-seed-900">
          {appointment.provider.discipline} appointment
          <br />for {child.firstName} {child.lastName}
        </h1>

        <div className="mt-6 space-y-3">
          <Detail icon="📅" label="Date">{fmtDate(appointment.startsAt)}</Detail>
          <Detail icon="⏰" label="Time">{fmtTime(appointment.startsAt)} – {fmtTime(appointment.endsAt)}</Detail>
          <Detail icon="👩‍⚕️" label="Provider">{appointment.provider.name}{appointment.provider.credentials ? ` · ${appointment.provider.credentials}` : ""}</Detail>
          <Detail icon="🎯" label="Discipline">{appointment.provider.discipline}</Detail>
          <Detail icon="📍" label="Location">{appointment.locationAddress ?? "Watermelon Therapy School"}</Detail>
        </div>

        {alreadyFilled && (
          <div className="mt-6 rounded-xl bg-seed-100 px-4 py-3 text-center text-[14px] text-seed-700">
            This opening has already been filled. We&apos;ll send the next one as soon as it becomes available.
          </div>
        )}

        {isOpen && existingOffer && (
          <div className="mt-6 space-y-3">
            <PortalConfirmButton
              offerId={existingOffer.id}
              childId={payload.childId}
              childName={`${child.firstName} ${child.lastName}`}
            />
            <p className="text-center text-[12px] text-seed-500">
              First family to confirm books the opening. You&apos;ll receive a confirmation text.
            </p>
          </div>
        )}

        {isOpen && !existingOffer && (
          <div className="mt-6 space-y-3">
            <PortalConfirmButton
              offerId={null}
              slotId={payload.slotId}
              childId={payload.childId}
              childName={`${child.firstName} ${child.lastName}`}
            />
            <p className="text-center text-[12px] text-seed-500">
              Tap above to confirm this appointment for {child.firstName}. You&apos;ll receive a confirmation text.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-[12px] text-seed-400 text-center">
        Questions? Call or text us at{" "}
        <a href="tel:+16195550000" className="underline">Watermelon Therapy</a>.
      </p>
    </main>
  );
}

function Detail({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-seed-50 px-3.5 py-3">
      <span className="text-lg leading-none" aria-hidden>{icon}</span>
      <div>
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-seed-500">{label}</div>
        <div className="mt-0.5 text-[14px] text-seed-900">{children}</div>
      </div>
    </div>
  );
}

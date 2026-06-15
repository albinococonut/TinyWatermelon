// Application-layer enums + label maps.
// SQLite-compatible: enum values are stored as String in the DB; this file
// is the single source of truth for valid values and TypeScript types.
// On Postgres migration we can switch to native enums.

// ─────────────────────────────────────────────────────────────────────────────
// Role — RBAC for organization membership
// ─────────────────────────────────────────────────────────────────────────────
export const ROLES = ["OWNER", "ADMIN", "PROVIDER"] as const;
export type Role = (typeof ROLES)[number];
export const RoleLabel: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  PROVIDER: "Provider",
};

// MFA-required roles per HIPAA security best practices
export const MFA_REQUIRED_ROLES: ReadonlySet<Role> = new Set(["OWNER", "ADMIN"]);

// ─────────────────────────────────────────────────────────────────────────────
// Discipline — therapy service type
// ─────────────────────────────────────────────────────────────────────────────
export const DISCIPLINES = ["OT", "PT", "SLP", "MT", "ABA"] as const;
export type Discipline = (typeof DISCIPLINES)[number];
export const DisciplineLabel: Record<Discipline, string> = {
  OT: "Occupational Therapy",
  PT: "Physical Therapy",
  SLP: "Speech-Language",
  MT: "Music Therapy",
  ABA: "ABA Therapy",
};

// Default GP$/hr by discipline — used when an org doesn't override.
export const DEFAULT_RATES: Record<Discipline, number> = {
  OT: 185,
  PT: 200,
  SLP: 175,
  ABA: 120,
  MT: 140,
};

// ─────────────────────────────────────────────────────────────────────────────
// Appointment lifecycle
// ─────────────────────────────────────────────────────────────────────────────
export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED_FAMILY",
  "CANCELLED_PROVIDER",
  "OPEN_SLOT",
  "FILLED_MAKEUP",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const CANCELLATION_REASONS = [
  "CHILD_SICK",
  "PROVIDER_OUT",
  "SCHOOL_CONFLICT",
  "FAMILY_TRAVEL",
  "PARENT_FORGOT",
  "WEATHER",
  "AUTHORIZATION_DELAY",
] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];
export const CancellationReasonLabel: Record<CancellationReason, string> = {
  CHILD_SICK: "Child sick",
  PROVIDER_OUT: "Provider out",
  SCHOOL_CONFLICT: "School conflict",
  FAMILY_TRAVEL: "Family travel",
  PARENT_FORGOT: "Parent forgot",
  WEATHER: "Weather",
  AUTHORIZATION_DELAY: "Authorization delay",
};

// ─────────────────────────────────────────────────────────────────────────────
// Smart Offers (family outreach for openings)
// ─────────────────────────────────────────────────────────────────────────────
export const SMART_OFFER_STATUSES = ["LIVE", "CLAIMED", "EXPIRED"] as const;
export type SmartOfferStatus = (typeof SMART_OFFER_STATUSES)[number];

export const SMART_OFFER_MODES = ["STANDARD", "LAST_MINUTE"] as const;
export type SmartOfferMode = (typeof SMART_OFFER_MODES)[number];

export const RECIPIENT_STATUSES = ["SENT", "CLAIMED", "MISSED_OUT", "DECLINED"] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Messaging
// ─────────────────────────────────────────────────────────────────────────────
export const MESSAGE_DIRECTIONS = ["OUTBOUND", "INBOUND"] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Revenue events
// ─────────────────────────────────────────────────────────────────────────────
export const LOST_REASONS = ["AUTH_EXPIRED", "NO_MATCH_FOUND", "FAMILY_DROPPED"] as const;
export type LostReason = (typeof LOST_REASONS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────────────────────────────────────
export const AUDIT_ACTIONS = [
  "READ",
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "SEND_SMS",
  "SEND_EMAIL",
  "CANCEL_APPOINTMENT",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Default billing types — seeded for every new org.
export const DEFAULT_BILLING_TYPES = [
  { id: "private_pay",        label: "Private Pay",               includesTravel: false },
  { id: "private_pay_travel", label: "Private Pay with Travel",   includesTravel: true  },
  { id: "sdrc",               label: "San Diego Regional Center", includesTravel: false },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Runtime validators (lightweight — no zod dependency yet)
// ─────────────────────────────────────────────────────────────────────────────
function isValid<T extends readonly string[]>(values: T, x: unknown): x is T[number] {
  return typeof x === "string" && (values as readonly string[]).includes(x);
}
export const isRole = (x: unknown): x is Role => isValid(ROLES, x);
export const isDiscipline = (x: unknown): x is Discipline => isValid(DISCIPLINES, x);
export const isAppointmentStatus = (x: unknown): x is AppointmentStatus =>
  isValid(APPOINTMENT_STATUSES, x);

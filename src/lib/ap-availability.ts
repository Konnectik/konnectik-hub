import type { AccessPoint, ApAvailabilityStatus } from "@/types/database";

export const AP_HEALTH_FRESHNESS_MS = 180_000;

export function effectiveAvailability(
  ap: Pick<AccessPoint, "availability_status" | "availability_checked_at" | "availability_reason" | "status">,
  nowMs = Date.now(),
): { status: ApAvailabilityStatus; reason: string; checkedAt: string | null } {
  if (ap.status === "maintenance" || ap.availability_status === "maintenance") {
    return {
      status: "maintenance",
      reason: ap.availability_reason || "Maintenance administrative",
      checkedAt: ap.availability_checked_at || null,
    };
  }

  const checkedAt = ap.availability_checked_at || null;
  const checkedMs = checkedAt ? Date.parse(checkedAt) : Number.NaN;
  if (!Number.isFinite(checkedMs) || nowMs - checkedMs > AP_HEALTH_FRESHNESS_MS || checkedMs > nowMs + 5_000) {
    return {
      status: "unknown",
      reason: checkedAt ? "Preuve de santé périmée" : "Aucune preuve de santé",
      checkedAt,
    };
  }

  return {
    status: ap.availability_status || "unknown",
    reason: ap.availability_reason || "Aucun détail fourni",
    checkedAt,
  };
}

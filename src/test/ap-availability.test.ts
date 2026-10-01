import { describe, expect, it } from "vitest";
import { effectiveAvailability } from "@/lib/ap-availability";

const now = Date.parse("2026-09-30T14:00:00Z");

describe("effectiveAvailability", () => {
  it("keeps a fresh authoritative online proof", () => {
    expect(effectiveAvailability({
      status: "online", availability_status: "online",
      availability_checked_at: "2026-09-30T13:58:00Z", availability_reason: "checks passed",
    }, now).status).toBe("online");
  });

  it("turns stale online evidence into unknown", () => {
    const result = effectiveAvailability({
      status: "online", availability_status: "online",
      availability_checked_at: "2026-09-30T13:56:59Z", availability_reason: "checks passed",
    }, now);
    expect(result.status).toBe("unknown");
    expect(result.reason).toContain("périmée");
  });

  it("preserves administrative maintenance", () => {
    expect(effectiveAvailability({
      status: "maintenance", availability_status: "unknown",
      availability_checked_at: null, availability_reason: null,
    }, now).status).toBe("maintenance");
  });
});

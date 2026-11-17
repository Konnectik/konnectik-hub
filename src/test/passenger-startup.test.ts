import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Hodifly Passenger startup", () => {
  it("uses the Passenger socket in production and a numeric port locally", () => {
    const config = JSON.parse(readFileSync("hodifly.json", "utf8"));
    const server = readFileSync("server.cjs", "utf8");
    expect(config.mode).toBe("node");
    expect(config.startup).toBe("server.cjs");
    expect(server).toContain("server.listen('passenger'");
    expect(server).toContain("server.listen(Number(port), host");
  });
});

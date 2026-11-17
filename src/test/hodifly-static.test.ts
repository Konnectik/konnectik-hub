import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Hodifly static deployment", () => {
  it("publishes the Vite output without a Passenger startup file", () => {
    const config = JSON.parse(readFileSync("hodifly.json", "utf8"));
    expect(config.mode).toBe("static");
    expect(config.output).toBe("dist");
    expect(config.startup).toBeUndefined();
    expect(existsSync("app.js")).toBe(false);
    expect(existsSync("server.cjs")).toBe(false);
  });
});

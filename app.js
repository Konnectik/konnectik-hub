// Canonical Passenger entry point. Passenger auto-detects app.js even when a
// hosting control plane does not propagate its custom startup-file setting.
if (typeof PhusionPassenger !== "undefined") {
  PhusionPassenger.configure({ autoInstall: false });
}

await import("./server.cjs");

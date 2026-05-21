# Show WireGuard Config Script on Add Access Point — Step 2

## Problem
On `/dashboard/k-zones/add` step 2 ("Router Information"), we currently just show optional Router Type / Speed Profile fields and a note that "an admin will assign the WireGuard IP later". That's wrong — like the competitor's flow in the screenshot, this step must display the **ready-to-paste Mikrotik script** that links the provider's hardware to our system, with a copy button.

The provisioning Edge Function (`provision-router`) and the command template already exist and are used in `EditAccessPoint.tsx`. We just need to wire the same flow into the Add page.

## Approach

Re-shape step 2 of `src/pages/AddAccessPoint.tsx` so it:

1. **Creates the AP first**, then provisions the tunnel, then shows the script.
2. Reuses the existing `provision-router` Edge Function and its returned `command` (which already matches the exact script format requested).

### Step-by-step UX

- **Step 1 → Next**: same as today (validates + moves to step 2). No AP created yet.
- **Entering Step 2**: 
  - If AP not yet created → call `useAddAccessPoint` to insert the row (with current Router Type / Speed Profile values, blank allowed), get back the new `ap.id`, then call `supabase.functions.invoke('provision-router', { body: { ap_id } })`.
  - Show a loading state ("Generating router configuration…") while this runs.
  - On success → render the dark code block (matching the screenshot style) containing the multi-line `command` string returned by the function, plus a **Copy** icon button in the top-right corner (uses `navigator.clipboard.writeText`, shows a toast on success).
  - Below the code block, render a tunnel status indicator (Pending / Connected / Disconnected) subscribed via Supabase Realtime on `access_points` for this `ap.id` — same pattern already used in `EditAccessPoint.tsx`.
- **Editable fields kept on Step 2**: Router Type and Speed Profile inputs stay above the script (so the provider can still fill them). Changes are saved via a lightweight `update` on the existing AP row.
- **Footer buttons**:
  - "Back" → returns to Step 1 (AP already exists; we do not delete it — switching back simply lets them tweak metadata, saved via update on Done).
  - Replace "Add Access Point" with **"Done"** → persists any final Router Type / Speed Profile edits and navigates to `/dashboard/k-zones`.
- **Error handling**: if `provision-router` fails (e.g. relay unreachable, no IPs), show an inline error with a "Retry" button. The AP row still exists; retry just re-invokes the function (function is idempotent — already returns existing command if `tunnel_ip` is set).

### Visual style of the code block
Match the competitor screenshot: dark slate background, monospace text, rounded corners, padding, copy icon button top-right. Use design tokens (`bg-slate-900` equivalent via theme, `font-mono`, semantic foreground). No inline hex colors.

## Files to change
- `src/pages/AddAccessPoint.tsx` — rework step 2 only. Step 1 untouched.

## Files NOT changed
- `supabase/functions/provision-router/index.ts` — already returns the exact script format requested.
- `src/sql/phase10-tunnel-provisioning.sql` — schema already supports this.
- `EditAccessPoint.tsx` — already implements the same pattern; we mirror it.
- `src/hooks/use-access-points.ts`, types — no schema changes.

## Notes / assumptions
- The AP is created as soon as the user lands on Step 2 (not on final "Done"). This is required because provisioning needs an `ap_id`. If the user navigates away mid-flow, the AP exists with `tunnel_status='pending'` — same behavior as the Edit flow today.
- The script the function returns already substitutes `PRIVATE_KEY_VALUE`, `VPS_PUBLIC_KEY_PLACEHOLDER`, and `ASSIGNED_IP` with real values — no client-side templating needed.
- Requires `VPS_WG_PUBLIC_KEY`, `MIKROTIK_RELAY_URL`, `MIKROTIK_RELAY_API_KEY` secrets to be set (already added in earlier turn). If missing, the inline error will surface the relay/config message from the function.

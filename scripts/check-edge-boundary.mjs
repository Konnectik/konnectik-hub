import { existsSync, readFileSync } from 'node:fs';

const protectedFunctions = [
  'initiate-recharge', 'recharge-webhook', 'purchase-bundle', 'start-segment',
  'end-segment', 'payout-webhook', 'process-payout', 'provision-router', 'send-push',
];

const present = protectedFunctions.filter((name) => existsSync(`supabase/functions/${name}/index.ts`));
if (present.length) {
  console.error(`Edge deployment boundary violated. Canonical functions live in appweb: ${present.join(', ')}`);
  process.exit(1);
}

const filesToScan = ['package.json', '.github/workflows/edge-boundary.yml'];
for (const file of filesToScan) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (/supabase\s+functions\s+deploy(?!\s+--help)/.test(text)) {
    console.error(`Raw Supabase Edge deployment command is forbidden in ${file}`);
    process.exit(1);
  }
}
console.log('Edge deployment boundary OK: konnectik-hub contains no deployable shared functions.');

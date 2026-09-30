import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('security boundaries', () => {
  it('public dashboard signup cannot request the owner role', () => {
    const auth = readFileSync('src/contexts/AuthContext.tsx', 'utf8');
    expect(auth).not.toContain("signup_source: 'platform'");
    expect(auth).toContain("signup_source: 'mobile'");
  });

  it('shared production Edge Functions are absent from this repository', () => {
    const protectedFunctions = ['recharge-webhook', 'purchase-bundle', 'start-segment'];
    for (const name of protectedFunctions) {
      expect(() => readFileSync(`supabase/functions/${name}/index.ts`, 'utf8')).toThrow();
    }
  });
});

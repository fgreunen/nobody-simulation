import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function withFixture(check: (root: string, run: (args?: string[], fail?: boolean) => ReturnType<typeof spawnSync>) => void) {
  const root = mkdtempSync(join(tmpdir(), 'verification-runner-'));
  mkdirSync(join(root, 'scripts'));
  const script = join(root, 'scripts/check.mjs');
  copyFileSync(new URL('../scripts/check.mjs', import.meta.url), script);
  const npm = join(root, 'npm-fixture.cjs');
  writeFileSync(npm, `
    console.log(JSON.stringify(process.argv.slice(2)));
    process.stdout.write('x'.repeat(14000));
    process.stderr.write('FIXTURE_DIAGNOSTIC_END\\n');
    process.exitCode = process.env.RUNNER_FIXTURE_FAIL === '1' ? 1 : 0;
  `);
  // Windows passes only one spelling of case-insensitive environment keys.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'npm_execpath'));
  try {
    check(root, (args = [], fail = false) => spawnSync(process.execPath, [script, ...args], {
      cwd: root, encoding: 'utf8',
      env: { ...env, npm_execpath: npm, RUNNER_FIXTURE_FAIL: fail ? '1' : '0' },
    }));
  } finally { rmSync(root, { recursive: true, force: true }); }
}

const result = (root: string, name: string) => JSON.parse(readFileSync(join(root, `verification-results/${name}.json`), 'utf8'));

describe('compact verification runner', () => {
  it('keeps passing output small while recording full logs and every gate stage', () => withFixture((root, run) => {
    const child = run();
    expect(child.status).toBe(0);
    expect(String(child.stdout).length).toBeLessThan(200);
    expect(child.stderr).toBe('');
    expect(result(root, 'check').stages.map((stage: { status: string }) => stage.status)).toEqual(Array(4).fill('passed'));
    expect(readFileSync(join(root, 'verification-results/check.log'), 'utf8').length).toBeGreaterThan(56000);
  }));

  it('forwards focused-test arguments without overwriting full-gate evidence', () => withFixture((root, run) => {
    expect(run().status).toBe(0);
    const before = readFileSync(join(root, 'verification-results/check.json'), 'utf8');
    const child = run(['test', 'tests/physics.test.ts', '-t', 'merger']);
    expect(child.status).toBe(0);
    expect(result(root, 'test').stages).toHaveLength(1);
    expect(readFileSync(join(root, 'verification-results/test.log'), 'utf8')).toContain(
      JSON.stringify(['run', 'test:raw', '--', 'tests/physics.test.ts', '-t', 'merger']));
    expect(readFileSync(join(root, 'verification-results/check.json'), 'utf8')).toBe(before);
  }));

  it('caps failure diagnostics, preserves the full log, and stops at the failure', () => withFixture((root, run) => {
    const child = run([], true);
    expect(child.status).toBe(1);
    expect(String(child.stderr).length).toBeLessThanOrEqual(3000);
    expect(child.stderr).toContain('FIXTURE_DIAGNOSTIC_END');
    expect(result(root, 'check').stages.map((stage: { status: string }) => stage.status)).toEqual(['failed', 'pending', 'pending', 'pending']);
    expect(readFileSync(join(root, 'verification-results/check.log'), 'utf8').length).toBeGreaterThan(14000);
  }));

  it('streams full output when verbose is requested', () => withFixture((root, run) => {
    const child = run(['lint', '--verbose'], true);
    expect(child.status).toBe(1);
    expect(String(child.stdout).length).toBeGreaterThan(14000);
    expect(child.stderr).toContain('FIXTURE_DIAGNOSTIC_END');
    expect(result(root, 'lint').status).toBe('failed');
  }));

  it('rejects unknown checks before creating evidence', () => withFixture((root, run) => {
    const child = run(['unknown']);
    expect(child.status).toBe(1);
    expect(child.stderr).toContain('Unknown check');
    expect(existsSync(join(root, 'verification-results'))).toBe(false);
  }));
});

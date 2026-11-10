import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const requested = args.filter(arg => arg !== '--verbose');
const selected = requested.shift();
const defaultStages = ['lint', 'test', 'build', 'test:browser'];
if (selected && ![...defaultStages, 'typecheck'].includes(selected)) {
  process.stderr.write(`Unknown check: ${selected}. Choose lint, test, typecheck, build, or test:browser.\n`);
  process.exit(1);
}
if (requested[0] === '--') requested.shift();
const basename = selected ? selected.replaceAll(':', '-') : 'check';
const output = new URL('../verification-results/', import.meta.url);
mkdirSync(output, { recursive: true });
const report = {
  startedAt: new Date().toISOString(),
  finishedAt: null,
  status: 'running',
  stages: (selected ? [selected] : defaultStages).map(command => ({ command, status: 'pending', exitCode: null })),
};
const log = new URL(`${basename}.log`, output);
writeFileSync(log, '');
const save = () => writeFileSync(new URL(`${basename}.json`, output), JSON.stringify(report, null, 2) + '\n');
save();

try {
  if (!process.env.npm_execpath) throw new Error('Run this gate with npm run check.');
  for (const stage of report.stages) {
    stage.status = 'running'; save();
    const heading = `\nChecking ${stage.command}\n`;
    if (verbose) process.stdout.write(heading);
    appendFileSync(log, heading);
    let stdoutTail = '', stderrTail = '';
    const capture = (stream, data) => {
      appendFileSync(log, data);
      if (verbose) stream.write(data);
      else if (stream === process.stderr) stderrTail = (stderrTail + data.toString()).slice(-2000);
      else stdoutTail = (stdoutTail + data.toString()).slice(-3000);
    };
    stage.exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [process.env.npm_execpath, 'run', `${stage.command}:raw`, '--', ...requested], { cwd: root, env: process.env });
      child.stdout.on('data', data => capture(process.stdout, data));
      child.stderr.on('data', data => capture(process.stderr, data));
      child.on('error', reject);
      child.on('close', code => resolve(code ?? 1));
    });
    stage.status = stage.exitCode === 0 ? 'passed' : 'failed'; save();
    process.stdout.write(`${stage.command}: ${stage.status === 'passed' ? 'PASS' : 'FAIL'}\n`);
    if (stage.status === 'failed') {
      if (!verbose) process.stderr.write(stdoutTail.slice(-(3000 - stderrTail.length)) + stderrTail);
      report.status = 'failed'; process.exitCode = 1; break;
    }
  }
  if (report.status === 'running') report.status = 'passed';
} catch (error) {
  report.status = 'failed'; process.exitCode = 1;
  const message = String(error) + '\n';
  process.stderr.write(message); appendFileSync(log, message);
} finally {
  report.finishedAt = new Date().toISOString(); save();
  process.stdout.write(`Details: verification-results/${basename}.{json,log}\n`);
}

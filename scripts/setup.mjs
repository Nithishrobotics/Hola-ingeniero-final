// One-time setup: checks Node/npm, installs dependencies, creates .env (never overwrites, never prints your key).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const say = (m = '') => console.log(m);
const fail = (m) => { console.error(`\n[X] ${m}\n`); process.exit(1); };

say('\n=== ¡Hola Ingeniero! setup ===\n');

// 1. Node version
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 20 || (maj === 20 && min < 19)) {
  fail(`Node.js ${process.versions.node} is too old. Install the current LTS version from https://nodejs.org (need 20.19 or newer), then run setup.bat again.`);
}
say(`[OK] Node.js ${process.versions.node}`);

// 2. npm
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const npmV = spawnSync(npmCmd, ['--version'], { encoding: 'utf8', shell: isWin });
if (npmV.status !== 0) fail('npm was not found. It is installed together with Node.js from https://nodejs.org.');
say(`[OK] npm ${npmV.stdout.trim()}`);

// 3. Install dependencies (project-local: nothing is installed globally)
for (const dir of ['.', 'backend', 'frontend']) {
  const label = dir === '.' ? 'root tools' : dir;
  say(`\n[..] Installing ${label} dependencies (this can take a few minutes the first time)...`);
  const r = spawnSync(npmCmd, ['install', '--no-audit', '--no-fund'], { cwd: path.join(root, dir), stdio: 'inherit', shell: isWin });
  if (r.status !== 0) fail(`Installing ${label} dependencies failed. Check your internet connection and run setup.bat again.`);
}

// 4. .env (never overwritten)
const envPath = path.join(root, '.env');
const example = path.join(root, '.env.example');
if (fs.existsSync(envPath)) {
  say('\n[OK] .env already exists. It was NOT changed.');
} else {
  fs.copyFileSync(example, envPath);
  say('\n[OK] Created .env from .env.example');
}
const envText = fs.readFileSync(envPath, 'utf8');
const m = envText.match(/^GEMINI_API_KEY=(.*)$/m);
const val = (m?.[1] ?? '').trim();
const hasKey = val && val !== 'PASTE_YOUR_KEY_HERE';
say(hasKey ? '[OK] A Gemini API key is present in .env (not shown).' : '[!!] No Gemini API key yet. The AI tutor stays off until you add one. Everything else works.');

say(`
=== Setup finished ===

NEXT STEPS
  1. (For the AI tutor only) Get a free key: https://aistudio.google.com/apikey
     Open the file ".env" in VS Code and replace PASTE_YOUR_KEY_HERE with your key.
     Save the file. Never share it or upload it anywhere.
  2. Start the app: double-click start.bat  (or run:  npm start)
  3. Open http://localhost:5173 in your browser.
  Optional: check your key works with:  npm run check:ai --prefix backend
`);

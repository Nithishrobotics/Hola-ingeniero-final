// Fails if a secret could be shipped: key-shaped strings, a real .env, or the key from your .env inside the build/zip contents.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['node_modules', '.git']);
const keyShape = /AIza[0-9A-Za-z_-]{30,}/;
let envKey = '';
try { envKey = (fs.readFileSync(path.join(root, '.env'), 'utf8').match(/^GEMINI_API_KEY=(.*)$/m)?.[1] ?? '').trim(); } catch { /* no .env */ }
if (envKey === 'PASTE_YOUR_KEY_HERE') envKey = '';

const target = process.argv[2] ? path.resolve(process.argv[2]) : root;
const problems = [];
let scanned = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (/^\.env(\..*)?$/.test(e.name) && e.name !== '.env.example') { if (target !== root || e.name !== '.env') problems.push(`secret file present: ${path.relative(target, p)}`); }
    if (/\.(png|jpg|ico|woff2?|zip)$/i.test(e.name)) continue;
    const txt = fs.readFileSync(p, 'utf8'); scanned++;
    if (keyShape.test(txt)) problems.push(`Google-key-shaped string in ${path.relative(target, p)}`);
    if (envKey && txt.includes(envKey) && e.name !== '.env') problems.push(`your real key appears in ${path.relative(target, p)}`);
  }
})(target);
if (problems.length) { console.error('SECRET CHECK FAILED:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log(`Secret check passed: ${scanned} files scanned in ${path.relative(root, target) || '.'}, no keys found.`);

#!/usr/bin/env node
// BlockWild dedicated server. Runs the game in a hidden browser with ?server=1 so the world lives on this machine
// instead of on a player's computer. See SERVER_SETUP.md.
//
//   node server.js --code BLOCK1 --world "Server World"
//
// Options (all optional):
//   --code ABC123      fixed 6-character join code (letters and numbers). Without it a new code is picked every start.
//   --world NAME       world to load, created if it doesn't exist (default "Server World")
//   --seed TEXT        seed for a new world
//   --mode survival    what joining players get: survival, creative, adventure, spectator
//   --difficulty normal  peaceful, easy, normal, hard
//   --cheats           allow commands for everyone
//   --max 10           most players at once
//   --rd 6             chunks kept loaded around players (lower = less CPU)
//   --url URL          game address (default: the live site). Players must use the same version.
//   --data DIR         where the world is saved (default ./data next to this file)
//
// While it runs, type into this window: "/time set day", "/weather clear", "/tp Steve 0 100 0" run as the server;
// "status" shows who is on; anything else is said in chat; "stop" saves and quits.
const path = require('path');
const readline = require('readline');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is missing. Run:  npm install  &&  npx playwright install --with-deps chromium'); process.exit(1); }

const args = process.argv.slice(2); const opt = {};
for (let i = 0; i < args.length; i++) { const a = args[i]; if (!a.startsWith('--')) continue; const k = a.slice(2); const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : '1'; opt[k] = v; }
const base = opt.url || 'https://blockwild3d.github.io/BlockWild/';
const q = new URLSearchParams({ server: '1' });
for (const k of ['code', 'world', 'seed', 'mode', 'difficulty', 'cheats', 'max', 'rd']) if (opt[k] != null) q.set(k, opt[k]);
const url = base + (base.includes('?') ? '&' : '?') + q.toString();
const dataDir = path.resolve(opt.data || path.join(__dirname, 'data'));
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const log = (t) => console.log(stamp() + '  ' + t);

let ctx = null, page = null, stopping = false, restarts = 0;
async function launch() {
  log('starting ' + url);
  ctx = await chromium.launchPersistentContext(dataDir, {
    headless: true,
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
      '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    viewport: { width: 320, height: 240 },
  });
  page = ctx.pages()[0] || await ctx.newPage();
  page.on('console', (m) => { const t = m.text(); if (t.startsWith('[server] ')) log(t.slice(9)); else if (m.type() === 'error' && !/favicon|404/.test(t)) log('page error: ' + t.slice(0, 300)); });
  page.on('pageerror', (e) => log('page error: ' + String(e.message || e).slice(0, 300)));
  page.on('crash', () => { log('the game crashed, restarting'); restart(); });
  ctx.on('close', () => { if (!stopping) { log('browser closed, restarting'); restart(); } });
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
}
let restarting = false;
async function restart() {
  if (stopping || restarting) return; restarting = true; restarts++;
  try { if (ctx) await ctx.close(); } catch (e) { }
  await new Promise((r) => setTimeout(r, Math.min(60000, 3000 * restarts)));
  restarting = false; try { await launch(); } catch (e) { log('start failed: ' + e.message); restart(); }
}
async function stop() {
  if (stopping) return; stopping = true; log('saving and stopping...');
  try { await page.evaluate(() => { try { saveGame(false); } catch (e) { } }); await new Promise((r) => setTimeout(r, 3000)); } catch (e) { }
  try { await ctx.close(); } catch (e) { } process.exit(0);
}
process.on('SIGINT', stop); process.on('SIGTERM', stop);
// a fresh start every 12 hours keeps browser memory in check
setInterval(() => { log('scheduled restart'); restarts = 0; (async () => { try { await page.evaluate(() => saveGame(false)); await new Promise((r) => setTimeout(r, 3000)); } catch (e) { } restart(); })(); }, 12 * 3600 * 1000);

readline.createInterface({ input: process.stdin }).on('line', async (line) => {
  line = line.trim(); if (!line || !page) return;
  if (line === 'stop') return stop();
  try {
    if (line === 'status') { const s = await page.evaluate(() => SRV.status()); log('code ' + s.code + ' | ' + s.world + ' day ' + s.day + ' (' + s.dim + ') | players: ' + (s.players.join(', ') || 'none') + ' | mobs ' + s.mobs + ' | chunks ' + s.chunks); return; }
    await page.evaluate((l) => SRV.command(l), line);
  } catch (e) { log('could not run that: ' + e.message); }
});
launch().catch((e) => { log('start failed: ' + e.message); restart(); });

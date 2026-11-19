const { chromium } = require('playwright');
(async () => {
  const ctx = await chromium.launchPersistentContext('/tmp/probe' + Date.now(), { headless: true, viewport: { width: 320, height: 240 }, args: ['--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const p = ctx.pages()[0];
  p.on('console', m => { const t = m.text(); if (/^PROBE/.test(t)) console.log(new Date().toISOString().slice(11, 19), t); });
  await p.goto('https://blockwild3d.github.io/BlockWild/?v=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => typeof joinWorld === 'function', null, { timeout: 120000 });
  await p.evaluate(() => { try { localStorage.setItem('blockwild_name', 'PingProbe'); } catch (e) {}
    const _on = onPeerMsg; onPeerMsg = function (peer, m) { if (m && m.t === 'pong') console.log('PROBE pong ' + Math.round(performance.now() - m.ts)); if (m && m.t === 'ping') console.log('PROBE got server ping'); return _on.apply(this, arguments); };
    setInterval(() => console.log('PROBE status ' + (typeof $ === 'function' && $('mpStatus') ? $('mpStatus').textContent : '') + ' active=' + MP.active + ' peers=' + MP.peers.size), 3000);
    joinWorld('BLOCK1'); });
  await new Promise(r => setTimeout(r, 40000));
  await ctx.close(); process.exit(0);
})();

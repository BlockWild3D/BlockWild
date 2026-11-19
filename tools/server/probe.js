const { chromium } = require('playwright');
(async () => {
  const ctx = await chromium.launchPersistentContext('/tmp/probe' + Date.now(), { headless: true, viewport: { width: 320, height: 240 }, args: ['--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const p = ctx.pages()[0];
  p.on('console', m => { const t = m.text(); if (/^PROBE/.test(t)) console.log(new Date().toISOString().slice(11, 19), t); });
  await p.goto('https://blockwild3d.github.io/BlockWild/?v=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => typeof joinWorld === 'function', null, { timeout: 120000 });
  await p.evaluate(() => { try { localStorage.setItem('blockwild_name', 'PingProbe'); } catch (e) {}
    let lag = 0, last = performance.now(); setInterval(() => { const n = performance.now(); lag = Math.max(lag, n - last - 100); last = n; }, 100);
    const rt = []; onPeerMsg = function (peer, m) { if (m && m.t === 'pong' && m.pr) rt.push(Math.round(performance.now() - m.ts)); else if (m && m.t === 'ping') peer.link.send({ t: 'pong', ts: m.ts }, true); };
    joinWorld('BLOCK1');
    let k = 0; const iv = setInterval(() => { const h = MP.peers.get('host'); if (!h) return; h.link.send({ t: 'ping', ts: performance.now(), pr: 1 }, true); h.link.send({ t: 'ping', ts: performance.now(), pr: 1 }, false);
      if (++k % 6 === 0) { console.log('PROBE rtts ' + rt.join(',') + '  myLag ' + Math.round(lag)); rt.length = 0; lag = 0; } }, 500); });
  await new Promise(r => setTimeout(r, 40000));
  await ctx.close(); process.exit(0);
})();

const { chromium } = require('playwright');
(async () => {
  const ctx = await chromium.launchPersistentContext('/tmp/stalldata' + Date.now(), { headless: true, viewport: { width: 320, height: 240 }, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--mute-audio', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = ctx.pages()[0];
  p.on('console', m => { const t = m.text(); if (/^\[server\]|^SLOW|^HEAP/.test(t)) console.log(new Date().toISOString().slice(11, 19), t.slice(0, 300)); });
  p.on('crash', () => console.log('CRASH'));
  await p.goto('http://localhost:8765/?server=1&code=ZZSTAL', { waitUntil: 'load', timeout: 300000 });
  await p.waitForFunction(() => typeof MP !== 'undefined' && MP.active, null, { timeout: 300000, polling: 2000 });
  await p.evaluate(() => {
    const stack = [];
    const wrapFn = (owner, k, label) => { const f = owner[k]; if (typeof f !== 'function' || f.__w) return; const g = function (...a) { const t0 = performance.now(); stack.push(label); try { return new.target ? Reflect.construct(f, a, new.target) : f.apply(this, a); } finally { stack.pop(); const d = performance.now() - t0; if (d > 1000) console.log('SLOW ' + label + ' ' + Math.round(d) + 'ms  inside: ' + stack.join(' > ')); } }; g.__w = 1; Object.defineProperty(g, 'name', { value: f.name }); try { owner[k] = g; } catch (e) { } };
    for (const k of Object.keys(window)) { try { const v = window[k]; if (typeof v === 'function' && !/^[A-Z]/.test(k) && !/^(on|webkit|set|clear|request|cancel|fetch|alert|confirm|prompt|atob|btoa|queue|structured|post|get|scroll|open|close|print|stop|focus|blur|move|resize|find|capture|release|create|report)/.test(k)) wrapFn(window, k, k); } catch (e) { } }
    for (const [o, n] of [[World.prototype, 'World'], [Mob.prototype, 'Mob']]) for (const k of Object.getOwnPropertyNames(o)) { if (k === 'constructor') continue; const d = Object.getOwnPropertyDescriptor(o, k); if (d && typeof d.value === 'function') wrapFn(o, k, n + '.' + k); }
    setInterval(() => console.log('HEAP ' + Math.round(performance.memory.usedJSHeapSize / 1e6) + 'MB mobs ' + G.mobs.length + ' items ' + G.items.length + ' chunks ' + world.chunks.size + ' particles ' + (Particles.list ? Particles.list.length : '?')), 60000);
  });
  console.log('instrumented');
  await new Promise(r => setTimeout(r, 40 * 60 * 1000));
  await ctx.close();
})().catch(e => console.log('ERR', e.message));

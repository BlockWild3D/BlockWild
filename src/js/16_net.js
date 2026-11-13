// ================= NETWORK: tiny MQTT-over-WebSocket client (matchmaking only) + WebRTC peer links =================
// Players find each other through free public MQTT brokers (only the connection offer/answer passes through them);
// after that, all game traffic goes directly between browsers over WebRTC data channels. No game server is needed.
class Mqtt {
  constructor(url) { this.url = url; this.ws = null; this.buf = new Uint8Array(0); this.handlers = []; this.pid = 1; this.ok = false; }
  static enc(s) { return new TextEncoder().encode(s); }
  static rl(n) { const out = []; do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0); return out; }
  static str(s) { const b = Mqtt.enc(s); return [b.length >> 8, b.length & 255, ...b]; }
  send(type, body) { if (this.ws && this.ws.readyState === 1) this.ws.send(new Uint8Array([type, ...Mqtt.rl(body.length), ...body])); }
  connect(timeout = 6000) {
    return new Promise((res, rej) => {
      let done = false; const fail = (e) => { if (!done) { done = true; rej(e); try { this.ws.close(); } catch (x) { } } };
      try { this.ws = new WebSocket(this.url, 'mqtt'); } catch (e) { return fail(e); }
      this.ws.binaryType = 'arraybuffer'; const t = setTimeout(() => fail(new Error('timeout')), timeout);
      this.ws.onopen = () => { const id = 'bw' + Math.random().toString(36).slice(2, 12); this.send(0x10, [...Mqtt.str('MQTT'), 4, 2, 0, 60, ...Mqtt.str(id)]); };
      this.ws.onerror = () => fail(new Error('socket error')); this.ws.onclose = () => { this.ok = false; if (!done) fail(new Error('closed')); };
      this.ws.onmessage = (ev) => {
        const nb = new Uint8Array(ev.data); const b = new Uint8Array(this.buf.length + nb.length); b.set(this.buf); b.set(nb, this.buf.length); this.buf = b;
        for (;;) {
          if (this.buf.length < 2) break; let mul = 1, len = 0, i = 1, byte;
          do { if (i >= this.buf.length) return; byte = this.buf[i++]; len += (byte & 127) * mul; mul *= 128; } while (byte & 128);
          if (this.buf.length < i + len) break; const head = this.buf[0], p = this.buf.slice(i, i + len); this.buf = this.buf.slice(i + len);
          const type = head >> 4;
          if (type === 2) { if (p[1] === 0) { this.ok = true; done = true; clearTimeout(t); this.ping = setInterval(() => this.send(0xC0, []), 30000); res(this); } else fail(new Error('refused')); }
          else if (type === 3) { const tl = (p[0] << 8) | p[1]; const topic = new TextDecoder().decode(p.slice(2, 2 + tl)); let off = 2 + tl; if ((head >> 1) & 3) off += 2; const msg = new TextDecoder().decode(p.slice(off)); for (const h of this.handlers) h(topic, msg); }
        }
      };
    });
  }
  subscribe(topic) { const id = this.pid++; this.send(0x82, [id >> 8, id & 255, ...Mqtt.str(topic), 0]); }
  publish(topic, msg) { this.send(0x30, [...Mqtt.str(topic), ...Mqtt.enc(msg)]); }
  on(fn) { this.handlers.push(fn); }
  close() { clearInterval(this.ping); try { this.send(0xE0, []); this.ws.close(); } catch (e) { } }
}
async function connectBrokers(all) {
  const tries = CONFIG.mqttBrokers.map(u => new Mqtt(u).connect().then(m => m, () => null));
  if (all) return (await Promise.all(tries)).filter(Boolean);
  return (await Promise.all(tries)).filter(Boolean);
}
function waitIce(pc, ms = 3500) { return new Promise((res) => { if (pc.iceGatheringState === 'complete') return res(); const t = setTimeout(res, ms); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); }); }
// ---- matchmaking through your own Cloudflare Worker (CONFIG.serverUrl): short HTTP messages stored in D1 ----
const SERVER = () => String(CONFIG.serverUrl || '').replace(/\/$/, '');
class WorkerSignal {
  constructor(room, me) { this.room = room; this.me = me; this.after = 0; this.handlers = []; this.on = true; }
  async api(path, body) {
    const r = await fetch(SERVER() + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || ('server answered ' + r.status)); return j;
  }
  send(to, obj) { return this.api('/signal/send', { room: this.room, from: this.me, to, data: JSON.stringify(obj) }).catch(e => console.warn('signal send', e)); }
  listen(fn, ms = 1000) { this.handlers.push(fn); if (this.looping) return; this.looping = true;
    const loop = async () => { if (!this.on) return; try { const j = await this.api('/signal/poll?room=' + this.room + '&me=' + encodeURIComponent(this.me) + '&after=' + this.after); for (const m of j.msgs || []) { this.after = Math.max(this.after, m.id); for (const h of this.handlers) h(m.from, m.data); } } catch (e) { this.lastError = e; } if (this.on) this.timer = setTimeout(loop, ms); };
    loop(); }
  close() { this.on = false; clearTimeout(this.timer); }
}
// STUN + (when the Worker has a Cloudflare TURN key) TURN relays, so players on strict networks can still connect
async function getIceServers() {
  if (SERVER()) { try { const r = await fetch(SERVER() + '/ice', { cache: 'no-store' }); const j = await r.json(); if (Array.isArray(j.iceServers) && j.iceServers.length) return j.iceServers; } catch (e) { } }
  return CONFIG.iceServers;
}
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newRoomCode() { let s = ''; for (let i = 0; i < 6; i++) s += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)]; return s; }
const TOPIC = (code) => 'blockwild/v1/' + code.toUpperCase();
// a connection to one other player: reliable channel 'r' (world, chat, blocks) and fast channel 'u' (positions, mobs)
class PeerLink {
  constructor(pc, onMsg, onClose) { this.pc = pc; this.onMsg = onMsg; this.onClose = onClose; this.parts = {}; this.closed = false; this.ready = new Promise(r => this._ready = r);
    pc.addEventListener('connectionstatechange', () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) this.close(); }); }
  attach(ch) { ch.binaryType = 'arraybuffer'; if (ch.label === 'r') { this.rc = ch; ch.onopen = () => this._ready(); if (ch.readyState === 'open') this._ready(); } else this.uc = ch;
    ch.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.t === 'part') { const P = this.parts[m.id] = this.parts[m.id] || []; P[m.i] = m.d; if (P.filter(x => x !== undefined).length === m.n) { delete this.parts[m.id]; try { this.onMsg(JSON.parse(P.join(''))); } catch (x) { console.error(x); } } return; } try { this.onMsg(m); } catch (x) { console.error(x); } };
    ch.onclose = () => this.close(); }
  send(m, fast) {
    const ch = fast && this.uc && this.uc.readyState === 'open' ? this.uc : this.rc; if (!ch || ch.readyState !== 'open') return;
    const s = JSON.stringify(m);
    if (s.length < 15000 || ch === this.uc) { if (ch === this.uc && s.length > 60000) return; try { ch.send(s); } catch (e) { } return; }
    const id = Math.random().toString(36).slice(2, 9), n = Math.ceil(s.length / 15000); for (let i = 0; i < n; i++) try { ch.send(JSON.stringify({ t: 'part', id, i, n, d: s.slice(i * 15000, (i + 1) * 15000) })); } catch (e) { }
  }
  close() { if (this.closed) return; this.closed = true; try { this.pc.close(); } catch (e) { } if (this.onClose) this.onClose(); }
}

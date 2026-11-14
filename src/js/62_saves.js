// ================= WORLDS: MANY SAVES, KEPT SAFELY =================
// Minecraft-style world list: create, play, rename, copy, delete, export and import worlds.
// Where they live: IndexedDB in this browser (no 5 MB localStorage limit), and, when the game runs as a Claude
// artifact, also in the player's own private space in the artifact's database, so worlds survive a cleared browser
// and follow the player to other devices. Cloud copies are gzip-compressed and split into 180 KB parts (each
// document is capped at 256 KB); a save writes the new parts first, then points the world at them, then deletes the
// old parts, so a save that is cut off part-way never damages the previous one.
// The old single save ('blockwild_save' in localStorage) becomes a world called "My World" the first time.
const Saves = {
  metas: new Map(), ready: false, cloud: null, uid: null, cloudState: 'none', lastCloud: 0, busy: null, pending: null,
  newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  // ---------- this browser ----------
  open() {
    if (this._open) return this._open;
    this._open = new Promise(res => { try { const r = indexedDB.open('blockwild', 1); r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); if (!d.objectStoreNames.contains('data')) d.createObjectStore('data'); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null); setTimeout(() => res(null), 4000); } catch (e) { res(null); } });
    return this._open;
  },
  async tx(stores, mode, fn) { const d = await this.open(); if (!d) throw new Error('no idb'); return new Promise((res, rej) => { const t = d.transaction(stores, mode); let out; Promise.resolve(fn(t)).then(v => out = v); t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('aborted')); }); },
  req: (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
  async localPut(meta, json) {
    try { await this.tx(['meta', 'data'], 'readwrite', (t) => { t.objectStore('meta').put(meta, meta.id); t.objectStore('data').put(json, meta.id); }); return true; }
    catch (e) { try { localStorage.setItem('bw_data_' + meta.id, json); localStorage.setItem('bw_meta_' + meta.id, JSON.stringify(meta)); return true; } catch (e2) { return false; } }
  },
  async localGet(id) {
    try { const j = await this.tx(['data'], 'readonly', (t) => this.req(t.objectStore('data').get(id))); if (j) return j; } catch (e) { }
    try { return localStorage.getItem('bw_data_' + id); } catch (e) { return null; }
  },
  async localDel(id) { try { await this.tx(['meta', 'data'], 'readwrite', (t) => { t.objectStore('meta').delete(id); t.objectStore('data').delete(id); }); } catch (e) { } try { localStorage.removeItem('bw_data_' + id); localStorage.removeItem('bw_meta_' + id); } catch (e) { } },
  async localList() {
    const out = []; try { const [keys, vals] = await this.tx(['meta'], 'readonly', (t) => Promise.all([this.req(t.objectStore('meta').getAllKeys()), this.req(t.objectStore('meta').getAll())])); vals.forEach((m, i) => { if (m) out.push(Object.assign({}, m, { id: keys[i] })); }); } catch (e) { }
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('bw_meta_')) { const m = JSON.parse(localStorage.getItem(k)); if (m && !out.some(o => o.id === m.id)) out.push(m); } } } catch (e) { }
    return out;
  },
  // ---------- the player's Claude account (artifact database) ----------
  col() { return this.cloud.collection('data/users/' + this.uid); },
  async initCloud() {
    if (!(window.claude && typeof window.claude.use === 'function')) return;
    this.cloudState = 'connecting'; renderWorlds();
    try { const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); const uid = user && await user.id();
      if (!db || !uid) { this.cloudState = 'none'; renderWorlds(); return; } this.cloud = db; this.uid = uid;
      const snap = await Promise.race([this.col().get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]);
      for (const d of snap.docs) { if (!d.id.startsWith('w_')) continue; const m = d.data(); if (!m || !m.id) continue; const cur = this.metas.get(m.id); const c = { id: m.id, name: m.name, seed: m.seed, mode: m.mode, day: m.day, last: m.last, size: m.size, ico: m.ico };
        if (!cur) this.metas.set(m.id, Object.assign(c, { cloud: m.last, local: 0 })); else { cur.cloud = m.last; if ((m.last || 0) > (cur.last || 0)) Object.assign(cur, c, { cloud: m.last, local: cur.local }); } }
      this.cloudState = 'on';
    } catch (e) { console.warn('cloud saves', e); this.cloudState = 'error'; }
    renderWorlds();
  },
  async cloudPut(meta, json) {
    const enc = await gzEncode(json); const body = enc || json; const parts = []; for (let i = 0; i < body.length; i += 180000) parts.push(body.slice(i, i + 180000));
    const wref = this.col().doc('w_' + meta.id), rev = this.newId();
    for (let i = 0; i < parts.length; i++) await wref.collection('p').doc(rev + '_' + i).set({ d: parts[i] });
    let prev = null; try { const o = await wref.get(); if (o.exists) prev = o.data(); } catch (e) { }
    await wref.set(Object.assign({}, meta, { rev, parts: parts.length, enc: enc ? 'gz64' : 'raw' }));
    if (prev && prev.rev && prev.rev !== rev) for (let i = 0; i < (prev.parts || 0); i++) { try { await wref.collection('p').doc(prev.rev + '_' + i).delete(); } catch (e) { } }
  },
  async cloudGet(id) {
    const wref = this.col().doc('w_' + id); const o = await wref.get(); if (!o.exists) return null; const m = o.data(); let body = '';
    for (let i = 0; i < m.parts; i++) { const p = await wref.collection('p').doc(m.rev + '_' + i).get(); if (!p.exists) throw new Error('missing part'); body += p.data().d; }
    return m.enc === 'gz64' ? gzDecode(body) : body;
  },
  async cloudDel(id) { const wref = this.col().doc('w_' + id); try { const o = await wref.get(); if (o.exists) { const m = o.data(); await wref.delete(); for (let i = 0; i < (m.parts || 0); i++) { try { await wref.collection('p').doc(m.rev + '_' + i).delete(); } catch (e) { } } } } catch (e) { } },
  queueCloud(meta, json, notify) {
    if (!this.cloud) return; if (this.busy) { this.pending = [meta, json, notify]; return; }
    this.lastCloud = Date.now();
    this.busy = this.cloudPut(meta, json).then(() => { const m = this.metas.get(meta.id); if (m) m.cloud = meta.last; if (notify) toast('World saved to your Claude account too', 1.5); },
      (e) => { console.warn('cloud save', e); if (notify || !this._warned) { this._warned = true; toast(e && e.code === 'quota_exceeded' ? 'Account storage is full: the world is only saved in this browser' : 'Could not reach your Claude account: the world is saved in this browser', 3); } })
      .then(() => { this.busy = null; if (this.pending) { const p = this.pending; this.pending = null; this.queueCloud(p[0], p[1], p[2]); } renderWorlds(); });
  },
  // ---------- saving and loading ----------
  store(data, notify, forceCloud) {
    if (!S.worldId) S.worldId = this.newId(); data.name = S.worldName || 'New World'; data.wid = S.worldId;
    const json = JSON.stringify(data);
    const meta = { id: S.worldId, name: data.name, seed: data.seed, mode: data.mode, day: data.day, last: Date.now(), size: json.length, ico: worldIcon(data) };
    const cur = this.metas.get(meta.id) || {}; this.metas.set(meta.id, Object.assign(cur, meta, { local: meta.last }));
    const p = this.localPut(meta, json).then(ok => { if (notify) toast(ok ? 'World saved' : 'Could not save in this browser', ok ? 1.5 : 3); if (!ok) { const m = this.metas.get(meta.id); if (m) m.local = 0; } return ok; });
    if (this.cloud && (notify || forceCloud || !this.lastCloud || Date.now() - this.lastCloud > 120000 || S._quitting)) this.queueCloud(meta, json, notify);
    return p;
  },
  async read(id) { // the newest copy of a world
    const m = this.metas.get(id); if (!m) return null; let json = null;
    const cloudFirst = this.cloud && m.cloud && (m.cloud || 0) > (m.local || 0);
    if (!cloudFirst) json = await this.localGet(id);
    if (!json && this.cloud && m.cloud) try { json = await this.cloudGet(id); } catch (e) { console.warn(e); }
    if (!json && cloudFirst) json = await this.localGet(id);
    return json ? JSON.parse(json) : null;
  },
  async remove(id) { this.metas.delete(id); await this.localDel(id); if (this.cloud) await this.cloudDel(id); },
  async init() {
    for (const m of await this.localList()) this.metas.set(m.id, Object.assign({}, m, { local: m.last }));
    try { const old = localStorage.getItem('blockwild_save'); // the old single save becomes "My World"
      if (old) { const d = JSON.parse(old); const id = 'old' + this.newId(); d.name = d.name || 'My World'; d.wid = id; const meta = { id, name: d.name, seed: d.seed, mode: d.mode, day: d.day, last: Date.now(), size: old.length, ico: worldIcon(d) };
        if (await this.localPut(meta, JSON.stringify(d))) { this.metas.set(id, Object.assign(meta, { local: meta.last })); localStorage.removeItem('blockwild_save'); } } } catch (e) { }
    this.ready = true; renderWorlds(); if (!$('worlds').classList.contains('hidden') && !this.metas.size && $('wCreate').classList.contains('hidden')) openCreate(); this.initCloud();
  },
};
async function gzEncode(str) {
  if (typeof CompressionStream === 'undefined') return null;
  try { const s = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); const u = new Uint8Array(await new Response(s).arrayBuffer()); let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(bin); } catch (e) { return null; }
}
async function gzDecode(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const s = new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip')); return new Response(s).text(); }
function worldIcon(d) { const dim = d.dim || 'overworld'; return dim === 'nether' ? 'netherrack' : dim === 'end' ? 'end_stone' : d.mode === 'creative' ? 'diamond_block' : 'grass'; }
// a file the player keeps: through the artifact's download prompt when running in Claude, else a normal download
async function saveFile(filename, data) {
  if (window.claude && typeof window.claude.use === 'function') {
    const dl = await window.claude.use('downloads').catch(() => null);
    if (dl) { try { await dl.save({ filename, data }); return true; } catch (e) { if (e && e.code === 'declined') return false; if (e && e.code === 'rejected_extension' && !/\.txt$/.test(filename)) return saveFile(filename + '.txt', data); if (e && e.code === 'rate_limited') { toast('A download is already waiting for you', 2); return false; } } }
  }
  const blob = data instanceof Blob ? data : new Blob([data]); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return true;
}
// ---------- the world list screen ----------
let wSel = null, wDelArm = null;
function wMsg(t) { $('wMsg').textContent = t || ''; }
function fmtWhen(t) { if (!t) return ''; const d = new Date(t), now = new Date(); const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (d.toDateString() === now.toDateString()) return 'today ' + hm; const y = new Date(now - 864e5); if (d.toDateString() === y.toDateString()) return 'yesterday ' + hm; return d.toLocaleDateString() + ' ' + hm; }
function renderWorlds() {
  if (!$('worlds') || $('worlds').classList.contains('hidden')) return;
  const L = $('wList'); L.innerHTML = '';
  const cs = Saves.cloudState; $('wNote').textContent = cs === 'on' ? 'Worlds are saved in this browser and in your Claude account, so they are kept even if this browser is cleared.' : cs === 'connecting' ? 'Connecting to your Claude account...' : cs === 'error' ? 'Your Claude account could not be reached, so worlds are saved in this browser only. Use Export to keep a copy as a file.' : 'Worlds are saved in this browser. Use Export to keep a copy as a file or move it to another device.';
  const list = [...Saves.metas.values()].sort((a, b) => (b.last || 0) - (a.last || 0));
  if (!Saves.ready) { L.innerHTML = '<div class="wempty">Loading worlds...</div>'; }
  else if (!list.length) { L.innerHTML = '<div class="wempty">No worlds yet. Create one to start playing.</div>'; }
  if (wSel && !Saves.metas.has(wSel)) wSel = null; if (!wSel && list.length) wSel = list[0].id;
  for (const m of list) {
    const it = document.createElement('div'); it.className = 'witem' + (m.id === wSel ? ' sel' : '');
    const ic = document.createElement('img'); ic.className = 'wbadge'; const bid = B[String(m.ico || 'grass').toUpperCase()]; if (bid != null && ICON[bid]) ic.src = ICON[bid]; it.appendChild(ic);
    const info = document.createElement('div'); info.className = 'wi';
    const n = document.createElement('div'); n.className = 'wn'; n.textContent = m.name || 'World'; info.appendChild(n);
    const d = document.createElement('div'); d.className = 'wd'; d.textContent = (m.mode === 'creative' ? 'Creative' : m.mode === 'adventure' ? 'Adventure' : m.mode === 'spectator' ? 'Spectator' : 'Survival') + (m.day ? ' - Day ' + m.day : '') + ' - Last played ' + fmtWhen(m.last) + (m.size ? ' - ' + (m.size > 1048576 ? (m.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(m.size / 1024)) + ' KB') : ''); info.appendChild(d);
    const w = document.createElement('div'); const inCloud = !!m.cloud && (m.cloud || 0) >= (m.last || 0) - 1000, inLocal = !!m.local;
    w.className = 'ws' + (Saves.cloud && !inCloud ? ' off' : ''); w.textContent = inLocal && inCloud ? 'Saved in this browser and your Claude account' : inCloud ? 'Saved in your Claude account' : Saves.cloud ? (Saves.busy ? 'Saved in this browser, uploading to your account...' : 'Saved in this browser (account copy updates as you play)') : 'Saved in this browser'; info.appendChild(w);
    it.appendChild(info);
    it.onclick = () => { wSel = m.id; wDelArm = null; $('btnWDelete').textContent = 'Delete'; renderWorlds(); };
    it.ondblclick = () => { wSel = m.id; playWorld(m.id); };
    L.appendChild(it);
  }
  for (const id of ['btnWPlay', 'btnWRename', 'btnWCopy', 'btnWDelete', 'btnWExport']) $(id).disabled = !wSel;
}
function openWorlds() { for (const s of ['menu']) show(s, false); show('worlds', true); show('wCreate', false); show('wRename', false); show('wMain', true); wMsg(''); wDelArm = null; $('btnWDelete').textContent = 'Delete'; renderWorlds(); if (Saves.ready && !Saves.metas.size) openCreate(); }
function openCreate() { show('wMain', false); show('wRename', false); show('wCreate', true); $('worldName').value = ''; let n = 'New World', k = 2; const names = new Set([...Saves.metas.values()].map(m => m.name)); while (names.has(n)) n = 'New World (' + (k++) + ')'; $('worldName').placeholder = n; $('seedInput').value = ''; setTimeout(() => $('worldName').focus(), 0); }
async function playWorld(id) {
  if (!id) return; Sfx.init(); wMsg('Loading world...');
  let data = null; try { data = await Saves.read(id); } catch (e) { console.warn(e); }
  if (!data) { wMsg('That world could not be read.'); return; }
  const m = Saves.metas.get(id); S.worldId = id; S.worldName = (m && m.name) || data.name || 'World'; wMsg(''); show('worlds', false); startWorld(data);
}
$('btnSingle').addEventListener('click', () => { Sfx.init(); openWorlds(); });
$('btnWBack').addEventListener('click', () => { show('worlds', false); show('menu', true); });
$('btnWPlay').addEventListener('click', () => playWorld(wSel));
$('btnWCreate').addEventListener('click', openCreate);
$('btnWCreateCancel').addEventListener('click', () => { show('wCreate', false); show('wMain', true); });
$('worldName').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('btnNew').click(); });
$('seedInput').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('btnNew').click(); });
// creating a world (replaces the earlier New World handler; Minecraft seed rules)
{ const btn = $('btnNew'); const fresh = btn.cloneNode(true); btn.parentNode.replaceChild(fresh, btn);
  fresh.addEventListener('click', () => { Sfx.init(); const seed = seedFromText($('seedInput').value); S.worldId = Saves.newId(); S.worldName = ($('worldName').value.trim() || $('worldName').placeholder || 'New World').slice(0, 32); show('worlds', false); startWorld({ v: 4, seed, mode: pendingMode }); }); }
$('btnWRename').addEventListener('click', () => { const m = Saves.metas.get(wSel); if (!m) return; show('wMain', false); show('wRename', true); $('worldRename').value = m.name || ''; setTimeout(() => { $('worldRename').focus(); $('worldRename').select(); }, 0); });
$('btnWRenameCancel').addEventListener('click', () => { show('wRename', false); show('wMain', true); });
$('worldRename').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('btnWRenameOk').click(); });
async function rewriteWorld(id, fn, newId) { // read, change, store under id (or a new id)
  const d = await Saves.read(id); if (!d) return false; fn(d); const keep = [S.worldId, S.worldName];
  S.worldId = newId || id; S.worldName = d.name; const m = Saves.metas.get(id); const last = m && m.last;
  const p = Saves.store(d, false, true);
  if (!newId && last) Saves.metas.get(id).last = last; [S.worldId, S.worldName] = keep; await p; return true;
}
$('btnWRenameOk').addEventListener('click', async () => { const name = $('worldRename').value.trim().slice(0, 32); if (!name || !wSel) return; wMsg('Renaming...'); const ok = await rewriteWorld(wSel, (d) => d.name = name); wMsg(ok ? '' : 'That world could not be read.'); show('wRename', false); show('wMain', true); renderWorlds(); });
$('btnWCopy').addEventListener('click', async () => { const m = Saves.metas.get(wSel); if (!m) return; wMsg('Copying...'); const nid = Saves.newId(); const ok = await rewriteWorld(wSel, (d) => d.name = (m.name || 'World') + ' - Copy', nid); if (ok) wSel = nid; wMsg(ok ? 'World copied' : 'That world could not be read.'); renderWorlds(); });
$('btnWDelete').addEventListener('click', async () => {
  const m = Saves.metas.get(wSel); if (!m) return;
  if (wDelArm !== wSel) { wDelArm = wSel; $('btnWDelete').textContent = 'Click again to delete'; wMsg('"' + (m.name || 'World') + '" will be lost forever' + (Saves.cloud ? ', from this browser and your Claude account' : '') + '. Export it first if you want a copy.'); return; }
  wDelArm = null; $('btnWDelete').textContent = 'Delete'; wMsg('Deleting...'); await Saves.remove(m.id); wSel = null; wMsg('Deleted "' + (m.name || 'World') + '"'); renderWorlds();
});
$('btnWExport').addEventListener('click', async () => { const m = Saves.metas.get(wSel); if (!m) return; wMsg('Preparing file...'); const d = await Saves.read(m.id); if (!d) { wMsg('That world could not be read.'); return; }
  d.blockwildWorld = 1; const name = (m.name || 'world').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'world'; const ok = await saveFile(name + '.json', JSON.stringify(d)); wMsg(ok ? 'Exported "' + m.name + '"' : ''); });
$('btnWImport').addEventListener('click', () => $('worldFile').click());
$('worldFile').addEventListener('change', async (e) => {
  const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; wMsg('Importing...');
  try { const u = new Uint8Array(await f.arrayBuffer()); let txt; if (u[0] === 0x1f && u[1] === 0x8b) txt = await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); else txt = new TextDecoder().decode(u);
    const d = JSON.parse(txt); if (!d || typeof d !== 'object' || d.seed == null || (!d.worlds && !d.edits && !d.player)) throw new Error('not a world');
    const nid = Saves.newId(); d.name = String(d.name || f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ') || 'Imported World').slice(0, 32); delete d.blockwildWorld;
    const keep = [S.worldId, S.worldName]; S.worldId = nid; S.worldName = d.name; const p = Saves.store(d, false, true); [S.worldId, S.worldName] = keep; await p;
    wSel = nid; wMsg('Imported "' + d.name + '"'); renderWorlds();
  } catch (err) { console.warn(err); wMsg('That file is not a Blockwild world.'); }
});
// starting any world hides the list; worlds started some other way (joining a friend) get no slot of their own
{ const _sw = startWorld; startWorld = function (data) { show('worlds', false); if (!S.worldId) { S.worldId = data.wid || Saves.newId(); S.worldName = data.name || 'New World'; } return _sw.apply(this, arguments); }; }
{ const _q = quitToTitle; quitToTitle = function () { const r = _q.apply(this, arguments); S.worldId = null; S.worldName = null; return r; }; }
// leaving or quitting: the cloud copy is brought up to date too
{ const b = $('btnQuit'); const fresh = b.cloneNode(true); b.parentNode.replaceChild(fresh, b); fresh.addEventListener('click', () => { S._quitting = true; saveGame(false); S._quitting = false; quitToTitle(); }); }
Saves.init();

// ================= RECIPE BOOK ON/OFF (pause menu setting, remembered on this device) =================
// Off hides the Recipe Book button and panel everywhere (Creative still shows its item palette). The book's
// open/closed state is remembered too.
try { const s = JSON.parse(localStorage.getItem('blockwild_settings') || '{}'); S.bookOn = s.book !== false; if (s.bookOpen != null) bookOpen = !!s.bookOpen; } catch (e) { S.bookOn = true; }
{ const _ss = saveSettings; saveSettings = function () { _ss.apply(this, arguments); try { const s = JSON.parse(localStorage.getItem('blockwild_settings') || '{}'); s.book = S.bookOn; s.bookOpen = bookOpen; localStorage.setItem('blockwild_settings', JSON.stringify(s)); } catch (e) { } }; }
function applyBookSetting() {
  const on = S.bookOn; for (const id of ['btnBook', 'btnBook2']) { const el = $(id); if (el) el.style.display = on ? '' : 'none'; }
  const tab = $('invTabs').querySelector('[data-t="craft"]'); if (tab) tab.style.display = on ? '' : 'none';
  for (const b of $('bookSeg').children) b.classList.toggle('on', (b.dataset.m === 'on') === on);
  if (S.uiOpen && S.uiOpen !== 'chat' && S.uiOpen !== 'panel') { if (!on) { if (S.mode === 'creative') setTab('creative'); else show('rightPanel', false); } else { show('rightPanel', bookOpen || S.mode === 'creative'); renderBook(); } }
}
for (const b of $('bookSeg').children) b.addEventListener('click', () => { S.bookOn = b.dataset.m === 'on'; applyBookSetting(); saveSettings(); });
{ const _tb = toggleBook; toggleBook = function () { if (!S.bookOn) return; const r = _tb.apply(this, arguments); saveSettings(); return r; }; }
{ const _ou = openUI; openUI = function (kind, key) { const r = _ou(kind, key); if (!S.bookOn && kind !== 'panel') { if (S.mode === 'creative') setTab('creative'); else show('rightPanel', false); } applyBookSetting(); return r; }; }
{ const _st = setTab; setTab = function (t) { if (!S.bookOn && t === 'craft' && S.mode === 'creative') t = 'creative'; return _st(t); }; }
applyBookSetting();

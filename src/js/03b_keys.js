// ================= KEY BINDINGS (changeable in Controls) =================
const KB_DEFAULT = { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', sneak: 'ShiftLeft', sprint: 'ControlLeft', inventory: 'KeyE', drop: 'KeyQ', swap: 'KeyX', chat: 'KeyT', command: 'Slash', pov: 'F5', fly: 'KeyF', book: 'KeyR', debug: 'F3' };
const KB_LABEL = { forward: 'Walk forward', back: 'Walk backward', left: 'Strafe left', right: 'Strafe right', jump: 'Jump / swim up', sneak: 'Sneak (fly down)', sprint: 'Sprint (or double-tap forward)', inventory: 'Inventory', drop: 'Drop item', swap: 'Swap item to offhand', chat: 'Open chat', command: 'Open command', pov: 'Change camera view', fly: 'Toggle flying (Creative)', book: 'Recipe book (in inventory)', debug: 'Debug screen' };
const KB = Object.assign({}, KB_DEFAULT);
try { Object.assign(KB, JSON.parse(localStorage.getItem('blockwild_keys') || '{}')); } catch (e) { }
function saveKB() { try { localStorage.setItem('blockwild_keys', JSON.stringify(KB)); } catch (e) { } }
// held-down test for an action; the ShiftLeft/ControlLeft defaults also accept the right-hand key
function kd(action) { const c = KB[action]; if (!c) return false; if (keys[c]) return true; if (c === 'ShiftLeft') return !!keys.ShiftRight; if (c === 'ControlLeft') return !!keys.ControlRight; return false; }
function isKey(code, action) { const c = KB[action]; return code === c || (c === 'ShiftLeft' && code === 'ShiftRight') || (c === 'ControlLeft' && code === 'ControlRight'); }
function keyName(code) {
  if (!code) return '(none)'; const m = { Space: 'Space', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Left Alt', AltRight: 'Right Alt', Slash: '/', Backquote: '`', Tab: 'Tab', Enter: 'Enter', CapsLock: 'Caps Lock', Backspace: 'Backspace', Comma: ',', Period: '.', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backslash: '\\', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };
  if (m[code]) return m[code]; if (code.startsWith('Key')) return code.slice(3); if (code.startsWith('Digit')) return code.slice(5); if (code.startsWith('Numpad')) return 'Num ' + code.slice(6); return code;
}

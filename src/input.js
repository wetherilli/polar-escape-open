// e.code(물리 키) 기준이라 한/영 입력 상태와 무관하게 동작한다.
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Enter: 'action', NumpadEnter: 'action', KeyF: 'action', // 조사·결정 (작가 지침 2026-10-04: Enter · F)
  ShiftLeft: 'run', ShiftRight: 'run',                     // 달리기 (스태미나를 쓴다)
  Escape: 'cancel', KeyQ: 'cancel',
  KeyL: 'light',                                           // 손전등 켜기·끄기 (작가 지침 2026-10-04)
  KeyE: 'items',                                           // 소지품 (작가 지침 2026-10-04)
};
const DIR_KEYS = ['up', 'down', 'left', 'right'];

const held = new Set();
const pressed = new Set();
const dirStack = []; // 가장 최근에 누른 방향이 맨 뒤
let tappedDir = null; // 프레임 사이에 눌렀다 뗀 방향(짧은 탭 유실 방지)

function dropDir(k) {
  const i = dirStack.indexOf(k);
  if (i >= 0) dirStack.splice(i, 1);
}

window.addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (e.repeat) return;
  held.add(k);
  pressed.add(k);
  if (DIR_KEYS.includes(k)) { dropDir(k); dirStack.push(k); tappedDir = k; }
});

window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  held.delete(k);
  dropDir(k);
});

window.addEventListener('blur', () => {
  held.clear();
  dirStack.length = 0;
});

export const input = {
  down: (k) => held.has(k),
  pressed: (k) => pressed.has(k),
  dir: () => dirStack[dirStack.length - 1] ?? tappedDir,
  endFrame() { pressed.clear(); tappedDir = null; },
};

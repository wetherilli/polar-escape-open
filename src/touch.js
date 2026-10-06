// 화면 버튼 — 휴대폰·태블릿용. 왼쪽 방향 패드, 오른쪽 조사·메뉴·소지품·손전등·달리기.
// 버튼은 키보드와 같은 키 신호(keydown/keyup, e.code)를 보내므로 input.js는 그대로다.
// 터치 기기면 저절로 켜지고, 설정의 「화면 버튼」(prefs.touch)으로 켜고 끈다.
// 세로 화면: 게임 화면 아래에 / 가로 화면: 게임 화면 위에 반투명하게 겹친다.

import { prefs } from './prefs.js?v=0.31.0';

const send = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
// 손가락이 버튼 밖으로 미끄러져도 떼는 것을 받도록 붙잡는다. 못 붙잡아도(시험용 가짜 이벤트 등) 버튼은 동작한다
const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch { /* 무시 */ } };

const STYLE = `
  body.touch { flex-direction: column; justify-content: flex-start; touch-action: none; user-select: none; -webkit-user-select: none; }
  body.touch canvas { width: min(100vw, calc((100vh - 200px) * 4 / 3)); }
  #touch { display: none; }
  body.touch #touch { display: flex; justify-content: space-between; align-items: center; gap: 12px;
    width: 100%; max-width: 680px; padding: 14px 18px; box-sizing: border-box; flex: 1; }
  #touch * { -webkit-tap-highlight-color: transparent; }
  #pad { position: relative; width: 150px; height: 150px; border-radius: 50%; background: rgba(140, 160, 200, 0.16);
    border: 2px solid rgba(160, 180, 220, 0.35); touch-action: none; flex: none; }
  #pad i { position: absolute; width: 0; height: 0; border: 11px solid transparent; opacity: 0.6; }
  #pad i.on { opacity: 1; }
  #pad .up { left: 64px; top: 10px; border-bottom: 16px solid #d7deea; border-top: 0; }
  #pad .down { left: 64px; bottom: 10px; border-top: 16px solid #d7deea; border-bottom: 0; }
  #pad .left { top: 64px; left: 10px; border-right: 16px solid #d7deea; border-left: 0; }
  #pad .right { top: 64px; right: 10px; border-left: 16px solid #d7deea; border-right: 0; }
  #btns { display: grid; grid-template-columns: repeat(3, auto); grid-template-rows: auto auto; gap: 10px; align-items: center; justify-items: center; }
  #btns button { font: 13px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #d7deea; background: rgba(40, 52, 80, 0.75);
    border: 2px solid rgba(160, 180, 220, 0.45); border-radius: 50%; width: 52px; height: 52px; padding: 0; touch-action: none; }
  #btns button.big { width: 78px; height: 78px; font-size: 16px; grid-row: span 2; background: rgba(90, 70, 20, 0.8); border-color: #b08a2a; color: #ffd98a; }
  #btns button.down, #btns button.toggled { background: rgba(255, 217, 138, 0.35); color: #fff; }
  @media (orientation: landscape) {
    body.touch canvas { width: min(100vw, calc(100vh * 4 / 3)); }
    body.touch #touch { position: fixed; left: 0; right: 0; bottom: 0; max-width: none; flex: none; pointer-events: none; padding: 10px 16px; }
    body.touch #touch > * { pointer-events: auto; opacity: 0.6; }
  }
`;

// 방향 패드: 손가락 위치로 방향을 정하고, 손가락을 미끄러뜨리면 방향이 바뀐다
function makePad(pad) {
  const CODES = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  let cur = null;
  const set = (dir) => {
    if (dir === cur) return;
    if (cur) { send('keyup', CODES[cur]); pad.querySelector(`.${cur}`).classList.remove('on'); }
    cur = dir;
    if (cur) { send('keydown', CODES[cur]); pad.querySelector(`.${cur}`).classList.add('on'); }
  };
  const at = (e) => {
    const r = pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 16) return null; // 가운데는 멈춤
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); capture(pad, e); set(at(e)); });
  pad.addEventListener('pointermove', (e) => { if (pad.hasPointerCapture(e.pointerId)) set(at(e)); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(t, () => set(null));
}

// 누르고 있는 동안 키를 누른 것으로 (조사·메뉴·소지품·손전등)
function holdButton(btn, code) {
  const up = () => { if (btn.classList.contains('down')) { btn.classList.remove('down'); send('keyup', code); } };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); capture(btn, e); btn.classList.add('down'); send('keydown', code); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(t, up);
}

// 달리기: 한 번 누르면 켜지고 다시 누르면 꺼진다(Shift를 누르고 있는 것과 같다 — 걸으면서 따로 누르기 어려워서)
function toggleButton(btn, code) {
  let on = false;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    on = !on;
    btn.classList.toggle('toggled', on);
    send(on ? 'keydown' : 'keyup', code);
  });
}

export function setupTouch() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (prefs.touch == null) prefs.touch = !!coarse; // 설정에서 바꾸기 전에는 기기를 보고 정한다(저장은 안 함)

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'touch';
  box.innerHTML = `
    <div id="pad"><i class="up"></i><i class="down"></i><i class="left"></i><i class="right"></i></div>
    <div id="btns">
      <button data-code="Escape">메뉴</button><button data-code="KeyE">소지품</button><button class="big" data-code="Enter">조사</button>
      <button data-code="KeyL">손전등</button><button data-toggle="ShiftLeft">달리기</button>
    </div>`;
  document.body.appendChild(box);
  makePad(box.querySelector('#pad'));
  for (const b of box.querySelectorAll('button[data-code]')) holdButton(b, b.dataset.code);
  for (const b of box.querySelectorAll('button[data-toggle]')) toggleButton(b, b.dataset.toggle);
  box.addEventListener('contextmenu', (e) => e.preventDefault()); // 길게 누르면 뜨는 메뉴 막기
  syncTouch();
}

// 설정이 바뀌면 보이기·숨기기 (main.js가 프레임마다 부른다)
export function syncTouch() {
  document.body.classList.toggle('touch', !!prefs.touch);
}

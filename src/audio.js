// 소리 — 효과음과 BGM. 지금은 파일 없이 Web Audio로 합성하는 임시 소리입니다.
// ★ 교체 지점: 소리 파일이 생기면 FILES에 「이름: 'assets/sound/파일.ogg'」를 적으면 합성 대신 그 파일을 씁니다.
//
//  sfx(이름)   효과음 한 번   — SFX의 이름
//  bgm(이름)   배경음 바꾸기 — BGM의 이름, null이면 끔. 같은 이름이면 그대로 둔다
//  음량은 설정(타이틀 톱니바퀴 · 게임 중 메뉴의 설정 탭)에서 바꾸고 이 브라우저에 남는다(localStorage, 세이브와 따로).
//  브라우저는 사람이 키나 마우스를 누르기 전에는 소리를 못 내게 막으므로, 첫 입력 때 소리를 켠다.

export const FILES = {
  // 예: night: 'assets/sound/night.ogg', door: 'assets/sound/door.wav',
};

const SETTINGS_KEY = 'polar-escape/settings';
export const volume = { bgm: 0.5, sfx: 0.7 };
try { Object.assign(volume, JSON.parse(localStorage.getItem(SETTINGS_KEY))?.volume ?? {}); } catch { /* 저장소가 막혀도 기본값으로 */ }
export function setVolume(kind, v) {
  volume[kind] = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
  if (bgmGain) bgmGain.gain.value = volume.bgm;
  if (sfxGain) sfxGain.gain.value = volume.sfx;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ volume })); } catch { /* 무시 */ }
}

let ac = null, bgmGain = null, sfxGain = null;
function ready() {
  if (!ac) {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    bgmGain = ac.createGain(); bgmGain.gain.value = volume.bgm; bgmGain.connect(ac.destination);
    sfxGain = ac.createGain(); sfxGain.gain.value = volume.sfx; sfxGain.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume().then(startPendingBgm).catch(() => {});
  return ac;
}
// 첫 입력 때 소리를 깨운다 (자동 재생 막기 대응). 깨어나면 기다리던 BGM을 튼다
for (const ev of ['keydown', 'pointerdown']) window.addEventListener(ev, () => { ready(); startPendingBgm(); }, { passive: true });

// ── 합성 도우미 ──
// 음 하나: type 파형, f 주파수(끝 주파수 f2로 미끄러짐), 길이 d초, 세기 v
function tone(out, { type = 'square', f = 440, f2 = f, d = 0.1, v = 0.2, at = 0, attack = 0.005 }) {
  const t = ac.currentTime + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + d + 0.02);
}
let noiseBuf = null;
function noise(out, { d = 0.1, v = 0.2, at = 0, lp = 2000 }) {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + at;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf;
  f.type = 'lowpass'; f.frequency.value = lp;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f).connect(g).connect(out);
  s.start(t); s.stop(t + d + 0.02);
}

// ── 효과음 (합성) ──
const SFX = {
  cursor: (o) => tone(o, { f: 520, d: 0.04, v: 0.06 }),                                    // 메뉴·선택지 이동
  select: (o) => tone(o, { f: 760, d: 0.06, v: 0.08 }),                                    // 대화 넘김·결정
  open: (o) => { tone(o, { f: 440, d: 0.06, v: 0.07 }); tone(o, { f: 660, d: 0.08, v: 0.07, at: 0.05 }); }, // 메뉴 열기
  close: (o) => { tone(o, { f: 660, d: 0.06, v: 0.07 }); tone(o, { f: 440, d: 0.08, v: 0.07, at: 0.05 }); },
  item: (o) => [523, 659, 784].forEach((f, i) => tone(o, { type: 'triangle', f, d: 0.16, v: 0.16, at: i * 0.07 })), // 아이템 얻음
  quest: (o) => [392, 523, 659, 784].forEach((f, i) => tone(o, { type: 'triangle', f, d: 0.2, v: 0.14, at: i * 0.08 })), // 퀘스트·노트·도움 알림
  save: (o) => { tone(o, { type: 'sine', f: 880, d: 0.35, v: 0.15 }); tone(o, { type: 'sine', f: 1320, d: 0.45, v: 0.1, at: 0.12 }); },
  door: (o) => { tone(o, { type: 'sine', f: 140, f2: 70, d: 0.18, v: 0.3 }); noise(o, { d: 0.08, v: 0.12, lp: 900 }); },
  locked: (o) => { tone(o, { type: 'square', f: 110, d: 0.12, v: 0.08 }); tone(o, { type: 'square', f: 104, d: 0.12, v: 0.08, at: 0.13 }); },
  step: (o) => noise(o, { d: 0.05, v: 0.05, lp: 700 }),                                    // 발소리 (작게)
  caught: (o) => { tone(o, { type: 'sawtooth', f: 330, f2: 60, d: 0.7, v: 0.25 }); noise(o, { d: 0.5, v: 0.2, lp: 1500 }); },
  flash: (o) => noise(o, { d: 0.25, v: 0.18, lp: 5000 }),
  light: (o) => tone(o, { type: 'square', f: 1200, d: 0.03, v: 0.05 }),                    // 손전등 딸깍

  // ── 소동물 울음 (creatures.js의 sound) ── 가까이 가면 들린다. 크기는 거리에 따라 sfx(이름, 세기)
  cicadaHorse: (o) => { noise(o, { d: 1.6, v: 0.1, lp: 7000 }); tone(o, { type: 'sawtooth', f: 4200, d: 1.5, v: 0.025, attack: 0.3 }); }, // 쏴아아—
  cicadaRobust: (o) => { for (let i = 0; i < 5; i++) tone(o, { type: 'sawtooth', f: 3100, f2: 2500, d: 0.2, v: 0.05, at: i * 0.26, attack: 0.04 }); }, // 맴 맴 맴
  cicadaWalker: (o) => { for (let i = 0; i < 9; i++) tone(o, { type: 'sawtooth', f: 2600 + Math.random() * 1600, d: 0.08 + Math.random() * 0.1, v: 0.04, at: i * 0.16 }); }, // 이리저리 바꿔 가며
  cicadaAutumn: (o) => { for (let i = 0; i < 2; i++) { tone(o, { type: 'sawtooth', f: 3600, d: 0.22, v: 0.045, at: i * 0.7 }); tone(o, { type: 'sawtooth', f: 2900, f2: 2700, d: 0.34, v: 0.045, at: i * 0.7 + 0.24 }); } }, // 쓰름 쓰름
  cicadaKaempfer: (o) => { noise(o, { d: 1.3, v: 0.06, lp: 4500 }); tone(o, { type: 'square', f: 3000, d: 1.2, v: 0.015, attack: 0.2 }); }, // 지이이—
  cricket: (o) => { for (let g = 0; g < 2; g++) for (let i = 0; i < 3; i++) tone(o, { type: 'sine', f: 4600, d: 0.045, v: 0.07, at: g * 0.45 + i * 0.07 }); }, // 귀뚤귀뚤
  cricketSmall: (o) => { for (let i = 0; i < 4; i++) tone(o, { type: 'sine', f: 6200, d: 0.05, v: 0.045, at: i * 0.12 }); },
  katydid: (o) => { for (let i = 0; i < 10; i++) tone(o, { type: 'square', f: 7000, d: 0.02, v: 0.03, at: i * 0.035 }); }, // 찌르르
  katydidLong: (o) => { for (let i = 0; i < 26; i++) tone(o, { type: 'square', f: 6600, d: 0.02, v: 0.03, at: i * 0.035 }); }, // 찌르르르르—
  bulbul: (o) => { for (let i = 0; i < 2; i++) { tone(o, { type: 'sine', f: 2200, f2: 3400, d: 0.18, v: 0.09, at: i * 0.55 }); tone(o, { type: 'sine', f: 3200, f2: 2000, d: 0.24, v: 0.08, at: i * 0.55 + 0.18 }); } }, // 삐이요
  bulbulLight: (o) => [2800, 3300, 2600, 3500].forEach((f, i) => tone(o, { type: 'sine', f, f2: f * 1.1, d: 0.09, v: 0.07, at: i * 0.12 })),
  tit: (o) => { for (let g = 0; g < 2; g++) { tone(o, { type: 'sine', f: 5200, d: 0.05, v: 0.06, at: g * 0.5 }); tone(o, { type: 'sine', f: 5200, d: 0.05, v: 0.06, at: g * 0.5 + 0.09 }); tone(o, { type: 'sine', f: 3900, d: 0.16, v: 0.07, at: g * 0.5 + 0.2 }); } }, // 쯔쯔삐
  redstart: (o) => { for (let i = 0; i < 3; i++) { noise(o, { d: 0.03, v: 0.12, lp: 6000, at: i * 0.3 }); tone(o, { type: 'square', f: 3000, d: 0.025, v: 0.03, at: i * 0.3 }); } }, // 딱, 딱
  azureMagpie: (o) => { for (let i = 0; i < 3; i++) { noise(o, { d: 0.18, v: 0.1, lp: 3500, at: i * 0.32 }); tone(o, { type: 'sawtooth', f: 1400, f2: 1100, d: 0.18, v: 0.04, at: i * 0.32 }); } }, // 캐애 캐애
  woodpecker: (o) => { for (let i = 0; i < 16; i++) noise(o, { d: 0.02, v: 0.16 * (1 - i / 20), lp: 1800, at: i * 0.045 }); }, // 드르르르륵
  cat: (o) => { tone(o, { type: 'sawtooth', f: 520, f2: 860, d: 0.25, v: 0.05, attack: 0.05 }); tone(o, { type: 'sawtooth', f: 860, f2: 480, d: 0.35, v: 0.05, at: 0.24 }); }, // 야옹
  shutter: (o) => { noise(o, { d: 0.04, v: 0.25, lp: 6000 }); noise(o, { d: 0.05, v: 0.2, lp: 4000, at: 0.08 }); }, // 카메라 찰칵
};

const fileCache = new Map();
async function playFile(url, out, loop = false) {
  let buf = fileCache.get(url);
  if (!buf) {
    buf = await fetch(url).then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b));
    fileCache.set(url, buf);
  }
  const s = ac.createBufferSource();
  s.buffer = buf; s.loop = loop;
  s.connect(out); s.start();
  return s;
}

// gain = 이 소리만의 세기 0~1 (소동물 울음은 거리에 따라 작아진다)
export function sfx(name, gain = 1) {
  if (!ready() || volume.sfx <= 0 || gain <= 0) return;
  let out = sfxGain;
  if (gain < 1) { out = ac.createGain(); out.gain.value = gain; out.connect(sfxGain); setTimeout(() => out.disconnect(), 4000); }
  if (FILES[name]) { playFile(FILES[name], out).catch(() => {}); return; }
  SFX[name]?.(out);
}

// ── BGM (합성, 임시) ── 박자마다 다음 음을 미리 짜 둔다
//  notes: 박마다 [베이스, 화음…] (Hz). 0이면 쉼
const N = (s) => 440 * 2 ** ((s - 69) / 12); // MIDI 음 번호 → Hz
const BGM = {
  // 밤: 느린 패드, 어둡게
  night: { beat: 2.4, type: 'triangle', lp: 900, v: 0.07, chords: [[45, 57, 60, 64], [41, 53, 57, 60], [43, 55, 59, 62], [40, 52, 55, 59]] },
  // 타이틀: 밤과 같은 결, 조금 더 높게
  title: { beat: 2.8, type: 'sine', lp: 1400, v: 0.08, chords: [[57, 64, 69, 72], [53, 60, 65, 69], [55, 62, 67, 71], [52, 59, 64, 67]] },
  // 낮(오프닝): 밝은 아르페지오
  day: { beat: 0.35, type: 'triangle', lp: 2400, v: 0.06, arp: [60, 64, 67, 72, 67, 64, 62, 65, 69, 74, 69, 65] },
  // 추격: 빠른 베이스
  chase: { beat: 0.2, type: 'sawtooth', lp: 700, v: 0.08, arp: [40, 40, 52, 40, 41, 41, 53, 41] },
};
let current = null, pending = null, timer = null, step = 0, nextAt = 0, fileSrc = null, bgmBus = null;

function scheduleBgm() {
  const def = BGM[current];
  if (!def || !ac) return;
  while (nextAt < ac.currentTime + 0.5) {
    const at = nextAt - ac.currentTime;
    if (def.chords) {
      const ch = def.chords[step % def.chords.length];
      ch.forEach((n, i) => tone(bgmBus, { type: def.type, f: N(n), d: def.beat * 1.05, v: def.v * (i === 0 ? 1.2 : 0.7), at, attack: def.beat * 0.4 }));
    } else {
      const n = def.arp[step % def.arp.length];
      if (n) tone(bgmBus, { type: def.type, f: N(n), d: def.beat * 0.9, v: def.v, at, attack: 0.01 });
    }
    step++;
    nextAt += def.beat;
  }
}
function stopBgm() {
  clearInterval(timer); timer = null;
  try { fileSrc?.stop(); } catch { /* 이미 멈춤 */ }
  fileSrc = null;
  if (bgmBus) { const b = bgmBus; b.gain.setTargetAtTime(0.0001, ac.currentTime, 0.3); setTimeout(() => b.disconnect(), 1500); }
  bgmBus = null;
}
function startBgm(name) {
  stopBgm();
  current = name;
  if (!name) return;
  bgmBus = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = BGM[name]?.lp ?? 20000;
  bgmBus.connect(lp).connect(bgmGain);
  bgmBus.gain.setValueAtTime(0.0001, ac.currentTime);
  bgmBus.gain.setTargetAtTime(1, ac.currentTime, 0.4);
  if (FILES[name]) { playFile(FILES[name], bgmBus, true).then((s) => { if (current === name) fileSrc = s; else s.stop(); }).catch(() => {}); return; }
  step = 0; nextAt = ac.currentTime + 0.05;
  scheduleBgm();
  timer = setInterval(scheduleBgm, 200);
}
function startPendingBgm() {
  if (pending !== undefined && ac && ac.state !== 'suspended' && pending !== current) startBgm(pending);
}
export function bgm(name) {
  pending = name ?? null;
  if (pending === current) return;
  if (!ac || ac.state === 'suspended') return; // 첫 입력 때 시작
  startBgm(pending);
}

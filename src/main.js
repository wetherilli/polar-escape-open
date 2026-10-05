import { TILE, DIRS, MOVE_SPEED, RUN_SPEED, STAMINA_DRAIN, STAMINA_REGEN, STAMINA_RECOVER } from './config.js?v=0.21.2';
import { Chaser } from './chase.js?v=0.21.2';
import { sfx, bgm, volume, setVolume } from './audio.js?v=0.21.2';
import { input } from './input.js?v=0.21.2';
import { state, resetState, readSave, readAllSaves, hasAnySave, latestSlot, applySave, hasItem, curseEnv, helpMult } from './state.js?v=0.21.2';
import { World } from './world.js?v=0.21.2';
import { Player, Follower } from './player.js?v=0.21.2';
import { Dialog } from './dialog.js?v=0.21.2';
import { Menu } from './menu.js?v=0.21.2';
import { QUESTS } from './data/quests.js?v=0.21.2';
import { fader } from './fader.js?v=0.21.2';
import { createRunner } from './events.js?v=0.21.2';
import { START, MAPS } from './data/maps.js?v=0.21.2';
import { ENDINGS } from './data/endings.js?v=0.21.2';
import { PATCH, VERSION } from './data/patch.js?v=0.21.2';
import { camera, drawWorld, drawLighting, drawHUD, drawTitle, drawEnding, drawPicture, drawToast, drawChaseBorder, drawGameOver, drawBubbles, drawSettings, GEAR_BUTTON, drawSlots, SLOT_BOX } from './render.js?v=0.21.2';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// 장면: 'title' → 'play' → 'ending' → 'title'
const game = {
  scene: 'title',
  world: new World(),
  player: new Player(),
  dialog: new Dialog(ctx),
  menu: new Menu(),
  toasts: [],      // 화면 위 알림 { text, t }
  ending: null,
  time: 0,
  warmth: 1,       // 체온 0~1. cold 맵에서 떨어지고 밖에서 회복
  beamAngle: 0,    // 손전등이 비추는 각도 (라디안). 플레이어 방향을 따라 돈다
  stamina: 1,      // 스태미나 0~1. Shift로 달리면 줄고, 걷거나 서 있으면 찬다
  tired: false,    // 스태미나가 바닥났음 → STAMINA_RECOVER까지 차야 다시 달린다
  chase: null,     // 추격 중이면 { opts, chaser, maps, wakeAt, hidden, caught } (c.chase.start)
  follower: null,  // 동행자 (c.follow)
  picture: null,   // 전체 화면 그림 id (c.picture)
  shake: null,     // { until, power } (c.shake)
  blackout: false, // 정전 (c.lights(false))

  toast(text) { this.toasts.push({ text, t: 0 }); sfx('quest'); }, // 퀘스트·노트·도움·도감 알림

  follow(name, color) {
    this.follower = new Follower(this.player, name, color);
    this.follower.place(this.player.x, this.player.y, this.player.dir);
  },

  enterMap(mapId, anchor, dir) {
    this.clearBubbles();
    this.stopEventMoves();
    this.world.load(mapId);
    const a = this.world.anchor(anchor);
    dir = dir ?? this.world.entryDir(a);
    const d = DIRS[dir];
    this.player.place(a.x + d.x, a.y + d.y, dir);
    this.follower?.place(this.player.x, this.player.y, dir);
    // 추격 중: maps 안의 맵이면 추격자가 같은 문으로 조금 늦게 따라 들어온다. 밖이면 추격 끝
    const ch = this.chase;
    if (ch && ch.maps.includes(mapId)) {
      ch.chaser.place(this.player.x, this.player.y, dir);
      ch.hidden = true;
      ch.wakeAt = this.time + (ch.opts.follow ?? 1.5);
    } else if (ch) {
      this.chase = null;
    }
  },

  // ── 말풍선 (c.bubble, NPC chatter) ── 캐릭터 머리 위 짧은 혼잣말. 게임을 멈추지 않는다
  //  { who: player | 이벤트 객체, text, until, resolve }
  bubbles: [],
  clearBubbles() { this.bubbles.forEach((b) => b.resolve?.()); this.bubbles = []; },
  bubble(text, who = 'player', seconds) {
    const target = who === 'player' ? this.player : this.world.events.find((e) => e.id === who);
    if (!target) return Promise.resolve();
    const secs = seconds ?? Math.min(6, 1.6 + text.length * 0.08); // 길이에 맞춰 보여 주는 시간
    this.bubbles = this.bubbles.filter((b) => b.who !== target || (b.resolve?.(), false)); // 같은 사람의 이전 말풍선은 바꿈
    return new Promise((resolve) => this.bubbles.push({ who: target, text, until: this.time + secs, resolve }));
  },

  // ── NPC 이동 (c.move) ── 이벤트 하나를 dir 쪽으로 steps칸. 막히면 거기서 멈춤
  //  맵을 다시 들어오면 원래 자리로 돌아간다(이벤트 위치는 맵을 불러올 때마다 새로 정해짐)
  eventMoves: [],
  stopEventMoves() { this.eventMoves.forEach((m) => m.resolve()); this.eventMoves = []; },
  moveEvent(id, dir, steps) {
    const ev = this.world.events.find((e) => e.id === id);
    if (!ev || steps <= 0) return Promise.resolve();
    ev.dir = dir;
    return new Promise((resolve) => this.eventMoves.push({ ev, dir, left: steps, t: 1, resolve }));
  },

  // ── 화면 번쩍임 (c.flash) ──
  flash: null, // { color, until, dur }

  // ── 이벤트 중 걷기 (c.walk) ── 걷기가 끝나거나 막히면 resolve
  autoMove: null,
  walk(dir, steps) {
    if (steps <= 0) return Promise.resolve();
    return new Promise((resolve) => { this.autoMove = { dir, left: steps, resolve }; });
  },

  // ── 추격 (c.chase.start) ──
  startChase(opts) {
    let at = opts.at;
    if (typeof at === 'string') { // 앵커 글자 → 그 옆 빈 칸
      const a = this.world.anchor(at);
      const d = DIRS[this.world.entryDir(a)];
      at = { x: a.x + d.x, y: a.y + d.y };
    }
    const chaser = new Chaser(opts.who ?? 'shark', opts.speed ?? 3.5);
    chaser.place(at.x, at.y);
    this.chase = { opts, chaser, maps: opts.maps ?? [this.world.id], wakeAt: this.time + (opts.delay ?? 1), hidden: false, caught: false };
  },
  stopChase() { this.chase = null; },

  // 잡혔을 때: 게임 오버 → 마지막 세이브에서 다시 / 타이틀로
  over: { sel: 0, options: [] },
  gameOver() {
    this.chase = null;
    this.autoMove = null;
    this.scene = 'gameover';
    this.over.options = [
      ...(latestSlot() >= 0 ? [{ label: '마지막 세이브에서 다시', run: () => this.continueGame(latestSlot()) }] : []),
      { label: '타이틀로', run: () => this.openTitle() },
    ];
    this.over.sel = 0;
  },

  newGame() {
    resetState();
    Object.assign(state.flags, structuredClone(START.flags ?? {}));
    this.begin(START);
  },

  // ── 저장 슬롯 고르기 (3슬롯) ── mode 'save' | 'load'. 고른 슬롯 번호(0~2), 그만두면 null
  slots: null,
  pickSlot(mode) {
    const saves = readAllSaves();
    const sel = mode === 'load' ? Math.max(0, saves.findIndex(Boolean)) : Math.max(0, latestSlot());
    return new Promise((resolve) => { this.slots = { mode, saves, sel, resolve }; });
  },
  async loadFromSlot() {
    const slot = await this.pickSlot('load');
    if (slot !== null) this.continueGame(slot);
  },

  continueGame(slot) {
    const save = readSave(slot);
    if (!save) return this.newGame();
    applySave(save);
    this.begin(save);
  },

  begin({ map, x, y, dir }) {
    this.world.load(map);
    this.player.place(x, y, dir);
    this.scene = 'play';
    this.warmth = 1;
    this.stamina = 1;
    this.beamAngle = DIR_ANGLE[dir] ?? 0;
    this.tired = false;
    this.chase = null;
    this.autoMove = null;
    this.clearBubbles();
    this.stopEventMoves();
    this.flash = null;
    this.follower = null;
    this.picture = null;
    this.shake = null;
    this.blackout = false;
    this.toasts = [];
    this.menu.hide();
    fader.alpha = 1;
    runner.run(async (c) => {
      await fader.to(0);
      await this.world.def.onEnter?.(c);
    });
  },

  // 타이틀 메뉴. 세이브가 있으면 이어하기가 맨 위.
  title: { sel: 0, options: [], version: VERSION },
  openTitle() {
    this.scene = 'title';
    this.title.options = hasAnySave()
      ? [{ label: '이어하기', run: () => this.loadFromSlot() }, { label: '새로 시작', run: () => this.newGame() }]
      : [{ label: '새로 시작', run: () => this.newGame() }];
    this.title.sel = 0;
  },

  showEnding(id) {
    this.scene = 'ending';
    this.ending = ENDINGS[id];
  },
};

const runner = createRunner(game);

const hooks = {
  busy: () => runner.busy || game.dialog.active,
  onBump(x, y) {
    const ev = game.world.eventAt(x, y);
    if (ev?.trigger === 'touch') runner.run(ev.run);
  },
  onArrive(x, y) {
    const ev = game.world.eventAt(x, y);
    if (ev && !ev.solid && ev.trigger === 'touch') runner.run(ev.run);
  },
  onStep(x, y) { game.follower?.stepTo(x, y); stepSound(); },
};

function updatePlay(dt) {
  if (game.toasts.length && (game.toasts[0].t += dt) > TOAST_TIME) game.toasts.shift();
  updateBubbles();
  if (game.eventMoves.length) updateEventMoves(dt);
  if (game.dialog.active) return game.dialog.update(dt, input);
  if (game.menu.open) return game.menu.update(input);
  if (game.autoMove) return updateAutoMove(dt);
  if (runner.busy) return;
  if (updateCold(dt)) return;

  const p = game.player;
  // 추격 중에는 메뉴를 열 수 없다(메뉴가 열린 동안 시간이 멈추므로)
  if (!p.moving && input.pressed('cancel') && !game.chase) return game.menu.show();
  if (!p.moving && input.pressed('items') && !game.chase) return game.menu.show(true);
  if (input.pressed('light') && hasItem('flashlight')) { state.flags.flashlightOn = !state.flags.flashlightOn; sfx('light'); } // 세이브에 남는다
  p.update(dt, input.dir(), game.world, hooks, updateStamina(dt, p));
  if (!runner.busy && !p.moving && input.pressed('action')) {
    const f = p.front();
    const ev = game.world.eventAt(f.x, f.y);
    if (ev?.trigger === 'action') {
      if (ev.turnToPlayer) ev.dir = OPPOSITE[p.dir];
      runner.run(ev.run);
    }
  }
  if (!runner.busy) updateChase(dt);
}

// 말풍선: 시간이 다 된 것을 지우고, NPC 잡담(chatter)을 띄운다.
//  chatter: { lines: ['…'], every: 초(기본 7), range: 칸(기본 5) } 또는 줄 배열만.
//  플레이어가 range칸 안에 있고 대화·이벤트 중이 아닐 때, 대략 every초마다 한 줄씩 돌아가며 말한다.
function updateBubbles() {
  game.bubbles = game.bubbles.filter((b) => {
    if (game.time < b.until) return true;
    b.resolve?.();
    return false;
  });
  if (runner.busy || game.dialog.active || game.menu.open) return;
  const p = game.player;
  for (const ev of game.world.visibleEvents()) {
    if (!ev.chatter) continue;
    const ch = Array.isArray(ev.chatter) ? { lines: ev.chatter } : ev.chatter;
    const every = ch.every ?? 7;
    if (ev.chatterAt === undefined) ev.chatterAt = game.time + 1 + Math.random() * every; // 처음엔 조금 기다렸다가
    if (game.time < ev.chatterAt) continue;
    if (Math.abs(ev.x - p.x) + Math.abs(ev.y - p.y) > (ch.range ?? 5)) continue;
    ev.chatterIdx = ((ev.chatterIdx ?? -1) + 1) % ch.lines.length;
    game.bubble(ch.lines[ev.chatterIdx], ev.id);
    ev.chatterAt = game.time + every * (0.8 + Math.random() * 0.4);
  }
}

// NPC 이동: 한 칸씩 MOVE_SPEED로. 그리는 위치는 ev.px/py (render.js가 읽는다)
const NPC_SPEED = 4;
function updateEventMoves(dt) {
  game.eventMoves = game.eventMoves.filter((m) => {
    const ev = m.ev;
    if (m.t < 1) {
      m.t = Math.min(1, m.t + dt * NPC_SPEED);
      ev.px = ev.fx + (ev.x - ev.fx) * m.t;
      ev.py = ev.fy + (ev.y - ev.fy) * m.t;
      if (m.t < 1) return true;
    }
    const d = DIRS[m.dir], nx = ev.x + d.x, ny = ev.y + d.y;
    const blocked = game.world.isBlocked(nx, ny) || (game.player.x === nx && game.player.y === ny);
    if (m.left <= 0 || blocked) {
      delete ev.px; delete ev.py;
      m.resolve();
      return false;
    }
    ev.fx = ev.x; ev.fy = ev.y; ev.x = nx; ev.y = ny;
    ev.px = ev.fx; ev.py = ev.fy;
    m.left--; m.t = 0;
    return true;
  });
}

// 이벤트가 시킨 걷기: 문·이벤트를 건드리지 않고 정해진 칸 수만큼 걷는다
const QUIET_HOOKS = { busy: () => false, onBump() {}, onArrive() {}, onStep: (x, y) => game.follower?.stepTo(x, y) };
function updateAutoMove(dt) {
  const a = game.autoMove, p = game.player, x0 = p.x, y0 = p.y, was = p.moving;
  p.update(dt, a.left > 0 ? a.dir : null, game.world, QUIET_HOOKS);
  if (p.x !== x0 || p.y !== y0) a.left--;           // 한 칸 내디딤
  const blocked = !was && !p.moving && a.left > 0;  // 막혀서 못 감
  if ((a.left === 0 && !p.moving) || blocked) {
    game.autoMove = null;
    a.resolve();
  }
}

// Shift를 누른 채 움직이면 달린다. 이번 프레임의 이동 속도를 돌려준다.
function updateStamina(dt, p) {
  const run = input.down('run') && !game.tired && game.stamina > 0 && (p.moving || !!input.dir());
  if (run && p.moving) {
    game.stamina = Math.max(0, game.stamina - dt / STAMINA_DRAIN * helpMult('stamina'));
    if (game.stamina === 0) game.tired = true;
  } else if (!run) {
    game.stamina = Math.min(1, game.stamina + dt / STAMINA_REGEN);
    if (game.tired && game.stamina >= STAMINA_RECOVER) game.tired = false;
  }
  return run ? RUN_SPEED : MOVE_SPEED;
}

// 추격자 움직이기. 잡으면 게임 오버 장면을 시작한다.
function updateChase(dt) {
  const ch = game.chase;
  if (!ch || ch.caught) return;
  if (ch.opts.until?.(state)) { // 조건을 채우면 추격 끝
    game.stopChase();
    if (ch.opts.onEscape) runner.run(ch.opts.onEscape);
    return;
  }
  if (game.time < ch.wakeAt) return;
  ch.hidden = false;
  ch.chaser.update(dt * helpMult('chase'), game.world, game.player); // 도움(chase)이면 추격자가 느려진다
  if (!ch.chaser.touches(game.player)) return;
  ch.caught = true;
  sfx('caught');
  runner.run(async (c) => {
    await c.shake(0.4, 8);
    await ch.opts.onCaught?.(c);
    await c.fade(1);
    game.gameOver();
    await c.fade(0);
  });
}

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const TOAST_TIME = 2.8;

// 목표 줄: 직접 지정한 목표(c.objective)가 먼저, 없으면 가장 최근에 받은 진행 중 퀘스트의 현재 단계
function currentObjective() {
  if (state.flags.objective) return state.flags.objective;
  // 진행 중인 메인 퀘스트가 먼저, 그다음 가장 최근에 받은 사이드 퀘스트
  const isMain = (id) => QUESTS[id].type === 'main';
  const active = Object.entries(state.quests).filter(([, q]) => !q.done)
    .sort((a, b) => isMain(b[0]) - isMain(a[0]) || b[1].order - a[1].order);
  if (!active.length) return null;
  const [id, q] = active[0];
  return `${QUESTS[id].name} — ${QUESTS[id].steps[q.stage]}`;
}

// 체온이 바닥나면 cold.exit으로 내보낸다. 이벤트를 시작했으면 true.
function updateCold(dt) {
  const cold = game.world.def.cold;
  if (!cold) {
    game.warmth = Math.min(1, game.warmth + dt / 8);
    return false;
  }
  game.warmth = Math.max(0, game.warmth - dt / cold.seconds * helpMult('cold')); // 도움(cold)이면 천천히 언다
  if (game.warmth > 0) return false;
  runner.run(async (c) => {
    await c.say('(체온이 바닥났다 — 대사 미정)');
    await c.transfer(...cold.exit);
  });
  return true;
}

// ── 소리 ──
// 지금 장면에 맞는 BGM: 맵에 bgm을 적으면 그것(null이면 무음), 아니면 추격·낮·밤
function wantedBgm() {
  if (game.scene === 'title' || game.scene === 'ending') return 'title';
  if (game.scene !== 'play') return null;
  if (game.chase) return 'chase';
  if (game.world.def.bgm !== undefined) return game.world.def.bgm;
  return state.flags.day ? 'day' : 'night';
}
// 메뉴·대화·슬롯·설정·타이틀에서 고르는 소리. 메뉴를 열고 닫는 소리
let menuWasOpen = false;
function uiSounds() {
  const open = game.menu.open;
  if (open !== menuWasOpen) sfx(open ? 'open' : 'close');
  menuWasOpen = open;
  const ui = game.slots || game.settings || game.scene !== 'play' || open || game.dialog.active;
  if (!ui) return;
  if (input.pressed('up') || input.pressed('down') || (game.settings && (input.pressed('left') || input.pressed('right')))) {
    if (!game.dialog.active || game.dialog.choices) sfx('cursor');
  }
  if (input.pressed('action')) sfx('select');
}
// 발소리: 달리면 조금 더 자주 들리는 것처럼 매 걸음, 걷기는 한 걸음 건너
let stepCount = 0;
function stepSound() {
  stepCount++;
  if (input.down('run') || stepCount % 2 === 0) sfx('step');
}

function update(dt) {
  fader.update(dt);
  uiSounds();
  bgm(wantedBgm()); // 장면에 맞는 BGM (같으면 그대로)
  if (game.slots) return updateSlots(); // 저장·이어하기 슬롯 고르기가 열려 있으면 그것만
  if (fader.alpha > 0 && fader.alpha < 1) return; // 페이드 중엔 입력 무시
  if (game.scene === 'title') {
    if (game.settings) return updateSettings();
    // 고르는 차례: 설정 버튼(-1) → 메뉴 0 … n-1 → 다시 설정 버튼
    const m = game.title, n = m.options.length;
    if (input.pressed('up')) m.sel = m.sel === -1 ? n - 1 : m.sel - 1;
    if (input.pressed('down')) m.sel = m.sel === n - 1 ? -1 : m.sel + 1;
    if (input.pressed('action')) (m.sel === -1 ? openSettings() : m.options[m.sel].run());
  } else if (game.scene === 'play') {
    updateBeam(dt);
    updatePlay(dt);
  } else if (game.scene === 'ending') {
    if (!runner.busy && input.pressed('action')) game.openTitle();
  } else if (game.scene === 'gameover') {
    const m = game.over, n = m.options.length;
    if (runner.busy) return;
    if (input.pressed('up')) m.sel = (m.sel + n - 1) % n;
    if (input.pressed('down')) m.sel = (m.sel + 1) % n;
    if (input.pressed('action')) m.options[m.sel].run();
  }
}

// ── 설정 화면 (타이틀 오른쪽 위 톱니바퀴) — 지금은 판 이력(data/patch.js)만 ──
// 항목: BGM 음량 · 효과음 음량 (A/D로 10%씩) · 판 이력 (Enter로 펼침)
const SETTINGS_ROWS = [
  { id: 'bgm', label: 'BGM 음량' },
  { id: 'sfx', label: '효과음 음량' },
  { id: 'history', label: '판 이력' },
];
function openSettings() {
  const lines = PATCH.flatMap((p) => [
    { head: true, text: `v${p.ver}   ${p.date}` },
    ...p.notes.map((n) => ({ text: `· ${n}` })),
  ]);
  game.settings = { sel: 0, view: 'main', lines, scroll: 0, volume };
}
function updateSettings() {
  const s = game.settings;
  if (s.view === 'history') { // 판 이력: W/S 넘기기, Esc·Enter 돌아가기
    const max = Math.max(0, s.lines.length - 14);
    if (input.pressed('up')) s.scroll = Math.max(0, s.scroll - 3);
    if (input.pressed('down')) s.scroll = Math.min(max, s.scroll + 3);
    if (input.pressed('cancel') || input.pressed('action')) s.view = 'main';
    return;
  }
  const n = SETTINGS_ROWS.length, row = SETTINGS_ROWS[s.sel];
  if (input.pressed('up')) s.sel = (s.sel + n - 1) % n;
  if (input.pressed('down')) s.sel = (s.sel + 1) % n;
  if (row.id === 'bgm' || row.id === 'sfx') {
    const d = (input.pressed('right') ? 0.1 : 0) - (input.pressed('left') ? 0.1 : 0);
    if (d) { setVolume(row.id, volume[row.id] + d); if (row.id === 'sfx') sfx('select'); }
  }
  if (input.pressed('action') && row.id === 'history') { s.view = 'history'; s.scroll = 0; }
  else if (input.pressed('cancel')) game.settings = null;
}

// 슬롯 고르기: W/S로 고르고 Enter 결정, Esc 그만두기. 이어하기에서는 빈 슬롯을 건너뛴다
function closeSlots(result) {
  const s = game.slots;
  game.slots = null;
  s.resolve(result);
}
function updateSlots() {
  const s = game.slots, n = s.saves.length;
  const ok = (i) => s.mode === 'save' || !!s.saves[i];
  const step = (d) => { let i = s.sel; do i = (i + d + n) % n; while (!ok(i) && i !== s.sel); s.sel = i; };
  if (input.pressed('up')) step(-1);
  if (input.pressed('down')) step(1);
  if (input.pressed('cancel')) closeSlots(null);
  else if (input.pressed('action') && ok(s.sel)) closeSlots(s.sel);
}

// 타이틀은 마우스로도 누를 수 있다: 설정 버튼, 메뉴 줄 (슬롯 고르기 창은 어느 화면에서든)
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * canvas.width / r.width, y = (e.clientY - r.top) * canvas.height / r.height;
  if (game.slots) {
    const s = game.slots, i = Math.floor((y - SLOT_BOX.y) / (SLOT_BOX.h + SLOT_BOX.gap));
    const inside = x >= SLOT_BOX.x && x <= SLOT_BOX.x + SLOT_BOX.w && i >= 0 && i < s.saves.length
      && y - SLOT_BOX.y - i * (SLOT_BOX.h + SLOT_BOX.gap) <= SLOT_BOX.h;
    if (!inside) return closeSlots(null);
    if (s.mode === 'save' || s.saves[i]) { s.sel = i; closeSlots(i); }
    return;
  }
  if (game.scene !== 'title') return;
  if (game.settings) { if (x < 40 || x > canvas.width - 40 || y < 30 || y > canvas.height - 30) game.settings = null; return; } // 창 밖을 누르면 닫기
  const b = GEAR_BUTTON;
  if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { game.title.sel = -1; openSettings(); return; }
  const i = Math.floor((y - 286) / 34); // drawTitle의 메뉴 줄: 290 + i * 34
  if (i >= 0 && i < game.title.options.length && Math.abs(x - canvas.width / 2) < 140) { game.title.sel = i; game.title.options[i].run(); }
});

// 조명 단계는 스토리에 맞춰 조정. null이면 어둠 레이어를 그리지 않는다.
// 손전등(flashlight)을 켜 두면(L) 밤에 앞쪽만 부채꼴로 비춘다. 없거나 끄면 발밑만 조금 보인다.
function lighting(t) {
  if (game.blackout) return { radius: 1, darkness: 1 };
  if (state.flags.day) return null;
  if (game.world.def.lit) return { radius: 400, darkness: 0.12 };
  if (state.flags.power) return { radius: 300, darkness: 0.4 };
  const env = curseEnv(); // 저주 진행도(또는 풀린 뒤 새벽)에 따른 밤 환경 — data/curse.js
  if (hasItem('flashlight') && state.flags.flashlightOn) {
    return { radius: Math.max(40, env.radius - 50), darkness: Math.min(0.96, env.darkness + 0.01), beam: { angle: game.beamAngle, length: 280 * helpMult('light') + Math.sin(t * 17) * 3, spread: 0.95 } };
  }
  return { radius: env.radius + Math.sin(t * 17) * 2, darkness: env.darkness };
}

// 손전등 방향: 바라보는 쪽으로 빠르게 돌아간다(가까운 쪽으로)
const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
function updateBeam(dt) {
  const target = DIR_ANGLE[game.player.dir] ?? 0;
  let d = target - game.beamAngle;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  game.beamAngle += d * Math.min(1, dt * 14);
}

function draw() {
  const t = game.time;
  if (game.scene === 'title') {
    drawTitle(ctx, t, game.title);
    if (game.settings) drawSettings(ctx, game.settings);
  } else if (game.scene === 'play') {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cam = camera(game.world, game.player);
    ctx.save();
    if (game.shake && t < game.shake.until) {
      const p = game.shake.power;
      ctx.translate(Math.round((Math.random() * 2 - 1) * p), Math.round((Math.random() * 2 - 1) * p));
    }
    const chaser = game.chase && !game.chase.hidden ? game.chase.chaser : null;
    drawWorld(ctx, game.world, game.player, state, cam, t, game.follower, chaser);
    const L = lighting(t);
    if (L) {
      // 불 켜진 방(lit)으로 이어지는 문은 복도에서도 불빛이 보인다. 이벤트에 glow: true를 주면 직접 켤 수도 있다
      const glows = game.world.visibleEvents()
        .filter((ev) => ev.glow || (ev.to && MAPS[ev.to.map]?.lit))
        .map((ev) => {
          // 문 옆의 빈 칸 쪽(복도)으로 부채꼴. 시작점은 문 칸의 복도 쪽 가장자리
          const d = DIRS[game.world.entryDir(ev)];
          return {
            x: ev.x * TILE - cam.x + TILE / 2 + d.x * TILE / 2,
            y: ev.y * TILE - cam.y + TILE / 2 + d.y * TILE / 2,
            angle: Math.atan2(d.y, d.x),
          };
        });
      drawLighting(ctx, game.player.px * TILE - cam.x + TILE / 2, game.player.py * TILE - cam.y + TILE / 2, L.radius, L.darkness, L.beam, glows);
    }
    const tint = !state.flags.day && !game.blackout && curseEnv().tint; // 저주 단계·새벽의 화면 색조
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    if (!game.picture) drawBubbles(ctx, game.bubbles, cam, t);
    if (game.flash && t < game.flash.until) { // c.flash: 정한 색으로 번쩍였다가 사라진다
      ctx.globalAlpha = (game.flash.until - t) / game.flash.dur;
      ctx.fillStyle = game.flash.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
    if (game.chase) drawChaseBorder(ctx, t);
    ctx.restore();
    if (game.picture) drawPicture(ctx, game.picture, t);
    else if (!game.blackout) drawHUD(ctx, game.world, state, game.warmth, currentObjective(), game.stamina, game.tired);
    if (game.toasts.length) drawToast(ctx, game.toasts[0].text, game.toasts[0].t / TOAST_TIME);
    game.menu.draw(ctx);
    game.dialog.draw(ctx);
  } else if (game.scene === 'ending') {
    drawEnding(ctx, game.ending, t);
  } else if (game.scene === 'gameover') {
    drawGameOver(ctx, t, game.over);
  }
  if (game.slots) drawSlots(ctx, game.slots);
  fader.draw(ctx);
}

game.openTitle();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt;
  update(dt);
  draw();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 디버그용: 콘솔에서 dbg.state.flags.power = true 등
//  dbg.tick(초) — 프레임을 직접 돌린다. 미리보기 창이 가려져 requestAnimationFrame이 멈췄을 때 시험용
window.dbg = {
  game, state,
  run: (script) => runner.run(script), // 이벤트 시험: dbg.run(async (c) => c.curse.add(1))
  chase: (opts = {}) => game.startChase({ at: { x: game.player.x, y: game.player.y + 3 }, ...opts }), // 추격 시험: dbg.chase({ who: 'bear' })
  tick(seconds = 0.1) {
    const dt = 1 / 60;
    for (let i = 0; i < Math.max(1, Math.round(seconds / dt)); i++) {
      game.time += dt;
      update(dt);
      input.endFrame();
    }
    draw();
  },
};

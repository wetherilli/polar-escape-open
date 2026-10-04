import { TILE, SCREEN_W, SCREEN_H } from './config.js?v=0.20.0';
import { ITEMS } from './data/items.js?v=0.20.0';

export const FONT = '18px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
export const SMALL_FONT = '14px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const T = TILE;

export function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 14, 28, 0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#8fa8cc';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

export function camera(world, player) {
  const mw = world.w * T, mh = world.h * T;
  const px = player.px * T + T / 2, py = player.py * T + T / 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const x = mw <= SCREEN_W ? (mw - SCREEN_W) / 2 : clamp(px - SCREEN_W / 2, 0, mw - SCREEN_W);
  const y = mh <= SCREEN_H ? (mh - SCREEN_H) / 2 : clamp(py - SCREEN_H / 2, 0, mh - SCREEN_H);
  return { x: Math.round(x), y: Math.round(y) };
}

// ═════════════════════════════════════════════
// 에셋 교체 지점 — 지금은 도형으로 그리는 임시 그래픽.
// 스프라이트시트가 생기면 TILES / SPRITES / drawPlayer 안쪽만 drawImage로 바꾸면 된다.
// ═════════════════════════════════════════════
const rect = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

// 낮/밤: state.flags.day 가 켜져 있으면 낮 색으로 그린다.
const day = (o) => !!o.state?.flags.day;

// ── 픽셀 타일 (코드로 그림) ──
// 칸 좌표로 정해지는 난수로 32×32 타일을 몇 가지 변형(VARIANTS)으로 한 번만 그려 두고 꺼내 쓴다.
// 그림 파일이 생기면 PIXEL_TILES의 해당 항목을 drawImage로 바꾸면 된다.
const VARIANTS = 4;
const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const tileCache = new Map();
function pixelTile(name, isDay, v) {
  const key = `${name}/${isDay ? 'd' : 'n'}/${v}`;
  let c = tileCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = T;
    const g = c.getContext('2d');
    PIXEL_TILES[name](g, isDay ? 0 : 1, (x, y, s = 0) => hash(x + v * 97, y + v * 61, s));
    tileCache.set(key, c);
  }
  return c;
}
const drawPixelTile = (name) => (ctx, x, y, o) =>
  ctx.drawImage(pixelTile(name, day(o), Math.floor(hash(o.tx, o.ty, 7) * VARIANTS)), x, y);
// 색 배열에서 난수로 하나 고르기
const pick = (list, r) => list[Math.floor(r * list.length) % list.length];

// 각 함수: (g, n, r) — g = 32×32 캔버스, n = 0 낮 / 1 밤, r(x, y, s) = 0~1 난수
const PIXEL_TILES = {
  // 실내 바닥: 16×16 비닐 타일 넷 + 줄눈 + 잔 반점
  floor(g, n, r) {
    const base = [['#d9d5cc', '#d3cfc5', '#dedad1'], ['#454c5a', '#414855', '#4a5160']][n];
    for (let i = 0; i < 4; i++) rect(g, pick(base, r(i, 0, 1)), (i % 2) * 16, (i >> 1) * 16, 16, 16);
    for (let k = 0; k < 40; k++) rect(g, pick([['#c8c3b8', '#e6e2da'], ['#3b414d', '#525a6a']][n], r(k, 1, 2)), Math.floor(r(k, 2, 3) * 32), Math.floor(r(k, 3, 4) * 32), 1, 1);
    const line = ['#bdb8ad', '#363c48'][n];
    rect(g, line, 0, 0, 32, 1); rect(g, line, 0, 16, 32, 1);
    rect(g, line, 0, 0, 1, 32); rect(g, line, 16, 0, 1, 32);
  },
  // 보도: 16×8 보도블록을 엇갈려 깐 것. 회색과 붉은 블록이 섞인다(실내 바닥과 확실히 다르게)
  sidewalk(g, n, r) {
    const gray = [['#b9b4ab', '#c2bdb3', '#aea99f'], ['#3d4148', '#41454d', '#383c43']][n];
    const red = [['#b88772', '#ad7d69'], ['#46393a', '#4b3d3d']][n];
    const joint = ['#8f8a80', '#26292e'][n];
    rect(g, joint, 0, 0, 32, 32);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 8 : 0;
      for (let col = -1; col < 3; col++) {
        const bx = col * 16 + off, by = row * 8;
        const c = r(col + 5, row, 1) < 0.18 ? pick(red, r(col, row, 2)) : pick(gray, r(col, row, 3));
        const x0 = Math.max(0, bx + 1), x1 = Math.min(32, bx + 16);
        if (x1 > x0) rect(g, c, x0, by + 1, x1 - x0, 7);
        if (x1 > x0) rect(g, [['#cfcac1'], ['#4a4e56']][n][0], x0, by + 1, x1 - x0, 1); // 윗면 하이라이트
      }
    }
    for (let k = 0; k < 10; k++) rect(g, joint, Math.floor(r(k, 9, 5) * 32), Math.floor(r(k, 8, 6) * 32), 1, 1);
  },
  // 차도: 아스팔트 + 자갈 반점
  road(g, n, r) {
    rect(g, ['#575b62', '#202328'][n], 0, 0, 32, 32);
    const dots = [['#4b4f55', '#666a71', '#707479', '#43474d'], ['#1a1d21', '#2a2d33', '#30343a', '#16181c']][n];
    for (let k = 0; k < 90; k++) rect(g, pick(dots, r(k, 0, 1)), Math.floor(r(k, 1, 2) * 32), Math.floor(r(k, 2, 3) * 32), 1, 1);
    if (r(3, 3, 9) < 0.25) rect(g, ['#4a4d53', '#1c1e22'][n], Math.floor(r(1, 1, 8) * 20), Math.floor(r(2, 2, 8) * 26), 8 + Math.floor(r(4, 4, 8) * 5), 2); // 균열
  },
  // 잔디: 바탕 + 위로 솟은 풀잎 + 가끔 작은 꽃
  grass(g, n, r) {
    rect(g, ['#5c9a4c', '#1e2d23'][n], 0, 0, 32, 32);
    const blades = [['#4f8a41', '#6cab59', '#7dbb67', '#477d3a'], ['#1a271e', '#26382b', '#2c4031', '#172219']][n];
    for (let k = 0; k < 70; k++) {
      const x = Math.floor(r(k, 0, 1) * 32), y = Math.floor(r(k, 1, 2) * 31);
      rect(g, pick(blades, r(k, 2, 3)), x, y, 1, 2);
    }
    if (r(0, 0, 4) < 0.3) {
      const fx = 4 + Math.floor(r(1, 0, 5) * 24), fy = 4 + Math.floor(r(2, 0, 6) * 24);
      rect(g, [pick(['#f3f0e2', '#f2d65c'], r(3, 0, 7)), '#3d4a40'][n], fx, fy, 2, 2);
    }
  },
  // 나무: 잔디 위에 줄기 + 둥근 잎 덩어리(밝은 쪽·어두운 쪽)
  tree(g, n, r) {
    PIXEL_TILES.grass(g, n, r);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(17, 28, 11, 3, 0, 0, Math.PI * 2); g.fill();
    rect(g, ['#6b4a2e', '#2e2219'][n], 14, 18, 5, 11);
    const leaf = [['#3f7d36', '#4f9442', '#2f6429'], ['#16251a', '#1d3022', '#101b13']][n];
    g.fillStyle = leaf[2]; g.beginPath(); g.arc(16, 13, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = leaf[0]; g.beginPath(); g.arc(15, 12, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = leaf[1]; g.beginPath(); g.arc(12, 9, 5, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 14; k++) rect(g, pick(leaf, r(k, 0, 1)), 6 + Math.floor(r(k, 1, 2) * 20), 3 + Math.floor(r(k, 2, 3) * 18), 1, 1);
  },
  // 화단: 돌 테두리 + 흙 + 꽃
  flowerbed(g, n, r) {
    rect(g, ['#a39c8e', '#3a3833'][n], 0, 0, 32, 32);
    rect(g, ['#6b4f36', '#251c15'][n], 3, 3, 26, 26);
    const leaves = ['#4f8a41', '#1d2f22'][n];
    const petals = [['#f2d65c', '#ef8fa8', '#f4f0e2', '#e8584a'], ['#4d4a30', '#4a3540', '#45443e', '#4a2c2a']][n];
    for (let k = 0; k < 9; k++) {
      const x = 5 + Math.floor(r(k, 0, 1) * 20), y = 5 + Math.floor(r(k, 1, 2) * 20);
      rect(g, leaves, x, y + 2, 2, 3);
      rect(g, pick(petals, r(k, 2, 3)), x - 1, y, 3, 2);
    }
  },
  // 필로티: 건물 1층이 뚫려 차가 지나가는 곳 — 위층 그늘이 진 아스팔트 + 가장자리 기둥 그림자
  pilotis(g, n, r) {
    PIXEL_TILES.road(g, n, r);
    rect(g, 'rgba(0, 0, 0, 0.32)', 0, 0, 32, 32);
    rect(g, ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'][n], 0, 0, 32, 2);
    if (r(5, 5, 5) < 0.25) rect(g, ['#6c727b', '#24272d'][n], 12, 12, 8, 8);
  },
  // 주차장: 아스팔트 + 칸 왼쪽의 흰 주차선
  parking(g, n, r) {
    PIXEL_TILES.road(g, n, r);
    rect(g, ['#e8e8e2', '#5d5f5a'][n], 0, 2, 2, 28);
  },
  // 벽: 위쪽 마감(밝은 띠) + 그 아래 그늘, 16px마다 패널 이음매, 잔 얼룩
  wall(g, n, r) {
    rect(g, ['#8f99a8', '#1f2430'][n], 0, 0, 32, 32);
    rect(g, ['#b4bcc8', '#2e3546'][n], 0, 0, 32, 6);
    rect(g, ['#c9d0da', '#384052'][n], 0, 0, 32, 1);
    rect(g, ['#76808f', '#191d26'][n], 0, 6, 32, 1);
    for (const sx of [0, 16]) rect(g, ['#818b9a', '#1b1f29'][n], sx, 7, 1, 25);
    for (let k = 0; k < 24; k++) rect(g, pick([['#8a94a3', '#96a0ae'], ['#1c2029', '#242a37']][n], r(k, 0, 1)), Math.floor(r(k, 1, 2) * 32), 8 + Math.floor(r(k, 2, 3) * 23), 1, 1);
    rect(g, ['#7a8392', '#181b23'][n], 0, 31, 32, 1);
  },
  // 창고 바닥: 에폭시 칠한 콘크리트 — 얼룩, 긁힌 자국, 가장자리 줄눈
  storage(g, n, r) {
    rect(g, ['#9aa39a', '#343a37'][n], 0, 0, 32, 32);
    const spots = [['#8f988f', '#a5ada4', '#878f86'], ['#2f3532', '#3a403c', '#2b302d']][n];
    for (let k = 0; k < 6; k++) {
      const w = 3 + Math.floor(r(k, 0, 1) * 6);
      rect(g, pick(spots, r(k, 1, 2)), Math.floor(r(k, 2, 3) * (32 - w)), Math.floor(r(k, 3, 4) * 28), w, 2 + Math.floor(r(k, 4, 5) * 3));
    }
    for (let k = 0; k < 30; k++) rect(g, pick(spots, r(k, 5, 6)), Math.floor(r(k, 6, 7) * 32), Math.floor(r(k, 7, 8) * 32), 1, 1);
    if (r(9, 9, 9) < 0.4) { // 긁힌 자국
      const sx = Math.floor(r(1, 9, 1) * 20), sy = Math.floor(r(2, 9, 2) * 28);
      for (let i = 0; i < 7; i++) rect(g, ['#b3bab2', '#444b47'][n], sx + i, sy + (i >> 2), 1, 1);
    }
    rect(g, ['#7d867d', '#262a28'][n], 0, 31, 32, 1);
    rect(g, ['#7d867d', '#262a28'][n], 31, 0, 1, 32);
  },
};

const floor = drawPixelTile('floor');
const wallTile = drawPixelTile('wall');
const wall = (ctx, x, y, o = {}) => wallTile(ctx, x, y, { tx: o.tx ?? 0, ty: o.ty ?? 0, state: o.state });

// 창문 칸: 바깥 풍경(낮 하늘 / 새벽 / 밤 야경) + 창틀과 가운데 창살
function windowPane(ctx, x, y, o) {
  if (day(o)) { // 낮: 하늘과 구름
    wall(ctx, x, y, o);
    rect(ctx, '#8cc4ec', x + 4, y + 7, T - 8, T - 13);
    rect(ctx, '#f4f8fc', x + 6 + ((o.tx * 5 + Math.floor(o.t * 2)) % 12), y + 10, 8, 3);
    return;
  }
  if (o.state?.flags.curseLifted) { // 저주가 풀린 뒤: 극야가 끝나 새벽 하늘
    wall(ctx, x, y);
    rect(ctx, '#3b4f7a', x + 4, y + 7, T - 8, 6);
    rect(ctx, '#c78a8a', x + 4, y + 13, T - 8, 4);
    rect(ctx, '#f2b77a', x + 4, y + 17, T - 8, T - 23);
    rect(ctx, '#1d2638', x + 4, y + T - 8, T - 8, 2);
    return;
  }
  // 밤: 창밖 송도 야경. 건물 불빛이 천천히 깜빡인다
  wall(ctx, x, y);
  rect(ctx, '#0a1426', x + 4, y + 7, T - 8, T - 13);
  rect(ctx, '#111d33', x + 4, y + T - 12, T - 8, 6);
  for (let i = 0; i < 4; i++) {
    const h = (o.tx * 7 + i * 13) % 17;
    const on = Math.sin(o.t * 0.7 + o.tx * 3 + i * 2) > -0.6;
    rect(ctx, on ? '#f2c96b' : '#3a3420', x + 6 + ((h * 3 + i * 5) % (T - 14)), y + 10 + (h % 9), 2, 2);
  }
}
function windowFrame(ctx, x, y, isDay) {
  const c = isDay ? '#6f7987' : '#3a4252';
  rect(ctx, c, x + 3, y + 6, T - 6, 1);
  rect(ctx, c, x + 3, y + T - 6, T - 6, 1);
  rect(ctx, c, x + 3, y + 6, 1, T - 11);
  rect(ctx, c, x + T - 4, y + 6, 1, T - 11);
  rect(ctx, c, x + 15, y + 7, 2, T - 13);
}

const TILES = {
  '.': floor,
  '#': wall,
  // ── 야외 ──
  ',': drawPixelTile('storage'), // 창고 바닥 (실내)
  ':': drawPixelTile('sidewalk'), // 보도
  _: drawPixelTile('road'),       // 차도
  ';': drawPixelTile('grass'),    // 잔디
  T: drawPixelTile('tree'),       // 나무 (통과 불가)
  '*': drawPixelTile('flowerbed'), // 화단 (통과 불가)
  '|': drawPixelTile('parking'),  // 주차장 (주차선)
  P: drawPixelTile('pilotis'),    // 필로티 (건물 1층을 차가 지나감)
  H(ctx, x, y, o) { // 건물 외벽 — 낮: 밝은 외장 + 하늘이 비친 유리 / 밤: 창 몇 개만 불이 켜져 있다
    if (day(o)) {
      rect(ctx, '#dfe3e8', x, y, T, T);
      rect(ctx, '#c4cad2', x, y + 30, T, 2);
      for (let i = 0; i < 2; i++) rect(ctx, (o.tx + o.ty + i) % 3 ? '#7fb3dc' : '#9cc8e8', x + 5 + i * 14, y + 8, 8, 10);
      return;
    }
    rect(ctx, '#2a2f3a', x, y, T, T);
    rect(ctx, '#232732', x, y + 30, T, 2);
    for (let i = 0; i < 2; i++) {
      const lit = (o.tx * 13 + o.ty * 7 + i * 5) % 11 === 0;
      rect(ctx, lit ? '#e8c46a' : '#171b23', x + 5 + i * 14, y + 8, 8, 10);
    }
  },
  F(ctx, x, y, o) { // 부지 경계 (화단·울타리)
    const d = day(o);
    rect(ctx, d ? '#3f7a3a' : '#18241b', x, y, T, T);
    rect(ctx, d ? '#8d96a3' : '#55606e', x, y + 13, T, 3);
    rect(ctx, d ? '#8d96a3' : '#55606e', x + 4, y + 6, 3, 20);
    rect(ctx, d ? '#8d96a3' : '#55606e', x + 24, y + 6, 3, 20);
  },
  W(ctx, x, y, o) { windowPane(ctx, x, y, o); windowFrame(ctx, x, y, day(o)); },
  V(ctx, x, y, o) { // 아래층이 내다보이는 트인 공간: 어두운 아래층 바닥 + 복도 쪽 난간
    rect(ctx, day(o) ? '#7d848f' : '#141820', x, y, T, T);
    rect(ctx, day(o) ? '#8b929d' : '#1a1f29', x + (o.ty % 2 ? 4 : 18), y + 6, 10, 10);
    rect(ctx, '#a9b2bf', x, y, 3, T);
    rect(ctx, '#c4ccd6', x, y + 2, 3, 2);
  },
  '='(ctx, x, y, o) {
    floor(ctx, x, y, o);
    rect(ctx, '#5a4634', x + 1, y + 6, T - 2, T - 10);
    rect(ctx, '#6e5640', x + 1, y + 6, T - 2, 4);
  },
  R(ctx, x, y, o) {
    floor(ctx, x, y, o);
    rect(ctx, '#7c8796', x + 1, y + 3, T - 2, T - 6);
    rect(ctx, '#a9c4e0', x + 3, y + 6, T - 6, 7);
    rect(ctx, '#a9c4e0', x + 3, y + 17, T - 6, 7);
  },
  G(ctx, x, y, o) {
    floor(ctx, x, y, o);
    rect(ctx, '#3b4a3d', x, y + 2, T, T - 4);
    rect(ctx, '#2c382e', x, y + 10, T, 3);
    rect(ctx, '#2c382e', x, y + 18, T, 3);
    const on = o.state.flags.power && Math.floor(o.t * 4 + o.tx) % 2 === 0;
    rect(ctx, on ? '#7dff9a' : '#55302f', x + 12, y + 24, 6, 4);
  },
};

// o = { t, state, ev } — ev는 이벤트 정의 전체(커스텀 필드 포함)
const SPRITES = {
  // ── 범용 ──
  // 조사할 수 있는 책상 (= 타일과 같은 모양 + 꺼진 모니터)
  desk(ctx, x, y, o) {
    floor(ctx, x, y, { tx: o.ev.x, ty: o.ev.y, state: o.state });
    rect(ctx, '#5a4634', x + 1, y + 6, T - 2, T - 10);
    rect(ctx, '#6e5640', x + 1, y + 6, T - 2, 4);
    rect(ctx, '#2a2f38', x + 9, y + 1, 14, 9);
    rect(ctx, '#1b2028', x + 10, y + 2, 12, 6);
  },
  note(ctx, x, y) {
    rect(ctx, '#5a4634', x + 3, y + 8, T - 6, T - 12);
    rect(ctx, '#eae4d4', x + 10, y + 11, 12, 9);
  },
  item(ctx, x, y, o) {
    const a = 0.45 + 0.55 * Math.abs(Math.sin(o.t * 4));
    ctx.fillStyle = `rgba(255, 226, 120, ${a})`;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 9); ctx.lineTo(x + 23, y + 16); ctx.lineTo(x + 16, y + 23); ctx.lineTo(x + 9, y + 16);
    ctx.fill();
  },
  // 소방함 (벽에 붙은 붉은 함)
  fireBox(ctx, x, y) {
    rect(ctx, '#8e1c1c', x + 5, y + 4, T - 10, T - 8);
    rect(ctx, '#c62f2f', x + 7, y + 6, T - 14, T - 12);
    rect(ctx, '#f2e6d0', x + 10, y + 9, T - 20, 5);
    rect(ctx, '#e8c45a', x + T - 11, y + 17, 2, 4);
  },
  locker(ctx, x, y) {
    rect(ctx, '#5b6b82', x + 5, y + 1, T - 10, T - 2);
    rect(ctx, '#3e4a5c', x + 15, y + 3, 2, T - 6);
    rect(ctx, '#c9d3e0', x + 11, y + 14, 2, 5);
  },
  // ── 문 ──
  door(ctx, x, y) {
    rect(ctx, '#6e5236', x + 2, y, T - 4, T);
    rect(ctx, '#5a432c', x + 5, y + 3, T - 10, T - 6);
    rect(ctx, '#d8b860', x + 21, y + 15, 3, 3);
  },
  // 호실 문: 이벤트의 room(예: '306호')에서 숫자만 번호판에 쓴다
  roomDoor(ctx, x, y, o) {
    SPRITES.labDoor(ctx, x, y);
    const num = (o.ev.room.match(/\d+/) ?? [''])[0];
    if (!num) return;
    rect(ctx, '#e8ecf1', x + 6, y + 17, 20, 9);
    ctx.font = 'bold 8px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#1d3557';
    ctx.fillText(num, x + 16 - ctx.measureText(num).width / 2, y + 18);
  },
  // 엘리베이터: lockFlag가 켜지면 버튼 불이 초록
  elevator(ctx, x, y, o) {
    rect(ctx, '#7d8794', x, y, T, T);
    rect(ctx, '#aab3bf', x + 3, y + 2, 12, T - 4);
    rect(ctx, '#aab3bf', x + 17, y + 2, 12, T - 4);
    rect(ctx, '#5c6570', x + 15, y + 2, 2, T - 4);
    rect(ctx, o.state.flags[o.ev.lockFlag] ? '#5dff8a' : '#ff6a4a', x + 14, y - 1, 4, 3);
  },
  // 화장실 문: 문 위쪽에 흰 표지판 + 남(파랑)·여(빨강) 그림
  wcDoor(ctx, x, y) {
    rect(ctx, '#8b95a3', x + 2, y, T - 4, T);
    rect(ctx, '#d0d6de', x + 21, y + 19, 3, 3);
    rect(ctx, '#f4f6f8', x + 6, y + 3, 20, 12);
    rect(ctx, '#2f6fd0', x + 10, y + 5, 2, 2);  // 남: 머리
    rect(ctx, '#2f6fd0', x + 9, y + 8, 4, 5);   //     몸
    rect(ctx, '#9aa3ad', x + 15, y + 5, 1, 9);  // 가운데 줄
    rect(ctx, '#d0383b', x + 19, y + 5, 2, 2);  // 여: 머리
    ctx.fillStyle = '#d0383b';                  //     치마
    ctx.beginPath(); ctx.moveTo(x + 20, y + 8); ctx.lineTo(x + 23, y + 13); ctx.lineTo(x + 17, y + 13); ctx.fill();
  },
  labDoor(ctx, x, y) {
    rect(ctx, '#8b95a3', x + 2, y, T - 4, T);
    rect(ctx, '#1b2a40', x + 9, y + 5, 14, 8);
    rect(ctx, '#d0d6de', x + 21, y + 17, 3, 3);
  },
  freezerDoor(ctx, x, y) {
    rect(ctx, '#c8d3df', x + 1, y, T - 2, T);
    rect(ctx, '#9fb0c2', x + 4, y + 3, T - 8, T - 6);
    rect(ctx, '#55606e', x + 22, y + 10, 4, 12);
    rect(ctx, 'rgba(255,255,255,0.5)', x + 5, y + 4, 8, 2);
  },
  glassDoor(ctx, x, y) {
    rect(ctx, '#2c3a4e', x, y, T, T);
    rect(ctx, 'rgba(120, 170, 220, 0.35)', x + 2, y + 2, T - 4, T - 4);
    rect(ctx, '#8a9bb0', x + 15, y + 2, 2, T - 4);
  },
  booth(ctx, x, y, o) { // 경비실 창구
    rect(ctx, day(o) ? '#dfe3e8' : '#2a2f3a', x, y, T, T);
    rect(ctx, day(o) ? '#7fb3dc' : '#141a24', x + 4, y + 4, T - 8, 16);
    if (day(o)) drawPerson(ctx, x, y - 6, 'down', '#3b4b63', '#2a2420');
    rect(ctx, '#8a7350', x + 2, y + 20, T - 4, 6);
  },
  register(ctx, x, y, o) { // 카페 카운터 + 계산대
    floor(ctx, x, y, { tx: 0, ty: 0, state: o.state });
    rect(ctx, '#5a4634', x + 1, y + 6, T - 2, T - 10);
    rect(ctx, '#6e5640', x + 1, y + 6, T - 2, 4);
    rect(ctx, '#2a2f38', x + 9, y + 2, 14, 10);
    rect(ctx, day(o) ? '#8fd3ff' : '#2d3b48', x + 10, y + 3, 12, 6);
  },
  stairs(ctx, x, y) {
    rect(ctx, '#2a2f3a', x, y, T, T);
    for (let i = 0; i < 5; i++) rect(ctx, i % 2 ? '#6f7886' : '#8a93a1', x + 2, y + 2 + i * 6, T - 4 - i * 4, 5);
  },
  gate(ctx, x, y, o) {
    rect(ctx, '#3a4350', x, y, T, T);
    for (let i = 0; i < 4; i++) rect(ctx, i % 2 ? '#1c1c1c' : '#d9b11c', x + 2 + i * 7, y + 13, 7, 5);
    rect(ctx, Math.floor(o.t * 2) % 2 ? '#ff4a4a' : '#5a1f1f', x + 24, y + 4, 5, 5);
  },
  // 잠금 문: 이벤트에 lockFlag를 주면 그 플래그가 켜졌을 때 초록불
  cardDoor(ctx, x, y, o) {
    rect(ctx, '#59606e', x + 1, y, T - 2, T);
    rect(ctx, '#474d59', x + 15, y, 2, T);
    rect(ctx, o.state.flags[o.ev.lockFlag] ? '#5dff8a' : '#ff4a4a', x + 24, y + 13, 4, 4);
  },
  // ── 소동물 ──
  // 채집 지점: 풀잎이 가끔 살랑이고 작은 점이 꼼지락댄다 (일부러 눈에 덜 띄게)
  critter(ctx, x, y, o) {
    const wob = Math.sin(o.t * 5 + o.ev.x) > 0.6 ? 1 : 0;
    ctx.fillStyle = 'rgba(160, 200, 140, 0.55)';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 10 + i * 5 + (i === 1 ? wob : 0), y + 18 - i % 2 * 3, 2, 8);
    rect(ctx, '#2b2216', x + 15 + wob * 2, y + 24, 3, 2);
  },
  // 수조: 잡기 전에는 물고기가 헤엄친다
  tank(ctx, x, y, o) {
    rect(ctx, '#5a4634', x + 2, y + 22, T - 4, 8);
    rect(ctx, '#9fb3c8', x + 3, y + 6, T - 6, 17);
    rect(ctx, '#3f7fa8', x + 4, y + 9, T - 8, 13);
    if (!o.state.creatures[o.ev.creature]) {
      const fx = x + 8 + ((Math.sin(o.t * 1.3) + 1) / 2) * 12;
      rect(ctx, '#f0a040', fx, y + 14, 5, 3);
      rect(ctx, '#f0a040', fx + (Math.cos(o.t * 1.3) > 0 ? -2 : 5), y + 14, 2, 3);
    }
  },
  // ── 사람·세이브 ──
  // NPC: 이벤트에 color(옷 색)를 준다. 말을 걸면 ev.dir이 플레이어 쪽으로 바뀐다.
  npc(ctx, x, y, o) {
    const walking = o.ev.px !== undefined; // c.move로 걷는 중이면 걷는 장면
    drawPerson(ctx, x, y, o.ev.dir ?? 'down', o.ev.color ?? '#7a8a9a', '#2a2420', 0, walking ? 1 + ((o.ev.x + o.ev.y) & 1) : 0);
  },
  // 세이브 포인트: 켜진 노트북 + 스탠드 불빛
  savePoint(ctx, x, y, o) {
    const glow = 0.25 + 0.1 * Math.sin(o.t * 2);
    ctx.fillStyle = `rgba(255, 220, 140, ${glow})`;
    ctx.beginPath(); ctx.arc(x + 16, y + 14, 15, 0, Math.PI * 2); ctx.fill();
    rect(ctx, '#5a4634', x + 1, y + 10, T - 2, T - 14);
    rect(ctx, '#2a2f38', x + 9, y + 6, 14, 10);
    rect(ctx, '#8fd3ff', x + 10, y + 7, 12, 8);
    rect(ctx, '#e8c45a', x + 25, y + 4, 4, 4);
  },
  // ── 홍보관·로비 ──
  panel(ctx, x, y) {
    rect(ctx, '#d9dde3', x + 1, y + 4, T - 2, T - 8);
    rect(ctx, '#3d6b9e', x + 4, y + 7, T - 8, 8);
    rect(ctx, '#8a929c', x + 4, y + 18, T - 8, 2);
    rect(ctx, '#8a929c', x + 4, y + 22, T - 12, 2);
  },
  bear(ctx, x, y) {
    ctx.fillStyle = '#eef1f4';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 19, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 25, y + 11, 6, 0, Math.PI * 2); ctx.fill();
    rect(ctx, '#222', x + 28, y + 10, 2, 2);
  },
  bow(ctx, x, y) {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.lineTo(x + 16, y + 2); ctx.lineTo(x + 32, y + 30); ctx.fill();
    rect(ctx, '#f2f2f2', x + 6, y + 22, 20, 3);
  },
  drill(ctx, x, y) {
    rect(ctx, '#6b7480', x + 4, y + 26, 24, 4);
    rect(ctx, '#e0b03a', x + 13, y + 2, 6, 24);
    rect(ctx, '#bfe3ff', x + 14, y + 20, 4, 8);
  },
  penguin(ctx, x, y) {
    rect(ctx, '#1e2228', x + 10, y + 8, 12, 20);
    rect(ctx, '#f4f4f4', x + 13, y + 13, 6, 13);
    rect(ctx, '#f0a030', x + 15, y + 10, 3, 2);
  },
};

// 타일 하나 그리기 (맵 편집기 팔레트용)
export function drawTileAt(ctx, ch, x, y, state, t = 0) {
  (TILES[ch] ?? wall)(ctx, x, y, { tx: 0, ty: 0, t, state });
}

// 추격자 임시 그림 (c.chase.start의 who). 그림이 생기면 여기만 바꾼다.
const CHASERS = {
  // 상어귀신: 상어 후드를 쓴 창백한 학생. 아래쪽이 흐려진다
  shark(ctx, x, y, o) {
    const fl = Math.sin(o.t * 6) * 1.5;
    ctx.fillStyle = 'rgba(150, 190, 220, 0.25)';
    ctx.beginPath(); ctx.arc(x + 16, y + 16, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(70, 95, 125, 0.85)';
    ctx.fillRect(x + 8, y + 13 + fl, 16, 12);
    ctx.fillStyle = 'rgba(70, 95, 125, 0.4)';
    ctx.fillRect(x + 9, y + 25 + fl, 14, 4);
    ctx.fillStyle = '#5f7f9f'; // 후드
    ctx.beginPath(); ctx.arc(x + 16, y + 11 + fl, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 13, y + 4 + fl); ctx.lineTo(x + 18, y - 3 + fl); ctx.lineTo(x + 20, y + 5 + fl); ctx.fill(); // 지느러미
    if (o.dir !== 'up') {
      rect(ctx, '#e6eef5', x + 12, y + 10 + fl, 8, 5);
      rect(ctx, '#f4f8fb', x + 11, y + 15 + fl, 10, 2); // 이빨 줄
      rect(ctx, '#c03040', x + 13, y + 11 + fl, 2, 2);
      rect(ctx, '#c03040', x + 17, y + 11 + fl, 2, 2);
    }
  },
  // 북극곰: 홍보관 모형보다 큰 진짜 곰
  bear(ctx, x, y, o) {
    const step = o.moving ? Math.round(Math.sin(o.t * 14)) : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 29, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eef1f4';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 18 + step, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
    const hx = { left: 4, right: 28, up: 16, down: 16 }[o.dir] ?? 16;
    const hy = o.dir === 'up' ? 8 : o.dir === 'down' ? 22 : 14;
    ctx.beginPath(); ctx.arc(x + hx, y + hy + step, 7, 0, Math.PI * 2); ctx.fill();
    if (o.dir !== 'up') rect(ctx, '#222', x + hx - 1, y + hy + 1 + step, 3, 2);
  },
};

export function drawWorld(ctx, world, player, state, cam, t, follower = null, chaser = null) {
  const x0 = Math.floor(cam.x / T), y0 = Math.floor(cam.y / T);
  for (let ty = y0; ty <= y0 + SCREEN_H / T + 1; ty++) {
    for (let tx = x0; tx <= x0 + SCREEN_W / T + 1; tx++) {
      if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) continue;
      const draw = TILES[world.tiles[ty][tx]] ?? wall;
      draw(ctx, tx * T - cam.x, ty * T - cam.y, { tx, ty, t, state });
    }
  }
  for (const ev of world.visibleEvents()) {
    SPRITES[ev.sprite]?.(ctx, Math.round((ev.px ?? ev.x) * T - cam.x), Math.round((ev.py ?? ev.y) * T - cam.y), { t, state, ev }); // px·py = c.move로 걷는 중
  }
  if (follower) {
    const fx = Math.round(follower.px * T - cam.x), fy = Math.round(follower.py * T - cam.y);
    const bob = follower.moving ? -Math.round(Math.sin(player.t * Math.PI) * 2) : 0;
    drawPerson(ctx, fx, fy, follower.dir, follower.color, '#2a2420', bob, walkFrame(follower.moving, player.t, follower.x, follower.y));
  }
  drawPlayer(ctx, player, cam);
  if (chaser) {
    const cx = Math.round(chaser.px * T - cam.x), cy = Math.round(chaser.py * T - cam.y);
    (CHASERS[chaser.kind] ?? CHASERS.shark)(ctx, cx, cy, { t, dir: chaser.dir, moving: chaser.moving });
  }
  if (world.def.tint) rect(ctx, world.def.tint, 0, 0, SCREEN_W, SCREEN_H);
}

// 사람 공용 임시 그림: 몸통 색(body)과 머리 색(head)만 다르게
// ── 사람 픽셀 그림 (16×16을 2배로) ──
// 글자: h 머리카락 · s 피부 · e 눈 · w 셔츠 깃 · b 옷 · d 옷 그늘(팔) · p 바지 · k 신발
// 몸(0~12줄)은 방향마다, 다리(13~15줄)는 걷는 장면마다. 오른쪽은 왼쪽을 뒤집어 쓴다.
const PERSON_BODY = {
  down: ['......hhhh......', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '...hssssssssh...',
    '...ssessssess...', '....ssssssss....', '.....bwwwwb.....', '....bbbwwbbb....', '...dbbbbbbbbd...',
    '...dbbbbbbbbd...', '...sbbbbbbbbs...', '....pppppppp....'],
  up: ['......hhhh......', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '...hhhhhhhhhh...',
    '...hhhhhhhhhh...', '....hhhhhhhh....', '.....bbbbbb.....', '....bbbbbbbb....', '...dbbbbbbbbd...',
    '...dbbbbbbbbd...', '...sbbbbbbbbs...', '....pppppppp....'],
  left: ['.....hhhhh......', '....hhhhhhh.....', '...hhhhhhhhh....', '...hhhhhhhhh....', '...sshhhhhhh....',
    '..ssehhhhhhh....', '...sssshhhh.....', '.....wbbb.......', '....bbbbbb......', '....bbbdbb......',
    '....bbbdbb......', '....bbbsbb......', '....pppppp......'],
};
const PERSON_LEGS = {
  front: [ // 앞·뒤: 서 있기, 왼발, 오른발
    ['....ppp..ppp....', '....ppp..ppp....', '....kkk..kkk....'],
    ['....ppp..ppp....', '....ppp...kk....', '....kkk.........'],
    ['....ppp..ppp....', '....kk...ppp....', '.........kkk....'],
  ],
  side: [ // 옆: 서 있기, 벌린 걸음
    ['.....pppp.......', '.....pppp.......', '....kkkk........'],
    ['....pp..pp......', '...pp....pp.....', '..kk......kk....'],
  ],
};
// '#rrggbb'를 조금 어둡게 (옷 그늘)
const shade = (hex, k = 0.72) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
const personCache = new Map();
function personCanvas(dir, frame, body, hair) {
  const key = `${dir}/${frame}/${body}/${hair}`;
  let c = personCache.get(key);
  if (c) return c;
  const side = dir === 'left' || dir === 'right';
  const legs = side ? PERSON_LEGS.side[frame % 2] : PERSON_LEGS.front[frame % 3];
  const rows = [...PERSON_BODY[side ? 'left' : dir], ...legs];
  const pal = { h: hair, s: '#f1c9a0', e: '#1b1f27', w: '#eef1f4', b: body, d: shade(body), p: '#2b2f3a', k: '#15181e' };
  c = document.createElement('canvas');
  c.width = c.height = T;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!pal[ch]) return;
    const px = dir === 'right' ? 15 - x : x; // 오른쪽은 뒤집기
    rect(g, pal[ch], px * 2, y * 2, 2, 2);
  }));
  personCache.set(key, c);
  return c;
}

// 사람 공용 그림: 옷 색(body)과 머리 색(head)만 다르게. frame = 걷는 장면(0 서 있기)
function drawPerson(ctx, x, y, dir, body, head, bob = 0, frame = 0) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x + 16, y + 30, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(personCanvas(dir ?? 'down', frame, body, head), x, y + bob);
}
// 걷는 중이면 한 칸 걸음의 앞쪽 절반에 발을 내딛는 장면. 칸마다 왼발·오른발을 번갈아
const walkFrame = (moving, t, x, y) => (moving && t < 0.6 ? 1 + ((x + y) & 1) : 0);

function drawPlayer(ctx, p, cam) {
  const x = Math.round(p.px * T - cam.x), y = Math.round(p.py * T - cam.y);
  const bob = p.moving ? -Math.round(Math.sin(p.t * Math.PI) * 2) : 0;
  drawPerson(ctx, x, y, p.dir, '#2f4a7a', '#2a2420', bob, walkFrame(p.moving, p.t, p.x, p.y)); // 수오: 교복 재킷
}

// ── 아이템 아이콘 (14×14 픽셀 그림) ──
// 글자 하나 = 픽셀 하나, '.'는 투명. 그림 파일이 생기면 drawItemIcon 안쪽만 drawImage로 바꾸면 된다.
const ICON_COLORS = {
  k: '#1b1f27', w: '#f2f2ee', b: '#3d6bb3', p: '#e8b98f', l: '#9aa3ad', r: '#c8372d', s: '#ee8a7e',
  m: '#b8c0ca', y: '#ffe27a', d: '#3a3f4a', c: '#7fe0e8', L: '#d0a040', q: '#9cc9dc', n: '#e8e8e8',
  h: '#a0784a', o: '#b0844e', O: '#8a6538',
  P: '#efe0b4', G: '#5aa04a', g: '#2f6b2a', e: '#7a4a2a', E: '#4e2e18', f: '#f0a040', F: '#c06a20', u: '#6f7f96',
};
const ICONS = {
  visitorPass: [ // 목줄 달린 출입 카드
    '....bbbbbb....', '....b....b....', '....b....b....', '..kkkkkkkkkk..', '..kwwwwwwwwk..', '..kbbbbbbbbk..',
    '..kwwwwwwwwk..', '..kwppwwllwk..', '..kwppwwwwwk..', '..kwppwwllwk..', '..kwwwwwwwwk..', '..kwwllllwwk..',
    '..kwwwwwwwwk..', '..kkkkkkkkkk..',
  ],
  flashlight: [ // 붉은 비상용 손전등
    '..............', '..............', '..............', '..........kkk.', 'kkkkkkkkkkmmmk', 'krrrrrrrrkmyyk',
    'krrrrssrrkmyyk', 'krrrrrrrrkmyyk', 'kkkkkkkkkkmmmk', '..........kkk.', '..............', '..............',
    '..............', '..............',
  ],
  translator: [ // 화면과 단추가 있는 작은 기계
    '..............', '...kkkkkkkk...', '...kddddddk...', '...kdcccckk...', '...kdcccckk...', '...kddddddk...',
    '...kddddddk...', '...kdmdmdmk...', '...kddddddk...', '...kdmdmdmk...', '...kddddddk...', '...kkkkkkkk...',
    '..............', '..............',
  ],
  net: [ // 잠자리채
    '......kkkk....', '.....kn.n.k...', '....kn.n.n.k..', '....k.n.n.nk..', '....kn.n.n.k..', '.....kn.n.k...',
    '......kkkk....', '......h.......', '.....h........', '....h.........', '...h..........', '..h...........',
    '.h............', '..............',
  ],
  jar: [ // 뚜껑 달린 채집통
    '..............', '....LLLLLL....', '....LLLLLL....', '...kkkkkkkk...', '...kwqqqqqk...', '...kwqqqqqk...',
    '...kqqqqqqk...', '...kqqqqqqk...', '...kqqqqqqk...', '...kqqqqqqk...', '...kqqqqqqk...', '...kkkkkkkk...',
    '..............', '..............',
  ],
};
// ── 소동물 아이콘 (creatures.js의 icon) ──
Object.assign(ICONS, {
  grasshopper: [ // 풀벌레
    '..............', '..............', '..............', '..........k...', '.........k....', '...ggggggg....',
    '..gGGGGGGGGk..', '.gGGGGGGGGGGk.', '..gGGGGGGGGg..', '...g.g...gg...', '..g...g.g..g..', '.g.....g....g.',
    '..............', '..............',
  ],
  beetle: [ // 딱정벌레
    '..............', '.....k...k....', '......k.k.....', '.....EEEEE....', '...eeeeEeeee..', '.k.eeeeEeeee.k',
    '..keeeeEeeeek.', '...eeeeEeeee..', '.k.eeeeEeeee.k', '..keeeeEeeeek.', '...eeeeEeeee..', '....eeeEeee...',
    '.....eeEee....', '..............',
  ],
  fish: [ // 작은 물고기
    '..............', '..............', '..............', '..............', '.....ffff.....', 'F..ffffffff...',
    'FF.fffffffkf..', 'FFFffffffffff.', 'FF.ffffffffff.', 'F..ffffffff...', '.....ffff.....', '..............',
    '..............', '..............',
  ],
  quest: [ // 퀘스트 — 느낌표가 적힌 종이
    '..............', '..OOOOOOOOOO..', '..OPPPPPPPPO..', '..OPPPrrPPPO..', '..OPPPrrPPPO..', '..OPPPrrPPPO..',
    '..OPPPrrPPPO..', '..OPPPrrPPPO..', '..OPPPPPPPPO..', '..OPPPrrPPPO..', '..OPPPPPPPPO..', '..OOOOOOOOOO..',
    '..............', '..............',
  ],
  questDone: [ // 끝낸 퀘스트 — 체크 표시가 적힌 종이
    '..............', '..OOOOOOOOOO..', '..OPPPPPPPPO..', '..OPPPPPPGPO..', '..OPPPPPGGPO..', '..OPGPPPGPPO..',
    '..OPGGPGGPPO..', '..OPPGGGPPPO..', '..OPPPGPPPPO..', '..OPPPPPPPPO..', '..OPPPPPPPPO..', '..OOOOOOOOOO..',
    '..............', '..............',
  ],
  note: [ // 노트 — 스프링 수첩
    '..............', '..k.k.k.k.k...', '.bbbbbbbbbbb..', '.bwwwwwwwwwb..', '.bwllllllwwb..', '.bwwwwwwwwwb..',
    '.bwllllllllb..', '.bwwwwwwwwwb..', '.bwlllllwwwb..', '.bwwwwwwwwwb..', '.bwllllllwwb..', '.bwwwwwwwwwb..',
    '.bbbbbbbbbbb..', '..............',
  ],
  help: [ // 받은 도움 — 별
    '......yy......', '......yy......', '.....yyyy.....', '.yyyyyyyyyyyy.', '..yyyyyyyyyy..', '...yyyyyyyy...',
    '....yyyyyy....', '....yyyyyy....', '...yyyyyyyy...', '...yyy..yyy...', '..yyy....yyy..', '..yy......yy..',
    '..............', '..............',
  ],
  unknown: [ // 아직 못 찾은 소동물
    '..............', '....uuuuuu....', '...uu....uu...', '...uu....uu...', '.........uu...', '........uu....',
    '.......uu.....', '......uu......', '......uu......', '..............', '......uu......', '......uu......',
    '..............', '..............',
  ],
});
// 정해진 아이콘이 없는 아이템: 상자
ICONS.default = [
  '..............', '..............', '..kkkkkkkkkk..', '..kooooOoook..', '..kooooOoook..', '..kkkkkkkkkk..',
  '..kooooOoook..', '..kooooOoook..', '..kooooOoook..', '..kooooOoook..', '..kooooOoook..', '..kkkkkkkkkk..',
  '..............', '..............',
];
const iconCache = new Map();
function iconCanvas(id) {
  const key = ICONS[id] ? id : 'default';
  let c = iconCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 14;
    const g = c.getContext('2d');
    ICONS[key].forEach((row, y) => [...row].forEach((ch, x) => { if (ICON_COLORS[ch]) rect(g, ICON_COLORS[ch], x, y, 1, 1); }));
    iconCache.set(key, c);
  }
  return c;
}
// 아이콘 칸 한 변(px). scale 2면 설명 칸용 큰 아이콘
export const iconSlot = (scale = 1) => 14 * scale + 6;
export const ICON_SLOT = iconSlot(1);
// 사람이 그린 아이콘 그림: items.js·creatures.js에 iconImage: 'assets/icons/이름.png'를 주면 코드 그림 대신 쓴다.
// 정사각형 그림이면 크기는 상관없다(칸에 맞춰 줄이거나 늘린다). 불러오기 전이나 실패하면 코드 그림이 나온다.
const iconImages = new Map();
function iconImage(path) {
  let img = iconImages.get(path);
  if (!img) { img = new Image(); img.src = path; iconImages.set(path, img); }
  return img.complete && img.naturalWidth ? img : null;
}
// 이름 왼쪽의 아이콘 칸: (x, y)가 칸의 왼쪽 위. id = 아이템 id 또는 소동물 아이콘 이름, image = iconImage 경로
export function drawItemIcon(ctx, id, x, y, scale = 1, image = null) {
  const s = iconSlot(scale);
  rect(ctx, '#0b1220', x, y, s, s);
  ctx.strokeStyle = '#4a5d7c';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage((image && iconImage(image)) || iconCanvas(id), x + 3, y + 3, 14 * scale, 14 * scale);
  ctx.imageSmoothingEnabled = smooth;
}

// 말풍선: 캐릭터 머리 위의 작은 흰 풍선 + 꼬리. 어둠 위에 그려서 어두운 곳에서도 읽힌다.
const BUBBLE_FONT = '13px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
export function drawBubbles(ctx, bubbles, cam, t) {
  if (!bubbles.length) return;
  ctx.save();
  ctx.font = BUBBLE_FONT;
  ctx.textBaseline = 'top';
  for (const b of bubbles) {
    const lines = wrapBubble(ctx, b.text, 170);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14;
    const h = lines.length * 16 + 8;
    const cx = Math.round(b.who.px * T - cam.x + T / 2);
    const x = Math.max(4, Math.min(SCREEN_W - w - 4, cx - w / 2));
    const y = Math.max(4, Math.round(b.who.py * T - cam.y) - h - 8);
    ctx.fillStyle = 'rgba(250, 250, 245, 0.95)';
    ctx.strokeStyle = '#2a2f3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect?.(x + 0.5, y + 0.5, w, h, 6) ?? ctx.rect(x + 0.5, y + 0.5, w, h);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); // 꼬리
    ctx.moveTo(cx - 4, y + h); ctx.lineTo(cx, y + h + 6); ctx.lineTo(cx + 4, y + h);
    ctx.fill();
    ctx.fillStyle = '#1d222c';
    lines.forEach((l, i) => ctx.fillText(l, x + 7, y + 5 + i * 16));
  }
  ctx.restore();
}
function wrapBubble(ctx, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const ch of para) {
      if (line && ctx.measureText(line + ch).width > maxW) { out.push(line); line = ''; }
      line += ch;
    }
    out.push(line);
  }
  return out;
}

// 새 소식 표시: 노란 동그라미 안의 느낌표. (cx, cy)가 가운데
export function drawBadge(ctx, cx, cy) {
  ctx.save();
  ctx.fillStyle = '#ffcc4d';
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a1d05';
  ctx.fillRect(cx - 1, cy - 5, 3, 6);
  ctx.fillRect(cx - 1, cy + 3, 3, 2);
  ctx.restore();
}

// 어둠 레이어: 화면 전체를 어둡게 칠하고 플레이어 주변만 도려낸다.
let lightCanvas = null;
// beam = { angle, length, spread } 이면 손전등: 발밑만 조금 밝고, angle 쪽으로 spread(라디안) 폭의 부채꼴을 비춘다
// glows = [{ x, y, angle }] 불 켜진 방으로 이어지는 문(화면 좌표, 문의 복도 쪽 가장자리) — 복도 쪽으로 부채꼴로 새는 따뜻한 불빛
export function drawLighting(ctx, sx, sy, radius, darkness, beam = null, glows = []) {
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = SCREEN_W;
    lightCanvas.height = SCREEN_H;
  }
  const l = lightCanvas.getContext('2d');
  l.globalCompositeOperation = 'source-over';
  l.clearRect(0, 0, SCREEN_W, SCREEN_H);
  l.fillStyle = `rgba(3, 5, 14, ${darkness})`;
  l.fillRect(0, 0, SCREEN_W, SCREEN_H);
  l.globalCompositeOperation = 'destination-out';
  const g = l.createRadialGradient(sx, sy, 0, sx, sy, radius);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  l.fillStyle = g;
  l.fillRect(0, 0, SCREEN_W, SCREEN_H);
  if (beam) {
    const b = l.createRadialGradient(sx, sy, 0, sx, sy, beam.length);
    b.addColorStop(0, 'rgba(0,0,0,1)');
    b.addColorStop(0.7, 'rgba(0,0,0,0.9)');
    b.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = b;
    // 가장자리를 부드럽게: 폭을 조금씩 넓혀 가며 옅게 여러 번 칠한다
    for (const [k, a] of [[1, 0.8], [1.25, 0.35], [1.5, 0.15]]) {
      l.globalAlpha = a;
      l.beginPath();
      l.moveTo(sx, sy);
      l.arc(sx, sy, beam.length, beam.angle - beam.spread * k / 2, beam.angle + beam.spread * k / 2);
      l.closePath();
      l.fill();
    }
    l.globalAlpha = 1;
  }
  // 불 켜진 방의 문: 문틈에서 복도 쪽(gl.angle)으로 부채꼴 불빛. 어둠을 덜어 내고 그 위에 노란 빛을 얹는다
  const GLOW_LEN = 120, GLOW_SPREAD = 1.7;
  const fan = (g2, gl, len, spread) => {
    g2.beginPath();
    g2.moveTo(gl.x, gl.y);
    g2.arc(gl.x, gl.y, len, gl.angle - spread / 2, gl.angle + spread / 2);
    g2.closePath();
    g2.fill();
  };
  for (const gl of glows) {
    const h = l.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, GLOW_LEN);
    h.addColorStop(0, 'rgba(0,0,0,0.9)');
    h.addColorStop(0.5, 'rgba(0,0,0,0.55)');
    h.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = h;
    for (const [k, a] of [[1, 0.8], [1.3, 0.3]]) { l.globalAlpha = a; fan(l, gl, GLOW_LEN, GLOW_SPREAD * k); }
    l.globalAlpha = 1;
  }
  ctx.drawImage(lightCanvas, 0, 0);
  for (const gl of glows) {
    const w = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, GLOW_LEN * 0.9);
    w.addColorStop(0, 'rgba(255, 210, 120, 0.38)');
    w.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = w;
    fan(ctx, gl, GLOW_LEN * 0.9, GLOW_SPREAD);
  }
}

// 추격 중: 화면 가장자리가 붉게 맥박친다
export function drawChaseBorder(ctx, t) {
  const a = 0.35 + 0.2 * Math.sin(t * 6);
  const g = ctx.createRadialGradient(SCREEN_W / 2, SCREEN_H / 2, SCREEN_H * 0.35, SCREEN_W / 2, SCREEN_H / 2, SCREEN_W * 0.62);
  g.addColorStop(0, 'rgba(160, 0, 0, 0)');
  g.addColorStop(1, `rgba(170, 10, 20, ${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
}

export function drawGameOver(ctx, t, menu) {
  rect(ctx, '#0a0306', 0, 0, SCREEN_W, SCREEN_H);
  ctx.textBaseline = 'top';
  centered(ctx, '(게임 오버 — 문구 미정)', 160, 'bold 30px "Malgun Gothic", sans-serif', '#e06070');
  menu.options.forEach((opt, i) => {
    const on = i === menu.sel;
    centered(ctx, on ? `▶ ${opt.label} ◀` : opt.label, 280 + i * 34, FONT, on ? '#ffd98a' : '#7d8aa0');
  });
}

export function drawHUD(ctx, world, state, warmth, objective, stamina = 1, tired = false) {
  ctx.save();
  ctx.font = SMALL_FONT;
  ctx.textBaseline = 'top';
  const name = world.def.name;
  panel(ctx, 8, 8, ctx.measureText(name).width + 24, 28);
  ctx.fillStyle = '#c9d6ea';
  ctx.fillText(name, 20, 14);

  let y = 42;
  if (objective) {
    // 목표 줄: 퀘스트 아이콘 + 목표
    const w = ctx.measureText(objective).width;
    panel(ctx, 8, y, w + ICON_SLOT + 30, 26);
    drawItemIcon(ctx, 'quest', 12, y + 3);
    ctx.fillStyle = '#ffd98a';
    ctx.fillText(objective, 12 + ICON_SLOT + 8, y + 5);
    y += 32;
  }

  if (warmth < 1) {
    panel(ctx, 8, y, 150, 26);
    ctx.fillStyle = '#c9d6ea';
    ctx.fillText('체온', 18, y + 5);
    rect(ctx, '#1a2233', 56, y + 8, 92, 10);
    rect(ctx, warmth > 0.35 ? '#e8a25a' : '#e0503c', 56, y + 8, Math.round(92 * warmth), 10);
    y += 32;
  }

  // 스태미나: 줄었을 때만 보인다. 바닥나서 회복 중이면 회색
  if (stamina < 1) {
    panel(ctx, 8, y, 150, 26);
    ctx.fillStyle = '#c9d6ea';
    ctx.fillText('기력', 18, y + 5);
    rect(ctx, '#1a2233', 56, y + 8, 92, 10);
    rect(ctx, tired ? '#6b7380' : '#7fd18b', 56, y + 8, Math.round(92 * stamina), 10);
  }

  if (state.items.length) {
    const counts = new Map();
    for (const id of state.items) counts.set(id, (counts.get(id) ?? 0) + 1);
    const rows = [...counts].map(([id, n]) => ({ id, name: n > 1 || ITEMS[id].consumable ? `${ITEMS[id].name} ×${n}` : ITEMS[id].name }));
    const rowH = ICON_SLOT + 4;
    const w = Math.max(...rows.map((r) => ctx.measureText(r.name).width)) + ICON_SLOT + 30;
    const x = SCREEN_W - w - 8;
    panel(ctx, x, 8, w, rows.length * rowH + 12);
    ctx.fillStyle = '#ffd98a';
    rows.forEach((r, i) => {
      const y = 14 + i * rowH;
      drawItemIcon(ctx, r.id, x + 8, y, 1, ITEMS[r.id].iconImage);
      ctx.fillStyle = '#ffd98a';
      ctx.fillText(r.name, x + 8 + ICON_SLOT + 8, y + 3);
    });
  }
  ctx.restore();
}

function snow(ctx, t, count) {
  ctx.fillStyle = 'rgba(225, 235, 250, 0.8)';
  for (let i = 0; i < count; i++) {
    const x = (i * 73 + t * (25 + (i % 4) * 15)) % SCREEN_W;
    const y = (i * 131 + t * (35 + (i % 5) * 12)) % SCREEN_H;
    ctx.fillRect(x, y, i % 3 ? 2 : 3, i % 3 ? 2 : 3);
  }
}

function centered(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, (SCREEN_W - ctx.measureText(text).width) / 2, y);
}

export function drawTitle(ctx, t, menu) {
  rect(ctx, '#05080f', 0, 0, SCREEN_W, SCREEN_H);
  snow(ctx, t, 90);
  ctx.textBaseline = 'top';
  centered(ctx, '한밤의 극지연구소', 150, 'bold 40px "Malgun Gothic", sans-serif', '#e8eef8');
  centered(ctx, 'MIDNIGHT POLAR STATION', 205, SMALL_FONT, '#6f86a8');
  menu.options.forEach((opt, i) => {
    const on = i === menu.sel;
    centered(ctx, on ? `▶ ${opt.label} ◀` : opt.label, 290 + i * 34, FONT, on ? '#ffd98a' : '#7d8aa0');
  });
  centered(ctx, 'WASD 이동 · Shift 달리기 · Enter/F 조사 · E 소지품 · L 손전등 · Esc 메뉴', 420, SMALL_FONT, '#56657a');
  // 오른쪽 아래 판 번호, 오른쪽 위 설정(톱니바퀴) 버튼 — menu.sel === -1이면 버튼이 골라진 상태
  ctx.font = SMALL_FONT;
  ctx.fillStyle = '#56657a';
  const ver = `v${menu.version}`;
  ctx.fillText(ver, SCREEN_W - ctx.measureText(ver).width - 12, SCREEN_H - 24);
  drawGearButton(ctx, menu.sel === -1, t);
}

// 타이틀 오른쪽 위의 설정 버튼 (마우스로 누를 수 있게 자리를 내보낸다)
export const GEAR_BUTTON = { x: SCREEN_W - 48, y: 12, w: 36, h: 36 };
function drawGearButton(ctx, on, t) {
  const b = GEAR_BUTTON, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  ctx.fillStyle = on ? 'rgba(255, 217, 138, 0.15)' : 'rgba(8, 14, 28, 0.7)';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = on ? '#ffd98a' : '#4a5d7c';
  ctx.lineWidth = 1;
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  const col = on ? '#ffd98a' : '#9aa8bd';
  ctx.save();
  ctx.translate(cx, cy);
  if (on) ctx.rotate(t * 0.8);
  ctx.fillStyle = col;
  for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-2.5, -12, 5, 6); } // 톱니
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = on ? '#2a2414' : '#0b1220';
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// 저장·이어하기 슬롯 고르기 — 슬롯마다 메인 퀘스트, 있는 곳, 저장한 날짜·시간 (작가 지침)
export const SLOT_BOX = { x: 70, y: 84, w: SCREEN_W - 140, h: 102, gap: 10 };
const two = (n) => String(n).padStart(2, '0');
const stamp = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`; };
export function drawSlots(ctx, s) {
  rect(ctx, 'rgba(2, 4, 10, 0.88)', 0, 0, SCREEN_W, SCREEN_H);
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.font = FONT;
  centered(ctx, s.mode === 'save' ? '어느 슬롯에 저장할까요?' : '어느 슬롯에서 이어할까요?', 40, FONT, '#ffd98a');
  s.saves.forEach((sv, i) => {
    const b = SLOT_BOX, y = b.y + i * (b.h + b.gap), on = i === s.sel;
    const usable = s.mode === 'save' || !!sv;
    panel(ctx, b.x, y, b.w, b.h);
    if (on) { ctx.fillStyle = 'rgba(255, 217, 138, 0.12)'; ctx.fillRect(b.x + 3, y + 3, b.w - 6, b.h - 6); }
    ctx.font = FONT;
    ctx.fillStyle = on ? '#ffd98a' : usable ? '#e8eef8' : '#56657a';
    ctx.fillText(`${on ? '▶ ' : ''}슬롯 ${i + 1}`, b.x + 16, y + 12);
    ctx.font = SMALL_FONT;
    if (!sv) {
      ctx.fillStyle = '#56657a';
      ctx.fillText('(비어 있음)', b.x + 16, y + 44);
      return;
    }
    const lines = [
      ['퀘스트', sv.meta?.quest || '—'],
      ['장소', sv.meta?.place || '—'],
      ['저장', sv.savedAt ? stamp(sv.savedAt) : '—'],
    ];
    lines.forEach(([k, v], j) => {
      ctx.fillStyle = '#6f86a8';
      ctx.fillText(k, b.x + 16, y + 40 + j * 20);
      ctx.fillStyle = '#c9d6ea';
      let text = v;
      while (ctx.measureText(text).width > b.w - 110 && text.length > 1) text = text.slice(0, -2) + '…';
      ctx.fillText(text, b.x + 76, y + 40 + j * 20);
    });
  });
  ctx.font = SMALL_FONT;
  centered(ctx, 'W/S 고르기 · Enter 결정 · Esc 그만두기', SCREEN_H - 34, SMALL_FONT, '#56657a');
  ctx.restore();
}

// 설정 화면 — 지금은 판 이력만. lines = 미리 펼친 줄 목록, scroll = 첫 줄 번호
// settings = { sel, view: 'main' | 'history', lines, scroll, volume }
const SETTINGS_LABELS = ['BGM 음량', '효과음 음량', '판 이력'];
export function drawSettings(ctx, settings) {
  rect(ctx, 'rgba(2, 4, 10, 0.92)', 0, 0, SCREEN_W, SCREEN_H);
  panel(ctx, 40, 30, SCREEN_W - 80, SCREEN_H - 60);
  ctx.textBaseline = 'top';
  ctx.font = FONT;
  ctx.fillStyle = '#ffd98a';
  ctx.fillText('설정', 60, 46);
  if (settings.view === 'main') {
    // 음량 두 줄(막대 + ◀ ▶) + 판 이력
    SETTINGS_LABELS.forEach((label, i) => {
      const y = 100 + i * 52, on = i === settings.sel;
      if (on) { ctx.fillStyle = 'rgba(255, 217, 138, 0.12)'; ctx.fillRect(52, y - 10, SCREEN_W - 104, 42); }
      ctx.font = FONT;
      ctx.fillStyle = on ? '#ffd98a' : '#c9d6ea';
      ctx.fillText(`${on ? '▶ ' : '   '}${label}`, 62, y);
      if (i < 2) {
        const v = settings.volume[i === 0 ? 'bgm' : 'sfx'];
        rect(ctx, '#1a2233', 260, y + 4, 200, 14);
        rect(ctx, on ? '#ffd98a' : '#7d8aa0', 260, y + 4, Math.round(200 * v), 14);
        ctx.font = SMALL_FONT;
        ctx.fillStyle = '#c9d6ea';
        ctx.fillText(`${Math.round(v * 100)}%`, 474, y + 2);
        if (on) { ctx.fillStyle = '#ffd98a'; ctx.fillText('◀', 240, y + 2); ctx.fillText('▶', 520, y + 2); }
      } else {
        ctx.font = SMALL_FONT;
        ctx.fillStyle = '#7d8aa0';
        ctx.fillText('Enter — 보기', 260, y + 3);
      }
    });
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#56657a';
    ctx.fillText('W/S 고르기 · A/D 음량 · Enter 결정 · Esc 닫기', 60, SCREEN_H - 58);
    return;
  }
  ctx.font = SMALL_FONT;
  ctx.fillStyle = '#6f86a8';
  ctx.fillText('판 이력', 60, 80);
  rect(ctx, '#3b4a63', 112, 88, SCREEN_W - 172, 1);
  const rows = 14;
  settings.lines.slice(settings.scroll, settings.scroll + rows).forEach((l, i) => {
    ctx.fillStyle = l.head ? '#e8eef8' : '#c9d6ea';
    ctx.font = l.head ? `bold ${SMALL_FONT}` : SMALL_FONT;
    ctx.fillText(l.text, l.head ? 60 : 76, 100 + i * 22);
  });
  ctx.font = SMALL_FONT;
  ctx.fillStyle = '#56657a';
  const more = settings.lines.length > rows ? 'W/S 넘기기 · ' : '';
  ctx.fillText(`${more}Esc·Enter 돌아가기`, 60, SCREEN_H - 58);
}

export function drawEnding(ctx, ending, t) {
  rect(ctx, '#05080f', 0, 0, SCREEN_W, SCREEN_H);
  snow(ctx, t, 60);
  ctx.textBaseline = 'top';
  centered(ctx, `— ${ending.title} —`, 130, 'bold 30px "Malgun Gothic", sans-serif', '#e8eef8');
  ending.lines.forEach((line, i) => centered(ctx, line, 210 + i * 34, FONT, '#c9d6ea'));
  centered(ctx, 'Enter — 타이틀로', 410, SMALL_FONT, '#6f86a8');
}

// ═════════════════════════════════════════════
// 전체 화면 그림 (c.picture). 에셋 교체 지점 — 그림 파일이 생기면 여기서 drawImage로 바꾼다.
// ═════════════════════════════════════════════
const PICTURES = {
  // 낮의 극지연구소 전경 (오프닝)
  kopri_day(ctx, t) {
    const W = SCREEN_W, H = SCREEN_H;
    const sky = ctx.createLinearGradient(0, 0, 0, 300);
    sky.addColorStop(0, '#4f97dc');
    sky.addColorStop(1, '#d4ecfb');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 300);

    // 해
    const sun = ctx.createRadialGradient(545, 70, 10, 545, 70, 90);
    sun.addColorStop(0, 'rgba(255,250,225,1)');
    sun.addColorStop(0.3, 'rgba(255,245,200,0.6)');
    sun.addColorStop(1, 'rgba(255,245,200,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(455, 0, 185, 170);

    // 구름
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [cx, cy, s] of [[120, 70, 1], [330, 45, 0.7], [470, 120, 0.8]]) {
      const x = ((cx + t * 6 * s) % (W + 160)) - 80;
      ctx.beginPath();
      ctx.ellipse(x, cy, 46 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 26 * s, cy - 9 * s, 30 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 멀리 송도 빌딩숲
    for (let i = 0; i < 16; i++) {
      const bx = i * 42 + ((i * 17) % 13), bh = 50 + ((i * 37) % 90);
      rect(ctx, i % 2 ? '#a6bacd' : '#b4c6d7', bx, 250 - bh, 26 + (i % 3) * 6, bh);
    }

    // 잔디
    const lawn = ctx.createLinearGradient(0, 270, 0, H);
    lawn.addColorStop(0, '#6aab58');
    lawn.addColorStop(1, '#3f7f3a');
    ctx.fillStyle = lawn;
    ctx.fillRect(0, 270, W, H - 270);

    // 연구동 (뒤쪽 높은 동)
    rect(ctx, '#e9edf2', 70, 150, 170, 140);
    rect(ctx, '#c9d1db', 70, 150, 170, 8);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
      rect(ctx, (r + c) % 4 ? '#79acd6' : '#a8cdea', 80 + c * 22, 166 + r * 24, 16, 16);
    }

    // 본관 (앞쪽 긴 유리동)
    rect(ctx, '#f2f4f7', 200, 200, 380, 95);
    rect(ctx, '#ccd4de', 200, 200, 380, 10);
    const glass = ctx.createLinearGradient(0, 215, 0, 285);
    glass.addColorStop(0, '#5e9bd0');
    glass.addColorStop(1, '#a9d0ef');
    ctx.fillStyle = glass;
    ctx.fillRect(212, 216, 356, 66);
    for (let c = 0; c <= 14; c++) rect(ctx, '#e6eaef', 212 + c * 25.4, 216, 2, 66);
    rect(ctx, '#e6eaef', 212, 248, 356, 2);
    // 하늘이 비친 반사광
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.moveTo(300, 216); ctx.lineTo(340, 216); ctx.lineTo(290, 282); ctx.lineTo(250, 282); ctx.fill();

    // 입구 캐노피와 진입로
    rect(ctx, '#d7dde5', 360, 268, 90, 6);
    rect(ctx, '#33475f', 385, 274, 40, 21);
    ctx.fillStyle = '#d9d3c5';
    ctx.beginPath(); ctx.moveTo(385, 295); ctx.lineTo(425, 295); ctx.lineTo(500, H); ctx.lineTo(310, H); ctx.fill();

    // 현판
    ctx.textBaseline = 'top';
    ctx.font = 'bold 20px "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#1d3557';
    ctx.fillText('극지연구소', 258, 178);
    ctx.font = '9px sans-serif';
    ctx.fillText('KOREA POLAR RESEARCH INSTITUTE', 360, 186);

    // 깃대
    for (let i = 0; i < 3; i++) {
      rect(ctx, '#b9c0c9', 520 + i * 16, 200, 2, 95);
      rect(ctx, ['#e8eef5', '#c0392b', '#2f6db5'][i], 522 + i * 16, 202 + Math.sin(t * 3 + i) * 1.5, 12, 8);
    }

    // 나무
    for (const [tx, s] of [[40, 1], [190, 0.8], [600, 1.1], [520, 0.9], [270, 0.7]]) {
      rect(ctx, '#6b4f36', tx - 3, 300 - 10 * s, 6, 26 * s);
      ctx.fillStyle = '#4c8f43';
      ctx.beginPath(); ctx.arc(tx, 288 - 14 * s, 22 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5ea653';
      ctx.beginPath(); ctx.arc(tx - 6 * s, 282 - 16 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
    }
  },
};

export function drawPicture(ctx, id, t) {
  const draw = PICTURES[id];
  if (draw) return draw(ctx, t);
  rect(ctx, '#111', 0, 0, SCREEN_W, SCREEN_H);
  centered(ctx, `(그림 없음: ${id})`, SCREEN_H / 2 - 10, FONT, '#888');
}

// 화면 위 알림 한 줄. p = 0→1 진행도 (처음과 끝에 살짝 페이드)
export function drawToast(ctx, text, p) {
  const a = Math.min(1, p * 8, (1 - p) * 6);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = FONT;
  ctx.textBaseline = 'top';
  const w = ctx.measureText(text).width + 40;
  const x = (SCREEN_W - w) / 2, y = 96;
  panel(ctx, x, y, w, 36);
  ctx.fillStyle = '#ffd98a';
  ctx.fillText(text, x + 20, y + 8);
  ctx.restore();
}

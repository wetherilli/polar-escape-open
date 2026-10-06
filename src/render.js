import { TILE, SCREEN_W, SCREEN_H } from './config.js?v=0.32.0';
import { ITEMS } from './data/items.js?v=0.32.0';
import { lookFor } from './data/looks.js?v=0.32.0';
import { SOLID_TILES as SOLID } from './world.js?v=0.32.0';
import { isExplored } from './state.js?v=0.32.0';

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
  // 책상: 바닥 위에 나뭇결 상판 + 앞면 띠 + 그림자. 위에 종이·모니터·머그컵 중 하나쯤
  desk(g, n, r) {
    PIXEL_TILES.floor(g, n, r);
    rect(g, 'rgba(0,0,0,0.25)', 2, 26, 29, 4); // 그림자
    rect(g, ['#8a6a4c', '#3a2d22'][n], 1, 5, 30, 18); // 상판
    for (let k = 0; k < 5; k++) rect(g, ['#7d5f43', '#33281e'][n], 2, 7 + k * 3 + Math.floor(r(k, 0, 1) * 2), 28, 1); // 나뭇결
    rect(g, ['#a3825f', '#45372a'][n], 1, 5, 30, 1); // 윗 모서리
    rect(g, ['#5e4632', '#261d16'][n], 1, 23, 30, 4); // 앞면
    rect(g, ['#4c3828', '#1d1611'][n], 3, 27, 2, 2); rect(g, ['#4c3828', '#1d1611'][n], 27, 27, 2, 2); // 다리
    const kind = Math.floor(r(0, 0, 9) * 4);
    if (kind === 0) { // 종이 몇 장
      rect(g, ['#efece4', '#5c5e63'][n], 6, 8, 10, 12); rect(g, ['#e2ded4', '#505257'][n], 9, 10, 10, 11);
      for (let k = 0; k < 4; k++) rect(g, ['#b9b4aa', '#3d3f43'][n], 11, 13 + k * 2, 6, 1);
    } else if (kind === 1) { // 모니터 + 키보드
      rect(g, ['#2b2f36', '#121418'][n], 9, 6, 14, 10); rect(g, ['#5b7896', '#1d2a38'][n], 10, 7, 12, 8);
      rect(g, ['#2b2f36', '#121418'][n], 15, 16, 2, 2);
      rect(g, ['#c9ccd1', '#3c3f45'][n], 8, 19, 16, 3);
    } else if (kind === 2) { // 머그컵 + 펜
      rect(g, ['#e8e4dc', '#55575c'][n], 20, 10, 5, 6); rect(g, ['#c94f43', '#4a2622'][n], 20, 10, 5, 1);
      rect(g, ['#3a6fb0', '#1c3048'][n], 7, 15, 9, 1);
    }
  },
  // 선반: 철제 틀 + 세 칸, 칸마다 바인더·상자
  shelf(g, n, r) {
    PIXEL_TILES.floor(g, n, r);
    const frame = ['#6d7682', '#262b33'][n];
    rect(g, ['#3d434c', '#15181d'][n], 2, 2, 28, 26); // 안쪽 그늘
    rect(g, frame, 1, 1, 2, 28); rect(g, frame, 29, 1, 2, 28);
    const books = [['#c0493d', '#3f6fae', '#e0b23f', '#4f8a50', '#d6d2c8', '#7a5aa0'], ['#45211e', '#1f2f45', '#4a3d1c', '#1f3420', '#4b4a46', '#2e2440']][n];
    for (let s = 0; s < 3; s++) {
      const top = 3 + s * 9;
      rect(g, frame, 1, top + 7, 30, 2); // 선반 판
      let x = 4;
      while (x < 27) {
        if (r(x, s, 2) < 0.2) { // 상자
          const w = Math.min(8, 27 - x);
          rect(g, ['#b99c73', '#3e3426'][n], x, top + 2, w, 5); rect(g, ['#a68a62', '#352c20'][n], x, top + 2, w, 1);
          x += w + 1;
        } else { // 책·바인더
          const w = 2 + Math.floor(r(x, s, 3) * 2), h = 4 + Math.floor(r(x, s, 4) * 3);
          rect(g, pick(books, r(x, s, 5)), x, top + 7 - h, w, h);
          x += w;
        }
        if (r(x, s, 6) < 0.12) x += 3; // 빈 자리
      }
    }
    rect(g, 'rgba(0,0,0,0.25)', 1, 29, 30, 2);
  },
  // 설비: 회색 장비 캐비닛 — 위 화면, 손잡이, 아래 환기구(불빛은 TILES.G에서 따로 깜빡인다)
  equipment(g, n, r) {
    PIXEL_TILES.floor(g, n, r);
    rect(g, 'rgba(0,0,0,0.25)', 2, 28, 29, 3);
    rect(g, ['#7f8a85', '#2a302e'][n], 1, 2, 30, 26);
    rect(g, ['#98a39e', '#343b38'][n], 1, 2, 30, 2);
    rect(g, ['#66706b', '#1f2422'][n], 1, 26, 30, 2);
    rect(g, ['#2a3530', '#0f1412'][n], 5, 6, 14, 8); // 화면
    rect(g, ['#4c6b5d', '#1a2a23'][n], 6, 7, 12, 3);
    for (let k = 0; k < 3; k++) rect(g, ['#b8c0bc', '#454c49'][n], 23, 6 + k * 3, 4, 2); // 단추
    for (let k = 0; k < 4; k++) rect(g, ['#5c6662', '#1c211f'][n], 5, 17 + k * 2, 22, 1); // 환기구
  },
  // 세면대: 흰 상판 + 둥근 세면기 + 수도꼭지
  sink(g, n, r) {
    PIXEL_TILES.floor(g, n, r);
    rect(g, 'rgba(0,0,0,0.25)', 2, 26, 29, 4);
    rect(g, ['#e9ebee', '#555b66'][n], 1, 4, 30, 20);
    rect(g, ['#c4c9d0', '#40454f'][n], 1, 22, 30, 4);
    g.fillStyle = ['#b9c3cd', '#3a404b'][n]; g.beginPath(); g.ellipse(16, 15, 10, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = ['#d6dde4', '#474e5a'][n]; g.beginPath(); g.ellipse(16, 16, 8, 4, 0, 0, Math.PI * 2); g.fill();
    rect(g, ['#8d96a3', '#2c313a'][n], 15, 16, 2, 2); // 배수구
    rect(g, ['#9aa3ae', '#3a404a'][n], 15, 5, 2, 5); rect(g, ['#9aa3ae', '#3a404a'][n], 13, 5, 6, 2); // 수도꼭지
    if (r(1, 1, 1) < 0.5) rect(g, ['#7fc1d6', '#2d4a55'][n], 23, 6, 4, 3); // 비누
  },
  // 건물 외벽(캠퍼스): 외장 패널 + 유리창 둘. 밤의 불 켜진 창은 TILES.H에서 덧그린다
  facade(g, n, r) {
    rect(g, ['#dfe3e8', '#2a2f3a'][n], 0, 0, 32, 32);
    for (let k = 0; k < 18; k++) rect(g, pick([['#d6dbe1', '#e6e9ed'], ['#262b35', '#2f3440']][n], r(k, 0, 1)), Math.floor(r(k, 1, 2) * 32), Math.floor(r(k, 2, 3) * 32), 2, 1);
    rect(g, ['#cdd3da', '#242832'][n], 0, 0, 32, 1); // 층 이음매
    rect(g, ['#c4cad2', '#232732'][n], 0, 30, 32, 2);
    for (let i = 0; i < 2; i++) {
      const wx = 5 + i * 14;
      rect(g, ['#9aa3ae', '#1e222b'][n], wx - 1, 7, 10, 12); // 창틀
      rect(g, [r(i, 0, 4) < 0.35 ? '#9cc8e8' : '#7fb3dc', '#171b23'][n], wx, 8, 8, 10);
      rect(g, ['#c6e0f2', '#222733'][n], wx + 1, 9, 2, 4); // 비친 빛
      rect(g, ['#b0b8c2', '#363c48'][n], wx - 1, 19, 10, 1); // 창턱
    }
  },
  // 부지 경계: 낮은 생울타리 + 철제 울타리
  hedge(g, n, r) {
    rect(g, ['#3f7a3a', '#18241b'][n], 0, 0, 32, 32);
    const leaf = [['#356b31', '#4b8c44', '#5a9c50', '#2e5f2b'], ['#142018', '#1c2c20', '#203325', '#101a13']][n];
    for (let k = 0; k < 90; k++) rect(g, pick(leaf, r(k, 0, 1)), Math.floor(r(k, 1, 2) * 31), Math.floor(r(k, 2, 3) * 31), 2, 2);
    const metal = ['#8d96a3', '#55606e'][n], dark = ['#6c7480', '#3b434e'][n];
    rect(g, metal, 0, 12, 32, 2); rect(g, dark, 0, 14, 32, 1);
    for (const px of [3, 11, 19, 27]) { rect(g, metal, px, 5, 2, 22); rect(g, dark, px + 2, 5, 1, 22); }
    rect(g, 'rgba(0,0,0,0.2)', 0, 29, 32, 3);
  },
  // 트인 공간: 아래층이 내려다보이는 곳 — 어두운 아래층 바닥 타일(난간은 TILES.V에서 이웃을 보고 긋는다)
  atrium(g, n, r) {
    rect(g, ['#6f7680', '#11151c'][n], 0, 0, 32, 32);
    const tile = [['#767d88', '#6a717b'], ['#151a22', '#0e1218']][n];
    for (let i = 0; i < 4; i++) rect(g, pick(tile, r(i, 0, 1)), (i % 2) * 16 + 1, (i >> 1) * 16 + 1, 15, 15);
    for (let k = 0; k < 20; k++) rect(g, ['#5f666f', '#0b0e13'][n], Math.floor(r(k, 1, 2) * 32), Math.floor(r(k, 2, 3) * 32), 1, 1);
  },
};

const floor = drawPixelTile('floor');
const wallTile = drawPixelTile('wall');
const wall = (ctx, x, y, o = {}) => wallTile(ctx, x, y, { tx: o.tx ?? 0, ty: o.ty ?? 0, state: o.state });
const facade = drawPixelTile('facade');
const atrium = drawPixelTile('atrium');
const equipment = drawPixelTile('equipment');

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

// 큰 나무: 64×64 한 그루를 미리 그려 두고, 2×2 칸이 각자 자기 4분의 1을 그린다.
// 몇 번째 칸인지는 왼쪽·위로 이어진 B의 개수로 정한다(짝수 번째 = 왼쪽·위). check.mjs가 2×2로 놓였는지 본다
const bigTreeCache = new Map();
function bigTreeCanvas(n) {
  let c = bigTreeCache.get(n);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = T * 2;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.ellipse(34, 57, 24, 6, 0, 0, Math.PI * 2); g.fill();
  rect(g, ['#6b4a2e', '#2e2219'][n], 28, 38, 9, 20); // 줄기
  rect(g, ['#5a3e26', '#261c15'][n], 33, 38, 4, 20);
  const leaf = [['#2f6a2b', '#3f7d36', '#4f9442', '#5fa651'], ['#0f1c12', '#16251a', '#1d3022', '#233a28']][n];
  const blob = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  // 잎 덩어리 여럿을 겹쳐 둥근 수관 — 뒤(어두운 색)부터 앞(밝은 색)으로
  [[32, 28, 26], [18, 30, 14], [46, 30, 14], [32, 16, 15]].forEach(([x, y, r]) => blob(x, y, r, leaf[0]));
  [[30, 26, 21], [20, 24, 11], [43, 25, 12]].forEach(([x, y, r]) => blob(x, y, r, leaf[1]));
  [[26, 20, 12], [40, 20, 9], [22, 32, 8]].forEach(([x, y, r]) => blob(x, y, r, leaf[2]));
  blob(22, 15, 6, leaf[3]); blob(36, 13, 4, leaf[3]);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 60; k++) { // 잎 결
    const x = 8 + Math.floor(rnd() * 48), y = 4 + Math.floor(rnd() * 44);
    if (Math.hypot(x - 32, y - 27) < 24) rect(g, leaf[Math.floor(rnd() * 4)], x, y, 1, 1);
  }
  bigTreeCache.set(n, c);
  return c;
}
const grassTile = drawPixelTile('grass');
function bigTreeTile(ctx, x, y, o) {
  grassTile(ctx, x, y, o);
  const tree = bigTreeCanvas(day(o) ? 0 : 1);
  if (!o.world) return ctx.drawImage(tree, x, y, T, T); // 편집기 견본: 한 그루를 한 칸에 줄여서
  const run = (dx, dy) => { let k = 0; while (o.world.tiles[o.ty + dy * (k + 1)]?.[o.tx + dx * (k + 1)] === 'B') k++; return k; };
  ctx.drawImage(tree, (run(-1, 0) % 2) * T, (run(0, -1) % 2) * T, T, T, x, y, T, T);
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
  B: bigTreeTile,                 // 큰 나무 (2×2 칸 한 그루, 통과 불가)
  '*': drawPixelTile('flowerbed'), // 화단 (통과 불가)
  '|': drawPixelTile('parking'),  // 주차장 (주차선)
  P: drawPixelTile('pilotis'),    // 필로티 (건물 1층을 차가 지나감)
  H(ctx, x, y, o) { // 건물 외벽 — 낮: 밝은 외장 + 하늘이 비친 유리 / 밤: 맵의 litWindows 칸만 불이 켜져 있다(야근 중인 방)
    facade(ctx, x, y, o);
    const d = day(o);
    if (!d && o.world?.def.litWindows?.some(([lx, ly]) => lx === o.tx && ly === o.ty)) {
      for (let i = 0; i < 2; i++) rect(ctx, '#e8c46a', x + 5 + i * 14, y + 8, 8, 10);
    }
    // 건물 가장자리(옆 칸이 H가 아닌 쪽)에 진한 테두리 — 건물끼리, 건물과 길이 갈라져 보이게
    const out = (dx, dy) => o.world && o.world.tiles[o.ty + dy]?.[o.tx + dx] !== 'H';
    const edge = d ? '#a7afba' : '#151820';
    if (out(0, -1)) rect(ctx, edge, x, y, T, 2);
    if (out(0, 1)) rect(ctx, edge, x, y + T - 2, T, 2);
    if (out(-1, 0)) rect(ctx, edge, x, y, 2, T);
    if (out(1, 0)) rect(ctx, edge, x + T - 2, y, 2, T);
  },
  F: drawPixelTile('hedge'), // 부지 경계 (생울타리·울타리)
  W(ctx, x, y, o) { windowPane(ctx, x, y, o); windowFrame(ctx, x, y, day(o)); },
  V(ctx, x, y, o) { // 아래층이 내다보이는 트인 공간: 어두운 아래층 바닥 + 걸을 수 있는 칸과 맞닿은 쪽에 유리 난간
    atrium(ctx, x, y, o);
    const walk = (dx, dy) => { const ch = o.world?.tiles[o.ty + dy]?.[o.tx + dx]; return ch != null && ch !== 'V' && !SOLID.has(ch); };
    const glass = 'rgba(170, 205, 230, 0.35)', rail = day(o) ? '#c4ccd6' : '#7d8796';
    if (!o.world) { rect(ctx, glass, x, y, 4, T); rect(ctx, rail, x, y, 2, T); return; } // 편집기 견본
    if (walk(-1, 0)) { rect(ctx, glass, x, y, 4, T); rect(ctx, rail, x, y, 2, T); }
    if (walk(1, 0)) { rect(ctx, glass, x + T - 4, y, 4, T); rect(ctx, rail, x + T - 2, y, 2, T); }
    if (walk(0, -1)) { rect(ctx, glass, x, y, T, 4); rect(ctx, rail, x, y, T, 2); }
    if (walk(0, 1)) { rect(ctx, glass, x, y + T - 4, T, 4); rect(ctx, rail, x, y + T - 2, T, 2); }
  },
  '=': drawPixelTile('desk'),      // 책상
  R: drawPixelTile('shelf'),       // 선반
  S: drawPixelTile('sink'),        // 세면대
  X: (ctx, x, y, o) => rubbleTile(ctx, x, y, o), // 잔해 더미 (통과 불가) — 밤 겹침층에 칠한다. 바닥은 낮의 그 칸을 따른다
  G(ctx, x, y, o) {                // 설비 — 전기가 들어와 있으면 초록 불이 깜빡인다
    equipment(ctx, x, y, o);
    const on = o.state?.flags.power && Math.floor(o.t * 4 + o.tx) % 2 === 0;
    rect(ctx, on ? '#7dff9a' : '#55302f', x + 23, y + 16, 4, 3);
  },
};

// ── 붕괴 (밤) — 본편이 시작되면 연구소 전체가 무너지기 시작했다(작가 설정) ──
// 밤에는 바닥·벽·외벽·도로 칸 일부에 금·파손·패임을 덧그린다. 칸 좌표와 맵 id로 정해지므로 늘 같은 자리에 같은 모양.
// 얼마나 부서지는지는 DAMAGE 비율만 바꾸면 된다. 길을 막는 잔해는 맵의 밤 겹침층(night)에 X로 칠한다.
const DAMAGE = {
  floor: { crack: 0.09, broken: 0.025 },           // 실내 바닥 '.', 창고 바닥 ','
  sidewalk: { crack: 0.1, broken: 0.03 },          // 보도 ':'
  road: { crack: 0.12, area: 0.22, pothole: 0.35 }, // 차도·주차장·필로티 — area: 4×4칸 구역이 패인 구간일 확률, pothole: 그 구간 안에서 깊은 구멍일 확률
  facade: { crack: 0.22, broken: 0.05 },           // 건물 외벽 'H' — broken: 깨진 창
  wall: { crack: 0.07 },                           // 실내 벽 '#'
  glass: { crack: 0.12 },                          // 창문 'W'
};
const DAMAGE_KIND = { '.': 'floor', ',': 'floor', ':': 'sidewalk', _: 'road', '|': 'road', P: 'road', H: 'facade', '#': 'wall', W: 'glass' };
const DAMAGE_VARIANTS = 12;
const mapSeed = (id) => [...(id ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

// 덧그림 한 장(32×32, 투명 바탕) — 종류·변형마다 한 번만 그려 둔다
const damageCache = new Map();
function damageCanvas(kind, v) {
  const key = `${kind}/${v}`;
  let c = damageCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = T;
    let s = 1 + v * 7919 + kind.length * 104729;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    DAMAGE_ART[kind](c.getContext('2d'), rnd);
    damageCache.set(key, c);
  }
  return c;
}

// 금 한 줄: (x, y)에서 각도 a로 len픽셀, 지그재그로 꺾이며(처음 방향에서 너무 벗어나지 않게).
// 밝은 결을 한 칸 아래에 깔아 패인 느낌. thick: 앞쪽 몇 할을 2픽셀 굵기로. 가끔 곁가지
function crackLine(g, rnd, x, y, a, len, dark, light, branch = true, box = [0, 0, T, T], thick = 0) {
  const a0 = a;
  for (let i = 0; i < len; i++) {
    if (rnd() < 0.35) a = a0 + Math.max(-0.8, Math.min(0.8, a - a0 + (rnd() - 0.5) * 1.4));
    x += Math.cos(a); y += Math.sin(a);
    const px = Math.round(x), py = Math.round(y);
    if (px < box[0] || py < box[1] || px >= box[2] || py >= box[3]) return;
    const w = i < len * thick ? 2 : 1;
    if (light) rect(g, light, px, py + 1, w, 1);
    rect(g, dark, px, py, w, 1);
    if (branch && i > 3 && rnd() < 0.07) crackLine(g, rnd, x, y, a + (rnd() < 0.5 ? 0.9 : -0.9), len * 0.4, dark, light, false, box);
  }
}
// 가장자리 한 점에서 맞은편 쪽으로 뻗는 금
function crackAcross(g, rnd, dark, light, len, box = [0, 0, T, T], thick = 0) {
  const w = box[2] - box[0], h = box[3] - box[1], at = () => 0.2 + rnd() * 0.6;
  const starts = [[box[0] + w * at(), box[1], Math.PI / 2], [box[2] - 1, box[1] + h * at(), Math.PI],
    [box[0] + w * at(), box[3] - 1, -Math.PI / 2], [box[0], box[1] + h * at(), 0]];
  const [x, y, a] = starts[Math.floor(rnd() * 4)];
  crackLine(g, rnd, x, y, a + (rnd() - 0.5) * 0.8, len, dark, light, true, box, thick);
}
// 마감이 떨어져 나간 자리: 들쭉날쭉한 어두운 조각 + 윗가장자리의 밝은 깨진 면
function spall(g, rnd, x, y, w, h, dark, edge) {
  for (let k = 0; k < h; k++) {
    const l = Math.floor(rnd() * 2) + (k === 0 || k === h - 1 ? 1 : 0), r = Math.floor(rnd() * 2) + (k === 0 || k === h - 1 ? 1 : 0);
    rect(g, dark, x + l, y + k, w - l - r, 1);
  }
  rect(g, edge, x + 1, y - 1, w - 2, 1);
}
// 울퉁불퉁한 덩어리(원 몇 개를 겹침) — 구멍·웅덩이·잔해 바닥
function blob(g, rnd, cx, cy, r, color) {
  g.fillStyle = color;
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.arc(cx + (rnd() - 0.5) * r, cy + (rnd() - 0.5) * r * 0.7, r * (0.55 + rnd() * 0.35), 0, Math.PI * 2);
    g.fill();
  }
}
// 깨진 조각 하나(삼각·사각 파편)
function shard(g, rnd, x, y, size, fill, edge) {
  g.fillStyle = fill; g.strokeStyle = edge; g.lineWidth = 1;
  g.beginPath();
  const n = 3 + Math.floor(rnd() * 2), a0 = rnd() * Math.PI;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI * 2, rr = size * (0.6 + rnd() * 0.5);
    g[k ? 'lineTo' : 'moveTo'](Math.round(x + Math.cos(a) * rr) + 0.5, Math.round(y + Math.sin(a) * rr) + 0.5);
  }
  g.closePath(); g.fill(); g.stroke();
}

// 각 함수: (g, rnd) — 밤 색만 쓴다(낮에는 붕괴가 없다)
const DAMAGE_ART = {
  floorCrack(g, rnd) { crackAcross(g, rnd, '#16191f', 'rgba(140,150,170,0.25)', 22 + rnd() * 14); },
  // 바닥 타일 한 장(16×16)이 깨져 꺼지고 조각이 흩어짐 + 둘레로 금
  floorBroken(g, rnd) {
    const qx = rnd() < 0.5 ? 0 : 16, qy = rnd() < 0.5 ? 0 : 16;
    for (let y = 0; y < 16; y++) { // 들쭉날쭉한 가장자리
      const l = Math.floor(rnd() * 3), r = Math.floor(rnd() * 3);
      rect(g, '#1c1f25', qx + l, qy + y, 16 - l - r, 1);
    }
    rect(g, '#25292f', qx + 3, qy + 3, 10, 10); // 드러난 콘크리트 바닥
    for (let k = 0; k < 8; k++) rect(g, '#30343b', qx + 3 + Math.floor(rnd() * 10), qy + 3 + Math.floor(rnd() * 10), 1, 1);
    for (let k = 0; k < 4; k++) shard(g, rnd, qx + 3 + rnd() * 10, qy + 3 + rnd() * 10, 2 + rnd() * 2, rnd() < 0.5 ? '#4a5160' : '#414855', '#1a1d23');
    for (let k = 0; k < 3; k++) shard(g, rnd, 2 + rnd() * 28, 2 + rnd() * 28, 1.5, '#4f5666', '#1a1d23'); // 튄 조각
    crackLine(g, rnd, qx + 8, qy + 8, rnd() * Math.PI * 2, 18, '#16191f', 'rgba(140,150,170,0.25)');
  },
  sidewalkCrack(g, rnd) { crackAcross(g, rnd, '#141619', 'rgba(120,125,135,0.25)', 20 + rnd() * 14); },
  // 보도블록 한 장이 빠져 흙이 드러남
  sidewalkBroken(g, rnd) {
    const row = Math.floor(rnd() * 4), off = row % 2 ? 8 : 0, col = Math.floor(rnd() * 2);
    const bx = Math.max(0, col * 16 + off + 1), by = row * 8 + 1, w = Math.min(15, 32 - bx);
    rect(g, '#1d1915', bx, by, w, 7);
    for (let k = 0; k < 10; k++) rect(g, rnd() < 0.5 ? '#2a241e' : '#14110e', bx + Math.floor(rnd() * w), by + Math.floor(rnd() * 7), 1, 1);
    shard(g, rnd, bx + w * rnd(), by + 3, 3, '#41454d', '#1a1c20'); // 들린 블록 조각
    crackAcross(g, rnd, '#141619', 'rgba(120,125,135,0.25)', 14);
  },
  roadCrack(g, rnd) {
    crackAcross(g, rnd, '#0b0c0e', 'rgba(90,95,105,0.35)', 28 + rnd() * 10);
    if (rnd() < 0.5) crackAcross(g, rnd, '#0b0c0e', 'rgba(90,95,105,0.35)', 16);
  },
  // 패인 구간의 칸: 아스팔트가 군데군데 내려앉고 부서진 조각이 흩어짐 (칸 경계에서 잘리지 않게 안쪽에만)
  roadRough(g, rnd) {
    for (let k = 0; k < 3; k++) blob(g, rnd, 8 + rnd() * 16, 8 + rnd() * 16, 3 + rnd() * 2, 'rgba(0,0,0,0.3)');
    for (let k = 0; k < 10; k++) shard(g, rnd, 2 + rnd() * 28, 2 + rnd() * 28, 1 + rnd() * 1.5, rnd() < 0.5 ? '#33373e' : '#2a2d33', '#141619'); // 부서진 아스팔트 조각
    crackAcross(g, rnd, '#0b0c0e', 'rgba(90,95,105,0.3)', 24 + rnd() * 12, [0, 0, T, T], 0.3);
  },
  // 패인 곳: 거친 바닥 위에 깊은 구멍 + 들뜬 테두리 + 가끔 고인 물
  pothole(g, rnd) {
    DAMAGE_ART.roadRough(g, rnd);
    const cx = 12 + rnd() * 8, cy = 12 + rnd() * 8, r = 8 + rnd() * 4;
    const hole = (rr, color) => { // 원 여럿을 겹친 들쭉날쭉한 구멍
      g.fillStyle = color;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        g.beginPath(); g.arc(cx + Math.cos(a) * rr * 0.45, cy + Math.sin(a) * rr * 0.3, rr * (0.45 + rnd() * 0.25), 0, Math.PI * 2); g.fill();
      }
    };
    hole(r + 2, '#2c3036');
    hole(r, '#0b0c0f');
    hole(r * 0.55, '#121418');
    if (rnd() < 0.45) { hole(r * 0.45, '#16222e'); rect(g, '#2d4256', Math.round(cx - 2), Math.round(cy), 4, 1); } // 고인 물
  },
  // 외벽: 굵게 갈라진 금 + 마감이 떨어져 나간 자리
  facadeCrack(g, rnd) {
    crackAcross(g, rnd, '#0a0c10', 'rgba(110,120,140,0.35)', 30 + rnd() * 14, [0, 0, T, T], 0.5);
    if (rnd() < 0.4) crackAcross(g, rnd, '#0a0c10', 'rgba(110,120,140,0.35)', 16);
    if (rnd() < 0.4) spall(g, rnd, 2 + Math.floor(rnd() * 22), 3 + Math.floor(rnd() * 22), 4 + Math.floor(rnd() * 4), 3 + Math.floor(rnd() * 3), '#1a1e26', '#454c5a');
  },
  // 깨진 창: 유리 한 장이 깨져 안이 시커멓고 날카로운 조각만 남음
  facadeBroken(g, rnd) {
    const wx = rnd() < 0.5 ? 5 : 19;
    rect(g, '#05070a', wx, 8, 8, 10);
    g.fillStyle = '#3c4658';
    g.beginPath(); g.moveTo(wx, 8); g.lineTo(wx + 3 + rnd() * 4, 8); g.lineTo(wx, 11 + rnd() * 4); g.fill();
    g.beginPath(); g.moveTo(wx + 8, 18); g.lineTo(wx + 8, 13 + rnd() * 3); g.lineTo(wx + 3 + rnd() * 3, 18); g.fill();
    crackAcross(g, rnd, '#0a0c10', 'rgba(110,120,140,0.35)', 16);
  },
  wallCrack(g, rnd) {
    crackAcross(g, rnd, '#0b0d12', 'rgba(90,100,120,0.3)', 22 + rnd() * 10, [0, 7, T, T], 0.4);
    if (rnd() < 0.3) spall(g, rnd, 3 + Math.floor(rnd() * 20), 10 + Math.floor(rnd() * 16), 5, 3, '#14171e', '#353c4c');
  },
  // 금 간 유리창: 한 점에서 퍼지는 금
  glassCrack(g, rnd) {
    const cx = 8 + rnd() * 16, cy = 10 + rnd() * 10;
    for (let k = 0; k < 5 + Math.floor(rnd() * 3); k++) crackLine(g, rnd, cx, cy, rnd() * Math.PI * 2, 6 + rnd() * 10, 'rgba(210,225,245,0.55)', null, false, [4, 7, T - 4, T - 6]);
    rect(g, 'rgba(230,240,255,0.7)', Math.round(cx), Math.round(cy), 1, 1);
  },
  // 잔해 더미: 무너진 콘크리트 덩어리·철근·부스러기
  rubble(g, rnd) {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.ellipse(16, 25, 14, 5, 0, 0, Math.PI * 2); g.fill();
    blob(g, rnd, 16, 19, 10, '#2f333b');
    const rocks = ['#4b505a', '#585e69', '#3f444d', '#646a75'];
    for (let k = 0; k < 9; k++) shard(g, rnd, 5 + rnd() * 22, 8 + rnd() * 17, 2.5 + rnd() * 3.5, rocks[Math.floor(rnd() * 4)], '#16181d');
    g.strokeStyle = '#7a4f3a'; g.lineWidth = 1; // 철근
    for (let k = 0; k < 2; k++) {
      const x = 6 + rnd() * 20, y = 8 + rnd() * 12;
      g.beginPath(); g.moveTo(x + 0.5, y + 0.5); g.lineTo(x + (rnd() - 0.5) * 14 + 0.5, y - 4 - rnd() * 5 + 0.5); g.stroke();
    }
    for (let k = 0; k < 14; k++) rect(g, '#6b707a', 3 + Math.floor(rnd() * 26), 10 + Math.floor(rnd() * 19), 1, 1);
  },
};

// 이 칸에 덧그릴 붕괴 그림 이름 (없으면 null)
function damageAt(world, tx, ty, ch) {
  const kind = DAMAGE_KIND[ch];
  if (!kind) return null;
  const p = DAMAGE[kind], seed = mapSeed(world.id), r = hash(tx, ty, seed);
  if (kind === 'road') {
    if (hash(tx >> 2, ty >> 2, seed + 3) < p.area && hash(tx, ty, seed + 9) < 0.6) { // 패인 구간
      return hash(tx, ty, seed + 5) < p.pothole ? 'pothole' : 'roadRough';
    }
    return r < p.crack ? 'roadCrack' : null;
  }
  if (r < p.crack) return `${kind}Crack`;
  if (p.broken && r < p.crack + p.broken) return `${kind}Broken`;
  return null;
}
function drawDamage(ctx, world, tx, ty, ch, x, y) {
  const art = damageAt(world, tx, ty, ch);
  if (art) ctx.drawImage(damageCanvas(art, Math.floor(hash(tx, ty, 11) * DAMAGE_VARIANTS)), x, y);
}

// 잔해 칸: 낮의 그 칸 그림(바닥·도로 등) 위에 잔해 더미
function rubbleTile(ctx, x, y, o) {
  const under = o.world?.dayTiles?.[o.ty]?.[o.tx];
  (under && under !== 'X' && TILES[under] ? TILES[under] : floor)(ctx, x, y, o);
  ctx.drawImage(damageCanvas('rubble', Math.floor(hash(o.tx, o.ty, 13) * DAMAGE_VARIANTS)), x, y);
}

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
    if (day(o)) drawPerson(ctx, x, y - 6, 'down', lookFor('경비원'));
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
  // NPC: 겉모습은 data/looks.js(이름으로 찾음), 없으면 이벤트의 color가 옷 색. 이벤트에 look을 주면 덧입힌다. 말을 걸면 ev.dir이 플레이어 쪽으로 바뀐다.
  npc(ctx, x, y, o) {
    const walking = o.ev.px !== undefined; // c.move로 걷는 중이면 걷는 장면
    drawPerson(ctx, x, y, o.ev.dir ?? 'down', lookFor(o.ev.name, o.ev.color, o.ev.look), 0, walking ? 1 + ((o.ev.x + o.ev.y) & 1) : 0);
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

// ── 상어귀신 (v0.30.0) — 하늘색 상어 후드집업을 깊이 눌러쓴 소년. 얼굴은 그늘, 빨간 눈만 보인다 ──
// 16×16을 2배로(사람 그림과 같은 크기). 오른쪽은 왼쪽을 뒤집는다. 시안은 tools/shark.html(시안 C).
//  k 테두리 · F 후드집업 · D 그늘 · K 후드의 상어 눈 · T 후드 이빨 · S 얼굴 그늘 · r 눈 · Z 지퍼 · w 후드 끈 · u 바지 · f 신발
// 눈은 어둠 위에 한 번 더 그린다(drawChaserGlow) — 불이 꺼져 있어도 눈빛은 보인다.
const SHARK_HEAD = {
  down: ['.......kk.......', '......kFFk......', '....kFFFFFFk....', '...kFKFFFFKFk...', '..kFTFTFTFTFFk..', '..kFDDSSSSDDFk..', '..kFSrSSSSrSFk..', '...kFSSSSSSFk...'],
  up: ['.......kk.......', '......kFFk......', '....kFFFFFFk....', '...kFFFFFFFFk...', '..kFFFFFFFFFFk..', '..kFFDFFFFDFFk..', '..kFFDFFFFDFFk..', '...kFFFFFFFFk...'],
  left: ['........kk......', '.......kFFk.....', '.....kFFFFFk....', '....kFFKFFFFk...', '...kTFTFFFFFFk..', '...kDSSDFFFFFk..', '..kSrSSDFDFFFk..', '...kSSSSFFFFk...'],
};
const SHARK_BODY = {
  down: ['...kFFwZZwFFk...', '..kFFFFZZFFFFk..', '..kDFFFZZFFFDk..', '..kSFFFZZFFFSk..', '...kDDFZZFDDk...'],
  up: ['...kFFFFFFFFk...', '..kFFFFFFFFFFk..', '..kDFFFFFFFFDk..', '..kSFFFFFFFFSk..', '...kDDDDDDDDk...'],
  left: ['....kFFFFFFk....', '....kFFFFFFk....', '....kFFDFFFk....', '....kFFSFFFk....', '....kDDDDDDk....'],
};
const SHARK_LEGS = {
  front: [
    ['....kuuk.kuuk...', '....kuuk.kuuk...', '....kffk.kffk...'],
    ['....kuuk.kuuk...', '....kffk.kuuk...', '.........kffk...'],
    ['....kuuk.kuuk...', '....kuuk.kffk...', '....kffk........'],
  ],
  side: [
    ['.....kuuuk......', '.....kuuuk......', '....kfffk.......'],
    ['....kuk.kuk.....', '...kuk...kuk....', '..kfk.....kfk...'],
  ],
};
const SHARK_PAL = { k: '#1a2633', F: '#86c8e8', D: '#4f8fb2', K: '#1a2633', T: '#f4fbff', S: '#2a3a4a', r: '#ff3b4d', Z: '#dcecf5', w: '#f4fbff', u: '#26303e', f: '#cfd8e2' };
const SHARK_EYES = { down: [[5, 6], [10, 6]], left: [[4, 6]], right: [[11, 6]], up: [] }; // 눈 칸 (16×16 기준)
const sharkBob = (t) => Math.round(Math.sin(t * 3)); // 떠다니듯 1px 오르내림
const sharkCache = new Map();
function sharkCanvas(dir, frame) {
  const key = `${dir}/${frame}`;
  let c = sharkCache.get(key);
  if (c) return c;
  const side = dir === 'left' || dir === 'right';
  const face = side ? 'left' : dir;
  const legs = side ? SHARK_LEGS.side[frame % 2] : SHARK_LEGS.front[frame % 3];
  const rows = [...SHARK_HEAD[face], ...SHARK_BODY[face], ...legs];
  c = document.createElement('canvas');
  c.width = c.height = T;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!SHARK_PAL[ch]) return;
    g.globalAlpha = y < 13 ? 1 : 1 - 0.5 * (y - 12) / 3; // 다리 쪽이 흐려진다
    rect(g, SHARK_PAL[ch], (dir === 'right' ? 15 - x : x) * 2, y * 2, 2, 2);
  }));
  sharkCache.set(key, c);
  return c;
}
function drawShark(ctx, x, y, dir, t, moving) {
  const side = dir === 'left' || dir === 'right';
  const step = moving ? Math.floor(t * 8) % (side ? 2 : 4) : 0;
  const frame = side ? step : [0, 1, 0, 2][step];
  const bob = sharkBob(t);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x + 16, y + 30, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(140, 200, 240, 0.13)'; // 몸 둘레 차가운 빛
  ctx.beginPath(); ctx.arc(x + 16, y + 14 + bob, 17, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(sharkCanvas(dir, frame), x, y + bob);
}
// 추격자의 눈빛 — 어둠(drawLighting) 위에 그린다. 불이 꺼진 어둠 속에서도 빨간 두 점이 또렷하게 맥박친다
export function drawChaserGlow(ctx, chaser, cam, t) {
  if (chaser.kind !== 'shark') return;
  const x = Math.round(chaser.px * T - cam.x), y = Math.round(chaser.py * T - cam.y) + sharkBob(t);
  const pulse = 0.8 + 0.2 * Math.sin(t * 5);
  for (const [ex, ey] of SHARK_EYES[chaser.dir] ?? SHARK_EYES.down) {
    const cx = x + ex * 2 + 1, cy = y + ey * 2 + 1;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
    g.addColorStop(0, `rgba(255, 60, 80, ${0.9 * pulse})`);
    g.addColorStop(0.35, `rgba(255, 40, 60, ${0.45 * pulse})`);
    g.addColorStop(1, 'rgba(255, 30, 50, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 14, cy - 14, 28, 28);
    rect(ctx, '#ff3b4d', cx - 2, cy - 2, 4, 4);
    rect(ctx, '#ffe6ea', cx - 1, cy - 1, 2, 2);
  }
}

// 추격자 그림 (c.chase.start의 who). 그림 파일이 생기면 여기만 바꾼다.
const CHASERS = {
  shark(ctx, x, y, o) { drawShark(ctx, x, y, o.dir ?? 'down', o.t, o.moving); },
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
      const ch = world.tiles[ty][tx];
      (TILES[ch] ?? wall)(ctx, tx * T - cam.x, ty * T - cam.y, { tx, ty, t, state, world });
      if (!state.flags.day) drawDamage(ctx, world, tx, ty, ch, tx * T - cam.x, ty * T - cam.y);
    }
  }
  for (const ev of world.visibleEvents()) {
    SPRITES[ev.sprite]?.(ctx, Math.round((ev.px ?? ev.x) * T - cam.x), Math.round((ev.py ?? ev.y) * T - cam.y), { t, state, ev }); // px·py = c.move로 걷는 중
  }
  if (follower) {
    const fx = Math.round(follower.px * T - cam.x), fy = Math.round(follower.py * T - cam.y);
    const bob = follower.moving ? -Math.round(Math.sin(player.t * Math.PI) * 2) : 0;
    drawPerson(ctx, fx, fy, follower.dir, lookFor(follower.name, follower.color), bob, walkFrame(follower.moving, player.t, follower.x, follower.y));
  }
  drawPlayer(ctx, player, cam);
  if (chaser) {
    const cx = Math.round(chaser.px * T - cam.x), cy = Math.round(chaser.py * T - cam.y);
    (CHASERS[chaser.kind] ?? CHASERS.shark)(ctx, cx, cy, { t, dir: chaser.dir, moving: chaser.moving });
  }
  drawOverhead(ctx, world, state, cam, x0, y0);
  if (world.def.tint) rect(ctx, world.def.tint, 0, 0, SCREEN_W, SCREEN_H);
}

// 위층 덮개: 필로티(P) 위의 건물과 맵의 overhead 칸(구름다리 등)을 사람·차 위에 반투명하게 덮는다(작가 지침).
// 덮개 가장자리에 진한 선을 그어 위층의 테두리가 보이게 한다.
const OVERHEAD_ALPHA = 0.5;
function isOverhead(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return false;
  if (world.tiles[ty][tx] === 'P') return true;
  return (world.def.overhead ?? []).some(([x, y, w, h]) => tx >= x && tx < x + w && ty >= y && ty < y + h);
}
function drawOverhead(ctx, world, state, cam, x0, y0) {
  if (world.def.overhead == null && !world.tiles.some((r) => r.includes('P'))) return;
  const d = !!state.flags.day;
  ctx.save();
  ctx.globalAlpha = OVERHEAD_ALPHA;
  for (let ty = y0; ty <= y0 + SCREEN_H / T + 1; ty++) {
    for (let tx = x0; tx <= x0 + SCREEN_W / T + 1; tx++) {
      if (!isOverhead(world, tx, ty)) continue;
      const x = tx * T - cam.x, y = ty * T - cam.y;
      rect(ctx, d ? '#dfe3e8' : '#4a5264', x, y, T, T); // 밤에는 건물 외벽보다 밝게 해서 덮개가 보이게
      const edge = d ? '#8d96a3' : '#11141b';
      const open = (ax, ay) => !isOverhead(world, ax, ay) && world.tiles[ay]?.[ax] !== 'H'; // 건물(H)과 맞닿은 쪽은 선을 안 긋는다
      if (open(tx, ty - 1)) rect(ctx, edge, x, y, T, 3);
      if (open(tx, ty + 1)) rect(ctx, edge, x, y + T - 3, T, 3);
      if (open(tx - 1, ty)) rect(ctx, edge, x, y, 3, T);
      if (open(tx + 1, ty)) rect(ctx, edge, x + T - 3, y, 3, T);
    }
  }
  ctx.restore();
}

// ── 사람 픽셀 그림 (16×16을 2배로) — 겉모습은 data/looks.js ──
// 머리(0~6줄, 긴 머리는 9줄까지 덧그림)는 머리 모양마다, 몸통(7~12줄)은 방향마다, 다리(13~15줄)는 걷는 장면마다.
// 오른쪽은 왼쪽을 뒤집어 쓴다. 글자 → 색은 personPalette가 겉모습에 따라 정한다:
//  h 머리카락 · H 머리 밝은 곳 · s 피부 · e 눈 · g 안경테 · c 모자 · C 모자 챙 · Y 모자 휘장
//  b 윗옷 · d 윗옷 그늘 · a 아래팔(긴소매면 옷, 반팔이면 살) · w 안쪽 옷·깃 · t 넥타이·휘장 · m 가운 자락(아니면 바지)
//  u 허벅지(바지) · l 정강이(긴 바지면 바지, 반바지면 살) · f 발(신발)
const HAIR = {
  short: {
    down: ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhHhhhhhhh...', '...hhsshhsshh...', '...hsessssesh...', '....ssssssss....'],
    up: ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhHhhhhhhh...', '...hhhhhhhhhh...', '...shhhhhhhhs...', '....ssssssss....'],
    left: ['.....hhhhh......', '....hhhhhhh.....', '...hhHhhhhhh....', '...hhhhhhhhh....', '...sshhhhhhh....', '..ssehhhhhhh....', '...sssshhhh.....'],
  },
  buzz: {
    down: ['................', '.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hssssssssh...', '...ssessssess...', '....ssssssss....'],
    up: ['................', '.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '...shhhhhhhhs...', '....ssssssss....'],
    left: ['................', '.....hhhhh......', '....hhhhhhh.....', '...hhhhhhhhh....', '...sssshhhhh....', '..ssesshhhhh....', '...sssssshh.....'],
  },
  curly: {
    down: ['....h.hhhh.h....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhHhhhhHhhhh..', '..hhhsshhsshhh..', '...hsessssesh...', '....ssssssss....'],
    up: ['....h.hhhh.h....', '...hhhhhhhhhh...', '..hhhhhhhhhhhh..', '..hhHhhhhHhhhh..', '..hhhhhhhhhhhh..', '...hhhhhhhhhh...', '....ssssssss....'],
    left: ['....h.hhh.h.....', '...hhhhhhhhh....', '..hhHhhhhhhhh...', '..hhhhhhhhhhh...', '...sshhhhhhhh...', '..ssehhhhhhh....', '...sssshhhh.....'],
  },
  bob: {
    down: ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhHhhhhhhh...', '...hhhsssshhh...', '...hsessssesh...', '...hhsssssshh...'],
    up: ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhHhhhhhhh...', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '...hhhhhhhhhh...'],
    left: ['.....hhhhh......', '....hhhhhhh.....', '...hhHhhhhhh....', '...hhhhhhhhh....', '...shhhhhhhh....', '..ssehhhhhhh....', '...sshhhhhhh....'],
  },
  long: {
    down: ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhHhhhhhhh...', '...hhsssssshh...', '...hsessssesh...', '...hssssssssh...',
      '...hh......hh...', '...hh......hh...', '...h........h...'],
    up: ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhHhhhhhhh...', '...hhhhhhhhhh...', '...hhhhhhhhhh...', '...hhhhhhhhhh...',
      '...hhhhhhhhhh...', '....hhhhhhhh....', '.....hhhhhh.....'],
    left: ['.....hhhhh......', '....hhhhhhh.....', '...hhHhhhhhh....', '...hhhhhhhhh....', '...sshhhhhhh....', '..ssehhhhhhh....', '...ssshhhhhh....',
      '.......hhhh.....', '.......hhhh.....', '........hh......'],
  },
  ponytail: {
    down: ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhHhhhhhhh...', '...hhsssssshh...', '...hsessssesh...', '....ssssssss....'],
    up: ['.....hhhhhh.....', '....hhhhhhhh....', '...hhhhhhhhhh...', '...hhHhhhhhhh...', '...hhhhhhhhhh...', '...shhhhhhhhs...', '....ssshhsss....',
      '.......hh.......', '.......hh.......', '........h.......'],
    left: ['.....hhhhh......', '....hhhhhhh.....', '...hhHhhhhhhh...', '...hhhhhhhhhhh..', '...sshhhhhhhhh..', '..ssehhhhhh.hh..', '...sssshhhh..h..'],
  },
  cap: {
    down: ['................', '.....ccYYcc.....', '....cccccccc....', '...CCCCCCCCCC...', '...hssssssssh...', '...ssessssess...', '....ssssssss....'],
    up: ['................', '.....cccccc.....', '....cccccccc....', '...cccccccccc...', '...hhhhhhhhhh...', '...shhhhhhhhs...', '....ssssssss....'],
    left: ['................', '.....ccccY......', '....ccccccc.....', '.CCCcccccccc....', '...sshhhhhhh....', '..ssehhhhhhh....', '...sssshhhh.....'],
  },
};
// 안경: 눈 줄(5줄)에 덧그린다
const GLASSES = { down: '....gegssgeg....', left: '...geg..........' };
const TORSO = {
  down: ['.....bwwwwb.....', '....bbbwtbbb....', '...dbbbbbbbbd...', '...abbbbbbbba...', '...sbbbbbbbbs...', '....muuuuuum....'],
  up: ['.....bbbbbb.....', '....bbbbbbbb....', '...dbbbbbbbbd...', '...abbbbbbbba...', '...sbbbbbbbbs...', '....muuuuuum....'],
  left: ['.....wbbb.......', '....bbbbbb......', '....bbbdbb......', '....bbbabb......', '....bbbsbb......', '....muuuum......'],
};
const LEGS = {
  front: [ // 앞·뒤: 서 있기, 왼발, 오른발
    ['....uuu..uuu....', '....lll..lll....', '....fff..fff....'],
    ['....uuu..uuu....', '....lll...ff....', '....fff.........'],
    ['....uuu..uuu....', '....ff...lll....', '.........fff....'],
  ],
  side: [ // 옆: 서 있기, 벌린 걸음
    ['.....uuuu.......', '.....llll.......', '....ffff........'],
    ['....uu..uu......', '...ll....ll.....', '..ff......ff....'],
  ],
};
// '#rrggbb'를 어둡게(k<1)·밝게(k>1)
const shade = (hex, k = 0.72) => '#' + [1, 3, 5].map((i) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k)).toString(16).padStart(2, '0')).join('');
const SHOE_COLORS = { shoes: '#15181e', sneakers: '#e4e6ea', slippers: '#3a6fb0' };
function personPalette(L) {
  const top = L.top, c = L.topColor, skin = L.skin;
  const coat = top === 'labcoat';
  const b = coat ? '#e9edf0' : c, d = coat ? '#c3c9cf' : shade(c);
  const inner = { jacket: '#eef1f4', suit: '#eef1f4', uniform: '#eef1f4', labcoat: c, tshirt: c, hoodie: shade(c, 1.25), sweater: shade(c, 1.2) }[top] ?? '#eef1f4';
  const accent = { suit: '#9b2c2c', uniform: '#d8b24a', labcoat: c }[top] ?? inner;
  const capColor = L.capColor ?? shade(c, 0.8);
  const pants = L.bottomColor, bare = L.bottom === 'shorts';
  return {
    h: L.hairColor, H: shade(L.hairColor, 1.45), s: skin, e: '#1b1f27', g: '#2b2f36',
    c: capColor, C: shade(capColor, 0.6), Y: '#d8b24a',
    b, d, a: top === 'tshirt' ? skin : d, w: inner, t: accent, m: coat ? '#e9edf0' : pants,
    u: pants, l: bare ? skin : pants, f: L.shoeColor ?? SHOE_COLORS[L.shoes] ?? '#15181e',
  };
}
const personCache = new Map();
function personCanvas(dir, frame, L) {
  const key = `${dir}/${frame}/${JSON.stringify(L)}`;
  let c = personCache.get(key);
  if (c) return c;
  const side = dir === 'left' || dir === 'right';
  const face = side ? 'left' : dir;
  const hair = (HAIR[L.hair] ?? HAIR.short)[face];
  const legs = side ? LEGS.side[frame % 2] : LEGS.front[frame % 3];
  const rows = [...hair.slice(0, 7), ...TORSO[face], ...legs].map((r) => [...r]);
  // 7줄 넘는 머리(긴 머리·묶은 머리)는 몸통 위에 덧그린다
  hair.slice(7).forEach((r, i) => [...r].forEach((ch, x) => { if (ch !== '.') rows[7 + i][x] = ch; }));
  if (L.glasses && GLASSES[face]) [...GLASSES[face]].forEach((ch, x) => { if (ch !== '.') rows[5][x] = ch; });
  const pal = personPalette(L);
  c = document.createElement('canvas');
  c.width = c.height = T;
  const g = c.getContext('2d');
  rows.forEach((row, y) => row.forEach((ch, x) => {
    if (!pal[ch]) return;
    const px = dir === 'right' ? 15 - x : x; // 오른쪽은 뒤집기
    rect(g, pal[ch], px * 2, y * 2, 2, 2);
  }));
  personCache.set(key, c);
  return c;
}

// 사람 그림: look = data/looks.js의 겉모습(lookFor로 만든 것). frame = 걷는 장면(0 서 있기)
export function drawPerson(ctx, x, y, dir, look, bob = 0, frame = 0) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x + 16, y + 30, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(personCanvas(dir ?? 'down', frame, look), x, y + bob);
}
// ── 대화 초상화 (24×24 픽셀 그림을 4배로 = 96×96) ──
// 맨 얼굴·몸(PORTRAIT_ROWS) 위에 머리 모양(PORTRAIT_HAIR)과 안경을 덧그린다. 색은 맵 위 그림과 같은 겉모습(data/looks.js)에서.
// 글자: 맵 위 그림과 같고(personPalette), 더해서 n 코 그늘 · m 입. 덧그림의 '.'은 그대로 둔다.
// 그림 파일(image)이 있으면 그것을 그린다. 바꿀 곳은 drawPortrait 안쪽뿐.
export const PORTRAIT_SIZE = 96;
const PORTRAIT_ROWS = [
  '........................', '........................', '........ssssssss........', '......ssssssssssss......',
  '.....ssssssssssssss.....', '....ssssssssssssssss....', '....ssssssssssssssss....', '....ssssssssssssssss....',
  '....ssseesssssseesss....', '....ssseesssssseesss....', '....ssssssssssssssss....', '.....ssssssnnssssss.....',
  '.....ssssssssssssss.....', '......sssssmmsssss......', '.......ssssssssss.......', '.........ssssss.........',
  '......bbbwwwwwwbbb......', '....bbbbbwwwwwwbbbbb....', '...bbbbbbbwttwbbbbbbb...', '..dbbbbbbbbttbbbbbbbbd..',
  '..dbbbbbbbbbbbbbbbbbbd..', '.ddbbbbbbbbbbbbbbbbbbdd.', '.ddbbbbbbbbbbbbbbbbbbdd.', '.ddbbbbbbbbbbbbbbbbbbdd.',
];
const PORTRAIT_HAIR = {
  short: ['........hhhhhhhh........', '......hhhhhhhhhhhh......', '.....hhhhhHHhhhhhhh.....', '....hhhhhhhhhhhhhhhh....',
    '....hhhhhhhhhhhhhhhh....', '....hhhh....hh....hh....', '....h..............h....', '....h..............h....',
    '....h..............h....', '....h..............h....'],
  buzz: ['........................', '........................', '.......hhhhhhhhhh.......', '.....hhhhhHhhhhhhhh.....',
    '....hhhhhhhhhhhhhhhh....', '....hh............hh....'],
  curly: ['......hh.hhhhh.hh.......', '.....hhhhhhhhhhhhhh.....', '....hhhhhHhhhhhHhhhh....', '...hhhhhhhhhhhhhhhhhh...',
    '...hhhhhhhhhhhhhhhhhh...', '...hhhh.hhh..hhh.hhhh...', '...hhh............hhh...', '....hh............hh....',
    '....h..............h....'],
  bob: ['........hhhhhhhh........', '......hhhhhhhhhhhh......', '.....hhhhhHHhhhhhhh.....', '....hhhhhhhhhhhhhhhh....',
    '....hhhhhhhhhhhhhhhh....', '....hhhhhhhhhhhhhhhh....', '...hhhhh........hhhhh...', '...hhh............hhh...',
    '...hhh............hhh...', '...hhh............hhh...', '...hhh............hhh...', '...hhh............hhh...',
    '...hhhh..........hhhh...', '....hhh..........hhh....'],
  long: ['........hhhhhhhh........', '......hhhhhhhhhhhh......', '.....hhhhhHHhhhhhhh.....', '....hhhhhhhhhhhhhhhh....',
    '....hhhhhhhhhhhhhhhh....', '....hhhh....hh....hh....', '...hhh............hhh...', '...hhh............hhh...',
    '...hhh............hhh...', '...hhh............hhh...', '...hhh............hhh...', '...hhh............hhh...',
    '...hhh............hhh...', '...hhh............hhh...', '...hhh............hhh...', '...hhh............hhh...',
    '..hhhh............hhhh..', '..hhhh............hhhh..', '..hhhh............hhhh..', '..hhhh............hhhh..',
    '..hhh..............hhh..', '..hh................hh..'],
  ponytail: ['........hhhhhhhh........', '......hhhhhhhhhhhh......', '.....hhhhhHHhhhhhhh.....', '....hhhhhhhhhhhhhhhh....',
    '....hhhhhhhhhhhhhhhh....', '....hhhh....hh....hh....', '....h..............hh...', '....h..............hhh..',
    '...................hhh..', '...................hhh..', '...................hhh..', '...................hhh..',
    '...................hhh..', '...................hhh..', '....................hh..'],
  cap: ['........................', '.......cccccccccc.......', '.....ccccccYYcccccc.....', '....cccccccYYccccccc....',
    '....cccccccccccccccc....', '..CCCCCCCCCCCCCCCCCCCC..', '....h..............h....', '....h..............h....'],
};
const PORTRAIT_GLASSES = ['', '', '', '', '', '', '', '......gggg....gggg......', '......g..gggggg..g......',
  '......g..g....g..g......', '......gggg....gggg......'];
const portraitCache = new Map();
// 표정(data/portraits.js MOODS): 바꿀 칸 [x, y, 글자]. face는 왼쪽 눈 쪽만 적고 오른쪽은 거울로(x → 23 - x), extra는 그대로.
// 바탕 눈은 (7~8, 8~9)·(15~16, 8~9), 입은 (11~12, 13). 글자: e 눈 · s 살(지우기) · k 눈썹 · m 입 · M 벌린 입 · T 눈물·땀
const PORTRAIT_MOODS = {
  '기쁨': { face: [[7, 9, 's'], [8, 9, 's'], [6, 9, 'e'], [9, 9, 'e']], // 웃는 눈(∩)
    extra: [[11, 13, 's'], [12, 13, 's'], [10, 13, 'm'], [13, 13, 'm'], [11, 14, 'm'], [12, 14, 'm']] }, // 웃는 입
  '놀람': { face: [[7, 7, 'e'], [8, 7, 'e'], [7, 5, 'k'], [8, 5, 'k']], // 커진 눈, 올라간 눈썹
    extra: [[11, 13, 'M'], [12, 13, 'M'], [11, 14, 'M'], [12, 14, 'M']] }, // 벌린 입
  '슬픔': { face: [[6, 7, 'k'], [7, 7, 'k'], [8, 6, 'k'], [7, 10, 'T']], // 안쪽이 올라간 눈썹, 눈물
    extra: [[10, 14, 'm'], [13, 14, 'm']] }, // 처진 입
  '화남': { face: [[6, 6, 'k'], [7, 7, 'k'], [8, 7, 'k']], // 안쪽이 내려간 눈썹
    extra: [[10, 13, 'm'], [13, 13, 'm']] }, // 다문 입
  '걱정': { face: [[6, 7, 'k'], [7, 7, 'k'], [8, 6, 'k']],
    extra: [[11, 13, 's'], [12, 13, 's'], [10, 13, 'm'], [11, 14, 'm'], [12, 13, 'm'], [13, 14, 'm'], [18, 6, 'T'], [18, 7, 'T']] }, // 삐뚤어진 입, 땀
};
function portraitCanvas(L, mood = '보통') {
  const key = `${mood}/${JSON.stringify(L)}`;
  let c = portraitCache.get(key);
  if (c) return c;
  const rows = PORTRAIT_ROWS.map((r) => [...r]);
  const over = (lines) => lines.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') rows[y][x] = ch; }));
  over(PORTRAIT_HAIR[L.hair] ?? PORTRAIT_HAIR.short);
  if (L.glasses) over(PORTRAIT_GLASSES);
  const m = PORTRAIT_MOODS[mood];
  if (m) {
    for (const [x, y, ch] of m.face) { rows[y][x] = ch; rows[y][23 - x] = ch; }
    for (const [x, y, ch] of m.extra) rows[y][x] = ch;
  }
  const pal = { ...personPalette(L), n: shade(L.skin, 0.88), m: '#b86a5c', g: '#a7b0bd', // 안경테는 밝게 — 어두우면 눈과 붙어 선글라스처럼 보인다
    k: shade(L.hairColor, 0.7), M: '#5a2a2a', T: '#8fd0f0' };
  c = document.createElement('canvas');
  c.width = c.height = PORTRAIT_SIZE;
  const g = c.getContext('2d');
  rows.forEach((row, y) => row.forEach((ch, x) => { if (pal[ch]) rect(g, pal[ch], x * 4, y * 4, 4, 4); }));
  portraitCache.set(key, c);
  return c;
}
// 직접 그린 초상화 (data/portraits.js의 art). 상어귀신: 깊이 눌러쓴 상어 후드, 그늘진 얼굴에 빨간 눈 — 눈빛은 맥박친다
const PORTRAIT_ART = {
  shark: {
    rows: [
      '...........kk...........',
      '..........kFFk..........',
      '.........kFFFDk.........',
      '......kkkFFFFFDkkk......',
      '....kkFFFFFFFFFFFFkk....',
      '...kFFFFFFFFFFFFFFFFk...',
      '..kFFFKKFFFFFFFFKKFFFk..',
      '..kFFFKKFFFFFFFFKKFFFk..',
      '..kFTFTFTFTFTFTFTFTFTFk.',
      '..kFDDDDDDDDDDDDDDDDDFk.',
      '..kFSSSSSSSSSSSSSSSSSFk.',
      '..kFSSSrrSSSSSSSrrSSSFk.',
      '..kFSSSrrSSSSSSSrrSSSFk.',
      '..kFSSSSSSSSSSSSSSSSSFk.',
      '..kFSTSTSTSTSTSTSTSTSFk.',
      '...kFFFFFFFFFFFFFFFFFk..',
      '.....kFFFFFwZZwFFFFFk...',
      '...kkFFFFFFwZZwFFFFFFkk.',
      '..kFFFFFFFFFZZFFFFFFFFFk',
      '.kDFFFFFFFFFZZFFFFFFFFDk',
      '.kDFFFFFFFFFZZFFFFFFFFDk',
      '.kDFFFFFFFFFZZFFFFFFFFDk',
      '.kDFFFFFFFFFZZFFFFFFFFDk',
      '.kDFFFFFFFFFZZFFFFFFFFDk',
    ],
    pal: { ...SHARK_PAL, k: '#0e1620' },
    eyes: [[7, 11], [16, 11]], // 눈 왼쪽 위 칸 (2×2)
  },
};
function artCanvas(id) {
  const key = `art/${id}`;
  let c = portraitCache.get(key);
  if (c) return c;
  const a = PORTRAIT_ART[id];
  c = document.createElement('canvas');
  c.width = c.height = PORTRAIT_SIZE;
  const g = c.getContext('2d');
  a.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (a.pal[ch]) rect(g, a.pal[ch], x * 4, y * 4, 4, 4); }));
  portraitCache.set(key, c);
  return c;
}
function drawArtGlow(ctx, id, x, y) {
  const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 200);
  for (const [ex, ey] of PORTRAIT_ART[id].eyes ?? []) {
    const cx = x + ex * 4 + 4, cy = y + ey * 4 + 4;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16);
    g.addColorStop(0, `rgba(255, 70, 90, ${0.6 * pulse})`);
    g.addColorStop(1, 'rgba(255, 40, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 16, cy - 16, 32, 32);
    ctx.globalAlpha = pulse;
    rect(ctx, '#fff0f2', cx - 3, cy - 3, 3, 3);
    ctx.globalAlpha = 1;
  }
}
// p = { look, image, moods, art } — look은 lookFor로 만든 겉모습(data/portraits.js가 넣어 준다). mood = 표정(MOODS). art = PORTRAIT_ART의 직접 그린 그림
export function drawPortrait(ctx, p, x, y, mood = '보통') {
  ctx.fillStyle = '#16213a';
  ctx.fillRect(x, y, PORTRAIT_SIZE, PORTRAIT_SIZE);
  const path = p.moods?.[mood] ?? p.image;
  const img = path ? iconImage(path) : null; // 그림 파일이 다 읽히기 전(null)에는 임시 얼굴
  if (img) ctx.drawImage(img, x, y, PORTRAIT_SIZE, PORTRAIT_SIZE);
  else if (p.art) { ctx.fillStyle = '#05070c'; ctx.fillRect(x, y, PORTRAIT_SIZE, PORTRAIT_SIZE); ctx.drawImage(artCanvas(p.art), x, y); drawArtGlow(ctx, p.art, x, y); }
  else ctx.drawImage(portraitCanvas(p.look ?? lookFor(null), mood), x, y);
  ctx.strokeStyle = '#8fa8cc';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, PORTRAIT_SIZE - 2, PORTRAIT_SIZE - 2);
}

// ── 지도 (메뉴의 「지도」 탭) ──
// 지금 맵에서 가 본 곳만 칸마다 색 하나로 줄여 그린다(다른 층·건물은 보지 않는다 — 작가 지침). 문 = 노란 점, 계단·엘리베이터 = 하늘색, 사람 = 분홍, 나 = 흰색(깜빡임),
// 길 안내 목적지 = 금색 고리. (x, y, w, h) 안에 가운데 맞춤, 한 칸은 2~12px
const MINIMAP_COLORS = {
  '.': '#5b6577', ',': '#55605a', ':': '#8f8a80', '_': '#3e4249', ';': '#3f6e3a', '|': '#4a4e55', P: '#34373e',
  '#': '#1c212b', W: '#3a5a7a', '=': '#6b5a48', R: '#6b5a48', G: '#5a6b62', S: '#8a929c', H: '#9aa3ae', F: '#2d4a30',
  V: '#11151c', T: '#24502a', B: '#24502a', '*': '#a0507a',
};
export function drawMinimap(ctx, world, player, target, x, y, w, h, t) {
  // 한 칸 크기는 소수일 수 있다(큰 캠퍼스도 칸을 꽉 채우게). 칸 경계는 정수 픽셀로 맞춰 틈이 안 생기게
  const s = Math.max(2, Math.min(12, Math.min(w / world.w, h / world.h)));
  const ox = Math.floor(x + (w - world.w * s) / 2), oy = Math.floor(y + (h - world.h * s) / 2);
  const px = (tx) => ox + Math.floor(tx * s), py = (ty) => oy + Math.floor(ty * s);
  rect(ctx, '#0b0e14', ox - 4, oy - 4, Math.ceil(world.w * s) + 8, Math.ceil(world.h * s) + 8);
  // 가 본 곳(state.js isExplored)만 그린다. 나머지는 바탕색 그대로
  const seen = (tx, ty) => isExplored(world.id, world.w, world.h, tx, ty);
  for (let ty = 0; ty < world.h; ty++) {
    for (let tx = 0; tx < world.w; tx++) {
      if (seen(tx, ty)) rect(ctx, MINIMAP_COLORS[world.tiles[ty][tx]] ?? '#1c212b', px(tx), py(ty), px(tx + 1) - px(tx), py(ty + 1) - py(ty));
    }
  }
  const dot = (tx, ty, color, k = 0.8) => {
    const d = Math.max(3, Math.round(s * k));
    rect(ctx, color, Math.round(ox + (tx + 0.5) * s - d / 2), Math.round(oy + (ty + 0.5) * s - d / 2), d, d);
  };
  for (const ev of world.visibleEvents()) {
    if (!seen(ev.x, ev.y)) continue;
    if (ev.floors) dot(ev.x, ev.y, '#7fd3f0');
    else if (ev.to) dot(ev.x, ev.y, '#ffd166');
    else if (ev.sprite === 'npc') dot(ev.x, ev.y, '#f28482');
  }
  if (target) { // 금색 고리 — 숨 쉬듯 커졌다 작아진다
    const r = s * 1.2 + Math.sin(t * 4) * s * 0.3 + 2;
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox + (target.x + 0.5) * s, oy + (target.y + 0.5) * s, r, 0, Math.PI * 2); ctx.stroke();
  }
  if (Math.floor(t * 3) % 3) dot(player.x, player.y, '#ffffff', 1.1);
  // 알림말
  ctx.font = SMALL_FONT;
  ctx.textBaseline = 'top';
  const legend = [['#ffffff', '나'], ['#ffd98a', '목적지'], ['#ffd166', '문'], ['#7fd3f0', '계단·엘리베이터'], ['#f28482', '사람']];
  let lx = x;
  for (const [c, label] of legend) {
    if (label === '목적지') { // 지도 위와 같은 고리
      ctx.strokeStyle = c; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(lx + 5, y + h + 17, 5, 0, Math.PI * 2); ctx.stroke();
    } else rect(ctx, c, lx, y + h + 12, 10, 10);
    ctx.fillStyle = '#9aa8bd';
    ctx.fillText(label, lx + 14, y + h + 8);
    lx += 14 + ctx.measureText(label).width + 16;
  }
}

// 길 안내 화살표: 캐릭터 둘레(반지름 26px)에서 목표 쪽을 가리키는 작은 삼각형. 천천히 숨 쉬듯 밝아졌다 흐려진다
// (cx, cy) = 캐릭터 가운데(화면 좌표), angle = 목표 방향(라디안)
export function drawGuideArrow(ctx, cx, cy, angle, t) {
  const r = 26 + Math.sin(t * 4) * 2;
  const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.75 + Math.sin(t * 4) * 0.2;
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath();
  ctx.fillStyle = '#ffd98a';
  ctx.strokeStyle = '#3a2a10';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

// 걷는 중이면 한 칸 걸음의 앞쪽 절반에 발을 내딛는 장면. 칸마다 왼발·오른발을 번갈아
const walkFrame = (moving, t, x, y) => (moving && t < 0.6 ? 1 + ((x + y) & 1) : 0);

function drawPlayer(ctx, p, cam) {
  const x = Math.round(p.px * T - cam.x), y = Math.round(p.py * T - cam.y);
  const bob = p.moving ? -Math.round(Math.sin(p.t * Math.PI) * 2) : 0;
  drawPerson(ctx, x, y, p.dir, lookFor('수오'), bob, walkFrame(p.moving, p.t, p.x, p.y)); // 겉모습은 data/looks.js
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
    const cx = Math.round((b.who.px ?? b.who.x) * T - cam.x + T / 2); // 서 있는 NPC(이벤트)는 px가 없다
    const x = Math.max(4, Math.min(SCREEN_W - w - 4, cx - w / 2));
    const y = Math.max(4, Math.round((b.who.py ?? b.who.y) * T - cam.y) - h - 8);
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

// menu.text가 있으면(추격의 caughtText) 암전된 화면에 그 글이 천천히 떠오른다
export function drawGameOver(ctx, t, menu) {
  ctx.textBaseline = 'top';
  if (menu.text) {
    rect(ctx, '#000', 0, 0, SCREEN_W, SCREEN_H);
    ctx.globalAlpha = Math.max(0, Math.min(1, (t - menu.at - 0.3) / 1.2));
    centered(ctx, menu.text, 170, '24px "Malgun Gothic", sans-serif', '#c9d2de');
    ctx.globalAlpha = 1;
  } else {
    rect(ctx, '#0a0306', 0, 0, SCREEN_W, SCREEN_H);
    centered(ctx, '(게임 오버 — 문구 미정)', 160, 'bold 30px "Malgun Gothic", sans-serif', '#e06070');
  }
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
  const keys = menu.touch ? '왼쪽 패드로 이동 · 조사 버튼으로 결정 · 설정(톱니바퀴)에서 화면 버튼 끄기' // 화면 버튼(touch.js)을 쓸 때
    : 'WASD 이동 · Shift 달리기 · Enter/F 조사 · E 소지품 · L 손전등 · Esc 메뉴';
  centered(ctx, keys, 420, SMALL_FONT, '#56657a');
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
// 조작법 화면: 키보드 그림에 쓰는 키만 색칠하고, 아래에 색마다 하는 일. 키 배치는 input.js KEYMAP과 맞출 것
const CONTROL_GROUPS = [
  { keys: ['W', 'A', 'S', 'D', '↑', '←', '↓', '→'], color: '#6fa8dc', text: '이동 — W·A·S·D 또는 방향키' },
  { keys: ['Shift'], color: '#7fc97f', text: '달리기 — Shift를 누른 채 이동' },
  { keys: ['Enter', 'F'], color: '#ffd98a', text: '조사 · 대사 넘기기 · 결정' },
  { keys: ['E'], color: '#f4a261', text: '소지품 열기 · 닫기' },
  { keys: ['L'], color: '#c39bd3', text: '손전등 켜기 · 끄기' },
  { keys: ['Esc', 'Q'], color: '#e07a7a', text: '메뉴 · 취소' },
];
// [글자, 너비(키 칸 수)] — 줄마다 왼쪽 들여쓰기(칸 수)
const KEYBOARD_ROWS = [
  { indent: 0, keys: [['Esc', 1.3]] },
  { indent: 0.5, keys: 'QWERTYUIOP'.split('').map((k) => [k, 1]) },
  { indent: 0.8, keys: [...'ASDFGHJKL'.split('').map((k) => [k, 1]), ['Enter', 1.9]] },
  { indent: 0, keys: [['Shift', 1.8], ...'ZXCVBNM'.split('').map((k) => [k, 1]), ['Shift', 1.8]] },
];
function drawKey(ctx, label, x, y, w, h) {
  const g = CONTROL_GROUPS.find((gr) => gr.keys.includes(label));
  rect(ctx, '#0b0f18', x, y + 3, w, h); // 키 그림자
  rect(ctx, g ? g.color : '#1f2738', x, y, w, h);
  rect(ctx, g ? 'rgba(255,255,255,0.25)' : '#2a3448', x, y, w, 2);
  ctx.font = label.length > 1 && !'↑←↓→'.includes(label) ? `bold 11px ${SMALL_FONT.split(' ').slice(1).join(' ')}` : `bold ${SMALL_FONT}`;
  ctx.fillStyle = g ? '#14181f' : '#56657a';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 - 7);
  ctx.textAlign = 'left';
}
function drawControls(ctx) {
  const u = 30, gap = 3, h = 26, x0 = 66, y0 = 104;
  KEYBOARD_ROWS.forEach((row, r) => {
    let x = x0 + row.indent * u;
    for (const [label, w] of row.keys) { drawKey(ctx, label, x, y0 + r * (h + 8), w * u - gap, h); x += w * u; }
  });
  // 방향키: 키보드 오른쪽 아래
  const ax = x0 + 12.4 * u, ay = y0 + 2 * (h + 8);
  drawKey(ctx, '↑', ax + u, ay, u - gap, h);
  ['←', '↓', '→'].forEach((k, i) => drawKey(ctx, k, ax + i * u, ay + h + 8, u - gap, h));
  // 색마다 하는 일
  ctx.font = SMALL_FONT;
  CONTROL_GROUPS.forEach((g, i) => {
    const y = y0 + 4 * (h + 8) + 18 + i * 26;
    rect(ctx, g.color, 70, y + 3, 14, 14);
    ctx.fillStyle = '#c9d6ea';
    ctx.fillText(g.text, 96, y + 1);
  });
}

export function drawSettings(ctx, settings) {
  rect(ctx, 'rgba(2, 4, 10, 0.92)', 0, 0, SCREEN_W, SCREEN_H);
  panel(ctx, 40, 30, SCREEN_W - 80, SCREEN_H - 60);
  ctx.textBaseline = 'top';
  ctx.font = FONT;
  ctx.fillStyle = '#ffd98a';
  ctx.fillText('설정', 60, 46);
  if (settings.view === 'main') {
    // 음량(막대 + ◀ ▶) · 켜고 끄기 · 펼쳐 보는 화면
    settings.rows.forEach((row, i) => {
      const y = 96 + i * 50, on = i === settings.sel;
      if (on) { ctx.fillStyle = 'rgba(255, 217, 138, 0.12)'; ctx.fillRect(52, y - 10, SCREEN_W - 104, 42); }
      ctx.font = FONT;
      ctx.fillStyle = on ? '#ffd98a' : '#c9d6ea';
      ctx.fillText(`${on ? '▶ ' : '   '}${row.label}`, 62, y);
      ctx.font = SMALL_FONT;
      if (row.kind === 'volume') {
        const v = settings.volume[row.id];
        rect(ctx, '#1a2233', 260, y + 4, 200, 14);
        rect(ctx, on ? '#ffd98a' : '#7d8aa0', 260, y + 4, Math.round(200 * v), 14);
        ctx.fillStyle = '#c9d6ea';
        ctx.fillText(`${Math.round(v * 100)}%`, 474, y + 2);
        if (on) { ctx.fillStyle = '#ffd98a'; ctx.fillText('◀', 240, y + 2); ctx.fillText('▶', 520, y + 2); }
      } else if (row.kind === 'toggle') {
        const v = settings.prefs[row.id];
        ['켜기', '끄기'].forEach((t, k) => {
          const sel = (k === 0) === !!v;
          rect(ctx, sel ? (on ? '#ffd98a' : '#7d8aa0') : '#1a2233', 260 + k * 74, y, 66, 22);
          ctx.fillStyle = sel ? '#14181f' : '#56657a';
          ctx.textAlign = 'center';
          ctx.fillText(t, 293 + k * 74, y + 3);
          ctx.textAlign = 'left';
        });
      } else {
        ctx.fillStyle = '#7d8aa0';
        ctx.fillText('Enter — 보기', 260, y + 3);
      }
    });
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#56657a';
    ctx.fillText('W/S 고르기 · A/D 바꾸기 · Enter 결정 · Esc 닫기', 60, SCREEN_H - 58);
    return;
  }
  ctx.font = SMALL_FONT;
  ctx.fillStyle = '#6f86a8';
  if (settings.view === 'controls') {
    ctx.fillText('조작법', 60, 80);
    rect(ctx, '#3b4a63', 112, 88, SCREEN_W - 172, 1);
    drawControls(ctx);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#56657a';
    ctx.fillText('Esc·Enter 돌아가기', 60, SCREEN_H - 58);
    return;
  }
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

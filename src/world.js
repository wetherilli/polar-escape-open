import { MAPS } from './data/maps.js?v=0.38.0';
import { state, helpTags } from './state.js?v=0.38.0';
import { DIRS } from './config.js?v=0.38.0';
import { spawnSpots } from './spots.js?v=0.38.0';

// 타일 글자. 여기 없는 글자(소문자 이벤트 제외)는 tools/check.mjs가 오류로 잡는다.
export const FLOOR_TILES = new Set(['.', ',', ':', '_', ';', '|', 'P']);
export const SOLID_TILES = new Set(['#', 'W', '=', 'R', 'G', 'S', 'H', 'F', 'V', 'T', 'B', '*', 'X']);
// 밤 겹침층(def.night)에서 「낮과 같음」을 뜻하는 글자
export const SAME_TILE = ' ';

const covers = (ev, x, y) => x >= ev.x && y >= ev.y && x < ev.x + (ev.size?.[0] ?? 1) && y < ev.y + (ev.size?.[1] ?? 1);

// 세워 둔 차 한 대의 크기 = 주차 자리 하나 (가로 2 × 세로 3칸)
const CAR_SIZE = [2, 3];
// 낮 차: 이어진 주차 칸(|)을 왼쪽 위부터 가로 2 × 세로 3칸씩 자리로 나누고(render.js parkingTile과 같은 나눔),
// 밤 차가 없는 자리를 rate 확률로 채운다
const DAY_CAR_KINDS = ['sedan', 'sedan', 'sedan', 'suv', 'suv', 'compact', 'minivan', 'truck'];
const DAY_CAR_COLORS = ['white', 'white', 'white', 'pearl', 'black', 'black', 'gray', 'gray', 'silver', 'silver', 'navy', 'blue', 'red', 'beige', 'green'];
const rnd = (x, y, s) => {
  let h = Math.imul(x * 374761393 + y * 668265263 + s * 982451653, 1274126177);
  h ^= h >>> 15;
  return (Math.imul(h, 2246822519) >>> 0) / 4294967296;
};
function dayCarSlots(world, rate) {
  const isLot = (x, y) => world.dayTiles[y]?.[x] === '|';
  const run = (x, y, dx, dy) => { let k = 0; while (isLot(x + dx * (k + 1), y + dy * (k + 1))) k++; return k; };
  const [sw, sh] = CAR_SIZE, out = [];
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      if (!isLot(x, y) || run(x, y, -1, 0) % sw || run(x, y, 0, -1) % sh) continue; // 자리의 왼쪽 위 칸만
      const cells = [];
      for (let dy = 0; dy < sh; dy++) for (let dx = 0; dx < sw; dx++) cells.push([x + dx, y + dy]);
      if (!cells.every(([cx, cy]) => isLot(cx, cy))) continue; // 모자란 자리(끝에 남는 칸)
      if (cells.some(([cx, cy]) => world.events.some((e) => covers(e, cx, cy))) || rnd(x, y, 1) >= rate) continue;
      out.push({
        x, y, facing: rnd(x, y, 2) < 0.5 ? 'up' : 'down',
        kind: DAY_CAR_KINDS[Math.floor(rnd(x, y, 3) * DAY_CAR_KINDS.length)],
        color: DAY_CAR_COLORS[Math.floor(rnd(x, y, 4) * DAY_CAR_COLORS.length)],
      });
    }
  }
  return out;
}

export class World {
  load(id) {
    const def = MAPS[id];
    if (!def) throw new Error(`맵 없음: ${id}`);
    const w = def.rows[0].length;
    def.rows.forEach((row, i) => {
      if (row.length !== w) throw new Error(`[${id}] ${i}행 길이 ${row.length} ≠ ${w}`);
    });

    this.id = id;
    this.def = def;
    this.w = w;
    this.h = def.rows.length;
    this.dayTiles = def.rows.map((row) => [...row]);
    this.events = [];
    this.missing = null; // 정의 없는 이벤트 글자 (check.mjs가 본다)

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const ch = this.dayTiles[y][x];
        if (!/[a-z]/.test(ch)) continue;
        const ev = def.events?.[ch];
        this.dayTiles[y][x] = '.';
        // 정의가 없는 글자는 바닥으로 둔다 — 공개 배포본에서 [비공개] 이벤트 줄을 빼면 이렇게 된다.
        // 개발 중의 빠뜨림은 tools/check.mjs가 잡는다
        if (!ev) { this.missing = [...(this.missing ?? []), ch]; continue; }
        this.events.push({ trigger: 'action', ...ev, id: ch, x, y });
      }
    }
    // 밤 겹침층: 본편(밤)에 붕괴로 바뀐 칸만 적는다 — 잔해(X) 등. 공백은 낮과 같음, 이벤트 칸은 건드리지 않는다
    this.nightTiles = this.dayTiles.map((row, y) => row.map((ch, x) => {
      const n = def.night?.[y]?.[x];
      return n && n !== SAME_TILE && !/[a-z]/.test(def.rows[y][x]) ? n : ch;
    }));
    // 세워 둔 차 (def.cars) — 칸 글자 없이 자리만 적는다. x·y는 자리 왼쪽 위, 가로 2 × 세로 3칸을 막는다
    for (const [i, c] of (def.cars ?? []).entries()) {
      this.events.push({ sprite: 'car', solid: true, trigger: 'none', size: CAR_SIZE, ...c, id: `car_${i}` });
    }
    // 낮(오프닝)에만 더 서 있는 차 (def.dayCars = 빈 주차 칸을 채울 비율) — 칸마다 정해진 난수라 늘 같은 배치
    if (def.dayCars) {
      for (const [i, c] of dayCarSlots(this, def.dayCars).entries()) {
        this.events.push({ sprite: 'car', solid: true, trigger: 'none', size: CAR_SIZE, ...c, id: `daycar_${i}`, visible: (s) => !!s.flags.day });
      }
    }
    // 무작위 채집 자리 (def.creatureSpots) — 들어올 때마다 새로 정한다
    this.events.push(...spawnSpots(this, FLOOR_TILES));
    this.marks = new Map(); // 칸마다 남기는 기록 (잔해 X 칸의 시료 조사 등) — 들어올 때마다 새로
  }

  // 칸 (x, y)의 기록 — 없으면 빈 기록을 만든다
  tileMark(x, y) {
    const key = `${x},${y}`;
    if (!this.marks.has(key)) this.marks.set(key, {});
    return this.marks.get(key);
  }

  // 낮(오프닝)과 밤(본편)은 칸이 다르다 — 지금 때에 맞는 쪽
  get tiles() { return state.flags?.day ? this.dayTiles : this.nightTiles; }

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '#';
    return this.tiles[y][x];
  }

  // hiddenTag가 있는 이벤트는 그 표시를 드러내는 도움(helps.js reveal)을 받아야 보인다
  visibleEvents() {
    const revealed = helpTags('reveal');
    return this.events.filter((ev) => (!ev.visible || ev.visible(state)) && (!ev.hiddenTag || revealed.includes(ev.hiddenTag)));
  }

  // size: [폭, 높이]가 있는 이벤트(차 등)는 (x, y)부터 그만큼의 칸을 다 차지한다
  eventAt(x, y) {
    return this.visibleEvents().find((ev) => covers(ev, x, y)) ?? null;
  }

  anchor(id) {
    const ev = this.events.find((e) => e.id === id);
    if (!ev) throw new Error(`[${this.id}] 앵커 '${id}' 없음`);
    return ev;
  }

  // 앵커 칸에서 들어설 방향: 막히지 않은 옆 칸 쪽 (문 방향을 적지 않았을 때 쓴다)
  entryDir(a) {
    for (const d of ['down', 'up', 'right', 'left']) {
      if (!this.isBlocked(a.x + DIRS[d].x, a.y + DIRS[d].y)) return d;
    }
    return 'down';
  }

  isBlocked(x, y) {
    if (SOLID_TILES.has(this.tileAt(x, y))) return true;
    return !!this.eventAt(x, y)?.solid;
  }
}

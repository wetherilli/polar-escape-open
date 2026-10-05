import { MAPS } from './data/maps.js?v=0.23.0';
import { state, helpTags } from './state.js?v=0.23.0';
import { DIRS } from './config.js?v=0.23.0';

// 타일 글자. 여기 없는 글자(소문자 이벤트 제외)는 tools/check.mjs가 오류로 잡는다.
export const FLOOR_TILES = new Set(['.', ',', ':', '_', ';', '|', 'P']);
export const SOLID_TILES = new Set(['#', 'W', '=', 'R', 'G', 'S', 'H', 'F', 'V', 'T', '*']);

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
    this.tiles = def.rows.map((row) => [...row]);
    this.events = [];
    this.missing = null; // 정의 없는 이벤트 글자 (check.mjs가 본다)

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const ch = this.tiles[y][x];
        if (!/[a-z]/.test(ch)) continue;
        const ev = def.events?.[ch];
        this.tiles[y][x] = '.';
        // 정의가 없는 글자는 바닥으로 둔다 — 공개 배포본에서 [비공개] 이벤트 줄을 빼면 이렇게 된다.
        // 개발 중의 빠뜨림은 tools/check.mjs가 잡는다
        if (!ev) { this.missing = [...(this.missing ?? []), ch]; continue; }
        this.events.push({ trigger: 'action', ...ev, id: ch, x, y });
      }
    }
  }

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '#';
    return this.tiles[y][x];
  }

  // hiddenTag가 있는 이벤트는 그 표시를 드러내는 도움(helps.js reveal)을 받아야 보인다
  visibleEvents() {
    const revealed = helpTags('reveal');
    return this.events.filter((ev) => (!ev.visible || ev.visible(state)) && (!ev.hiddenTag || revealed.includes(ev.hiddenTag)));
  }

  eventAt(x, y) {
    return this.visibleEvents().find((ev) => ev.x === x && ev.y === y) ?? null;
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

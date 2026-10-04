import { DIRS } from './config.js?v=0.20.0';

// 추격자 — 타일 단위로 움직이고, 한 칸 갈 때마다 BFS로 플레이어 쪽 다음 칸을 고른다.
// 이동 중엔 x,y가 목적지, fx,fy가 출발지, t(0→1)가 진행도 (Player와 같은 방식).
export class Chaser {
  constructor(kind, speed) {
    this.kind = kind;   // 그림 (render.js CHASERS)
    this.speed = speed; // 초당 타일 수. 플레이어는 config.MOVE_SPEED(5)
  }

  place(x, y, dir = 'down') {
    this.x = x; this.y = y;
    this.fx = x; this.fy = y;
    this.dir = dir;
    this.moving = false;
    this.t = 0;
  }

  get px() { return this.moving ? this.fx + (this.x - this.fx) * this.t : this.x; }
  get py() { return this.moving ? this.fy + (this.y - this.fy) * this.t : this.y; }

  update(dt, world, target) {
    if (this.moving) {
      this.t += dt * this.speed;
      if (this.t < 1) return;
      this.moving = false;
      this.t = 0;
    }
    const step = nextStep(world, this.x, this.y, target.x, target.y);
    if (!step) return;
    this.dir = step;
    this.fx = this.x; this.fy = this.y;
    this.x += DIRS[step].x; this.y += DIRS[step].y;
    this.moving = true;
  }

  // 그려지는 위치끼리 이만큼 가까우면 잡힌 것
  touches(p) {
    return Math.abs(this.px - p.px) + Math.abs(this.py - p.py) < 0.7;
  }
}

// (sx,sy)에서 (tx,ty)로 가는 가장 짧은 길의 첫 걸음 방향. 길이 없으면 null.
// 목적지 칸(플레이어가 선 칸)은 막혀 있어도 들어갈 수 있는 것으로 친다.
export function nextStep(world, sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return null;
  const w = world.w, h = world.h;
  const first = new Array(w * h).fill(null);
  const seen = new Uint8Array(w * h);
  seen[sy * w + sx] = 1;
  const queue = [[sx, sy]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const d of ['up', 'down', 'left', 'right']) {
      const nx = x + DIRS[d].x, ny = y + DIRS[d].y;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const k = ny * w + nx;
      if (seen[k]) continue;
      const goal = nx === tx && ny === ty;
      if (!goal && world.isBlocked(nx, ny)) continue;
      seen[k] = 1;
      first[k] = i === 0 ? d : first[y * w + x];
      if (goal) return first[k];
      queue.push([nx, ny]);
    }
  }
  return null;
}

import { DIRS, MOVE_SPEED } from './config.js?v=0.19.0';

// 타일 단위 이동. 이동 중엔 x,y가 목적지, fx,fy가 출발지, t(0→1)가 진행도.
export class Player {
  place(x, y, dir) {
    this.x = x; this.y = y;
    this.fx = x; this.fy = y;
    this.dir = dir;
    this.moving = false;
    this.t = 0;
    this.lastBump = null;
  }

  get px() { return this.moving ? this.fx + (this.x - this.fx) * this.t : this.x; }
  get py() { return this.moving ? this.fy + (this.y - this.fy) * this.t : this.y; }

  front() {
    const d = DIRS[this.dir];
    return { x: this.x + d.x, y: this.y + d.y };
  }

  // speed = 초당 타일 수 (걷기 MOVE_SPEED, 달리기 RUN_SPEED)
  update(dt, dir, world, hooks, speed = MOVE_SPEED) {
    let carry = 0;
    if (this.moving) {
      this.t += dt * speed;
      if (this.t < 1) return;
      carry = this.t - 1;
      this.moving = false;
      this.t = 0;
      hooks.onArrive(this.x, this.y);
      if (hooks.busy()) return;
    }

    if (!dir) { this.lastBump = null; return; }
    if (dir !== this.dir) { this.dir = dir; this.lastBump = null; }

    const d = DIRS[dir];
    const tx = this.x + d.x, ty = this.y + d.y;
    if (world.isBlocked(tx, ty)) {
      // 벽에 계속 붙어 있어도 같은 칸에는 한 번만 부딪힘 처리
      const key = `${tx},${ty}`;
      if (this.lastBump !== key) { this.lastBump = key; hooks.onBump(tx, ty); }
      return;
    }

    this.lastBump = null;
    this.fx = this.x; this.fy = this.y;
    this.x = tx; this.y = ty;
    this.moving = true;
    this.t = carry;
    hooks.onStep?.(this.fx, this.fy);
  }
}

// 동행자: 플레이어가 한 칸 움직일 때마다 플레이어가 있던 칸으로 따라온다.
// 이동 진행도는 플레이어의 t를 같이 쓴다(따로 업데이트할 필요 없음).
export class Follower {
  constructor(leader, name, color) {
    this.leader = leader;
    this.name = name;
    this.color = color;
  }

  place(x, y, dir) {
    this.x = x; this.y = y;
    this.fx = x; this.fy = y;
    this.dir = dir;
  }

  stepTo(x, y) {
    if (x === this.x && y === this.y) { this.fx = x; this.fy = y; return; }
    this.dir = x > this.x ? 'right' : x < this.x ? 'left' : y > this.y ? 'down' : 'up';
    this.fx = this.x; this.fy = this.y;
    this.x = x; this.y = y;
  }

  get moving() { return this.leader.moving && (this.fx !== this.x || this.fy !== this.y); }
  get px() { return this.moving ? this.fx + (this.x - this.fx) * this.leader.t : this.x; }
  get py() { return this.moving ? this.fy + (this.y - this.fy) * this.leader.t : this.y; }
}

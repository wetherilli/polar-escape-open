import { SCREEN_W, SCREEN_H } from './config.js?v=0.32.0';

export const fader = {
  alpha: 0,
  target: 0,
  speed: 3.5,
  done: null,

  to(target) {
    this.target = target;
    if (this.alpha === target) return Promise.resolve();
    return new Promise((r) => { this.done = r; });
  },

  update(dt) {
    if (this.alpha === this.target) return;
    const step = this.speed * dt;
    this.alpha = this.alpha < this.target
      ? Math.min(this.target, this.alpha + step)
      : Math.max(this.target, this.alpha - step);
    if (this.alpha === this.target && this.done) {
      const done = this.done;
      this.done = null;
      done();
    }
  },

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${this.alpha})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  },
};

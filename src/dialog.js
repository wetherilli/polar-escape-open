import { SCREEN_W, SCREEN_H, TEXT_SPEED } from './config.js?v=0.18.0';
import { panel, FONT, SMALL_FONT } from './render.js?v=0.18.0';

const BOX_DEFAULT = { x: 16, y: SCREEN_H - 132, w: SCREEN_W - 32, h: 116, pad: 18, lineH: 26 };
const LINES_PER_PAGE = 3;
// 자막(sub)이 있을 때: 창을 위로 조금 키우고, 본문 2줄 + 아래에 작은 글씨 자막 2줄
const SUB_BOX = { ...BOX_DEFAULT, y: SCREEN_H - 160, h: 144 };
const SUB_LINES_PER_PAGE = 2;
const SUB_LINE_H = 19;

// 띄어쓰기 단위로 줄을 바꾼다(영어 대사가 단어 중간에서 잘리지 않게).
// 한 단어가 한 줄보다 길면 그 단어만 글자 단위로 끊는다.
export function wrap(ctx, text, maxW) {
  const fits = (s) => ctx.measureText(s).width <= maxW;
  const lines = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (fits(next)) { line = next; continue; }
      if (line) lines.push(line);
      line = '';
      for (const ch of word) {
        if (line && !fits(line + ch)) { lines.push(line); line = ''; }
        line += ch;
      }
    }
    lines.push(line);
  }
  return lines;
}

// 쯔꾸르식 메시지 창. open()은 창이 닫힐 때 resolve되는 Promise를 돌려준다
// (선택지가 있으면 고른 번호로 resolve).
export class Dialog {
  constructor(measureCtx) {
    this.m = measureCtx;
    this.active = false;
    this.blink = 0;
  }

  // sub = 자막(번역 줄). 줄 수는 2줄까지 보인다.
  open(text, { speaker = null, choices = null, sub = null } = {}) {
    this.m.font = SMALL_FONT;
    this.sub = sub ? wrap(this.m, sub, BOX_DEFAULT.w - BOX_DEFAULT.pad * 2).slice(0, 2) : null;
    this.m.font = FONT;
    const lines = wrap(this.m, text, BOX_DEFAULT.w - BOX_DEFAULT.pad * 2);
    const per = this.sub ? SUB_LINES_PER_PAGE : LINES_PER_PAGE;
    this.pages = [];
    for (let i = 0; i < lines.length; i += per) this.pages.push(lines.slice(i, i + per));
    this.speaker = speaker;
    this.choices = choices;
    this.sel = 0;
    this.active = true;
    this.setPage(0);
    return new Promise((r) => { this.resolve = r; });
  }

  setPage(i) {
    this.page = i;
    this.shown = 0;
    this.total = this.pages[i].reduce((n, l) => n + l.length, 0);
  }

  get isLastPage() { return this.page === this.pages.length - 1; }
  get typing() { return this.shown < this.total; }

  update(dt, input) {
    if (!this.active) return;
    this.blink += dt;

    if (this.typing) {
      this.shown = Math.min(this.total, this.shown + dt * TEXT_SPEED);
      if (input.pressed('action')) this.shown = this.total;
      return;
    }

    if (!this.isLastPage) {
      if (input.pressed('action')) this.setPage(this.page + 1);
      return;
    }

    if (this.choices) {
      const n = this.choices.length;
      if (input.pressed('up')) this.sel = (this.sel + n - 1) % n;
      if (input.pressed('down')) this.sel = (this.sel + 1) % n;
      if (input.pressed('cancel')) return this.close(n - 1);
    }
    if (input.pressed('action')) this.close(this.choices ? this.sel : undefined);
  }

  close(value) {
    this.active = false;
    const r = this.resolve;
    this.resolve = null;
    r(value);
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    const BOX = this.sub ? SUB_BOX : BOX_DEFAULT;

    panel(ctx, BOX.x, BOX.y, BOX.w, BOX.h);

    if (this.speaker) {
      const w = ctx.measureText(this.speaker).width + 28;
      panel(ctx, BOX.x, BOX.y - 34, w, 30);
      ctx.fillStyle = '#ffd98a';
      ctx.fillText(this.speaker, BOX.x + 14, BOX.y - 28);
    }

    ctx.fillStyle = '#e8eef8';
    let budget = Math.floor(this.shown);
    this.pages[this.page].forEach((line, i) => {
      if (budget <= 0) return;
      ctx.fillText(line.slice(0, budget), BOX.x + BOX.pad, BOX.y + BOX.pad + i * BOX.lineH);
      budget -= line.length;
    });

    // 자막: 본문을 다 찍은 뒤에 나온다
    if (this.sub && !this.typing) {
      const y = BOX.y + BOX.pad + SUB_LINES_PER_PAGE * BOX.lineH + 6;
      ctx.fillStyle = '#3b4a63';
      ctx.fillRect(BOX.x + BOX.pad, y - 5, BOX.w - BOX.pad * 2 - 30, 1);
      ctx.font = SMALL_FONT;
      ctx.fillStyle = '#9fb7d9';
      this.sub.forEach((line, i) => ctx.fillText(line, BOX.x + BOX.pad, y + 2 + i * SUB_LINE_H));
      ctx.font = FONT;
    }

    if (!this.typing) {
      if (this.choices && this.isLastPage) {
        // 폭은 가장 긴 선택지에 맞추고, 7개를 넘으면 고른 줄을 따라 스크롤한다
        const ROWS = 7, n = this.choices.length, rows = Math.min(n, ROWS);
        const top = Math.max(0, Math.min(this.sel - ROWS + 1, n - ROWS));
        const longest = Math.max(...this.choices.map((l) => ctx.measureText(`▶ ${l}`).width));
        const w = Math.min(BOX.w, Math.max(170, longest + 32)), h = rows * 30 + 16;
        const x = BOX.x + BOX.w - w, y = BOX.y - h - 8;
        panel(ctx, x, y, w, h);
        this.choices.slice(top, top + rows).forEach((label, i) => {
          const idx = top + i;
          ctx.fillStyle = idx === this.sel ? '#ffd98a' : '#9aa8bd';
          ctx.fillText((idx === this.sel ? '▶ ' : '   ') + label, x + 14, y + 10 + i * 30);
        });
        ctx.fillStyle = '#6f86a8';
        if (top > 0) ctx.fillText('▲', x + w - 22, y + 4);
        if (top + rows < n) ctx.fillText('▼', x + w - 22, y + h - 24);
      } else if (Math.floor(this.blink * 2.5) % 2 === 0) {
        ctx.fillStyle = '#9fb7d9';
        ctx.fillText('▼', BOX.x + BOX.w - 32, BOX.y + BOX.h - 30);
      }
    }
    ctx.restore();
  }
}

import { SCREEN_W, SCREEN_H } from './config.js?v=0.38.0';
import { panel, FONT, SMALL_FONT, drawItemIcon, ICON_SLOT, iconSlot, drawBadge, drawMinimap } from './render.js?v=0.38.0';
import { wrap } from './dialog.js?v=0.38.0';
import { state, unreadNotes } from './state.js?v=0.38.0';
import { ITEMS } from './data/items.js?v=0.38.0';
import { QUESTS } from './data/quests.js?v=0.38.0';
import { CREATURES, toolsOf, rarityOf, carriedName } from './data/creatures.js?v=0.38.0';
import { NOTES } from './data/notes.js?v=0.38.0';
import { HELPS } from './data/helps.js?v=0.38.0';

// 메뉴 (Esc · 소지품은 E). 왼쪽 탭에서 고르고, Enter로 목록에 들어가 항목을 고르면 아래에 설명이 나온다.
const TABS = [
  { id: 'items', label: '소지품', empty: '(가진 것이 없다)' },
  { id: 'quests', label: '퀘스트', empty: '(받은 퀘스트가 없다)' },
  { id: 'collect', label: '소동물 도감', empty: '(아직 등록된 소동물이 없다)' },
  { id: 'notes', label: '노트', empty: '(아직 적어 둔 것이 없다)' },
  { id: 'map', label: '지도' }, // 지금 있는 맵 한 장 — 내 위치·문·계단·길 안내 목적지
  { id: 'settings', label: '설정' }, // 음량·판 이력 — 타이틀의 설정 화면과 같다
  { id: 'close', label: '닫기' },
];

const LIST = { x: 190, y: 58, rowH: 30, rows: 7 };
const DETAIL_Y = 290;

const WHERE = { inside: '연구소 안', outside: '연구소 밖', any: '어디서나' };
const creatureIcon = (cr) => ({ icon: cr.icon ?? 'default', image: cr.iconImage, tint: cr.tint });

// 같은 아이템은 「이름 ×개수」로 묶는다 (처음 얻은 순서대로)
export function groupedItems() {
  const counts = new Map();
  for (const id of state.items) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, n]) => ({
    id, n, label: n > 1 || ITEMS[id].consumable ? `${ITEMS[id].name} ×${n}` : ITEMS[id].name,
  }));
}

// 항목: { label, detail, flavor?, dim?, icon?, image? } — flavor는 설명 아래 다른 색으로,
//       icon = 아이템 id 또는 소동물 아이콘 이름(render.js ICONS), image = 사람이 그린 아이콘 그림(iconImage)
//       { section: '제목' } — 고를 수 없는 구역 제목 줄
function entries(tab) {
  if (tab === 'items') {
    const items = groupedItems().map(({ id, label }) => ({ label, use: id, icon: id, image: ITEMS[id].iconImage, detail: ITEMS[id].desc ?? '', flavor: ITEMS[id].flavor }));
    // 채집한 소동물 (Campbell에게 건네기 전) — 물건과 구역을 나눈다
    const carried = Object.keys(state.creatures).filter((id) => state.creatures[id] === 'caught')
      .map((id) => ({ label: carriedName(id), ...creatureIcon(CREATURES[id]), detail: CREATURES[id].desc, flavor: CREATURES[id].flavor }));
    // 대학원생에게 받은 도움 (data/helps.js)
    const helps = state.helps.map((id) => ({
      label: HELPS[id].name, icon: 'help', detail: `${HELPS[id].from ? `도와준 사람: ${HELPS[id].from}\n` : ''}${HELPS[id].desc ?? ''}`,
    }));
    if (!carried.length && !helps.length) return items;
    return [
      ...(items.length ? [{ section: '물건' }, ...items] : []),
      ...(carried.length ? [{ section: '채집한 소동물' }, ...carried] : []),
      ...(helps.length ? [{ section: '받은 도움' }, ...helps] : []),
    ];
  }
  if (tab === 'collect') {
    // 희귀도는 별 개수(오른쪽 끝)와 글자 색으로 — 못 찾은 종도 별은 보인다
    return Object.entries(CREATURES).map(([id, cr]) => {
      const st = state.creatures[id], rar = rarityOf(id);
      const stars = { right: rar.stars, rightColor: rar.color };
      if (!st) return { label: '???', icon: 'unknown', dim: true, ...stars, detail: `${rar.stars} ${rar.label} · ${WHERE[cr.where] ?? ''}
힌트: ${cr.hint}` };
      const tools = toolsOf(id).map((t) => ITEMS[t].name).join(' / ') || '맨손';
      return {
        label: `${st === 'delivered' ? '✓' : '●'} ${cr.name}`,
        color: rar.color, ...stars,
        ...creatureIcon(cr),
        head: `${rar.stars} ${rar.label} · ${WHERE[cr.where] ?? ''} · ${tools}${st === 'delivered' ? ' · Campbell에게 건넴' : ''}`,
        latin: { en: cr.en ?? '', species: cr.species ?? '' }, // 영문명 · 학명(기울임체)
        detail: cr.desc,
        flavor: cr.flavor,
      };
    });
  }
  if (tab === 'quests') {
    // 메인 퀘스트 구역이 맨 위, 그 아래 사이드 퀘스트. 구역마다 진행 중(최근 것 먼저) → 완료
    const ids = Object.keys(state.quests).sort((a, b) => {
      const qa = state.quests[a], qb = state.quests[b];
      return qa.done - qb.done || qb.order - qa.order;
    });
    const entry = (id) => {
      const q = state.quests[id], def = QUESTS[id];
      const now = q.done ? '완료' : `지금: ${def.steps[q.stage]}`;
      const giver = def.giver ? `의뢰: ${def.giver}\n` : '';
      // 진행 중 = 느낌표 종이, 완료 = 체크 종이 (아이콘으로 구분)
      return { label: def.name, icon: q.done ? 'questDone' : 'quest', dim: q.done, detail: `${giver}${def.desc}\n\n${now}` };
    };
    const main = ids.filter((id) => QUESTS[id].type === 'main').map(entry);
    const side = ids.filter((id) => QUESTS[id].type !== 'main').map(entry);
    return [
      ...(main.length ? [{ section: '메인 퀘스트' }, ...main] : []),
      ...(side.length ? [{ section: '사이드 퀘스트' }, ...side] : []),
    ];
  }
  if (tab === 'notes') {
    // 구역(category)별로 묶고, 구역 안에서는 얻은 순서대로. Enter로 본문 읽기
    const groups = new Map();
    for (const id of state.notes) {
      const cat = NOTES[id].category ?? '기록';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push({ label: NOTES[id].title, icon: 'note', detail: '(Enter — 읽기)', read: NOTES[id], noteId: id, unread: !state.notesRead.includes(id) });
    }
    return [...groups].flatMap(([cat, list]) => [{ section: cat }, ...list]);
  }
  return [];
}

// 「영문명 · 학명」 한 줄. 학명은 기울임체, 단 「sp.」처럼 종을 정하지 않은 표시는 바로 세운다(학명 표기 관례)
function drawLatin(ctx, { en, species }, x, y) {
  ctx.fillStyle = '#a9b8cf';
  ctx.font = SMALL_FONT;
  const lead = en && species ? `${en} · ` : en;
  ctx.fillText(lead, x, y);
  x += ctx.measureText(lead).width;
  const [, name, rest] = species.match(/^(.*?)((?:\s+(?:sp|spp)\.)?)$/);
  ctx.font = `italic ${SMALL_FONT}`;
  ctx.fillText(name, x, y);
  x += ctx.measureText(name).width;
  ctx.font = SMALL_FONT;
  if (rest) ctx.fillText(rest, x, y);
}

export class Menu {
  // onUse(아이템 id) — 소지품에서 Enter로 「사용」했을 때, onSettings() — 설정 탭에서 Enter,
  // mapView() — 지도 탭에 그릴 { world, player, target } (main.js가 넘겨준다)
  constructor({ onUse = () => {}, onSettings = () => {}, mapView = () => null } = {}) {
    this.open = false; this.onUse = onUse; this.onSettings = onSettings; this.mapView = mapView;
  }

  // start = true면 소지품 목록에 바로 들어간다 (E 키). 탭 id('settings' 등)를 주면 그 탭을 고른 채로 연다
  show(start = false) {
    this.reading = null;
    this.open = true;
    this.tab = typeof start === 'string' ? Math.max(0, TABS.findIndex((t) => t.id === start)) : 0;
    this.focus = 'tabs';
    this.sel = 0;
    if (start === true) {
      const first = this.list.findIndex((e) => !e.section);
      if (first >= 0) { this.focus = 'list'; this.sel = first; }
    }
  }

  hide() { this.open = false; }

  get list() { return entries(TABS[this.tab].id); }

  header(tab) {
    if (tab === 'map') return this.mapView() ? `  —  ${this.mapView().world.def.name}` : '';
    if (tab !== 'collect') return '';
    const total = Object.keys(CREATURES).length;
    const found = Object.keys(state.creatures).length;
    return `  —  ${found} / ${total}`; // 호감도는 숨은 값이라 보여 주지 않는다(작가 지침)
  }

  update(input) {
    if (input.pressed('items')) return this.hide(); // E로 열고 E로 닫는다
    if (this.reading) { // 노트 읽기: Enter·S 다음 쪽(마지막 쪽이면 닫기), W 앞 쪽, Esc 닫기
      const r = this.reading, last = (r.pages?.length ?? 1) - 1;
      if (input.pressed('cancel')) this.reading = null;
      else if (input.pressed('up') && r.page > 0) r.page--;
      else if (input.pressed('down') && r.page < last) r.page++;
      else if (input.pressed('action')) { if (r.page < last) r.page++; else this.reading = null; }
      return;
    }
    if (this.focus === 'tabs') {
      const n = TABS.length;
      if (input.pressed('up')) this.tab = (this.tab + n - 1) % n;
      if (input.pressed('down')) this.tab = (this.tab + 1) % n;
      if (input.pressed('cancel')) return this.hide();
      if (input.pressed('action')) {
        if (TABS[this.tab].id === 'close') return this.hide();
        if (TABS[this.tab].id === 'settings') { this.hide(); return this.onSettings(); }
        const first = this.list.findIndex((e) => !e.section);
        if (first >= 0) { this.focus = 'list'; this.sel = first; }
      }
      return;
    }
    const n = this.list.length;
    // 구역 제목 줄은 건너뛴다
    const step = (d) => { do this.sel = (this.sel + d + n) % n; while (this.list[this.sel].section); };
    if (input.pressed('up')) step(-1);
    if (input.pressed('down')) step(1);
    if (input.pressed('cancel') || input.pressed('left')) this.focus = 'tabs';
    else if (input.pressed('action') && this.list[this.sel]?.use) this.onUse(this.list[this.sel].use); // 아이템 「사용」 — 메뉴를 닫고 main.js가 처리
    else if (input.pressed('action') && this.list[this.sel]?.read) {
      const e = this.list[this.sel];
      this.reading = { note: e.read, page: 0 };
      if (e.unread) state.notesRead.push(e.noteId); // 펼치면 읽은 것으로
    }
  }

  // 노트 본문: 내용 칸 전체를 덮고 쪽 단위로 보여 준다
  drawReader(ctx) {
    const r = this.reading, x = 182, w = SCREEN_W - 198, perPage = 14;
    ctx.fillStyle = '#060a14'; // 뒤의 목록이 비치지 않게
    ctx.fillRect(x, 16, w, SCREEN_H - 32);
    panel(ctx, x, 16, w, SCREEN_H - 32);
    ctx.font = FONT;
    ctx.fillStyle = '#ffd98a';
    ctx.fillText(r.note.title, x + 18, 30);
    ctx.font = SMALL_FONT;
    if (!r.pages) {
      const lines = wrap(ctx, r.note.text, w - 36);
      r.pages = [];
      for (let i = 0; i < Math.max(1, lines.length); i += perPage) r.pages.push(lines.slice(i, i + perPage));
    }
    ctx.fillStyle = '#3b4a63';
    ctx.fillRect(x + 14, 60, w - 28, 1);
    ctx.fillStyle = '#c9d6ea';
    r.pages[r.page].forEach((t, i) => ctx.fillText(t, x + 18, 72 + i * 24));
    ctx.fillStyle = '#56657a';
    const more = r.page < r.pages.length - 1;
    ctx.fillText(`${r.page + 1} / ${r.pages.length}  ·  ${more ? 'Enter 다음 쪽' : 'Enter 닫기'}  ·  W/S 넘기기  ·  Esc 닫기`, x + 18, SCREEN_H - 46);
  }

  draw(ctx) {
    if (!this.open) return;
    ctx.save();
    ctx.fillStyle = 'rgba(2, 4, 10, 0.85)';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.textBaseline = 'top';

    // 탭
    panel(ctx, 16, 16, 160, TABS.length * 40 + 20);
    ctx.font = FONT;
    TABS.forEach((t, i) => {
      const on = i === this.tab;
      ctx.fillStyle = on ? (this.focus === 'tabs' ? '#ffd98a' : '#c9b47a') : '#9aa8bd';
      const label = (on ? '▶ ' : '   ') + t.label;
      ctx.fillText(label, 30, 30 + i * 40);
      // 안 읽은 노트가 있으면 노트 탭 오른쪽에 ! 표시
      if (t.id === 'notes' && unreadNotes().length) drawBadge(ctx, 30 + ctx.measureText(label).width + 14, 30 + i * 40 + 10);
    });

    // 내용
    const tab = TABS[this.tab];
    panel(ctx, 182, 16, SCREEN_W - 198, SCREEN_H - 32);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#6f86a8';
    ctx.fillText(tab.label + this.header(tab.id), 200, 28);

    const list = this.list;
    if (tab.id === 'map') {
      const v = this.mapView();
      if (v) drawMinimap(ctx, v.world, v.player, v.target, LIST.x, 48, SCREEN_W - 228, SCREEN_H - 120, performance.now() / 1000);
    } else if (tab.id === 'close' || tab.id === 'settings') {
      ctx.fillStyle = '#7d8aa0';
      ctx.fillText(tab.id === 'close' ? 'Enter — 메뉴 닫기' : 'Enter — 음량·판 이력', LIST.x + 10, LIST.y);
    } else if (!list.length) {
      ctx.fillStyle = '#7d8aa0';
      ctx.fillText(tab.empty, LIST.x + 10, LIST.y);
    } else {
      const top = Math.max(0, Math.min(this.sel - LIST.rows + 1, list.length - LIST.rows));
      ctx.font = FONT;
      list.slice(top, top + LIST.rows).forEach((e, i) => {
        const idx = top + i, on = this.focus === 'list' && idx === this.sel;
        if (e.section) {
          const y = LIST.y + i * LIST.rowH;
          ctx.font = SMALL_FONT;
          ctx.fillStyle = '#6f86a8';
          ctx.fillText(e.section, LIST.x + 4, y + 4);
          ctx.fillStyle = '#3b4a63';
          ctx.fillRect(LIST.x + 8 + ctx.measureText(e.section).width, y + 12, SCREEN_W - 248 - ctx.measureText(e.section).width, 1);
          ctx.font = FONT;
          return;
        }
        if (on) {
          ctx.fillStyle = 'rgba(255, 217, 138, 0.12)';
          ctx.fillRect(LIST.x, LIST.y + i * LIST.rowH - 4, SCREEN_W - 228, LIST.rowH);
        }
        ctx.fillStyle = on ? '#ffd98a' : e.dim ? '#6c7686' : '#e8eef8';
        const y = LIST.y + i * LIST.rowH;
        if (e.icon) drawItemIcon(ctx, e.icon, LIST.x + 8, y - 1, 1, e.image, e.tint);
        ctx.fillStyle = on ? '#ffd98a' : e.dim ? '#6c7686' : e.color ?? '#e8eef8'; // e.color = 소동물 희귀도 색
        const lx = LIST.x + 10 + (e.icon ? ICON_SLOT + 8 : 0);
        ctx.fillText(e.label, lx, y);
        if (e.right) { // 오른쪽 끝 글자 (소동물 희귀도 별)
          ctx.fillStyle = e.rightColor ?? ctx.fillStyle;
          ctx.globalAlpha = e.dim ? 0.5 : 1; // 못 찾은 종도 희귀도 색은 보이게, 조금 흐리게
          ctx.textAlign = 'right';
          ctx.fillText(e.right, SCREEN_W - 44, y);
          ctx.textAlign = 'left';
          ctx.globalAlpha = 1;
        }
        if (e.unread) drawBadge(ctx, lx + ctx.measureText(e.label).width + 14, y + 10); // 아직 안 읽은 노트
      });

      // 설명 (목록에 들어가 있을 때만)
      if (this.focus === 'list') {
        ctx.fillStyle = '#3b4a63';
        ctx.fillRect(LIST.x, DETAIL_Y - 12, SCREEN_W - 228, 1);
        ctx.font = SMALL_FONT;
        // 아이콘이 있으면 설명 왼쪽에 큰 아이콘 칸, 글은 그 오른쪽
        const e = list[this.sel], pad = e.icon ? iconSlot(2) + 12 : 0, maxW = SCREEN_W - 248 - pad;
        if (e.use) { // 쓸 수 있는 물건: 내용 칸 오른쪽 위에 안내
          ctx.fillStyle = '#c9b47a';
          ctx.textAlign = 'right';
          ctx.fillText('Enter — 사용', SCREEN_W - 34, 28);
          ctx.textAlign = 'left';
        }
        if (e.icon) drawItemIcon(ctx, e.icon, LIST.x + 8, DETAIL_Y - 2, 2, e.image, e.tint);
        // 소동물: 머리줄(head) → 영문명 · 학명 줄(latin) → 설명. 그 밖에는 설명만
        const lines = [
          ...(e.head ? wrap(ctx, e.head, maxW).map((t) => ({ t })) : []),
          ...(e.latin ? [{ latin: e.latin }] : []),
          ...wrap(ctx, e.detail, maxW).map((t) => ({ t, flavor: false })),
        ];
        if (e.flavor) lines.push({ t: '', flavor: true }, ...wrap(ctx, e.flavor, maxW).map((t) => ({ t, flavor: true })));
        lines.slice(0, 8).forEach((l, i) => {
          const x = LIST.x + 10 + pad, y = DETAIL_Y + i * 22;
          if (l.latin) return drawLatin(ctx, l.latin, x, y);
          ctx.fillStyle = l.flavor ? '#8fa3bd' : '#c9d6ea';
          ctx.font = l.flavor ? `italic ${SMALL_FONT}` : SMALL_FONT;
          ctx.fillText(l.t, x, y);
        });
      } else {
        ctx.font = SMALL_FONT;
        ctx.fillStyle = '#56657a';
        ctx.fillText('Enter — 목록 보기', LIST.x + 10, SCREEN_H - 46);
      }
    }

    ctx.font = SMALL_FONT;
    ctx.fillStyle = '#56657a';
    ctx.fillText('W/S 고르기 · Enter 결정 · Esc 뒤로', 30, SCREEN_H - 40);
    if (this.reading) this.drawReader(ctx);
    ctx.restore();
  }
}

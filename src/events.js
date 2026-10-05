import { state, hasItem, saveGame, readSave, curseLevel } from './state.js?v=0.29.0';
import { CURSE } from './data/curse.js?v=0.29.0';
import { NOTES } from './data/notes.js?v=0.29.0';
import { HELPS } from './data/helps.js?v=0.29.0';
import { MAPS } from './data/maps.js?v=0.29.0';
import { ITEMS } from './data/items.js?v=0.29.0';
import { QUESTS } from './data/quests.js?v=0.29.0';
import { CREATURES } from './data/creatures.js?v=0.29.0';
import { fader } from './fader.js?v=0.29.0';
import { sfx } from './audio.js?v=0.29.0';

import { josa } from './text.js?v=0.29.0';

const subtitle = (opts) => (opts.sub && hasItem('translator') ? opts.sub : null);

// 이벤트 스크립트가 쓰는 명령 모음(c). 맵 데이터의 run(c)에서 호출한다.
export function createRunner(game) {
  let running = false;

  const c = {
    // opts.sub = 한국어 자막. 번역기(translator)를 가지고 있을 때만 보인다.
    // 번역기는 자막만 켜 준다 — 진행 조건으로 쓰지 않는다(영어를 읽는 플레이어는 없이도 끝까지 간다).
    sfx: (name) => sfx(name), // 효과음 한 번 (audio.js의 SFX 이름)
    say: (text, speaker, opts = {}) => game.dialog.open(text, { speaker, sub: subtitle(opts), face: opts.face, mood: opts.mood }),
    choose: (text, choices, opts = {}) => game.dialog.open(text, { choices, speaker: opts.speaker, sub: subtitle(opts), face: opts.face, mood: opts.mood }),

    has: (id) => hasItem(id),
    async give(id, count = 1) {
      for (let i = 0; i < count; i++) state.items.push(id);
      const name = ITEMS[id].name;
      const label = count > 1 ? `${name} ${count}개를` : `${name}${josa(name, '을', '를')}`;
      sfx('item');
      await c.say(`${label} 손에 넣었다.`);
    },
    count: (id) => state.items.filter((i) => i === id).length,
    take(id) {
      const i = state.items.indexOf(id);
      if (i >= 0) state.items.splice(i, 1);
    },

    // ── 퀘스트 (data/quests.js) ──
    quest: {
      start(id) {
        if (state.quests[id]) return;
        state.quests[id] = { stage: 0, done: false, order: Object.keys(state.quests).length };
        game.toast(`새 ${QUESTS[id].type === 'main' ? '메인' : '사이드'} 퀘스트 — ${QUESTS[id].name}`);
      },
      next(id) {
        const q = state.quests[id];
        if (!q || q.done) return;
        q.stage = Math.min(q.stage + 1, QUESTS[id].steps.length - 1);
        game.toast(`퀘스트 갱신 — ${QUESTS[id].name}`);
      },
      set(id, stage) {
        const q = state.quests[id];
        if (q && !q.done) q.stage = stage;
      },
      done(id) {
        const q = state.quests[id];
        if (!q || q.done) return;
        q.done = true;
        game.toast(`퀘스트 완료 — ${QUESTS[id].name}`);
      },
      stage: (id) => state.quests[id]?.stage ?? -1,
      started: (id) => !!state.quests[id],
      active: (id) => !!state.quests[id] && !state.quests[id].done,
      finished: (id) => !!state.quests[id]?.done,
    },

    // ── 소동물 (data/creatures.js) ──
    creature: {
      status: (id) => state.creatures[id] ?? null,                  // null | 'caught' | 'delivered'
      carried: () => Object.keys(state.creatures).filter((id) => state.creatures[id] === 'caught'),
      // 잡는 데 쓸 도구: tools 중 가진 것 하나 (tools가 비었으면 'hands')
      toolFor(id) {
        const tools = CREATURES[id].tools ?? [];
        if (!tools.length) return 'hands';
        return tools.find((t) => hasItem(t)) ?? null;
      },
      // 잡기. 맞는 도구가 없으면 false. 소모품 도구는 하나 쓴다.
      catch(id) {
        if (state.creatures[id]) return false;
        const tool = c.creature.toolFor(id);
        if (!tool) return false;
        if (ITEMS[tool]?.consumable) c.take(tool);
        state.creatures[id] = 'caught';
        game.toast(`도감 등록 — ${CREATURES[id].name}`);
        return true;
      },
      // 건네기: 호감도가 creatures.js의 affinity만큼 오른다
      deliver(id, npc = 'campbell') {
        if (state.creatures[id] !== 'caught') return;
        state.creatures[id] = 'delivered';
        c.affinity.add(npc, CREATURES[id].affinity ?? 1);
      },
    },

    // ── 대학원생의 도움 (data/helps.js) ──
    help: {
      grant(id) {
        if (state.helps.includes(id)) return;
        state.helps.push(id);
        game.toast(`도움 — ${HELPS[id].name}`);
      },
      has: (id) => state.helps.includes(id),
    },

    // ── 노트 (data/notes.js) ──
    note: {
      add(id) {
        if (state.notes.includes(id)) return;
        state.notes.push(id);
        game.toast(`노트 추가 — ${NOTES[id].title}`);
      },
      has: (id) => state.notes.includes(id),
    },

    // ── 저주 (data/curse.js) ──
    curse: {
      get: () => curseLevel(),
      lifted: () => !!state.flags.curseLifted,
      // 진행도 올리기. max에 닿으면 저주가 풀리고 onLift 장면이 이어진다
      async add(n = 1) {
        if (state.flags.curseLifted) return;
        state.flags.curse = Math.min(CURSE.max, curseLevel() + n);
        if (state.flags.curse < CURSE.max) return;
        state.flags.curseLifted = true;
        await CURSE.onLift?.(c);
      },
    },

    // ── 호감도 ──
    affinity: {
      get: (npc) => state.affinity[npc] ?? 0,
      add(npc, n = 1) { state.affinity[npc] = (state.affinity[npc] ?? 0) + n; },
    },

    // c.flag('x') → 읽기(없으면 false), c.flag('x', true) → 쓰기. 숫자도 저장 가능
    flag(name, value) {
      if (value === undefined) return state.flags[name] ?? false;
      state.flags[name] = value;
    },

    wait: (ms) => new Promise((r) => setTimeout(r, ms)),

    // ── 연출 ──
    picture(id) { game.picture = id ?? null; },          // 전체 화면 그림 (render.js PICTURES). null이면 끔
    async shake(seconds, power = 6) {                    // 화면 흔들림
      game.shake = { until: game.time + seconds, power };
      await c.wait(seconds * 1000);
    },
    lights(on) { game.blackout = !on; },                 // false = 정전 (완전히 캄캄)
    fade: (alpha) => fader.to(alpha),                    // 1 = 검은 화면, 0 = 원래대로
    objective(text) { state.flags.objective = text ?? null; }, // 화면 왼쪽 위 목표 줄
    toast(text) { game.toast(text); },                   // 화면 위 알림 한 줄
    place(x, y, dir) {                                   // 같은 맵 안에서 플레이어 옮기기
      game.player.place(x, y, dir ?? game.player.dir);
      game.follower?.place(x, y, dir ?? game.player.dir);
    },
    // 말풍선: 캐릭터 머리 위에 짧게 (혼잣말·잡담). 게임을 멈추지 않는다.
    //  who = 'player'(수오) 또는 이 맵의 이벤트 글자(NPC). await하면 말풍선이 사라질 때까지 기다린다
    bubble: (text, who = 'player', opts = {}) => game.bubble(text, who, opts.seconds),
    walk: (dir, steps = 1) => game.walk(dir, steps),     // 플레이어를 dir 쪽으로 steps칸 걷게 함 (막히면 거기서 멈춤)
    move: (who, dir, steps = 1) => game.moveEvent(who, dir, steps), // 이 맵의 이벤트(NPC 글자)를 걷게 함. await하면 다 걸을 때까지
    // 화면 번쩍임: color(기본 흰색)로 덮였다가 seconds초 동안 사라진다
    async flash(color = '#ffffff', seconds = 0.4) {
      game.flash = { color, until: game.time + seconds, dur: seconds };
      sfx('flash');
      await c.wait(seconds * 1000);
    },
    face(dir) { game.player.dir = dir; },                // 플레이어가 dir 쪽을 보게 함
    follow(name, color) { game.follow(name, color); },  // 동행 시작 (뒤를 따라 걸음)
    unfollow() { game.follower = null; },

    // ── 추격 (chase.js) ──
    //  c.chase.start({ who, at, speed, delay, maps, follow, until, onCaught, onEscape })
    //   who      'shark'(상어귀신) | 'bear'(북극곰) — 그림 (render.js CHASERS)
    //   at       나타날 곳: 이 맵의 앵커 글자(그 옆 빈 칸) 또는 { x, y }
    //   speed    초당 타일 수 (기본 3.5 — 걷기 5, 달리기 7.5)
    //   delay    움직이기 시작할 때까지 초 (기본 1)
    //   maps     추격이 이어지는 맵 id 목록 (기본: 지금 맵). 이 밖으로 나가면 추격 끝
    //   follow   maps 안의 다른 맵으로 옮기면 추격자가 같은 문으로 몇 초 뒤 따라 들어옴 (기본 1.5)
    //   until    (state) => bool. 참이 되면 추격 끝
    //   onCaught async (c) — 잡혔을 때 게임 오버 화면 전에 (없어도 됨)
    //   onEscape async (c) — 벗어났거나 until을 채웠을 때 (없어도 됨)
    //  잡히면 게임 오버 → 「마지막 세이브에서 다시 / 타이틀로」. 추격 중에는 메뉴와 저장을 쓸 수 없다.
    chase: {
      start(opts) { game.startChase(opts); },
      stop() { game.stopChase(); },
      active: () => !!game.chase,
    },

    // anchor 이벤트 칸에서 dir 방향으로 한 칸 옆에 도착
    async transfer(mapId, anchor, dir) {
      // 공개 배포본에서는 internal 맵을 뺀다(tools/배포하기.sh). 그리로 가는 문은 잠긴 문처럼 둔다
      if (!MAPS[mapId]) { sfx('locked'); return c.say('(잠겨 있다)'); }
      sfx('door');
      await fader.to(1);
      const escaped = game.chase && !game.chase.maps.includes(mapId) ? game.chase : null;
      game.enterMap(mapId, anchor, dir); // 추격 구역 밖이면 여기서 추격이 끝난다
      await fader.to(0);
      await game.world.def.onEnter?.(c);
      await escaped?.opts.onEscape?.(c);
    },

    async save() {
      if (game.chase) return c.say('(지금은 저장할 수 없다)');
      const slot = await game.pickSlot('save'); // 슬롯 3개 중 하나 (작가 지침)
      if (slot === null) return;
      if (readSave(slot)) {
        const pick = await c.choose(`슬롯 ${slot + 1}에 덮어쓸까요?`, ['덮어쓴다', '그만둔다']);
        if (pick !== 0) return;
      }
      const p = game.player;
      // 슬롯에 보일 요약: 진행 중인 메인 퀘스트(없으면 목표 줄)와 지금 있는 곳
      const main = Object.entries(state.quests).filter(([id, q]) => !q.done && QUESTS[id].type === 'main')
        .sort((a, b) => b[1].order - a[1].order)[0];
      const quest = main ? `${QUESTS[main[0]].name} — ${QUESTS[main[0]].steps[main[1].stage]}` : (state.flags.objective ?? '');
      const ok = saveGame(slot, { map: game.world.id, x: p.x, y: p.y, dir: p.dir }, { quest, place: game.world.def.name });
      if (ok) sfx('save');
      await c.say(ok ? '저장했습니다.' : '저장하지 못했습니다.\n(브라우저 저장소가 막혀 있습니다)');
    },

    async end(id) {
      await fader.to(1);
      game.showEnding(id);
      await fader.to(0);
    },
  };

  return {
    get busy() { return running; },
    async run(script) {
      if (running) return;
      running = true;
      try {
        await script(c);
      } catch (e) {
        console.error('[이벤트 오류]', e);
      } finally {
        running = false;
      }
    },
  };
}

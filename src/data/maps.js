// ─────────────────────────────────────────────
// 배경: 극지연구소 송도 본원 (인천 연수구 송도미래로 26)
// ※ 캠퍼스 배치는 작가가 알려준 구조를 따른다(2026-10-04). 동 안쪽 방 배치는 아직 임시.
//   - 본관 ─ 제1·2·3연구동: 2층으로 이어짐. 연구동끼리는 1~2층이 이어지고 3~6층은 동마다 따로
//   - 연구지원동: 북서동·남동동 두 동, 2층 구름다리로 연결. 카페는 북서동 1층의 남서쪽 절반
//   - 경비실: 차량 진입로 오른쪽
//   - 기숙사동·극지지원동: 밖으로 나가서 간다
//   - 정문: 남동쪽 도로에서 본관 앞으로 진입. 부지 내 차도가 본관·연구동 사이를 지나 연구동 북서쪽을 따라간다
//   - 출입문: 본관 1층 북동·남서 / 연구동마다 1층 북서(차도 쪽) / 제1연구동 북동 / 제3연구동 남서
// ※ 대사·조건·아이템 등 스토리는 비워 둠. '(…)' 문구는 전부 자리표시.
//
// 맵 필드
//  name     화면 왼쪽 위 표시 이름
//  rows     타일 문자열.  #=벽  .=바닥  W=창문  ==책상  R=선반  G=설비  S=세면대  V=아래층이 내다보이는 트인 공간(난간)
//                         ,=창고 바닥  :=보도  _=차도  ;=잔디  |=주차장  P=필로티(건물 1층 차량 통로)  T=나무  B=큰 나무(2×2 덩어리로)  *=화단  H=건물 외벽  F=부지 경계
//                         X=잔해 더미(밤 겹침층에만 쓴다)
//                         (. , : _ ; | P 빼고 통과 불가)
//           소문자(a-z) = 이벤트 위치 → events[글자]. 같은 글자를 여러 칸에 써도 된다.
//  cold     { seconds, exit:[맵, 앵커, 방향] } — 체온이 seconds초 동안 바닥나면 exit로 이동
//  tint     화면 색조 (rgba 문자열)
//  lit      true면 불 켜진 방(세이브 포인트가 있는 야근 방 등) — 항상 밝다
//  onEnter  async (c) => {} 맵에 들어올 때마다 실행
//  internal true면 공개 배포본에서 뺄 맵 (CLAUDE.md 「공개 범위」)
//  night    밤 겹침층 — rows와 같은 크기의 줄. 공백 = 낮과 같음, 다른 글자 = 밤(본편)에만 그 타일(무너진 잔해 X 등).
//           이벤트 칸은 바꾸지 않는다. 금·파손·패인 도로는 render.js DAMAGE가 저절로 그린다. 편집기 「밤 칸」으로 칠한다
//  litWindows [[x, y], …] 밤에 불이 켜진 외벽(H) 칸 — 야근 중인 방. 나머지 창은 모두 꺼져 있다
//  overhead [[x, y, w, h], …] 위층 덮개 칸 — 사람 위에 반투명하게 그린다(구름다리 등). 필로티 P 칸은 저절로 덮인다
//
// 이벤트 필드
//  sprite   그릴 모양 (render.js SPRITES)
//  solid    true면 통과 불가
//  trigger  'action' = 바라보고 조사키 / 'touch' = 부딪히거나(solid) 밟으면(non-solid) 실행
//  visible  (state) => bool. false면 없는 취급
//  run      async (c) => { ... }  이벤트 스크립트. c의 명령은 events.js 참고
//  turnToPlayer  true면 조사할 때 플레이어 쪽으로 돌아본다 (npc 헬퍼가 켜 둠)
//  useItem  { 아이템id: async (c) => {} } — 이 이벤트를 바라보고 소지품에서 그 아이템을 「사용」하면 실행
//           (예: 잠긴 문에 열쇠 쓰기). 아이템을 없애려면 스크립트 안에서 c.take('id'). 없으면 아이템의 use(items.js)가 돈다
//  chatter  ['…'] 또는 { lines, every(초), range(칸) } — 플레이어가 가까이 있으면 가끔 머리 위 말풍선으로 혼잣말
//  hiddenTag  '표시' — 그 표시를 드러내는 도움(helps.js reveal)을 받아야 보이는 숨은 요소
//  glow     true면 밤에 그 칸 둘레로 따뜻한 불빛이 새어 나온다. lit 맵으로 이어지는 문(door·roomDoor 등)은 저절로 켜진다
//  passable (state) => bool — false면 지금은 지나갈 수 없는 문(낮에 잠긴 건물 등). 길 안내 화살표가 이 문으로 이끌지 않는다
//  그 밖의 필드(color, lockFlag 등)는 스프라이트에서 o.ev로 읽는다.
//
// 문 방향 관례: 문이 왼쪽 벽이면 'right', 오른쪽 벽이면 'left', 위 벽이면 'down', 아래 벽이면 'up'
//              (도착 칸 = 앵커 칸에서 그 방향으로 한 칸)
// ─────────────────────────────────────────────

import { PROLOGUE, PROLOGUE_START, STAFF } from './prologue.js?v=0.32.0';
import { NPCS, EXAMPLE_ITEM } from './npcs.js?v=0.32.0';
import { crowd } from './crowd.js?v=0.32.0';
import { CH1 } from './chapter1.js?v=0.32.0';
import { SHARK } from './shark.js?v=0.32.0';
import { CREATURES } from './creatures.js?v=0.32.0';
import { ITEMS } from './items.js?v=0.32.0';
import { josa } from '../text.js?v=0.32.0';
import { pickEnding } from './endings.js?v=0.32.0';
import { helpTags } from '../state.js?v=0.32.0';

export const START = PROLOGUE_START;

// ── 자주 쓰는 이벤트 모양 ──
// 아직 만들지 않은 방·층은 잠가 둔다(작가 지침 2026-10-04). 방을 만들면 그 문만 연결하면 된다.
const lockedMsg = (label) => `[${label}]\n(잠겨 있다 — 문구 미정)`;
// 잠긴 문·막힌 길: 덜컹 소리와 함께 문구
const sayLocked = (c, text) => { c.sfx('locked'); return c.say(text); };
// 헬퍼가 남기는 to·text·label·room 필드는 맵 편집기(tools/mapview.html)가 읽는다.
// 문 방향(dir)을 빼면 도착 칸 옆의 빈 칸을 게임이 알아서 고른다(world.entryDir).
const door = (sprite, map, anchor, dir) => ({
  sprite, solid: true, trigger: 'touch', to: { map, anchor, dir }, run: (c) => c.transfer(map, anchor, dir),
});
const look = (sprite, text) => ({
  sprite, solid: true, trigger: 'action', text, run: (c) => c.say(text),
});
const lockedRoom = (label) => ({
  sprite: label.startsWith('화장실') ? 'wcDoor' : 'labDoor', // 화장실은 표지판 붙은 문
  solid: true, trigger: 'touch', label, run: (c) => sayLocked(c, lockedMsg(label)),
});
// 대학원생 등 NPC. color = 옷 색(임시 그림 구분용). 대사는 name 이름표로 나온다.
const npc = (name, color, run) => ({
  sprite: 'npc', solid: true, trigger: 'action', turnToPlayer: true, color, name, run,
});
// 낮(오프닝)에는 볼일이 없는 건물 — 밤이 되면 열린다
const dayLocked = (d) => ({
  ...d,
  passable: (s) => !s.flags.day, // 길 안내(guide.js)가 지금 지나갈 수 있는 문인지 본다
  run: (c) => (c.flag('day') ? dayStop(c, '(지금은 볼일이 없다 — 대사 미정)') : d.run(c)),
});
// 낮에 막힌 곳: 카페로 가는 길(직원과 동행 중)이면 홍보실 직원이 막고, 아니면 문구만
const dayStop = (c, text) => (PROLOGUE.escorting(c) ? PROLOGUE.staffStop(c) : sayLocked(c, text));
// 건물 출입구 (캠퍼스 ↔ 건물). 낮이든 밤이든, 들어갈 때도 나갈 때도 방문증이 있어야 지날 수 있다(작가 지침).
// 건물 안의 문(호실·계단·구름다리)은 해당 없음.
const PASS_MSG = '(방문증이 없어 출입문을 지날 수 없다 — 문구 미정)';
const entrance = (sprite, map, anchor, dir) => ({
  ...door(sprite, map, anchor, dir),
  entrance: true, // check.mjs가 캠퍼스 문이 전부 entrance인지 본다
  run: (c) => (c.has('visitorPass') ? c.transfer(map, anchor, dir) : sayLocked(c, PASS_MSG)),
});
// 연구지원동 북서동 출입문: 낮(오프닝)에는 북극곰 장면(pro 3) 뒤에 열린다
const supADoor = (anchor, dir) => ({
  ...entrance('glassDoor', 'supA_1f', anchor, dir),
  passable: (s) => !(s.flags.day && s.flags.pro < 3),
  run: (c) => (c.flag('day') && c.flag('pro') < 3
    ? c.say('(지금은 볼일이 없다 — 대사 미정)')
    : entrance('glassDoor', 'supA_1f', anchor, dir).run(c)),
});

// 소동물 채집 지점 (data/creatures.js). 밤(본편)에만 나오고, 잡으면 사라진다.
//  fixture: true면 수조처럼 자리에 남는 물건 — 잡은 뒤에도 보이고 「비었다」고 나온다
const creatureSpot = (id, { sprite = 'critter', fixture = false } = {}) => ({
  sprite, solid: true, trigger: 'action', creature: id,
  visible: (s) => !s.flags.day && (fixture || !s.creatures[id]),
  async run(c) {
    if (c.creature.status(id)) return c.say('(비어 있다 — 문구 미정)');
    if (!c.creature.toolFor(id)) {
      const need = CREATURES[id].tools.map((t) => ITEMS[t].name).join(' 또는 ');
      return c.say(`(무언가 움직인다. 잡으려면 ${need}${josa(need, '이', '가')} 필요하다 — 문구 미정)`);
    }
    const pick = await c.choose('(무언가 움직인다 — 문구 미정)', ['잡는다', '그만둔다']);
    if (pick !== 0) return;
    c.creature.catch(id);
    await c.say(`(${CREATURES[id].name} — 잡았다. 문구 미정)`);
  },
});
// 세이브 포인트 (불 켜진 방에 둔다)
const savePoint = {
  sprite: 'savePoint', solid: true, trigger: 'action',
  async run(c) {
    const pick = await c.choose('저장할까요?', ['저장한다', '그만둔다']);
    if (pick === 0) await c.save();
  },
};

// 층 고르기 (계단·엘리베이터 공용). 각 층 맵의 같은 벽에 같은 글자(anchor)로 둔다.
//  floors[i] = (i+1)층 맵 id, null이면 아직 없는 층
//  dir = 도착 방향. 계단이 오른쪽 벽이면 'left'(기본), 왼쪽 벽이면 'right'
//  opts.lo  = 이 계단이 닿는 가장 낮은 층. 그 아래 층은 목록에 안 나온다(floors에는 null로 둔다)
//  opts.dayTop = 낮(flags.day)에 갈 수 있는 가장 높은 층. 그 위로 가려 하면 막힌다
//  opts.cut = 이 층과 바로 위층 사이가 무너져 있음. 사이를 건너려 하면 막히고 opts.onCut(c)를 부른다
const CUT_MSG = '(계단이 무너져 있어 지나갈 수 없다 — 문구 미정)';
//  opts.below = 지하층 맵 id 목록 [지하 1층, 지하 2층 …]. 지하층에서는 here가 -1, -2 …
//  opts.belowOpen = (c) => bool. 거짓이면 지하층으로 내려갈 수 없다
const BELOW_LOCKED = '(지하로는 아직 내려갈 수 없다 — 문구 미정)';
// 본관·연구동은 낮(오프닝)에는 1층만 다닌다. 2층부터는 메인 스토리(밤)부터 (작가 지침 2026-10-06) — 계단 opts.dayTop
const DAY_UP_MSG = '(지금은 위층에 올라갈 일이 없다 — 문구 미정)';
const floorPicker = (kind, label, anchor, floors, here, dir = 'left', opts = {}) => async (c) => {
  const list = [
    ...(opts.below ?? []).map((map, i) => ({ n: -(i + 1), map, name: `지하 ${i + 1}층` })).reverse(),
    ...floors.map((map, i) => ({ n: i + 1, map, name: `${i + 1}층` })).filter((f) => f.n >= (opts.lo ?? 1)),
  ];
  const labels = list.map((f) => `${f.name}${f.n === here ? ' (지금)' : ''}`);
  const pick = await c.choose(`[${label} ${kind}] 몇 층으로 갈까요?`, [...labels, '그만둔다']);
  const to = list[pick];
  if (!to || to.n === here) return;
  if (opts.dayTop && c.flag('day') && to.n > opts.dayTop) return dayStop(c, DAY_UP_MSG);
  if (opts.cut && (here <= opts.cut) !== (to.n <= opts.cut)) {
    await sayLocked(c, CUT_MSG);
    return opts.onCut?.(c);
  }
  if (!to.map) return sayLocked(c, lockedMsg(`${label} ${to.name}`));
  if (to.n < 0 && opts.belowOpen && !opts.belowOpen(c)) return dayStop(c, BELOW_LOCKED);
  await c.transfer(to.map, anchor, dir);
};
const stairs = (label, anchor, floors, here, dir = 'left', opts = {}) => ({
  sprite: 'stairs', solid: true, trigger: 'touch', floors, below: opts.below, anchor, dir, lo: opts.lo, here, cut: opts.cut, // floors·below·anchor·dir·lo는 check.mjs·편집기, here·cut은 길 안내(guide.js)가 본다
  run: floorPicker('계단', label, anchor, floors, here, dir, opts),
});
// 엘리베이터: unlockFlag가 켜지기 전에는 쓸 수 없다
const elevator = (label, anchor, floors, here, unlockFlag, dir = 'left', opts = {}) => ({
  sprite: 'elevator', solid: true, trigger: 'action', lockFlag: unlockFlag, floors, below: opts.below, anchor, dir, here, cut: opts.cut,
  run: (c) => (c.flag(unlockFlag)
    ? floorPicker('엘리베이터', label, anchor, floors, here, dir, opts)(c)
    : c.say('(엘리베이터 — 아직 쓸 수 없다. 해금 조건·대사 미정)')),
});
// 대학원생의 도움으로 열리는 문 (helps.js effects.open에 tag가 있는 도움을 받으면 열린다). 그 전에는 잠겨 있다
const helpDoor = (label, tag, map, anchor, dir) => ({
  sprite: 'labDoor', solid: true, trigger: 'touch', label, helpTag: tag, to: { map, anchor, dir },
  run: (c) => (helpTags('open').includes(tag) ? c.transfer(map, anchor, dir) : sayLocked(c, lockedMsg(label))),
});
// 호실 문 (번호판이 붙은 문). map이 없으면 잠겨 있다
const roomDoor = (room, map, anchor, dir) => ({
  sprite: 'roomDoor', solid: true, trigger: 'touch', room, to: map ? { map, anchor, dir } : null,
  run: map ? (c) => c.transfer(map, anchor, dir) : (c) => sayLocked(c, lockedMsg(room)),
});

// 동별 층 구성. 연구동 3~6층은 동마다 따로(연구동끼리는 1~2층만 이어진다).
// 연구지원동 엘리베이터 해금 플래그 (해금 조건은 작가가 정한다)
const SUP_ELEVATOR = 'supElevator';

const FLOORS = {
  main: ['main_1f', 'research_2f'],                           // 본관 (3층 이상 있는지 미확인)
  r1:   ['research_1f', 'research_2f', 'r1_3f', 'r1_4f', 'r1_5f', 'r1_6f'], // 제1연구동 계단1 (4↔5층이 무너짐)
  r1b:  [null, null, null, 'r1_4f', 'r1_5f', 'r1_6f'],         // 제1연구동 계단2 (4~6층만)
  r2:   ['research_1f', 'research_2f', 'r2_3f', 'r2_4f', 'r2_5f', 'r2_6f'], // 제2연구동
  r3:   ['research_1f', 'research_2f', 'r3_3f', 'r3_4f', 'r3_5f', 'r3_6f'], // 제3연구동
  supA: ['supA_1f', 'supA_2f', 'supA_3f'],                    // 연구지원동 북서동 (4층 이상 있는지 미확인)
  supB: ['supB_1f', 'supB_2f', 'supB_3f'],                    // 연구지원동 남동동 (3층까지, 계단만)
  polar: ['polar_1f', null],                                  // 극지지원동 (층수 미확인)
  dorm: ['dorm_1f', null],                                    // 기숙사동 (층수 미확인)
};

// 제1연구동 계단1은 4층과 5층 사이가 무너져 있다(1장). 4~6층은 계단2로 오간다.
const DAY_1F = { dayTop: 1 }; // 낮에는 1층만 (본관·연구동·연구지원동 북서동)
const r1Stairs = (here) => stairs('제1연구동', 'x', FLOORS.r1, here, 'left', { ...DAY_1F, cut: 4, onCut: CH1.stairsCollapsed });
const r1Stairs2 = (here) => stairs('제1연구동 계단2', 'y', FLOORS.r1b, here, 'right', { ...DAY_1F, lo: 4 });
const r2Stairs = (here) => stairs('제2연구동', 'y', FLOORS.r2, here, 'left', DAY_1F);
const r3Stairs = (here) => stairs('제3연구동', 'z', FLOORS.r3, here, 'left', DAY_1F);
// 제2·3연구동 계단2: 복도 왼쪽 끝(1·2층은 동 구역의 왼쪽 벽). 1~6층 모두 닿는다
const r2Stairs2 = (here) => stairs('제2연구동 계단2', 'g', FLOORS.r2, here, 'right', DAY_1F);
const r3Stairs2 = (here) => stairs('제3연구동 계단2', 'h', FLOORS.r3, here, 'right', DAY_1F);

// 연구지원동 북서동: 계단 둘과 엘리베이터 모두 지하 1층(주차장)까지 간다. here: 1~3층, 지하 1층은 -1
const SUPA_BELOW = ['supA_b1'];
const supABelowOpen = (c) => c.quest.started('ch1'); // 지하주차장은 1장이 시작된 뒤부터 (작가 지침 2026-10-05)
const supAStairs = (n, anchor, here) => stairs(`연구지원동 북서동 계단${n}`, anchor, FLOORS.supA, here, 'right', { ...DAY_1F, below: SUPA_BELOW, belowOpen: supABelowOpen });
const supAElevator = (here) => elevator('연구지원동 북서동', 'e', FLOORS.supA, here, SUP_ELEVATOR, 'right', { below: SUPA_BELOW, belowOpen: supABelowOpen });

export const MAPS = {
  // ── 캠퍼스 야외 (허브) ──
  // 위가 교차로 쪽(북동), 아래가 송도국제대로343번길 쪽(남서). 지도를 건물 줄 방향으로 세워 그렸다.
  // 축척: 한 칸 ≈ 2m. 캠퍼스 블록 약 150m(가로, 북서–남동) × 250m(세로, 북동–남서) = 75 × 125칸 (작가 설명 2026-10-04)
  // 배치는 작가가 위성 사진 위에 그려 준 구조도를 따른다(2026-10-04): 북동 끝 본관(저층·고층, 앞에 회차로),
  // 가운데 제1·2·3연구동(남동 끝끼리 연결, 북서 끝 1층은 필로티라 차가 지나감), 북서쪽에 지상 주차장·극지지원동·하역장,
  // 남서쪽에 연구지원동 두 동·지하주차장 입구·풋살장·기숙사동. 주입구는 남동 변, 화물 입구는 북서 변.
  // 차량 동선: 주입구 → 회차로 → 본관과 제1연구동 사이 → 연구동 필로티를 지나 남서쪽 → 지하주차장 입구.
  // 건물 크기는 사진에서 어림한 값. 줄은 tools/mapview.html 편집기로 고쳐도 된다.
  campus: {
    name: '극지연구소 (야외)',
    litWindows: [[33, 96], [44, 46]], // 밤에 불 켜진 창: 연구지원동 북서동 북동쪽 끝(306호 쪽) · 제1연구동
    overhead: [[35, 102, 2, 2]], // 위층 덮개: 연구지원동 두 동 사이 2층 구름다리 (필로티 P는 저절로 덮인다)
    rows: [
      'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      'F:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::F',
      'F:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::F',
      'F;;;;;;;;;;;;;;;;;;;::;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::;F',
      'F;;;;;;;;;;;;;;;T;;;::;;;;;;;;;;;;;;:::::::::;;;;;;;;;;;;;BB;;;;T;;;;;:::;F',
      'F;T;;T;;;;;;;;;;;;;;::;;;;T;;;;;;;;;:::::::::;;;;;T;;;;;;;BB;;;;;;;;;;:::;F',
      'F;;;;;;;;;;;T;;;;;;;::;;;;;;;T;;;;T;:::::::::;;;;;;;;T;;;;;;;;;;;;;;;;:::;F',
      'F;;;;;;;;;;;;;;T;;;;::;;;;;;;;;;;;;;::::n::::;;;;;;;;;;;;;;;;;;;;;;;;;:::;F',
      'F;T;;;T;;;;;;;;;;;T;::::::::::::::::::::::::::;T;;;;;;;;;;T;;;T;;;;;T;:::;F',
      'F;;;;;;;;BB;;;;;;;;;::::::::::::::::::::::::::;;;;;;BB;;;;;;;;;;;;;;;;:::;F',
      'F;;;;;;;;BB;;T;;;;;;::;;;;;;;;;;;;;;::*:::*::;;;;;;;BB;;;;;;;;;;;;;;;;:m:;F',
      'F;;BB;;;;;;;;;;;;;;;::;;;;;;BB;;;;;;:::::::::;;;;;;;;;;;;;;;;;;;;BB;;;:::;F',
      'F;;BB;;;;;;;;;;;T;;;::;;;;;;BB;;T;;;:::::::::;;;T;;;;;;;T;;;;;T;;BB;;;:::;F',
      'F;;;;;;T;;;;;T;;;;;;::;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;T;;;;;;;;;;;;;;;;:::;F',
      'F;;;;;;;;;;;;;;;;;;;::;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::;F',
      'F;T;;;;;::::::::::::::::o::::::::::::::::::::::::::::::::::::::::::::::::;F',
      'F;;;;;;;:::::::::::::::::::::::::::::::::::::::::::::::s:::::::::::::::::;F',
      'F;;;;;;;;;;;;;;;;;;;;;;;;;;;*;;;*;;;;;;;;;;;;;HHHHHHHHHHHHHHHHHHH;;;;;:::;F',
      'F;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;HHHHHHHHHHHHHHHHHHH;;;;;:::;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHHHHHaHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH;T;;;:::;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;:::;F',
      'F;;;;;BB;;HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;:::;F',
      'F;;T;;BB;;HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;:::;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;:::;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH;;T;;:::;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;:::;F',
      'F;;;;;;T;;HHHHHHHHHHHHHHHHHHHHjHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH;HHHH:::;F',
      'F;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;HHHHHHHHHHHHHHHHHHH;HHHH:::;F',
      'F;;BB;;;;;;;:::::::::::::::::::::::::::::::::::::::::___________::HvHH::::F',
      'F;;BB;;;;;;;:::::::::::::::::::::::t:::::::::::::::::___________::::::::::F',
      'F;;;;;;;;;;;:::::::::::::::::::::::::::::::::::::::::___________::::::::::F',
      'F;;;;;;;;;;;;;____________________________________________________________g',
      'F;;;;;T;;;T;;;___________________________________________***______________g',
      'F;T;;;;;;;;;;;___________________________________________***______________g',
      'F;;;;;;;;;;;::::::___:::::::::::::____:::::::::::::::____***____::::::::::F',
      'F;;;;;;;;;;;::::::___:::::::::::::____:::::::::::::::___________::::::::::F',
      'F;;;;;;;;;;;::::::___:::::::::::::____:::::::::::::::___________::::::::::F',
      'F;;;;;;;BB;;;;;;;;___;;;;;;;::;;;;____;;;;;;;;;;;;;;;___________;;;;;;;;;;F',
      'F;;;;;;;BB;;||||||||||||||||::;;T;____;;;;;;;;;;;;;;;___________;;;;;;;;;;F',
      'F;;;;;;;;;;;||||||||||||||||::;;;;____;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;T;;T;F',
      'F;;T;;;;;;;;||||||||||||||||::PPPPPPPPHHkHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;;;||||||||||||||||::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;T;;||||||||||||||||::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;T;;;;;;;F',
      'F;;;;;;;;;;;||||||||||||||||::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;BB;F',
      'F;;;;;;;;;;;||||||||||||||||::PPPPPPPPbHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;BB;F',
      'F;;;;x;T;;;;||||||||||||||||::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;T;;;;;;;;;F',
      'F;;;;;;;;;;;________________::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;;;________________::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;T;;;;;;F',
      'F;;;;T;;;;T;||||||||||||||||::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;T;;;F',
      'F;;;;;;;;;;;||||||||||||||||::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;T;;;;;;;;;F',
      'F;;;;;;;;;;;||||||||||||||||::;;;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;;;;;;;;;F',
      'F;;;;;;;;;;;||||||||||||||||::;T;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;;;BB;;;;F',
      'F;;;;BB;;;;;||||||||||||||||u:;;;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;T;;BB;;;;F',
      'F;;;;BB;;;;;||||||||||||||||::;;;;____;;;;;;;;;;;T;;HHHHHHH;;BB;;;;;;;;;T;F',
      'F;;;;;;;;;;;||||||||||||||||::;;;;____;;T;;;;;T;;;;;HHHHHHH;;BB;;;;;;;;;;;F',
      'F;;;;;;;;;;;||||||||||||||||::;T;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;;;;;;;;;F',
      'F;;;;T;;T;;;||||||||||||||||::;;;;____;;;;;T;;;;;T;;HHHHHHH;;;;;;;T;;;;;;;F',
      'F;;;;;;;;;;;;;;;;;;;;;;;;;;;::;;;;____;T;;;;;;;;;;;;HHHHHHH;;;;T;;;;;;T;;;F',
      'F;;;;;;;;;;T;;;;T;;;T;;;;;T;::;;;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;;;;;;;;;F',
      'F;;;;;;;T;;;;;;;;;;;;;;;;;;;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;T;;;;;;;F',
      'F;;T;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPcHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;T;;T;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;T;;;T;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;T;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;T;;;HHHHHHHHHHHHHHHHH;::;;;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::;;;;____;;;;;;;;;;;;;;HHHHHHH;T;;;;;;;;;;;T;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::;;;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;;;;T;;;;F',
      'F;;T;;;;;;HHHHHHHHHHHHHHHHp;::;;;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;T;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::;;;;____;;T;;;;;T;;T;;HHHHHHH;;;;;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::;;T;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;;;;;;;;;F',
      'F;;;;;T;;;HHHHHHHHHHHHHHHHH;:w;;;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;;T;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::;;;;____;;;;;;;;;T;;;;HHHHHHH;;T;;;;;;;;T;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::;;;;____;;;;;;;;;;;;;;HHHHHHH;;;;;;;;;;;;;;;F',
      'F;;T;;;T;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;T;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;T;;;F',
      'F;;;;;T;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;BB;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPdHHHHHHHHHHHHHHHHHHHHHHHH;;BB;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;T;;T;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;BB;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;BB;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHHHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::PPPPPPPPHHHHHHHlHHHHHHHHHHHHHHHHH;;;;;;;;;;;F',
      'F;;;;;;;;;HHHHHHHHHHHHHHHHH;::;;;;____;;;;;;;;;;;;;;;;;;;;;;;;;;;;T;;;;;;;F',
      'F_____________________________________;;;BB;;;;;;BB;;;;;;;;;;;;;;;;;;;;;;;F',
      'i_____________________________________;;;BB;;;;;;BB;;;;;;;;;;;;;;;;;;;;;T;F',
      'F_____________________________________;;;;;;;T;;;;;;;;;;;;;;;;;;;;;;;;;;;;F',
      'F________________;;;;;HqHH;;;;;;;;;;;;;;;;;;;;;;;;;;;T;;;BB;;;;;;;;;;;;;;;F',
      'F________________;;T;;HHHH;;;T;;;;;;;;;;;;;;;;;;;;;;;;;;;BB;;;;;;T;;T;;;;;F',
      'F________________;;;;;;;;;;;;;;;;;;;;T;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHeHHHHHHHH;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHH;;;;;;;;;T;;;;;;T;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHH;BB;;BB;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHH;BB;;BB;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHH;;;;;;;;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHf;;;;;;;;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHH;T;;;;;;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHH;;;;;;;;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHH;;HHHHHHHhHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHHH;;HHHHHHHHHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;;;;;;;;;;;;;;;;;;;;HHHHHHHHHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHH;BB;;;;;;;T;;;;;;;;T;HHHHHHHHHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHr;BB;;T;;;;;;;;;;;;;;;HHHHHHHHHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;;;;;;;;;;;;T;;;;;;;HHHHHHHHHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;;;;;;;;;y;;;;;;;;;;HHHHHHHHHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;;;;;;;;;;;;;;;;;;;;HHHHHHHHHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;FFFFFFFF;FFFFFFFFF;HHHHHHHHHHHHHHHH;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;F;;;;;;;;;;;;;;;;F;;;;;;;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;F;;;;;;;;;;;;;;;;F;;;;;;;;T;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;F;;;;;;;;;;;;;;;;F;;;;;;;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;F;;;;;;;;;;;;;;;;F;;;;;T;;;;;;;;;;;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;F;;;;;;;;;;;;;;;;F;;;;;;;;;;;;;;;T;;;F',
      'F________________;;HHHHHHHHHHHHHHHH;;F;;;;;;;;;;;;;;;;F;;;;;;;;;;;T;;;;;;;F',
      'F;;;;;;;;;;;;;;;;;;HHHHHHHHHHHHHHHH;;F;;;;;;;;;;;;;;;;F;;T;;T;;;;;;;;;;;;;F',
      'F;;;;;;;;;;;;;;;;;;HHHHHHHHHHHHHHHH;;F;;;;;;;;;;;;;;;;F;;;;;;;;;;;;;;;;;;;F',
      'F;BB;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;F;;;;;;;;;;;;;;;;F;;;;;;;;;T;;;;;;;;;F',
      'F;BB;;;;;T;;;;;;;;;;;T;;;;;;;T;;;;;;;FFFFFFFFFFFFFFFFFF;;;;;;;;;;;;T;;;;T;F',
      'F;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;F',
      'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    ],
    onEnter: PROLOGUE.arrive,
    events: {
      g: {
        sprite: 'gate', solid: true, trigger: 'action',
        async run(c) {
          if (c.flag('day')) return c.say('(정문 — 지금은 나갈 때가 아니다. 대사 미정)');
          if (!c.curse.lifted()) return c.say('(정문 — 저주로 나갈 수 없다. 대사 미정)');
          await c.end(pickEnding()); // 엔딩 분기: endings.js의 ENDING_RULES
        },
      },
      v: { sprite: 'booth', solid: true, trigger: 'action', run: PROLOGUE.booth },  // 경비실
      a: entrance('glassDoor', 'main_1f', 'a', 'down'),       // 본관 북동문
      j: entrance('glassDoor', 'main_1f', 'j', 'up'),         // 본관 남서문
      k: entrance('glassDoor', 'research_1f', 'n', 'down'),  // 제1연구동 북동문
      b: entrance('glassDoor', 'research_1f', 'b', 'right'), // 제1연구동 북서문 (차도)
      c: entrance('glassDoor', 'research_1f', 'c', 'right'), // 제2연구동 북서문 (차도)
      d: entrance('glassDoor', 'research_1f', 'd', 'right'), // 제3연구동 북서문 (차도)
      l: entrance('glassDoor', 'research_1f', 'u', 'up'),    // 제3연구동 남서문
      p: dayLocked(entrance('door', 'polar_1f', 'o', 'right')),         // 극지지원동
      e: supADoor('o', 'down'),                                    // 연구지원동 북서동 — 북동쪽 출입문
      r: supADoor('r', 'left'),                                    // 연구지원동 북서동 — 남동쪽 출입문 (트인 공간 쪽)
      f: dayLocked(entrance('door', 'supB_1f', 'o', 'right')),          // 연구지원동 남동동
      h: dayLocked(entrance('door', 'dorm_1f', 'o', 'up')),             // 기숙사동
      x: creatureSpot('exampleBugOut'),                             // 소동물 예시 (바깥)
      q: dayLocked(entrance('gate', 'supA_b1', 's', 'left')),          // 지하주차장 입구 (연구지원동 북서동 지하 1층)
      i: look('gate', '(화물 입구 — 닫혀 있다. 문구 미정)'),            // 화물 입구 (하역장 쪽, 닫힘)
      m: crowd('gateWalker'),      // 낮의 사람 — 정문 쪽 보도
      n: crowd('plazaWalker'),     // 낮의 사람 — 북쪽 광장
      o: crowd('pathWalkerW'),     // 낮의 사람 — 본관 북쪽 보도(서)
      s: crowd('pathWalkerE'),     // 낮의 사람 — 본관 북쪽 보도(동)
      t: crowd('mainSouth'),       // 낮의 사람 — 본관 남쪽 보도
      u: crowd('researchPath'),    // 낮의 사람 — 연구동 앞 보도
      w: crowd('researchPathS'),   // 낮의 사람 — 연구동 앞 보도(남)
      y: crowd('supLawn'),         // 낮의 사람 — 연구지원동 앞 잔디
    },
  },

  // ── 본관 ──
  main_1f: {
    name: '본관 1층 로비',
    onEnter: PROLOGUE.meetStaff,
    rows: [
      '##########a#############',
      '#......................w',
      't...............d......#',
      '#...bbbbb..............h',
      '#...........r..........#',
      '#c==g..............e...#',
      '#......................#',
      '##########j#############',
    ],
    events: {
      w: stairs('본관', 'w', FLOORS.main, 1, 'left', DAY_1F),
      h: door('glassDoor', 'exhibit', 'h', 'up'),
      r: { ...npc(STAFF.name, STAFF.color, PROLOGUE.meetStaff), visible: (s) => s.flags.pro === 1 },
      a: entrance('glassDoor', 'campus', 'a', 'up'),   // 북동문
      j: entrance('glassDoor', 'campus', 'j', 'down'), // 남서문
      b: look('panel', '(전시 패널 — 조사 텍스트)'),
      g: look('note', '(출입 신고소 — 조사 텍스트)'),
      t: door('wcDoor', 'wc_main_1f', 'o'), // 화장실
      c: crowd('lobbyDesk'),       // 낮의 사람 — 출입 신고소 옆
      d: crowd('lobbyWalker'),     // 낮의 사람 — 로비
      e: crowd('lobbyTech'),       // 낮의 사람 — 로비
    },
  },

  exhibit: {
    name: '극지과학홍보관',
    onEnter: PROLOGUE.enterExhibit,
    rows: [
      '##############',
      '#............#',
      '#.u......aaa.#',
      '#............#',
      '#.dd....nn...#',
      '#..b......c..#',
      '#............#',
      '######h#######',
    ],
    events: {
      h: door('glassDoor', 'main_1f', 'h', 'left'),
      u: { sprite: 'bear', solid: true, trigger: 'action', run: PROLOGUE.bear },
      a: look('bow', '(아라온호 뱃머리 구조물 — 조사 텍스트)'),
      d: look('drill', '(빙하 시추기 모형 — 조사 텍스트)'),
      n: look('penguin', '(펭귄 모형 — 조사 텍스트)'),
      b: crowd('exhibitA'),        // 낮의 사람 — 시추기 모형 앞
      c: crowd('exhibitB'),        // 낮의 사람 — 홍보관
    },
  },

  // ── 연구동 1층: 제1·2·3연구동이 한 맵 (위에서부터 제1 → 제3) ──
  research_1f: {
    name: '연구동 1층',
    onEnter: CH1.enterResearch,
    rows: [
      '#####n####',
      '#........#',
      '#...e....x',
      'b........#',
      '#........k',
      'w..r.....#',
      '#........#',
      '####..####',
      '#........#',
      'g........#',
      '#....i...y',
      'c........#',
      '#........f',
      'v........q',
      '#........#',
      '####..####',
      '#........#',
      'h........#',
      '#.....j..z',
      'd........#',
      '#........m',
      't........#',
      '#####u####',
    ],
    events: {
      // 제1연구동
      x: r1Stairs(1),
      n: entrance('glassDoor', 'campus', 'k', 'up'),    // 북동문
      b: entrance('glassDoor', 'campus', 'b', 'left'),  // 북서문 (차도)
      k: dayLocked(door('labDoor', 'nightlab', 'i', 'down')),  // 낮에는 연구실에 볼일이 없다
      // 제2연구동
      y: r2Stairs(1),
      g: r2Stairs2(1),
      c: entrance('glassDoor', 'campus', 'c', 'left'),  // 북서문 (차도)
      f: dayLocked(door('freezerDoor', 'coldlab', 'f', 'down')),
      q: lockedRoom('전자현미경 분석실'),
      // 제3연구동
      z: r3Stairs(1),
      h: r3Stairs2(1),
      d: entrance('glassDoor', 'campus', 'd', 'left'),  // 북서문 (차도)
      u: entrance('glassDoor', 'campus', 'l', 'down'),  // 남서문
      m: lockedRoom('운석보관 클린룸'),
      r: creatureSpot('exampleBugIn'), // 소동물 예시 (안)
      w: door('wcDoor', 'wc_r1_1f', 'o'), // 제1연구동 화장실
      v: door('wcDoor', 'wc_r2_1f', 'o'), // 제2연구동 화장실
      t: door('wcDoor', 'wc_r3_1f', 'o'), // 제3연구동 화장실
      e: crowd('r1fWalker'),       // 낮의 사람 — 제1연구동 복도
      i: crowd('r1fTech'),         // 낮의 사람 — 제2연구동 복도
      j: crowd('r1fReader'),       // 낮의 사람 — 제3연구동 복도
    },
  },

  // ── 2층: 본관 + 제1·2·3연구동이 한 맵 (위에서부터 본관 → 제3) ──
  research_2f: {
    name: '본관·연구동 2층',
    onEnter: CH1.enterResearch,
    rows: [
      '##########',
      'b........#',
      '#........w',
      'W........#',
      '#...a....#',
      '#........#',
      '####..####',
      'c........#',
      '#........x',
      '#........#',
      'W........#',
      '#........p',
      '#........#',
      '#........#',
      '####..####',
      'd........#',
      '#........y',
      'g........#',
      'W........#',
      '#........q',
      '#........#',
      '#........#',
      '####..####',
      'e........#',
      '#........z',
      'W........#',
      'h........#',
      '#........r',
      '#........#',
      '##########',
    ],
    events: {
      w: stairs('본관', 'w', FLOORS.main, 2),
      x: r1Stairs(2),
      y: r2Stairs(2),
      g: r2Stairs2(2),
      z: r3Stairs(2),
      h: r3Stairs2(2),
      p: lockedRoom('제1연구동 2층 방'),
      q: lockedRoom('제2연구동 2층 방'),
      r: lockedRoom('제3연구동 2층 방'),
      a: creatureSpot('exampleFish', { sprite: 'tank', fixture: true }), // 소동물 예시 (수조)
      b: door('wcDoor', 'wc_main_2f', 'o'), // 본관 화장실
      c: door('wcDoor', 'wc_r1_2f', 'o'), // 제1연구동 화장실
      d: door('wcDoor', 'wc_r2_2f', 'o'), // 제2연구동 화장실
      e: door('wcDoor', 'wc_r3_2f', 'o'), // 제3연구동 화장실
    },
  },

  // 세이브 포인트 예시: 불 켜진 방 + 야근 중인 대학원생 (위치 임시: 제1연구동 1층)
  nightlab: {
    name: '(야근 중인 연구실 — 예시)',
    lit: true,
    rows: [
      '####i#######',
      '#..........#',
      '#.==...==..#',
      '#..s....a..#',
      '#..........#',
      '############',
    ],
    events: {
      i: door('labDoor', 'research_1f', 'k', 'left'),
      s: savePoint,
      a: npc(NPCS.gradA.name, NPCS.gradA.color, NPCS.gradA.run),
    },
  },

  // 위치 임시: 제2연구동 1층
  coldlab: {
    name: '냉동실험실',
    cold: { seconds: 30, exit: ['research_1f', 'f', 'left'] },
    tint: 'rgba(110, 170, 255, 0.10)',
    rows: [
      '####f#######',
      '#..........#',
      '#.RRRR.RRR.#',
      '#..........#',
      '#.RRRR.RRR.#',
      '#.........x#',
      '############',
    ],
    events: {
      f: door('freezerDoor', 'research_1f', 'f', 'left'),
      x: EXAMPLE_ITEM, // 예시 퀘스트 물건
    },
  },

  // ── 제1연구동 3~6층 (1장) — 긴 복도 양쪽으로 방이 늘어선 구조(작가 설명). 방 위치·개수는 임시 ──
  //  계단1(x, 오른쪽 끝 → 도착 'left')은 4↔5층이 무너져 있고, 4~6층은 계단2(y, 왼쪽 끝 → 도착 'right')로 오간다.
  r1_3f: {
    name: '제1연구동 3층',
    rows: [
      '####a####a####a####a####a#',
      '#........................x',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      x: r1Stairs(3),
      a: lockedRoom('제1연구동 3층 방'),
      t: door('wcDoor', 'wc_r1_3f', 'o'), // 화장실
    },
  },
  r1_4f: {
    name: '제1연구동 4층',
    rows: [
      '####a####a####a####a####a#',
      'y........................x',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      x: r1Stairs(4),
      y: r1Stairs2(4),
      a: lockedRoom('제1연구동 4층 방'),
      t: door('wcDoor', 'wc_r1_4f', 'o'), // 화장실
    },
  },
  r1_5f: {
    name: '제1연구동 5층',
    rows: [
      '####a####a####a####a####a#',
      'y........................x',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      x: r1Stairs(5),
      y: r1Stairs2(5),
      a: lockedRoom('제1연구동 5층 방'),
      t: door('wcDoor', 'wc_r1_5f', 'o'), // 화장실
    },
  },
  r1_6f: {
    name: '제1연구동 6층',
    rows: [
      '####a####o####a####a####a#',
      'y........................x',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      x: r1Stairs(6),
      y: r1Stairs2(6),
      o: door('labDoor', 'r1_optics', 'o', 'up'), // 광학현미경실
      a: lockedRoom('제1연구동 6층 방'),
      t: door('wcDoor', 'wc_r1_6f', 'o'), // 화장실
    },
  },
  // 광학현미경실 — 1장의 목적지. 안쪽 배치는 임시
  r1_optics: {
    name: '광학현미경실',
    onEnter: CH1.reachOptics,
    rows: [
      '##########',
      '#........#',
      '#.GG..GG.#',
      '#........#',
      '#.==..==.#',
      '#........#',
      '#####o####',
    ],
    events: {
      o: door('labDoor', 'r1_6f', 'o', 'down'),
    },
  },

  // ── 제2·3연구동 3~6층 — 제1연구동처럼 긴 복도 양쪽으로 방. 계단1은 오른쪽 끝(y·z), 계단2는 왼쪽 끝(g·h). 방 위치·개수는 임시 ──
  r2_3f: {
    name: '제2연구동 3층',
    rows: [
      '####a####a####a####a####a#',
      'g........................y',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      y: r2Stairs(3),
      g: r2Stairs2(3),
      a: lockedRoom('제2연구동 3층 방'),
      t: door('wcDoor', 'wc_r2_3f', 'o'), // 화장실
    },
  },
  r2_4f: {
    name: '제2연구동 4층',
    rows: [
      '####a####a####a####a####a#',
      'g........................y',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      y: r2Stairs(4),
      g: r2Stairs2(4),
      a: lockedRoom('제2연구동 4층 방'),
      t: door('wcDoor', 'wc_r2_4f', 'o'), // 화장실
    },
  },
  r2_5f: {
    name: '제2연구동 5층',
    rows: [
      '####a####a####a####a####a#',
      'g........................y',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      y: r2Stairs(5),
      g: r2Stairs2(5),
      a: lockedRoom('제2연구동 5층 방'),
      t: door('wcDoor', 'wc_r2_5f', 'o'), // 화장실
    },
  },
  r2_6f: {
    name: '제2연구동 6층',
    rows: [
      '####a####a####a####a####a#',
      'g........................y',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      y: r2Stairs(6),
      g: r2Stairs2(6),
      a: lockedRoom('제2연구동 6층 방'),
      t: door('wcDoor', 'wc_r2_6f', 'o'), // 화장실
    },
  },
  r3_3f: {
    name: '제3연구동 3층',
    rows: [
      '####a####a####a####a####a#',
      'h........................z',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      z: r3Stairs(3),
      h: r3Stairs2(3),
      a: lockedRoom('제3연구동 3층 방'),
      t: door('wcDoor', 'wc_r3_3f', 'o'), // 화장실
    },
  },
  r3_4f: {
    name: '제3연구동 4층',
    rows: [
      '####a####a####a####a####a#',
      'h........................z',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      z: r3Stairs(4),
      h: r3Stairs2(4),
      a: lockedRoom('제3연구동 4층 방'),
      t: door('wcDoor', 'wc_r3_4f', 'o'), // 화장실
    },
  },
  r3_5f: {
    name: '제3연구동 5층',
    rows: [
      '####a####a####a####a####a#',
      'h........................z',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      z: r3Stairs(5),
      h: r3Stairs2(5),
      a: lockedRoom('제3연구동 5층 방'),
      t: door('wcDoor', 'wc_r3_5f', 'o'), // 화장실
    },
  },
  r3_6f: {
    name: '제3연구동 6층',
    rows: [
      '####a####a####a####a####a#',
      'h........................z',
      '#........................#',
      '####a####a####a####a####t#',
    ],
    events: {
      z: r3Stairs(6),
      h: r3Stairs2(6),
      a: lockedRoom('제3연구동 6층 방'),
      t: door('wcDoor', 'wc_r3_6f', 'o'), // 화장실
    },
  },

  // ── 극지지원동 (밖으로만 드나듦) ──
  polar_1f: {
    name: '극지지원동 1층',
    rows: [
      '##############',
      '#............#',
      'o............s',
      '#............#',
      '#............#',
      '##############',
    ],
    events: {
      s: stairs('극지지원동', 's', FLOORS.polar, 1),
      o: entrance('door', 'campus', 'p', 'right'),
    },
  },

  // ── 연구지원동 북서동 (작가 구조도 2026-10-04) ──
  //  위 = 북동, 아래 = 남서, 왼쪽 = 북서, 오른쪽 = 남동. 가운데 복도(x4-6)를 따라 양옆에 방.
  //  모든 층 공통: 계단2(y) · 계단1(x) · 엘리베이터(e) · 화장실(w) 자리가 같다. 계단·엘리베이터는 왼쪽(북서) 벽 → 도착 'right'.
  //  화장실보다 남서쪽: 1층은 넓은 카페, 2층은 회의실, 3층은 없음(가장 좁다).
  //  남동쪽 가운데(V)는 3층까지 트인 공간 — 1층에서는 그 자리에 남동쪽 출입문이 있다.
  supA_1f: {
    name: '연구지원동 북서동 1층',
    onEnter: CH1.leaveRestroom,
    rows: [
      '#####o#####',
      '####...####',
      '###y...####',
      '####...####',
      '####...####',
      '####...####',
      '####.f.####',
      '####...####',
      '####...####',
      '####...####',
      '####......#',
      '####......#',
      '####......r',
      '###x......#',
      '####......#',
      '####...####',
      '###e...####',
      'W......####',
      'W......####',
      '##wh...####',
      '####...####',
      '####...####',
      '####...####',
      '#.......b.#',
      '#......=k=#',
      '#.........#',
      '#.==..==..#',
      '#......t..#',
      '#..c..g...#',
      '#.==..==..#',
      '#..d......#',
      '#.........#',
      '###########',
    ],
    events: {
      o: entrance('glassDoor', 'campus', 'e', 'up'),    // 북동쪽 출입문
      r: entrance('glassDoor', 'campus', 'r', 'right'), // 남동쪽 출입문 (트인 공간 쪽)
      y: supAStairs(2, 'y', 1),
      x: supAStairs(1, 'x', 1),
      e: supAElevator(1),
      w: { ...door('wcDoor', 'supA_wc', 'o', 'down'), run: (c) => (PROLOGUE.escorting(c) ? PROLOGUE.staffStop(c) : c.transfer('supA_wc', 'o', 'down')) }, // 카페에 앉기 전에는 직원이 막음
      h: { sprite: 'fireBox', solid: true, trigger: 'action', run: CH1.fireBox }, // 소방함 — 비상용 손전등
      k: { sprite: 'register', solid: true, trigger: 'action', run: PROLOGUE.cafeCounter },
      t: {
        ...npc(STAFF.name, STAFF.color, (c) => c.say('(자리에서 기다리는 중 — 대사 미정)', STAFF.name)),
        dir: 'up', visible: (s) => s.flags.pro === 4,
      },
      f: crowd('supCorridor'),     // 낮의 사람 — 복도
      b: crowd('barista'),         // 낮의 사람 — 카페 카운터 안쪽
      c: crowd('cafeChatA'),       // 낮의 사람 — 카페 탁자
      d: crowd('cafeChatB'),       // 낮의 사람 — 카페 탁자 맞은편
      g: crowd('cafeSolo'),        // 낮의 사람 — 카페 탁자
    },
  },
  supA_wc: {
    name: '화장실',
    onEnter: PROLOGUE.restroom,
    rows: [
      '####o#####',
      '#........#',
      '#.SS..SS.#',
      '#........#',
      '##########',
    ],
    events: {
      o: door('door', 'supA_1f', 'w', 'up'),
    },
  },
  // 2층: 창고·304·303 자리 = 회의실, 305·306 자리 = 강의실, 301·302 자리는 비어 있고 남동쪽 밖으로 구름다리
  supA_2f: {
    name: '연구지원동 북서동 2층',
    rows: [
      '###########',
      '####...####',
      '###y...####',
      '####...####',
      '####...####',
      '####...f###',
      '####...####',
      '####...####',
      '###g...####',
      '####...####',
      '####...VVV#',
      '####...VVV#',
      '####...VVV#',
      '###x...VVV#',
      '####...VVV#',
      '####......#',
      '###e......#',
      '#.........#',
      '#.........n',
      '##w#......#',
      '####......#',
      '####......#',
      '#####j#####',
    ],
    events: {
      y: supAStairs(2, 'y', 2),
      x: supAStairs(1, 'x', 2),
      e: supAElevator(2),
      g: door('labDoor', 'supA_mr1', 'o'), // 회의실
      f: lockedRoom('강의실'),
      j: door('labDoor', 'supA_mr2', 'o'), // 회의실 (남서쪽)
      w: door('wcDoor', 'wc_supA_2f', 'o'), // 화장실
      n: door('door', 'supAB_bridge', 'a', 'right'), // 구름다리 → 남동동
    },
  },
  // 3층: 306호(캠벨) = 북동쪽 끝 오른쪽 방
  supA_3f: {
    name: '연구지원동 북서동 3층',
    rows: [
      '###########',
      '####...f###',
      '###y...####',
      '####...####',
      '####...m###',
      '###g...####',
      '####...####',
      '###d...####',
      '####...n###',
      '####...####',
      '####...VVV#',
      '###h...VVV#',
      '####...VVV#',
      '###x...VVV#',
      '####...VVV#',
      '####...b###',
      '###e...####',
      '#......####',
      '#......####',
      '##w#...a###',
      '####...####',
      '####...####',
      '###########',
    ],
    events: {
      y: supAStairs(2, 'y', 3),
      x: supAStairs(1, 'x', 3),
      e: supAElevator(3),
      f: roomDoor('306호', 'supA_306', 'o', 'up'),
      m: roomDoor('305호 (화석연구실)', 'supA_305', 'o'), // 305호 앞문
      n: roomDoor('305호 (화석연구실)', 'supA_305', 'p'), // 305호 뒷문
      b: roomDoor('302호'),
      a: roomDoor('301호'),
      g: roomDoor('창고'),
      d: roomDoor('304호'),
      h: roomDoor('303호 (장비창고)'),
      w: door('wcDoor', 'wc_supA_3f', 'o'), // 화장실
    },
  },
  // 306호 — 5인 사무실. 지금 자리에 있는 사람은 캠벨뿐이다. 불 켜진 방.
  //  배치는 작가가 그려 준 구조도(2026-10-04)를 따른다. 출입문은 아래쪽 벽 왼쪽.
  //   왼쪽 줄: 캠벨(위) · 초이(아래, 비어 있음)
  //   오른쪽 줄: ???(위) · 렐(가운데, 세이브 자리 — 렐의 컴퓨터) · ???(아래)
  //  책상은 2×2 칸, 조사는 통로 쪽 칸에서.
  supA_306: {
    name: '연구지원동 306호',
    onEnter: CH1.enter306,
    lit: true,
    rows: [
      '#########',
      '#....p=.#',
      '#==a.==.#',
      '#==.....#',
      '#.......#',
      '#....s=.#',
      '#....l=.#',
      '#=c.....#',
      '#==.....#',
      '#....q=.#',
      '#....==.#',
      '#.......#',
      '#.......#',
      '##o######',
    ],
    events: {
      o: door('labDoor', 'supA_3f', 'f', 'left'),
      a: { ...npc(NPCS.campbell.name, NPCS.campbell.color, NPCS.campbell.run), dir: 'left', chatter: NPCS.campbell.chatter }, // 캠벨 — 자기 책상 앞
      s: savePoint,                                          // 렐의 자리 (세이브) — 수오에게 전화를 건 지인, 지금은 자리에 없다
      l: look('desk', '(렐의 자리 — 조사 텍스트)'),
      c: look('desk', '(초이의 자리 — 비어 있다. 조사 텍스트)'),
      p: look('desk', '(??? 의 자리 — 조사 텍스트)'),
      q: look('desk', '(??? 의 자리 — 조사 텍스트)'),
    },
  },

  supB_1f: {
    name: '연구지원동 남동동 1층',
    rows: [
      '############',
      '#..........#',
      'o..........s',
      '#..........#',
      '############',
    ],
    events: {
      s: stairs('연구지원동 남동동', 's', FLOORS.supB, 1),
      o: entrance('door', 'campus', 'f', 'right'),
    },
  },
  // 2층 구름다리: 북서동(왼쪽) ↔ 남동동(오른쪽). 양옆이 유리창. 길이는 임시(실제로는 두 동 사이 약 4m)
  supAB_bridge: {
    name: '구름다리 (연구지원동 2층)',
    rows: [
      '#WWWWWW#',
      'a......b',
      '#WWWWWW#',
    ],
    events: {
      a: door('door', 'supA_2f', 'n', 'left'), // 북서동
      b: door('door', 'supB_2f', 'n', 'right'), // 남동동
    },
  },
  supB_2f: {
    name: '연구지원동 남동동 2층',
    rows: [
      '############',
      '#..........#',
      '#..........s',
      'n..........#',
      '############',
    ],
    events: {
      s: stairs('연구지원동 남동동', 's', FLOORS.supB, 2),
      n: door('door', 'supAB_bridge', 'b', 'left'), // 구름다리 → 북서동
    },
  },
  // 남동동 3층: 작가도 가 본 적이 없는 곳이라 배치 미정. 계단만 있다.
  supB_3f: {
    name: '연구지원동 남동동 3층',
    rows: [
      '############',
      '#..........#',
      '#..........s',
      '#..........#',
      '############',
    ],
    events: {
      s: stairs('연구지원동 남동동', 's', FLOORS.supB, 3),
    },
  },

  // ── 기숙사동 (밖으로만 드나듦) ──
  dorm_1f: {
    name: '기숙사동 1층',
    rows: [
      '############',
      '#..........#',
      '#..........s',
      '#..........#',
      '#####o######',
    ],
    events: {
      s: stairs('기숙사동', 's', FLOORS.dorm, 1),
      o: entrance('door', 'campus', 'h', 'up'),
    },
  },

  // ── 화장실 (v0.20.0) — 모두 같은 꼴: 칸막이 셋, 세면대. 문은 아래쪽 벽 ──
  wc_main_1f: {
    name: '화장실 (본관 1층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'main_1f', 't'),
    },
  },
  wc_main_2f: {
    name: '화장실 (본관 2층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'research_2f', 'b'),
    },
  },
  wc_r1_1f: {
    name: '화장실 (제1연구동 1층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'research_1f', 'w'),
    },
  },
  wc_r2_1f: {
    name: '화장실 (제2연구동 1층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'research_1f', 'v'),
    },
  },
  wc_r3_1f: {
    name: '화장실 (제3연구동 1층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'research_1f', 't'),
    },
  },
  wc_r1_2f: {
    name: '화장실 (제1연구동 2층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'research_2f', 'c'),
    },
  },
  wc_r2_2f: {
    name: '화장실 (제2연구동 2층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'research_2f', 'd'),
    },
  },
  wc_r3_2f: {
    name: '화장실 (제3연구동 2층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'research_2f', 'e'),
    },
  },
  wc_r1_3f: {
    name: '화장실 (제1연구동 3층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r1_3f', 't'),
    },
  },
  wc_r1_4f: {
    name: '화장실 (제1연구동 4층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r1_4f', 't'),
    },
  },
  wc_r1_5f: {
    name: '화장실 (제1연구동 5층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r1_5f', 't'),
    },
  },
  wc_r1_6f: {
    name: '화장실 (제1연구동 6층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r1_6f', 't'),
    },
  },
  wc_r2_3f: {
    name: '화장실 (제2연구동 3층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r2_3f', 't'),
    },
  },
  wc_r2_4f: {
    name: '화장실 (제2연구동 4층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r2_4f', 't'),
    },
  },
  wc_r2_5f: {
    name: '화장실 (제2연구동 5층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r2_5f', 't'),
    },
  },
  wc_r2_6f: {
    name: '화장실 (제2연구동 6층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r2_6f', 't'),
    },
  },
  wc_r3_3f: {
    name: '화장실 (제3연구동 3층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r3_3f', 't'),
    },
  },
  wc_r3_4f: {
    name: '화장실 (제3연구동 4층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r3_4f', 't'),
    },
  },
  wc_r3_5f: {
    name: '화장실 (제3연구동 5층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r3_5f', 't'),
    },
  },
  wc_r3_6f: {
    name: '화장실 (제3연구동 6층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'r3_6f', 't'),
    },
  },
  wc_supA_2f: {
    name: '화장실 (연구지원동 북서동 2층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'supA_2f', 'w'),
    },
  },
  wc_supA_3f: {
    name: '화장실 (연구지원동 북서동 3층)',
    rows: [
      '##########',
      '#.#.#.#..#',
      '#........#',
      '#SS......#',
      '####o#####',
    ],
    events: {
      o: door('wcDoor', 'supA_3f', 'w'),
    },
  },

  // ── 연구지원동 북서동 2층 회의실 둘 (v0.20.0) — 안쪽 배치는 임시 ──
  // 회의실: 창고·304·303 자리(복도 왼쪽, 북서). 문은 오른쪽 벽, 창은 왼쪽(바깥) 벽
  supA_mr1: {
    name: '회의실',
    rows: [
      '###b#######',
      'W.........#',
      'W.=======.#',
      'W.===t===.o',
      'W.........#',
      '###########',
    ],
    events: {
      o: door('labDoor', 'supA_2f', 'g'),
      t: { sprite: 'item', solid: true, trigger: 'action', visible: (s) => !s.items.includes('translator'), run: CH1.findTranslator }, // 번역기 (사이드 퀘스트)
      b: look('panel', '(화이트보드 — 조사 텍스트)'),
    },
  },
  // 회의실 (남서쪽): 2층 남서쪽 끝. 문은 위쪽 벽, 창은 아래(바깥) 벽
  supA_mr2: {
    name: '회의실 (남서쪽)',
    rows: [
      '#####o#####',
      '#.........#',
      '#.=======.b',
      '#.=======.#',
      '#.........#',
      '##WWW#WWW##',
    ],
    events: {
      o: door('labDoor', 'supA_2f', 'j'),
      b: look('panel', '(화이트보드 — 조사 텍스트)'),
    },
  },

  // ── 305호 화석연구실 (v0.20.0) — 3층 복도 오른쪽, 문 둘(앞문 m ↔ o, 뒷문 n ↔ p). 안쪽 배치는 임시 ──
  supA_305: {
    name: '305호 화석연구실',
    rows: [
      '#########',
      '#RRRRkRR#',
      'o.......#',
      '#.==.==.#',
      '#.......#',
      '#.==.==.#',
      'p.......#',
      '#GG..RRR#',
      '#########',
    ],
    events: {
      o: door('labDoor', 'supA_3f', 'm'),
      p: door('labDoor', 'supA_3f', 'n'),
      k: look('note', '(화석 표본 — 조사 텍스트)'),
    },
  },

  // ── 연구지원동 북서동 지하 1층 주차장 (v0.20.0) — 계단 둘·엘리베이터가 왼쪽 벽. 배치는 임시 ──
  //  바닥은 콘크리트(,), 주차 칸(|), 기둥(#). 오른쪽 벽의 차량 출입구(s)는 캠퍼스의 지하주차장 입구(q)로 이어진다
  supA_b1: {
    name: '연구지원동 북서동 지하 1층 주차장',
    onEnter: SHARK.enterParking, // 상어귀신이 나타나 쫓아온다 (shark.js)
    rows: [
      '######################',
      '#,,,,,,,,,,,,,,,,,,,,#',
      'y,,,,,,,,,,,,,,,,,,,,#',
      '#,,||||||,,,,||||||,,#',
      '#,,||||||,,,,||||||,,#',
      '#,,,,,,,,,,,,,,,,,,,,#',
      '#,,#,,,,,,#,,,,,,,#,,#',
      '#,,,,,,,,,,,,,,,,,,,,#',
      '#,,||||||,,,,||||||,,#',
      '#,,||||||,,,,||||||,,#',
      '#,,,,,,,,,,,,,,,,,,,,#',
      'x,,,,,,,,,,,,,,,,,,,,#',
      '#,,#,,,,,,#,,,,,,,#,,#',
      'e,,,,,,,,,,,,,,,,,,,,#',
      '#,,||||||,,,,||||||,,#',
      '#,,||||||,,,,||||||,,#',
      '#,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,,,,,,,,,,,,,,,,s',
      '#,,,,,,,,,,,,,,,,,,,,#',
      '######################',
    ],
    events: {
      y: supAStairs(2, 'y', -1),
      x: supAStairs(1, 'x', -1),
      e: supAElevator(-1),
      s: dayLocked(entrance('gate', 'campus', 'q', 'up')), // 차량 출입구 ↔ 캠퍼스 지하주차장 입구
    },
  },
};

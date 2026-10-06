// 길 안내 — 진행 중인 퀘스트의 지금 단계가 가리키는 곳(quests.js goals)으로 가는 다음 지점을 찾는다.
// 오프닝(낮)에는 prologue.js의 PROLOGUE_GOALS, 그 뒤로는 진행 중인 메인 퀘스트(최근 것) → 사이드 퀘스트(최근 것).
// 화살표는 render.js drawGuideArrow.
//
// 목표가 다른 맵이면: 맵 사이를 잇는 문(to)·계단·엘리베이터(floors)로 길을 찾아, 지금 맵에서 그 길로 나가는
// 가장 가까운 문·계단을 가리킨다. 지금은 지나갈 수 없는 것(잠긴 엘리베이터, 무너진 계단, 방문증 없는 출입구,
// 도움을 받기 전의 도움 문, 보이지 않는 이벤트)은 길로 치지 않는다.

import { MAPS } from './data/maps.js?v=0.32.0';
import { QUESTS } from './data/quests.js?v=0.32.0';
import { PROLOGUE_GOALS } from './data/prologue.js?v=0.32.0';
import { state, hasItem, helpTags } from './state.js?v=0.32.0';

// 길 안내 목표 (없으면 null). 오프닝(낮, flags.pro 0~4) 동안은 PROLOGUE_GOALS, 그 뒤로는 퀘스트
export function guideGoal() {
  const pro = state.flags.pro;
  if (typeof pro === 'number' && PROLOGUE_GOALS[pro]) return PROLOGUE_GOALS[pro];
  const isMain = (id) => QUESTS[id].type === 'main';
  const active = Object.entries(state.quests).filter(([id, q]) => !q.done && QUESTS[id])
    .sort((a, b) => isMain(b[0]) - isMain(a[0]) || b[1].order - a[1].order);
  for (const [id, q] of active) {
    const goal = QUESTS[id].goals?.[q.stage];
    if (goal) return goal;
  }
  return null;
}

// 한 맵에서 다른 맵으로 나가는 곳: [{ key: 이벤트 글자, to: 맵 id }]
function exits(mapId, viaCut) {
  const out = [];
  for (const [key, ev] of Object.entries(MAPS[mapId]?.events ?? {})) {
    if (ev.visible && !ev.visible(state)) continue;
    if (ev.passable && !ev.passable(state)) continue; // 낮에 잠긴 건물 등
    if (ev.to?.map) {
      if (ev.entrance && !hasItem('visitorPass')) continue;
      if (ev.helpTag && !helpTags('open').includes(ev.helpTag)) continue;
      out.push({ key, to: ev.to.map });
    }
    if (ev.floors) {
      if (ev.lockFlag && !state.flags[ev.lockFlag]) continue;
      const floors = [...(ev.below ?? []).map((m, i) => [-(i + 1), m]), ...ev.floors.map((m, i) => [i + 1, m])];
      for (const [n, m] of floors) {
        if (!m || m === mapId || (n > 0 && n < (ev.lo ?? 1))) continue;
        if (ev.cut && !viaCut && (ev.here <= ev.cut) !== (n <= ev.cut)) continue; // 무너진 사이는 건너지 못한다
        out.push({ key, to: m });
      }
    }
  }
  return out;
}

// 지금 맵에서 목표 맵으로 가는 가장 짧은 길의 첫 출구들(이벤트 글자). 갈 수 없으면 빈 목록
function firstExits(from, goalMap, viaCut) {
  const into = new Map(); // 맵 → 그 맵으로 들어오는 맵들
  for (const id of Object.keys(MAPS)) {
    for (const e of exits(id, viaCut)) {
      if (!into.has(e.to)) into.set(e.to, new Set());
      into.get(e.to).add(id);
    }
  }
  const dist = new Map([[goalMap, 0]]), queue = [goalMap];
  while (queue.length) {
    const m = queue.shift();
    for (const p of into.get(m) ?? []) if (!dist.has(p)) { dist.set(p, dist.get(m) + 1); queue.push(p); }
  }
  if (!dist.has(from)) return [];
  return exits(from, viaCut).filter((e) => dist.get(e.to) === dist.get(from) - 1).map((e) => e.key);
}

// 화살표가 가리킬 칸 { x, y } (지금 맵 안) — 없으면 null
export function guideTarget(world, player) {
  const goal = guideGoal();
  if (!goal) return null;
  const nearest = (evs) => evs.sort((a, b) => Math.abs(a.x - player.x) + Math.abs(a.y - player.y) - Math.abs(b.x - player.x) - Math.abs(b.y - player.y))[0] ?? null;
  if (goal.map === world.id) {
    if (goal.event) return nearest(world.visibleEvents().filter((ev) => ev.id === goal.event));
    if (goal.x != null) return { x: goal.x, y: goal.y };
    return null; // 맵에 들어온 것으로 끝나는 목표
  }
  const keys = firstExits(world.id, goal.map, goal.viaCut);
  const outs = world.visibleEvents().filter((ev) => keys.includes(ev.id));
  // 무너진 것을 보러 가는 단계: 길이 같으면 무너진 계단 쪽으로
  const cutStairs = goal.viaCut ? outs.filter((ev) => ev.cut) : [];
  return nearest(cutStairs.length ? cutStairs : outs);
}

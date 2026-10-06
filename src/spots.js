// ─────────────────────────────────────────────
// 무작위 채집 자리 — 맵에 들어올 때마다 자리를 새로 정한다 (작가 지침 2026-10-06: 같은 장소, 단 무작위로 바뀜)
//  맵 정의에 creatureSpots: { where: 'outside', ground: 8, tree: 6, flying: 4, wall: 3 }처럼 적으면
//  그 수만큼 알맞은 칸을 골라 이벤트를 만든다. 밤(본편)에만 보이고, 한 번 조사하면 사라진다.
//  어떤 종이 있는지는 자리가 생길 때 희귀도 가중치로 뽑아 둔다(pick — 울음소리 힌트가 쓴다).
//  조사할 때 그 종이 이미 도감에 있으면 다시 뽑는다(events.js c.creature.trySpot).
//
//  ground  잔디(;) 칸 — 꼼지락거리는 것 (critter)
//  tree    나무(T·B) 칸 — 강조된 나무 (treeGlow, 어둠 위에도 은은히 보인다)
//  flying  보도(:)·잔디(;) 칸 — 작게 빛나며 떠도는 것 (firefly, wander로 움직인다. 가까이 가면 멈춘다)
//  wall    건물 외벽(H) 칸 — 아무 표시 없음. 벽에 붙어서 조사해야 나온다
//  rubble  보도·차도 칸 — 잔해 더미 / puddle 보도·차도·잔디 칸 — 물웅덩이 (시료: 시료병에 떠서 현미경으로. 맵에 칠한 잔해 X 칸도 같다)
//  observe: true면 관찰 동물(새·너구리·고양이)도 — 아래 spawnAnimals
// ─────────────────────────────────────────────

import { state } from './state.js?v=0.37.0';
import { CREATURES, rollCreature, rarityOf } from './data/creatures.js?v=0.37.0';
import { lovebugOutbreak } from './data/lovebug.js?v=0.37.0';

const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const OUTBREAK_KINDS = ['ground', 'tree', 'flying']; // 러브버그 대발생 때 러브버그만 나오는 자리

const KINDS = {
  ground: { tiles: ';', sprite: 'critter', open: true },
  tree: { tiles: 'TB', sprite: null, overDark: 'treeGlow', reach: true },
  flying: { tiles: ':;', sprite: null, overDark: 'firefly', open: true, wander: { radius: 3, pause: [0.5, 1.5], speed: 1.6 } },
  wall: { tiles: 'H', sprite: null, reach: true },
  // 시료 자리 — 잔해 더미·물웅덩이. 사라지지 않고 남는다. 처음 조사할 때 확률로 「의심스럽다」(events.js trySample)
  rubble: { tiles: ':_', sprite: 'rubblePile', open: true, sample: true },
  puddle: { tiles: ':_;', sprite: 'puddle', open: true, sample: true, solid: false },
};

// 칸 고르기: 타일이 맞고, 다른 이벤트가 없고, open이면 지나갈 수 있는 칸, reach면 옆에 설 수 있는 칸이 있어야 한다
//  자리는 밤에만 나오므로 밤 칸(잔해 X 등이 칠해진 칸)으로 본다
function candidates(world, kind, taken, floorTiles) {
  const k = KINDS[kind], out = [];
  const tile = (x, y) => world.nightTiles[y]?.[x] ?? '#';
  const free = (x, y) => floorTiles.has(tile(x, y)) && !world.events.some((e) => e.solid && e.x === x && e.y === y);
  for (let y = 0; y < world.h; y++) {
    for (let x = 0; x < world.w; x++) {
      if (!k.tiles.includes(tile(x, y)) || taken.has(`${x},${y}`)) continue;
      if (world.events.some((e) => e.x === x && e.y === y)) continue;
      if (k.open && !free(x, y)) continue;
      if (k.reach && !ORTHO.some(([dx, dy]) => free(x + dx, y + dy))) continue;
      out.push({ x, y });
    }
  }
  return out;
}

export function spawnSpots(world, floorTiles) {
  const cfg = world.def.creatureSpots;
  if (!cfg) return [];
  const taken = new Set(), spots = [];
  const where = cfg.where ?? 'outside';
  // 러브버그 대발생(data/lovebug.js): 땅·나무·나는 빛 자리가 모두 러브버그, 날아다니는 것은 세 배
  const outbreak = where === 'outside' && lovebugOutbreak(state);
  world.outbreak = outbreak;
  for (const kind of Object.keys(KINDS)) {
    const pool = candidates(world, kind, taken, floorTiles);
    const k = KINDS[kind];
    const swarm = outbreak && OUTBREAK_KINDS.includes(kind);
    const count = (cfg[kind] ?? 0) * (swarm && kind === 'flying' ? 3 : 1);
    for (let i = 0; i < count && pool.length; i++) {
      const { x, y } = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      taken.add(`${x},${y}`);
      const ev = {
        id: `spot_${kind}_${i}`, x, y, spot: kind, where, outbreak: swarm,
        // 미리 뽑아 둔 종 — 울음소리 힌트(main.js)가 본다. 대발생 중이면 러브버그
        pick: swarm ? 'lovebug' : rollCreature(kind, where, (id) => !!state.creatures[id]),
        sprite: swarm && kind === 'flying' ? 'lovebug' : k.sprite, overDark: swarm && kind === 'flying' ? null : k.overDark,
        wander: k.wander, solid: k.solid ?? true, trigger: 'action',
        done: false,
      };
      ev.visible = (s) => !s.flags.day && !ev.done;
      ev.run = k.sample ? (c) => c.creature.trySample(ev, kind) : (c) => c.creature.trySpot(ev);
      spots.push(ev);
    }
  }
  if (cfg.observe) spots.push(...spawnAnimals(world, where, taken, floorTiles));
  return spots;
}

// ── 관찰 동물 (spots 'observe' — 새·너구리·고양이) ──
//  맵에 들어올 때마다 종마다 희귀도의 appear 확률로 한 마리씩 나온다(고양이는 특별 — 늘 한 마리).
//  돌아다니다 가끔 멈추고(main.js updateAnimals), 멈췄을 때 조사하면 카메라로 기록한다(events.js tryObserve).
//  사진을 찍은 뒤에도 그대로 돌아다닌다. 움직임은 종류마다 다르다:
//   speed 칸/초 · steps 한 번에 걷는 칸 · legs 쉬기 전에 방향을 바꿔 걷는 횟수 · rest 멈춰 있는 초 · radius 처음 자리에서 벗어나는 칸
//   새는 종종 날아서(fly) 몇 칸을 빠르게 옮긴다
export const ANIMAL_MOVES = {
  bird: { tiles: ';:', speed: 3.2, steps: [1, 1], legs: [2, 5], rest: [2, 5], radius: 5, fly: { chance: 0.3, speed: 6.5, steps: [3, 5] } },
  raccoonDog: { tiles: ';:_', speed: 1.7, steps: [2, 4], legs: [2, 4], rest: [3, 6], radius: 10 },
  cat: { tiles: ';:_', speed: 1.1, steps: [1, 3], legs: [1, 3], rest: [4, 9], radius: 7 },
};
export const animalKind = (id) => (CREATURES[id].icon === 'bird' ? 'bird' : id === 'cat' ? 'cat' : 'raccoonDog');

function spawnAnimals(world, where, taken, floorTiles) {
  const out = [];
  const ids = Object.keys(CREATURES).filter((id) => (CREATURES[id].spots ?? []).includes('observe')
    && (CREATURES[id].where === 'any' || CREATURES[id].where === where));
  for (const id of ids) {
    if (Math.random() >= (rarityOf(id).appear ?? 0.5)) continue;
    const kind = animalKind(id), m = ANIMAL_MOVES[kind];
    const pool = candidates(world, 'ground', taken, floorTiles).filter(({ x, y }) => m.tiles.includes(world.nightTiles[y][x]));
    if (!pool.length) continue;
    const { x, y } = pool[Math.floor(Math.random() * pool.length)];
    taken.add(`${x},${y}`);
    const ev = {
      id: `animal_${id}`, x, y, spot: 'observe', where, pick: id, animal: kind, moves: m,
      sprite: 'animal', overDark: kind === 'bird' ? null : 'eyeshine', solid: true, trigger: 'action',
      face: Math.random() < 0.5 ? 'left' : 'right',
    };
    ev.visible = (s) => !s.flags.day;
    ev.run = (c) => c.creature.tryObserve(ev);
    out.push(ev);
  }
  return out;
}

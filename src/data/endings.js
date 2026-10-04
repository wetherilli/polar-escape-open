// 엔딩 정의와 분기 — 내용과 조건은 작가가 정한다 (지금은 전부 자리표시)
//
//  ENDINGS        엔딩 화면 { title, lines }. 이벤트에서 c.end('id')로 바로 부를 수도 있다.
//  ENDING_RULES   정문으로 나갈 때 위에서부터 차례로 보고, when(s)가 처음 참인 엔딩으로 간다.
//                 마지막 줄은 늘 참이어야 한다(기본 엔딩).
//  s(state)로 볼 수 있는 것: s.flags, s.items, s.quests, s.creatures(도감), s.affinity(호감도)
//  편하게 쓰라고 아래 도우미를 둔다: creatureRate(s) 0~1, deliveredCount(s), questsDone(s), affinity(s, 'campbell')
import { state } from '../state.js?v=0.21.0';
import { CREATURES } from './creatures.js?v=0.21.0';

export const creatureRate = (s) => Object.keys(s.creatures).length / Math.max(1, Object.keys(CREATURES).length);
export const deliveredCount = (s) => Object.values(s.creatures).filter((v) => v === 'delivered').length;
export const questsDone = (s) => Object.values(s.quests).filter((q) => q.done).length;
export const affinity = (s, npc) => s.affinity[npc] ?? 0;

export const ENDINGS = {
  // (자리표시) 예: 소동물을 전부 찾고 Campbell에게 다 건넸을 때
  best: {
    title: '(엔딩 A — 미정)',
    lines: ['(엔딩 텍스트 — 작가 작성)'],
  },
  // 기본 엔딩: 저주를 풀고 정문으로 나감
  normal: {
    title: '(엔딩 B — 미정)',
    lines: ['(엔딩 텍스트 — 작가 작성)'],
  },
};

export const ENDING_RULES = [
  { id: 'best', when: (s) => creatureRate(s) >= 1 && deliveredCount(s) === Object.keys(CREATURES).length }, // (자리표시 조건)
  { id: 'normal', when: () => true },
];

export const pickEnding = (s = state) => ENDING_RULES.find((r) => r.when(s)).id;

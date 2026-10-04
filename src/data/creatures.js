// ─────────────────────────────────────────────
// 소동물 도감 — 주요 수집 요소. 내용은 작가 작성
//  연구소 안과 밖에서 잡는다(작은 벌레부터 사육 중인 작은 물고기까지).
//  잡으면 도감에 등록되고 채집통에 들어간다 → Campbell에게 가져가면 호감도가 오른다.
//
//  name      도감·알림 이름
//  desc      도감 설명 (잡은 뒤에 보인다)
//  flavor    플레이버 텍스트 (잡은 뒤에 설명 아래 다른 색으로)
//  where     'inside' | 'outside' — 도감에 「연구소 안 / 밖」으로 표시
//  hint      못 찾았을 때 도감 ??? 칸에 보이는 힌트
//  tools     잡는 데 필요한 도구(items.js의 id) 목록 — 이 중 하나만 있으면 된다.
//            소모품(채집통 등)이면 잡을 때 하나 쓴다. 비워 두면 맨손으로 잡는다.
//  affinity  Campbell에게 건넸을 때 오르는 호감도
//  reaction  { en, ko } — 건넸을 때 Campbell의 반응 (ko는 번역기 자막)
//  icon      도감·소지품의 코드 아이콘 이름 (render.js ICONS: grasshopper · beetle · fish …)
//  iconImage 사람이 그린 아이콘 그림 경로 (예: 'assets/icons/이름.png'). 주면 icon 대신 이것을 쓴다
//
// 맵에는 maps.js의 creatureSpot('id')로 둔다.
// ─────────────────────────────────────────────

export const CREATURES = {
  // 예시 셋 — 실제 소동물을 정하면 바꾼다
  exampleBugOut: {
    name: '(소동물 예시 1 — 바깥 벌레)',
    desc: '(설명 — 작가 작성)',
    flavor: '(플레이버 텍스트 — 작가 작성)',
    where: 'outside',
    hint: '(힌트 — 예: 잔디밭 어딘가)',
    tools: ['net'],
    icon: 'grasshopper',
    affinity: 1,
    reaction: { en: '(Campbell reacts — English TBD)', ko: '(자막 미정)' },
  },
  exampleBugIn: {
    name: '(소동물 예시 2 — 안쪽 벌레)',
    desc: '(설명 — 작가 작성)',
    flavor: '(플레이버 텍스트 — 작가 작성)',
    where: 'inside',
    hint: '(힌트 — 예: 연구동 1층 어딘가)',
    icon: 'beetle',
    tools: ['jar'],
    affinity: 1,
    reaction: { en: '(Campbell reacts — English TBD)', ko: '(자막 미정)' },
  },
  exampleFish: {
    name: '(소동물 예시 3 — 사육 중인 물고기)',
    desc: '(설명 — 작가 작성)',
    flavor: '(플레이버 텍스트 — 작가 작성)',
    where: 'inside',
    hint: '(힌트 — 예: 2층 수조)',
    icon: 'fish',
    tools: ['jar'],
    affinity: 2,
    reaction: { en: '(Campbell reacts — English TBD)', ko: '(자막 미정)' },
  },
};

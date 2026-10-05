// ─────────────────────────────────────────────
// 캐릭터 겉모습 — 맵 위 그림(16×16 픽셀)의 머리 모양·옷·색. 이름(이름표)으로 찾는다.
// 여기 없는 NPC는 기본 모습에 맵에서 준 옷 색(npc 헬퍼의 color)만 바뀐다.
// 바꿔 보려면 tools/looks.html(의상실)에서 골라 보고 나온 줄을 여기에 붙이면 된다.
//
//  hair       'short' 짧은 머리 · 'buzz' 아주 짧은 머리 · 'curly' 곱슬 · 'bob' 단발 · 'long' 긴 머리
//             · 'ponytail' 묶은 머리 · 'cap' 모자(머리는 모자 밑)
//  hairColor  머리 색          skin  피부 색
//  top        'jacket' 재킷 · 'tshirt' 반팔 티 · 'hoodie' 후드티 · 'sweater' 스웨터 · 'labcoat' 실험 가운
//             · 'suit' 정장 · 'uniform' 제복
//  topColor   윗옷 색 (가운이면 안에 입은 옷 색)
//  bottom     'pants' 긴 바지 · 'shorts' 반바지          bottomColor  바지 색
//  shoes      'shoes' 구두 · 'sneakers' 운동화 · 'slippers' 슬리퍼          shoeColor  신발 색(빼면 종류마다 기본색)
//  glasses    true면 안경          capColor  모자 색(hair: 'cap'일 때)
//
// 대학원생은 밤에 반바지·슬리퍼 차림이 많다(작가 설명 2026-10-05).
// ─────────────────────────────────────────────

export const DEFAULT_LOOK = {
  hair: 'short', hairColor: '#2a2420', skin: '#f1c9a0',
  top: 'jacket', topColor: '#7a8a9a', bottom: 'pants', bottomColor: '#2b2f3a', shoes: 'shoes', glasses: false,
};

export const LOOKS = {
  '수오': { hairColor: '#171412', skin: '#977049', top: 'hoodie', topColor: '#01060e', bottom: 'shorts', bottomColor: '#040506', shoes: 'sneakers' },
  'Campbell': { hair: 'ponytail', hairColor: '#d28732', skin: '#f3d6bd', top: 'tshirt', topColor: '#8f5c32', bottomColor: '#eef2f6', shoes: 'slippers' },
  '홍보실 직원': { hair: 'bob', hairColor: '#3a2a22', top: 'suit', topColor: '#dad7d8', bottomColor: '#3a3340' },
  '(경비원)': { hair: 'cap', capColor: '#2e3a4f', top: 'uniform', topColor: '#3b4b63', bottom: 'pants', bottomColor: '#2b3445', shoes: 'shoes' },
  '(대학원생 A)': { hair: 'ponytail', hairColor: '#1f1a17', top: 'labcoat', topColor: '#5b8bd9', bottom: 'shorts', bottomColor: '#3d4452', shoes: 'slippers' },
  '(유상)': { hairColor: '#0e0c0b', skin: '#caa681', top: 'tshirt', topColor: '#000000', bottomColor: '#04060b' },
  '(석초이)': { hairColor: '#141110', skin: '#c4a687', top: 'tshirt', topColor: '#f7f7f7', bottom: 'shorts', bottomColor: '#b7a89e', shoes: 'slippers', shoeColor: '#cad3dd' },
};

// 이름 → 겉모습. color = 맵에서 준 옷 색(LOOKS에 없을 때 쓴다), extra = 이벤트의 look 필드(장면마다 덧입히기)
export function lookFor(name, color = null, extra = null) {
  return { ...DEFAULT_LOOK, ...(color ? { topColor: color } : {}), ...(LOOKS[name] ?? {}), ...(extra ?? {}) };
}

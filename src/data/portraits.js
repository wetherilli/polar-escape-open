// ─────────────────────────────────────────────
// 대화 초상화 — c.say(글, 화자)의 화자 이름으로 찾아 대화창 왼쪽에 얼굴을 띄운다.
// 여기 없는 화자(이름 없는 혼잣말·안내 문구 포함)는 초상화 없이 이름표만 나온다.
//
//  body   옷 색   · hair 머리 색 — 지금은 코드로 그린 임시 얼굴(맵 위 그림과 같은 색)
//  image  그림 파일 경로(예: 'assets/portraits/suo.png'). 적으면 임시 얼굴 대신 이것을 그린다(96×96으로 맞춤)
//
// 한 장면에서만 초상화를 끄려면 c.say(글, 화자, { face: false }).
// ─────────────────────────────────────────────

import { NPCS } from './npcs.js?v=0.23.0';
import { STAFF } from './prologue.js?v=0.23.0';

const HAIR = '#2a2420';

export const PORTRAITS = {
  '수오': { body: '#2f4a7a', hair: HAIR }, // 남색 교복 재킷
  '(경비원)': { body: '#3b4b63', hair: HAIR },
};

// 맵에 서 있는 NPC는 이름과 옷 색을 그대로 가져온다(위에 따로 적은 것이 먼저)
for (const n of [...Object.values(NPCS), STAFF]) PORTRAITS[n.name] ??= { body: n.color, hair: HAIR };

// ─────────────────────────────────────────────
// 대화 초상화 — c.say(글, 화자)의 화자 이름으로 찾아 대화창 왼쪽에 얼굴을 띄운다.
// 여기 없는 화자(이름 없는 혼잣말·안내 문구 포함)는 초상화 없이 이름표만 나온다.
//
//  look   겉모습 — 맵 위 그림과 같은 looks.js에서 가져온다(머리 모양·안경·옷·색). 지금은 코드로 그린 임시 얼굴
//  image  그림 파일 경로(예: 'assets/portraits/suo.png'). 적으면 임시 얼굴 대신 이것을 그린다(96×96으로 맞춤)
//
//  moods  표정별 그림 파일 { '놀람': 'assets/portraits/suo_surprised.png', … } — 없는 표정은 image(또는 임시 얼굴)
//
// 표정: c.say(글, 화자, { mood: '놀람' }) — MOODS 가운데 하나. 빼면 '보통'. 임시 얼굴은 눈·눈썹·입이 바뀐다.
// 한 장면에서만 초상화를 끄려면 c.say(글, 화자, { face: false }).
// ─────────────────────────────────────────────

export const MOODS = ['보통', '기쁨', '놀람', '슬픔', '화남', '걱정'];

import { NPCS } from './npcs.js?v=0.30.0';
import { STAFF } from './prologue.js?v=0.30.0';
import { LOOKS, lookFor } from './looks.js?v=0.30.0';

export const PORTRAITS = {
  // 그림 파일이 생기면 여기에: '수오': { image: 'assets/portraits/suo.png' },
  '상어귀신': { art: 'shark' }, // 코드로 직접 그린 얼굴(render.js PORTRAIT_ART) — 그림 파일이 생기면 image로
};

// looks.js에 적힌 사람, 그리고 맵에 서 있는 NPC(NPCS·홍보실 직원)는 저절로 초상화가 생긴다(위에 따로 적은 것이 먼저)
for (const name of Object.keys(LOOKS)) PORTRAITS[name] ??= { look: lookFor(name) };
for (const n of [...Object.values(NPCS), STAFF]) PORTRAITS[n.name] ??= { look: lookFor(n.name, n.color) };

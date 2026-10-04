// ─────────────────────────────────────────────
// 대학원생 NPC — 이름·전공·대사·퀘스트는 작가 작성 (6단계에서 전공 기믹 연결)
//
//  name   이름표
//  color  임시 그림의 옷 색 (그림이 생기면 바뀐다)
//  run    말을 걸었을 때의 스크립트
// ─────────────────────────────────────────────

import { CREATURES } from './creatures.js?v=0.21.1';
import { CH1 } from './chapter1.js?v=0.21.1';

const A = '(대학원생 A)';

// 렐 — 수오에게 전화를 건 지인. 연구소 대학원생(306호). 수오가 찾아갔을 때는 자리에 없고 캠벨뿐이었다.
//      아직 NPC로 등장하지 않는다. 306호의 렐 자리가 세이브 포인트다.
const CAMPBELL = 'Campbell';

// 캠벨의 대사: 영어 본문 + 한국어 자막(번역기가 있을 때만 보임)
const campbell = (c, en, ko) => c.say(en, CAMPBELL, { sub: ko });

export const NPCS = {
  // 캠벨 — 가장 처음 만나는 NPC. 영국 사람이라 영어로 말한다. 연구지원동 북서동 306호.
  campbell: {
    name: CAMPBELL,
    color: '#7a6a4f',
    // 가까이 가면 가끔 머리 위 말풍선으로 혼잣말 (자리표시 — 작가 작성)
    chatter: ['(Campbell mutters — English TBD)', '(혼잣말 2 — 미정)'],
    async run(c) {
      if (!c.flag('metCampbell')) {
        c.flag('metCampbell', true);
        return CH1.meetCampbell(c); // 첫 만남 (1장 0단계)
      }
      // 1장 1단계: 렐의 행방 묻기. 묻지 않고 그만두면 아래(소동물 건네기)로
      if (c.quest.stage('ch1') === 1 && await CH1.askAboutRel(c)) return;
      // 채집통에 소동물이 있으면 한 종류씩 골라 건넨다 → 소동물마다 반응. 호감도는 숨은 값(화면에 안 보임)
      let gave = false;
      for (let carried = c.creature.carried(); carried.length; carried = c.creature.carried()) {
        const names = carried.map((id) => CREATURES[id].name);
        const pick = await c.choose('(어떤 소동물을 건넬까? — 문구 미정)', [...names, '그만둔다']);
        if (pick >= carried.length) break;
        const id = carried[pick];
        c.creature.deliver(id, 'campbell');
        await campbell(c, CREATURES[id].reaction.en, CREATURES[id].reaction.ko);
        gave = true;
      }
      if (!gave) await campbell(c, '(Campbell — repeat line in English, TBD)', '(한국어 자막 — 미정)');
    },
  },

  // 예시 — 퀘스트 시스템 견본(quests.js의 example). 실제 인물을 정하면 바꾼다.
  gradA: {
    name: A,
    color: '#5b8bd9',
    async run(c) {
      if (!c.quest.started('example')) {
        await c.say('(퀘스트 의뢰 — 대사 미정)', A);
        c.quest.start('example');
        return;
      }
      if (c.quest.finished('example')) return c.say('(퀘스트 완료 후 — 대사 미정)', A);
      if (c.has('exampleItem')) {
        c.take('exampleItem');
        await c.say('(물건을 건넴 — 대사 미정)', A);
        c.quest.done('example');
        c.help.grant('exampleHelp'); // 전공 기믹 예시: 퀘스트를 끝내면 도움(helps.js)
        return;
      }
      await c.say('(퀘스트 진행 중 — 대사 미정)', A);
    },
  },
};

// 예시 퀘스트의 물건 (냉동실험실에 놓임). 퀘스트를 받은 뒤에만 보인다.
export const EXAMPLE_ITEM = {
  sprite: 'item', solid: true, trigger: 'action',
  visible: (s) => !!s.quests.example && !s.quests.example.done && !s.flags.gotExampleItem,
  async run(c) {
    c.flag('gotExampleItem', true);
    await c.give('exampleItem');
    c.quest.next('example');
  },
};

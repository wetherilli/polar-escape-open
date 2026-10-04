// ─────────────────────────────────────────────
// 1장 — 작가 개요 (2026-10-04)
//  캠벨 만나기 → 캠벨에게 렐의 행방 묻기 → 렐을 찾아 연구동으로 → 제1연구동 6층 광학현미경실로.
//  제1연구동 계단은 4층에서 5층으로 오르는 곳이 무너져 있어서, 4층부터 6층까지는 다른 계단으로 간다.
//
// 진행은 퀘스트 'ch1'(quests.js)의 단계로 센다.
//   0 캠벨 만나기  1 렐의 행방 묻기  2 연구동으로  3 6층 광학현미경실로  4 (무너진 계단을 본 뒤) 다른 계단으로 6층
//
// ※ 대사는 전부 자리표시. '(장면 — 대사 미정)' 줄을 작가 대사로 바꾸면 된다.
//   캠벨 대사는 campbell(c, 영어, 한국어 자막) — 자막은 번역기가 있을 때만 보인다.
// ─────────────────────────────────────────────

const CAMPBELL = 'Campbell';
const campbell = (c, en, ko) => c.say(en, CAMPBELL, { sub: ko });

export const CH1 = {
  // 오프닝 끝에 정신을 차리면 시작
  start(c) {
    c.quest.start('ch1');
  },

  // 깨어나 화장실에서 처음 나왔을 때 — 손전등을 얻어 켜기까지 자동으로 (작가 지침 2026-10-04)
  //  화장실 문(2,19)으로 나오면 (2,18). 창문은 왼쪽 벽(0,17·0,18), 소방함은 문 오른쪽(3,19)
  async leaveRestroom(c) {
    if (c.flag('day') || c.flag('sawFireBox') || c.has('flashlight')) return;
    c.flag('sawFireBox', true);
    await c.say('바깥도 불이 다 꺼져있잖아?', '수오');
    await c.walk('left', 1);   // 창가로
    c.face('left');            // 창밖을 본다
    await c.wait(1200);
    await c.say('들어가기 전에 손전등을 봤던 것같은데?', '수오');
    await c.walk('right', 2);  // 소방함 앞으로
    c.face('down');
    await c.wait(400);
    await c.give('flashlight');
    c.flag('flashlightOn', true); // 꺼내서 바로 켠다
    await c.wait(300);
    await c.bubble('이게 무슨 일이야...');
    await c.say('L 키로 손전등을 켜고 끌 수 있다.');
  },

  // 화장실 문 옆 소방함 — 비상용 손전등
  async fireBox(c) {
    if (c.flag('day')) return c.say('(소방함 — 조사 텍스트)');
    if (c.has('flashlight')) return c.say('(소방함 — 손전등을 꺼낸 뒤. 문구 미정)');
    await c.say('(소방함을 열어 비상용 손전등을 꺼냄 — 대사 미정)');
    await c.give('flashlight');
    c.flag('flashlightOn', true); // 꺼낸 손전등은 켜진 채로 (L로 끄고 켠다)
    c.objective(null); // 목표 줄을 1장 퀘스트로 돌려놓는다
  },

  // 306호에서 캠벨을 처음 만남
  async meetCampbell(c) {
    if (!c.quest.started('ch1')) c.quest.start('ch1');
    await campbell(c, '(First meeting — Campbell\'s lines in English, TBD)', '(한국어 자막 — 미정)');
    await c.say('(수오 반응 — 대사 미정)', '수오');
    c.note.add('campbell'); // 노트 「대학원생 — Campbell」
    if (c.quest.stage('ch1') === 0) c.quest.next('ch1');
  },

  // 렐의 행방 묻기. 물었으면 true
  async askAboutRel(c) {
    const pick = await c.choose('(무엇을 물을까 — 문구 미정)', ['렐에 대해 묻는다', '그만둔다']);
    if (pick !== 0) return false;
    await c.say('(렐을 찾고 있다고 말함 — 대사 미정)', '수오');
    await campbell(c, '(Campbell tells where Rel might be — English TBD)', '(한국어 자막 — 미정)');
    c.quest.next('ch1');
    return true;
  },

  // 연구동 1층에 들어섬
  async enterResearch(c) {
    if (c.quest.stage('ch1') !== 2) return;
    await c.say('(연구동에 들어섬 — 대사 미정)');
    c.quest.next('ch1');
  },

  // 제1연구동 계단 — 4층과 5층 사이가 무너져 있음 (stairs의 onBroken)
  async stairsCollapsed(c) {
    if (c.quest.stage('ch1') !== 3) return;
    await c.say('(무너진 계단을 보고 다른 길을 찾기로 함 — 대사 미정)', '수오');
    c.quest.next('ch1');
  },

  // 6층 광학현미경실에 들어섬
  async reachOptics(c) {
    if (!c.quest.active('ch1')) return;
    await c.say('(광학현미경실 — 장면 미정)');
    c.quest.done('ch1');
  },
};

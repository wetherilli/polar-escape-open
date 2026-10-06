// ─────────────────────────────────────────────
// 305호 화석연구실 — 연구지원동 북서동 3층 (작가 설계 2026-10-06)
//  문이 둘이다. 위쪽 문(앞문)은 현미경 테이블과 수조가 있는 연구 공간, 아래쪽 문(뒷문)은 화석이 가득한 창고.
//  수조에는 붉은발남방가재 한 마리. 창고 선반을 뒤지면 카메라와 시료병 5개가 나온다.
//
// ※ '(… — 문구 미정)' 줄은 자리표시. 작가 문장으로 바꾸면 된다.
// ─────────────────────────────────────────────

export const LAB305 = {
  // 창고의 화석 선반 (아무것도 없는 칸)
  async shelf(c) {
    await c.say('(화석이 빼곡히 들어찬 선반이다 — 조사 텍스트)');
  },

  // 창고 선반 안쪽의 카메라 — 새·너구리·고양이처럼 잡을 수 없는 동물을 찍어 도감에 남긴다
  async cameraShelf(c) {
    if (c.flag('got305Camera')) return LAB305.shelf(c);
    await c.say('(화석 상자들 뒤에 무언가 있다 — 문구 미정)');
    c.flag('got305Camera', true);
    await c.give('camera');
  },

  // 창고 선반의 시료병 상자 — 한 번에 다섯 개
  async vialShelf(c) {
    if (c.flag('got305Vials')) return LAB305.shelf(c);
    await c.say('(빈 시료병이 든 상자가 있다 — 문구 미정)');
    c.flag('got305Vials', true);
    await c.give('vial', 5);
  },

  // 연구 공간의 현미경 — 시료병에 떠 온 시료를 들여다본다 (events.js c.creature.microscope, 광학현미경실과 같다)
  async microscope(c) {
    await c.creature.microscope();
  },

  // 수조 — 붉은발남방가재 한 마리 (도감 연결은 실내 사육 개체와 함께)
  async tank(c) {
    await c.say('수조 바닥에서 집게발이 붉은 가재 한 마리가 천천히 움직인다.');
  },
};

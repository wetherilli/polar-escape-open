// ─────────────────────────────────────────────
// 오프닝 (낮) — 작가가 정한 흐름 (2026-10-04)
//  도착(전경) → 경비실 방문증 → 본관 1층 홍보실 직원 → 극지과학홍보관 북극곰
//  → 연구지원동 카페(음료) → 전화 → 화장실 → 지진·정전·기절 → 끝나지 않는 밤 시작
//
// 진행 단계는 flags.pro 하나로 센다.
//   0 도착   1 방문증 받음   2 직원과 동행   3 북극곰 봄   4 카페에 앉음   5 밤(본편)
//
// ※ 대사는 전부 자리표시. '(장면 설명 — 대사 미정)' 줄을 작가 대사로 바꾸면 된다.
//   c.say(글, 화자) — 화자를 주면 이름표가 붙는다. 여러 줄은 c.say를 여러 번.
// ─────────────────────────────────────────────

import { CH1 } from './chapter1.js?v=0.22.0';

export const STAFF ={ name: '홍보실 직원', color: '#c0577a' };

// 새 게임 시작 상태
export const PROLOGUE_START = {
  map: 'campus', x: 71, y: 21, dir: 'left', // 정문 안쪽 차도
  flags: { day: true, pro: 0, objective: '경비실에서 방문증 받기' },
};

export const PROLOGUE = {
  // 캠퍼스에 처음 들어왔을 때 — 낮의 극지연구소 전경
  async arrive(c) {
    if (c.flag('seenArrive')) return;
    c.flag('seenArrive', true);
    c.picture('kopri_day');
    await c.say('(극지연구소 전경 — 도착 대사 미정)');
    await c.say('(남극체험 프로그램 참가 — 수오의 기대감. 대사 미정)', '수오');
    c.picture(null);
    c.note.add('antarcticProgram'); // 노트 「남극 청소년 체험 프로그램」
  },

  // 경비실 (차량 진입로 오른쪽)
  async booth(c) {
    if (c.flag('pro') === 0) {
      await c.say('(경비실 — 방문 목적 확인. 대사 미정)', '(경비원)');
      await c.give('visitorPass');
      c.flag('pro', 1);
      c.objective('본관 1층으로');
      c.bubble('본관동은 오른쪽 건물이라고 했지?'); // 걸어가기 시작할 때 머리 위에 (기다리지 않음)
      return;
    }
    await c.say('(경비실 — 평소 대사 미정)', '(경비원)');
  },

  // 본관 1층에 들어오면 — 홍보실 직원과 만남
  async meetStaff(c) {
    if (c.flag('pro') !== 1) return;
    await c.say('(홍보실 직원이 맞이함 — 대사 미정)', STAFF.name);
    await c.say('(수오 인사 — 대사 미정)', '수오');
    await c.say('(홍보관으로 안내 — 대사 미정)', STAFF.name);
    c.follow(STAFF.name, STAFF.color);
    c.flag('pro', 2);
    c.objective('홍보실 직원과 극지과학홍보관 둘러보기');
  },

  // 극지과학홍보관에 들어오면
  async enterExhibit(c) {
    if (c.flag('pro') !== 2 || c.flag('seenExhibit')) return;
    c.flag('seenExhibit', true);
    await c.say('(홍보관 입장 — 직원 소개. 대사 미정)', STAFF.name);
  },

  // 북극곰 앞
  async bear(c) {
    if (c.flag('pro') !== 2) return c.say('(북극곰 — 조사 텍스트)');
    await c.say('(북극곰 설명 — 대사 미정)', STAFF.name);
    await c.say('(수오 반응 — 대사 미정)', '수오');
    await c.say('(카페에서 이야기하자고 제안 — 대사 미정)', STAFF.name);
    c.flag('pro', 3);
    c.objective('연구지원동 카페로');
  },

  // 카페 카운터 — 직원이 음료를 사 줌 → 자리에 앉음 → 전화 → 화장실
  async cafeCounter(c) {
    if (c.flag('pro') !== 3) return c.say('(카페 카운터 — 조사 텍스트)');
    await c.say('(음료를 사 주겠다고 함 — 대사 미정)', STAFF.name);
    const pick = await c.choose('(무엇을 마실까 — 선택지 미정)', ['(음료 1)', '(음료 2)', '(음료 3)']);
    c.flag('drink', pick);
    await c.fade(1);
    c.unfollow();
    c.flag('pro', 4);
    c.place(6, 27, 'up'); // 카페 테이블 앞, 직원(t) 옆자리
    await c.fade(0);
    await c.say('(자리에 앉아 이야기 — 대사 미정)', STAFF.name);
    await c.say('(렐에게서 전화가 옴 — 대사 미정)'); // 렐: 수오의 지인, 연구소 대학원생
    c.note.add('rel'); // 노트 「대학원생 — 렐」
    await c.say('(잠시 화장실에 다녀오겠다고 함 — 대사 미정)', '수오');
    c.objective('화장실 다녀오기');
  },

  // 화장실에 들어오면 — 지진, 정전, 기절. 깨어나면 끝나지 않는 밤
  async restroom(c) {
    if (c.flag('pro') !== 4) return;
    await c.say('(화장실 — 대사 미정)');
    await c.wait(600);
    await c.shake(1.2, 5);
    c.lights(false);
    await c.say('(지진 같은 흔들림, 조명이 꺼짐 — 대사 미정)');
    await c.shake(1, 10);
    await c.fade(1);
    c.flag('day', false);
    c.flag('pro', 5);
    c.objective(null);
    c.lights(true);
    await c.wait(1500);
    await c.fade(0);
    await c.say('(정신을 차림 — 여기부터 본편. 대사 미정)');
    CH1.start(c);
  },
};

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

import { CH1 } from './chapter1.js?v=0.38.0';

export const STAFF ={ name: '홍보실 직원', color: '#c0577a' };

// 새 게임 시작 상태
export const PROLOGUE_START = {
  map: 'campus', x: 71, y: 21, dir: 'left', // 정문 안쪽 차도
  flags: { day: true, pro: 0, objective: '경비실에서 방문증 받기' },
};

// 오프닝 길 안내 — flags.pro 단계마다 가야 할 곳(quests.js goals와 같은 꼴). 화살표는 guide.js가 그린다
export const PROLOGUE_GOALS = [
  { map: 'campus', event: 'v' },   // 0 경비실에서 방문증 받기
  { map: 'main_1f' },              // 1 본관 1층으로 (들어서면 홍보실 직원이 맞이함)
  { map: 'exhibit', event: 'u' },  // 2 홍보관 북극곰
  { map: 'supA_1f', event: 'k' },  // 3 연구지원동 카페 카운터
  { map: 'supA_wc' },              // 4 화장실
];

export const PROLOGUE = {
  // 캠퍼스에 처음 들어왔을 때 — 낮의 극지연구소 전경
  async arrive(c) {
    if (c.flag('seenArrive')) return;
    c.flag('seenArrive', true);
    c.picture('kopri_day');
    await c.say('한국해양과학기술원 부설 극지연구소. 대한민국의 극지연구를 담당하는 굴지의 국책연구기관.');
    await c.say('남극에 직접 갈 수 있는 프로그램이라니. 너무 기대되네. 일단 경비실에 가서 방문증부터 받자.', '수오');
    c.picture(null);
    c.note.add('antarcticProgram'); // 노트 「남극 청소년 체험 프로그램」
  },

  // 경비실 (차량 진입로 오른쪽)
  async booth(c) {
    if (c.flag('pro') === 0) {
      await c.say('남극체험 프로그램 참가자... 여기 명단에 있네요. 방문증을 받고... 본관 로비에서 아마 기다리고 있을 거예요.', '경비원');
      await c.give('visitorPass');
      c.flag('pro', 1);
      c.objective('본관 1층 로비로');
      c.bubble('본관동은 오른쪽 건물이라고 했지?'); // 걸어가기 시작할 때 머리 위에 (기다리지 않음)
      return;
    }
    await c.say('누가 들어오는 것은 아닌지 잘 감시하고 있으니 걱정 마.', '경비원');
  },

  // 본관 1층에 들어오면 — 홍보실 직원과 만남
  async meetStaff(c) {
    if (c.flag('pro') !== 1) return;
    await c.say('안녕하세요, 수오군.', STAFF.name);
    await c.say('안녕하세요, 처음 뵙겠습니다. 박수오입니다.', '수오');
    await c.say('홍보관부터 같이 둘러볼까요? 오른쪽 방이에요.', STAFF.name);
    c.follow(STAFF.name, STAFF.color);
    c.flag('pro', 2);
    c.objective('홍보실 직원과 극지과학홍보관 둘러보기');
  },

  // 극지과학홍보관에 들어오면
  async enterExhibit(c) {
    if (c.flag('pro') !== 2 || c.flag('seenExhibit')) return;
    c.flag('seenExhibit', true);
    await c.say('홍보관에서는 극지연구소의 다양한 연구들을 소개하고 있답니다. 하나씩 살펴볼까요?', STAFF.name);
  },

  // 북극곰 앞
  async bear(c) {
    if (c.flag('pro') !== 2) return c.say('북극곰이다. 마치 살아있는 것 같은 느낌의 박제다.');
    await c.say('밤 12시가 되면 북극곰이 연구소를 돌아다닌다는 괴담도 있어요.', STAFF.name);
    await c.say('하하, 그런 일이 있을 리가요.', '수오');
    await c.say('봤다는 대학원생들이 있더라고요. 일단 카페에 가서 마저 이야기해볼까요?', STAFF.name);
    c.flag('pro', 3);
    c.objective('연구지원동 카페로');
  },

  // 북극곰을 보고 카페에 닿기 전(pro 3, 직원과 동행 중)에 다른 건물·층·방으로 가려 하면 직원이 막는다 (작가 지침 2026-10-06)
  //  연구동 1층·본관 1층은 다닐 수 있다. 막는 곳: 극지지원동·연구지원동 남동동·기숙사동·지하주차장, 연구지원동 북서동의 다른 층·화장실, 연구동 실험실, 본관·연구동 2층 이상
  escorting: (c) => c.flag('day') && c.flag('pro') === 3,
  async staffStop(c) {
    await c.say('수오군, 거기는 나중에 둘러보고 일단 카페로 가요.', STAFF.name);
  },

  // 카페 카운터 — 직원이 음료를 사 줌 → 자리에 앉음 → 전화 → 화장실
  async cafeCounter(c) {
    if (c.flag('pro') !== 3) return c.say('어떤 음료를 마실까?');
    await c.say('환영의 의미로 음료는 제가 살게요.', STAFF.name);
    const pick = await c.choose('무엇을 마실까', ['아메리카노', '초코라떼', '아이스티에 샷 추가']);
    c.flag('drink', pick);
    await c.fade(1);
    c.unfollow();
    c.flag('pro', 4);
    c.place(6, 27, 'up'); // 카페 테이블 앞, 직원(t) 옆자리
    await c.fade(0);
    await c.say('음료가 나왔으니 자리에 앉아서 이야기해요.', STAFF.name);
    await c.say('휴대폰에 진동이 울린다. ... 렐의 전화다.'); // 렐: 수오의 지인, 연구소 대학원생
    c.note.add('rel'); // 노트 「대학원생 — 렐」
    await c.say('잠시 화장실에 다녀와도 될까요?', '수오');
    c.objective('화장실 다녀오기');
  },

  // 화장실에 들어오면 — 지진, 정전, 기절. 깨어나면 끝나지 않는 밤
  async restroom(c) {
    if (c.flag('pro') !== 4) return;
    await c.say('안은 깨끗하네. 일단 아까 못 받은 전화를...');
    await c.wait(600);
    await c.shake(1.2, 5);
    c.lights(false);
    await c.say('땅이 흔들리고 조명이 꺼진다.');
    await c.shake(1, 10);
    await c.fade(1);
    c.flag('day', false);
    c.flag('pro', 5);
    c.objective(null);
    c.lights(true);
    await c.wait(1500);
    await c.fade(0);
    await c.say('...정신을 잠시 잃었나?');
    CH1.start(c);
    await c.autosave(); // 1장 시작 — 처음 저장 (작가 지침 2026-10-05)
  },
};

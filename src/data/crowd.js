// ─────────────────────────────────────────────
// 낮의 연구소 사람들 — 오프닝(낮)에만 연구소 여기저기에 있다가, 밤(본편)이 되면 전부 사라진다.
// 작가 요청(2026-10-06): 기술원·연구원·직원, 복장 바리에이션, 천천히 걸어다니며 말풍선, 말을 걸면 짧은 인사.
// ※ 여기 대사(chatter·talk)는 작가 요청으로 Claude가 지어 넣은 임시 대사다. 대사 편집기(「낮의 사람들」)에서 고치면 된다.
//
//  role     이름표 (기술원 · 연구원 · 직원 · 카페 직원)
//  look     겉모습 — looks.js와 같은 필드(머리·옷·색). 같은 이름표라도 사람마다 다르게
//  dir      처음 바라보는 쪽
//  wander   돌아다니는 범위(칸). 0이면 제자리(카페에 앉은 사람 등)
//  chatter  가까이 가면 머리 위 말풍선으로 하는 혼잣말 (돌아가며)
//  talk     말을 걸었을 때 하는 말 (말을 걸 때마다 다음 줄)
//
// 맵에는 maps.js에서 crowd('id')로 세운다.
// ─────────────────────────────────────────────

import { lookFor } from './looks.js?v=0.38.0';

// 복장 — 이름표마다 몇 벌씩
const RESEARCHER = [
  { hair: 'short', hairColor: '#2a2420', top: 'labcoat', topColor: '#5d7fa6', glasses: true },
  { hair: 'bob', hairColor: '#4a3426', top: 'labcoat', topColor: '#b05a5a', shoes: 'sneakers' },
  { hair: 'curly', hairColor: '#1c1816', skin: '#d9ad85', top: 'sweater', topColor: '#6f8f6a', bottomColor: '#4a4f5c', shoes: 'sneakers', glasses: true },
  { hair: 'long', hairColor: '#2b1f19', top: 'labcoat', topColor: '#d9c27a', bottomColor: '#3a3f4a' },
  { hair: 'buzz', hairColor: '#151210', skin: '#c79d78', top: 'hoodie', topColor: '#3e4a63', bottom: 'pants', bottomColor: '#5c5348', shoes: 'sneakers' },
];
const TECHNICIAN = [
  { hair: 'cap', capColor: '#2f5d8a', top: 'uniform', topColor: '#4b6a8a', bottomColor: '#34404f', shoes: 'sneakers', shoeColor: '#3a3a3a' },
  { hair: 'short', hairColor: '#1a1614', skin: '#c99c74', top: 'uniform', topColor: '#7a7f86', bottomColor: '#3b3f46', shoes: 'sneakers' },
  { hair: 'cap', capColor: '#c9772f', top: 'jacket', topColor: '#d08a3c', bottomColor: '#2e333d', shoes: 'sneakers', shoeColor: '#6b4a2b' },
  { hair: 'ponytail', hairColor: '#2a211b', top: 'uniform', topColor: '#3f6b5a', bottomColor: '#2c3a34', shoes: 'sneakers', glasses: true },
];
const OFFICE = [
  { hair: 'short', hairColor: '#191513', top: 'suit', topColor: '#2f3646', bottomColor: '#2f3646' },
  { hair: 'bob', hairColor: '#5a3d2a', top: 'sweater', topColor: '#c9a27a', bottomColor: '#4a4040' },
  { hair: 'long', hairColor: '#171311', top: 'jacket', topColor: '#8a5a7a', bottomColor: '#2b2f3a' },
  { hair: 'curly', hairColor: '#3a2a20', skin: '#e3b98f', top: 'suit', topColor: '#6a6f78', bottomColor: '#3a3e45', glasses: true },
];

export const CROWD = {
  // ── 캠퍼스 (야외) ──
  gateWalker: {
    role: '직원', look: OFFICE[0], wander: 4,
    chatter: ['좋은 아침!', '오늘 방문객이 온다고 했지.', '출근길이 오늘따라 상쾌하네.'],
    talk: ['너는 누구니? 아, 오늘 오는 체험 프로그램 학생이구나.', '극지연구소에 온 걸 환영해.'],
  },
  plazaWalker: {
    role: '연구원', look: RESEARCHER[2], wander: 4,
    chatter: ['오늘도 연구를 해 볼까.', '어제 데이터 정리를 끝냈어야 했는데...', '날씨 좋다. 남극은 지금 몇 도일까.'],
    talk: ['못 보던 얼굴인데? 견학 왔니?', '여기는 남극이랑 북극을 연구하는 곳이야. 천천히 둘러보렴.'],
  },
  pathWalkerW: {
    role: '직원', look: OFFICE[1], wander: 5,
    chatter: ['결재 서류를 어디 뒀더라...', '점심은 뭐 먹지?', '회의실 예약해 둬야겠다.'],
    talk: ['극지연구소에 온 걸 환영해.', '길을 잃으면 경비실이나 본관 로비에 물어보렴.'],
  },
  pathWalkerE: {
    role: '연구원', look: RESEARCHER[0], wander: 5,
    chatter: ['논문 마감이 언제였더라.', '세미나 발표 자료 아직 못 만들었는데.', '좋은 아침이에요.'],
    talk: ['너는 누구니?', '아, 체험 프로그램 참가자구나. 나도 처음 남극 갈 때 엄청 설렜어.'],
  },
  mainSouth: {
    role: '기술원', look: TECHNICIAN[0], wander: 4,
    chatter: ['중요한 시료니까 조심해.', '오늘 장비 점검은 오전 중에 끝내야지.', '액체질소 들어오는 날이 오늘이었나.'],
    talk: ['어이쿠, 비켜 줄게. 너는 누구니?', '시료 상자 옮기는 중이야. 부딪히면 큰일 나.'],
  },
  researchPath: {
    role: '연구원', look: RESEARCHER[1], wander: 4,
    chatter: ['배양이 잘 됐으려나.', '실험실 냉동고 자리가 또 모자라.', '좋은 아침!'],
    talk: ['연구동은 출입증이 있어야 들어갈 수 있어.', '극지연구소에 온 걸 환영해. 재밌는 거 많이 보고 가.'],
  },
  researchPathS: {
    role: '기술원', look: TECHNICIAN[2], wander: 4,
    chatter: ['이 배관 또 새는 거 아냐?', '쇄빙선에 실을 장비 목록 확인해야지.', '오늘도 무사히.'],
    talk: ['나는 장비를 관리하는 기술원이야. 너는 누구니?', '아라온호 본 적 있니? 진짜 커.'],
  },
  supLawn: {
    role: '직원', look: OFFICE[2], wander: 3,
    chatter: ['잠깐 바람 좀 쐬어야지.', '커피 한 잔 더 마실까.', '오후 회의 길어지면 안 되는데.'],
    talk: ['카페는 저 건물 1층에 있어.', '좋은 아침. 견학 온 학생이구나?'],
  },

  // ── 본관 1층 로비 ──
  lobbyDesk: {
    role: '직원', look: OFFICE[3], wander: 0,
    chatter: ['방문 신청서는 여기에 써 주세요.', '오늘 방문객 명단이...', '네, 극지연구소입니다.'],
    talk: ['극지연구소에 온 걸 환영해요.', '홍보관은 로비 오른쪽 방이에요.'],
  },
  lobbyWalker: {
    role: '연구원', look: RESEARCHER[3], wander: 4,
    chatter: ['좋은 아침이에요.', '오늘도 연구를...', '2층 세미나실이 비어 있으려나.'],
    talk: ['너는 누구니? 아, 오늘 온다던 학생?', '로비에 걸린 사진은 전부 남극기지 사진이야.'],
  },
  lobbyTech: {
    role: '기술원', look: TECHNICIAN[1], wander: 3,
    chatter: ['로비 조명 하나가 깜빡이네.', '중요한 시료니까 조심해서 옮겨야지.', '택배 왔나?'],
    talk: ['나는 시설을 봐 주는 기술원이야.', '극지연구소에 온 걸 환영해.'],
  },

  // ── 극지과학홍보관 ──
  exhibitA: {
    role: '연구원', look: RESEARCHER[4], wander: 2,
    chatter: ['이 시추기 모형, 실제로는 훨씬 커.', '펭귄 모형은 언제 봐도 귀엽네.', '전시 설명을 좀 고쳐야겠는데.'],
    talk: ['빙하 얼음 속에는 옛날 공기가 갇혀 있어. 신기하지?', '극지연구소에 온 걸 환영해.'],
  },
  exhibitB: {
    role: '직원', look: OFFICE[1], wander: 3,
    chatter: ['전시물 먼지 좀 닦아야겠다.', '오늘 단체 관람이 있었나?', '좋은 아침입니다.'],
    talk: ['천천히 둘러보세요.', '북극곰은 만지면 안 돼요!'],
  },

  // ── 연구동 1층 (제1·2·3연구동) ── 낮에는 1층만 다닌다(2층부터는 밤부터)
  r1fWalker: {
    role: '연구원', look: RESEARCHER[0], wander: 3,
    chatter: ['좋은 아침!', '오늘 실험은 몇 시부터였지.', '커피부터 마시고 시작하자.'],
    talk: ['너는 누구니? 여기는 연구동이라 조용히 다녀야 해.', '실험실 문은 함부로 열면 안 돼.'],
  },
  r1fTech: {
    role: '기술원', look: TECHNICIAN[3], wander: 3,
    chatter: ['중요한 시료니까 조심해.', '냉동고 온도 기록 확인했나?', '장비 예약표가 꽉 찼네.'],
    talk: ['시료는 영하 80도에 보관해. 엄청 차갑지.', '극지연구소에 온 걸 환영해.'],
  },
  r1fReader: {
    role: '연구원', look: RESEARCHER[2], wander: 2,
    chatter: ['이 그래프가 왜 이렇게 나오지...', '운석 분석 결과가 오늘 나온다던데.', '위층 세미나실에 자료 두고 왔네.'],
    talk: ['견학 왔구나. 위층은 연구실이라 올라가면 안 돼.', '1층 화장실은 복도 서쪽에 있어.'],
  },

  // ── 연구지원동 북서동 1층 (카페) ──
  supCorridor: {
    role: '기술원', look: TECHNICIAN[2], wander: 3,
    chatter: ['엘리베이터 점검 날이 언제였더라.', '좋은 아침!', '오늘도 연구를... 아니, 오늘도 수리를.'],
    talk: ['카페는 이 복도 끝이야.', '너는 누구니? 견학 왔구나.'],
  },
  barista: {
    role: '카페 직원', look: { hair: 'cap', capColor: '#3d5a3d', top: 'tshirt', topColor: '#4f7a4f', bottomColor: '#2b2f3a', shoes: 'sneakers' }, wander: 0,
    chatter: ['어서 오세요!', '주문 도와드릴게요.', '오늘의 원두는 산미가 좋아요.'],
    talk: ['어서 오세요. 주문은 카운터에서 도와드릴게요.', '천천히 고르세요.'],
  },
  cafeChatA: {
    role: '연구원', look: RESEARCHER[1], wander: 0,
    chatter: ['이번 시즌에 남극 가?', '세종기지는 요즘 눈이 많이 온대.', '다녀오면 같이 밥 먹자.'],
    talk: ['우린 잠깐 쉬는 중이야.', '극지연구소에 온 걸 환영해.'],
  },
  cafeChatB: {
    role: '직원', look: OFFICE[2], dir: 'up', wander: 0,
    chatter: ['응, 이번엔 석 달이야.', '방한복부터 챙겨야지.', '그래, 갔다 와서 보자.'],
    talk: ['너는 누구니? 아, 체험 프로그램?', '여기 초코라떼 맛있어.'],
  },
  cafeSolo: {
    role: '기술원', look: TECHNICIAN[0], wander: 0,
    chatter: ['보고서는 커피 마시고 쓰자.', '음... 오늘 할 일이 많네.'],
    talk: ['잠깐 쉬는 중이야.', '좋은 아침. 극지연구소에 온 걸 환영해.'],
  },
};

// 맵에 세우는 낮의 사람 (maps.js에서 crowd('id')). 밤(flags.day가 꺼지면)에는 없다.
export function crowd(id) {
  const p = CROWD[id];
  if (!p) throw new Error(`낮의 사람 없음: ${id}`);
  const face = { look: lookFor(p.role, null, p.look) }; // 대화 초상화도 그 사람 겉모습으로
  let n = 0;
  return {
    sprite: 'npc', solid: true, trigger: 'action', turnToPlayer: true,
    name: p.role, look: p.look, dir: p.dir ?? 'down', crowd: id,
    visible: (s) => !!s.flags.day,
    chatter: { lines: p.chatter, every: 9, range: 5 },
    wander: p.wander ? { radius: p.wander } : null,
    run: (c) => c.say(p.talk[n++ % p.talk.length], p.role, { face }),
  };
}

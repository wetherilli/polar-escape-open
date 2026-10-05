// ─────────────────────────────────────────────
// 상어귀신 — 작가 설정 (2026-10-05)
//  남극 체험 프로그램에서 떨어져 남극에 가지 못한 것이 한이 된 소년. 하늘색 상어 후드집업을 깊이 눌러쓰고 있다
//  (그림은 render.js의 drawShark·PORTRAIT_ART.shark, 시안은 tools/shark.html의 시안 C).
//
// 지하주차장(supA_b1)에 들어가면 나타난다:
//  - 손전등을 켜 두면 수오를 보고 쫓아온다.
//  - 끄면 수오가 보이지 않아(수오는 피부가 어두워 어둠에 묻힌다) 놓치고, 주차장 안을 돌아다닌다.
//  - 그래도 두 칸 안으로 다가오면 보고 쫓아와 공격한다.
//  - 잡히면 화면이 흔들리고 암전 → 「눈 앞이 깜깜하다.」 → 마지막으로 저장한 곳에서 다시.
// 눈은 어둠 위에 그려서 불이 꺼져 있어도 보인다.
// ─────────────────────────────────────────────

const NAME = '상어귀신';
// 한 번만 나오는 장면은 플래그(세이브에 남음)와 함께 여기에도 적어 둔다 — 저장하기 전에 잡혀 예전 세이브로 돌아가도 다시 나오지 않게
let met = false, retried = false;
export function resetShark() { met = false; retried = false; } // 새로 시작할 때 (main.js)

export const SHARK = {
  // 지하주차장에 들어올 때마다 (밤에만, 저주가 풀리기 전까지)
  enterParking(c) {
    if (c.flag('day') || c.flag('curseLifted')) return;
    c.chase.start({
      who: 'shark', at: 'far', speed: 6.2, wanderSpeed: 1.8, // 쫓을 때는 걷기(5)보다 빠르고 달리기(7.5)보다 느리다 (작가 지침)
      needsLight: true, near: 2,
      onSpot: SHARK.spot,
      caughtText: '눈 앞이 깜깜하다.',
      onRetry: SHARK.retry,
    });
  },

  // 수오를 알아챘을 때 — 처음 만났을 때만 대사
  async spot(c) {
    if (met || c.flag('metShark')) return;
    met = true;
    c.flag('metShark', true);
    await c.say('...!', NAME);
  },

  // 처음 만났다가 잡힌 뒤, 마지막 저장 지점으로 돌아왔을 때 — 한 번만
  async retry(c) {
    if (retried || c.flag('sharkRetried')) return;
    retried = true;
    c.flag('sharkRetried', true);
    c.flag('metShark', true); // 돌아온 세이브에는 만난 기록이 없을 수 있다
    await c.say('방금 뭐였지...?', '수오');
    await c.say('나 죽은 거였나?', '수오');
    await c.say('여긴 아까 거기인데...?', '수오');
  },
};

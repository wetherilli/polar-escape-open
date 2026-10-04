// ─────────────────────────────────────────────
// 상어귀신의 저주 & 극야 — 진행도와 단계는 작가가 정한다 (지금 값은 전부 자리표시)
//
//  저주 진행도는 숫자 하나(flags.curse)다. 퀘스트를 끝내거나 숨겨진 요소를 찾는 장면에서
//  c.curse.add(1)로 올린다. max에 닿으면 저주가 풀린다(flags.curseLifted) → onLift 장면 → 극야가 끝나 새벽이 된다.
//  정문은 저주가 풀리기 전에는 나갈 수 없다(maps.js 정문).
//
// 이벤트에서 쓰는 법 (events.js의 c.curse)
//   c.curse.add(n)     진행도 올리기 (기본 1). max에 닿으면 저주가 풀린다
//   c.curse.get()      지금 진행도
//   c.curse.lifted()   풀렸나
// 맵에서 진행도에 따라 이벤트를 보이거나 숨기려면: visible: (s) => curseLevel(s) >= 2   (state.js)
//
//  stages  진행도에 따른 밤 환경. at 이상이면 그 단계가 적용된다(가장 높은 것 하나).
//          darkness  어둠 짙기 0~1 (손전등이 없을 때 등 기본 밤 조명)
//          radius    손전등 없이(또는 꺼 두었을 때) 보이는 반지름(px). 손전등을 금방 얻으므로 발밑 정도로 좁게 (작가 지침)
//          tint      화면 전체 색조 (rgba). null이면 없음
//  dawn    저주가 풀린 뒤(새벽)의 환경
// ─────────────────────────────────────────────

export const CURSE = {
  max: 3, // (자리표시) 저주를 풀려면 진행도가 몇이어야 하나

  stages: [
    { at: 0, darkness: 0.95, radius: 50, tint: null },
    { at: 1, darkness: 0.93, radius: 56, tint: 'rgba(40, 0, 60, 0.05)' },  // (자리표시) 조금씩 옅어지는 어둠
    { at: 2, darkness: 0.9, radius: 64, tint: 'rgba(20, 30, 80, 0.06)' },
  ],
  dawn: { darkness: 0.45, radius: 320, tint: 'rgba(255, 170, 120, 0.08)' },

  // 저주가 풀린 순간의 장면
  async onLift(c) {
    await c.say('(저주가 풀림 — 장면 미정)');
    c.objective('정문으로'); // (자리표시)
  },
};

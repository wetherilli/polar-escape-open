// ─────────────────────────────────────────────
// 러브버그 대발생 (작가 지침 2026-10-06)
//  평소에는 나오지 않다가, 대발생하면 그동안은 러브버그만 나온다(땅·나무·나는 빛 자리 전부).
//  언제 대발생하는지는 실제 날짜(컴퓨터 시계)의 요일과 지금 스토리의 장을 함께 본다.
//  예: 1장을 하는 화요일에는 안 나오지만, 2장을 하는 화요일에는 나온다.
//  장은 3개 또는 5개로 생각 중 — 장이 늘면 DAYS에 줄만 더한다.
//
//  DAYS     장 → 대발생할 수 있는 요일 (0 일 · 1 월 · 2 화 · 3 수 · 4 목 · 5 금 · 6 토)
//  CHANCE   그 요일에 정말 대발생할 확률. 날짜와 장으로 정해지는 난수라 같은 날·같은 장이면 몇 번을 들어가도 같다
//  시험할 때: 콘솔에서 dbg.state.flags.lovebugForce = true (끌 때 false) — 맵에 다시 들어가면 바뀐다
// ─────────────────────────────────────────────

export const DAYS = {
  1: [],
  2: [2],
  3: [2, 5],
  4: [1, 3, 5],
  5: [0, 2, 4, 6],
};
export const CHANCE = 0.7;

// 지금 장: 시작한 장 퀘스트(ch1, ch2 …) 가운데 가장 큰 번호. 아직 없으면 0(오프닝)
export function chapterOf(s) {
  let ch = 0;
  for (const id of Object.keys(s.quests ?? {})) {
    const m = /^ch(\d+)$/.exec(id);
    if (m) ch = Math.max(ch, Number(m[1]));
  }
  return ch;
}

// 같은 날·같은 장이면 늘 같은 0~1 값
function dayRandom(date, ch) {
  let h = (date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()) * 31 + ch * 7919;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function lovebugOutbreak(s, date = new Date()) {
  if (s.flags?.lovebugForce !== undefined) return !!s.flags.lovebugForce;
  const ch = chapterOf(s);
  return (DAYS[ch] ?? []).includes(date.getDay()) && dayRandom(date, ch) < CHANCE;
}

// 대발생한 날 그 맵에 처음 들어왔을 때 한 번 나오는 문구
export const OUTBREAK_NOTICE = '공기 중에 검은 날벌레가 잔뜩 떠다닌다. 두 마리씩 붙어서… 러브버그다.';
// 대발생 중에 이미 도감에 있는 러브버그를 또 잡으려 할 때
export const OUTBREAK_AGAIN = '또 러브버그다. 다른 것은 보이지 않는다.';

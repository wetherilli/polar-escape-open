// 켜고 끄는 설정 — 이 브라우저에 남는다(localStorage, 세이브와 따로). 음량은 audio.js가 따로 맡는다.
//  guide  캐릭터 둘레의 길 안내 화살표 (guide.js)
//  touch  화면 버튼(방향 패드·조사 등) — 빼면 터치 기기인지 보고 정한다 (touch.js)

const KEY = 'polar-escape/prefs';

export const prefs = { guide: true };
try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY)) ?? {}); } catch { /* 저장소가 막혀도 기본값으로 */ }

export function setPref(name, value) {
  prefs[name] = value;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* 무시 */ }
}

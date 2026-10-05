import { CURSE } from './data/curse.js?v=0.26.0';
import { HELPS } from './data/helps.js?v=0.26.0';

// 세이브 대상이 되는 진행 상태.
//  flags   이야기 진행 플래그
//  items   소지품 id 목록
//  quests  { id: { stage, done, order } } — order는 시작한 순서(목표 줄은 가장 최근 것을 보여 준다)
//  creatures { id: 'caught' | 'delivered' } — 소동물 도감. caught = 채집통에 있음, delivered = Campbell에게 건넴
//  affinity  { npcId: 숫자 } — 호감도
//  notes     [noteId] — 얻은 노트 (data/notes.js), 얻은 순서대로
//  notesRead [noteId] — 메뉴에서 펼쳐 읽은 노트 (안 읽은 것이 있으면 노트 탭에 ! 표시)
//  helps     [helpId] — 대학원생에게 받은 도움 (data/helps.js)
export const state = {
  flags: {},
  items: [],
  quests: {},
  creatures: {},
  affinity: {},
  notes: [],
  notesRead: [],
  helps: [],
};

export function resetState() {
  state.flags = {};
  state.items = [];
  state.quests = {};
  state.creatures = {};
  state.affinity = {};
  state.notes = [];
  state.notesRead = [];
  state.helps = [];
}

export const hasItem = (id) => state.items.includes(id);
export const unreadNotes = () => state.notes.filter((id) => !state.notesRead.includes(id));

// ── 세이브: 브라우저 localStorage 3슬롯 (작가 지침) ──
// 사생활 보호 창 등에서는 저장소가 막힐 수 있어 전부 try로 감싼다.
// 슬롯 1은 예전 1슬롯 시절의 열쇠(save1)를 그대로 써서 옛 세이브가 슬롯 1로 이어진다.
export const SLOT_COUNT = 3;
const slotKey = (slot) => `polar-escape/save${slot + 1}`;
const SAVE_VERSION = 1;

// slot = 0~2, pos = { map, x, y, dir }, meta = { quest, place } — 슬롯 고르는 화면에 보여 줄 요약
export function saveGame(slot, pos, meta = {}) {
  try {
    const data = {
      v: SAVE_VERSION, ...pos, meta,
      flags: state.flags, items: state.items, quests: state.quests,
      creatures: state.creatures, affinity: state.affinity, notes: state.notes, notesRead: state.notesRead, helps: state.helps,
      savedAt: Date.now(),
    };
    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function readSave(slot) {
  try {
    const data = JSON.parse(localStorage.getItem(slotKey(slot)));
    return data?.v === SAVE_VERSION ? data : null;
  } catch {
    return null;
  }
}

export const readAllSaves = () => Array.from({ length: SLOT_COUNT }, (_, i) => readSave(i));
export const hasAnySave = () => readAllSaves().some(Boolean);
// 가장 최근에 저장한 슬롯 (게임 오버 뒤 「마지막 세이브에서 다시」). 없으면 -1
export function latestSlot() {
  const saves = readAllSaves();
  return saves.reduce((best, s, i) => (s && (best < 0 || s.savedAt > saves[best].savedAt) ? i : best), -1);
}

export function applySave(data) {
  state.flags = structuredClone(data.flags);
  state.items = [...data.items];
  state.quests = structuredClone(data.quests ?? {});       // v0.6.0 전 세이브에는 없다
  state.creatures = structuredClone(data.creatures ?? {}); // v0.9.0 전 세이브에는 없다
  state.affinity = structuredClone(data.affinity ?? {});
  state.notes = [...(data.notes ?? [])];                   // v0.15.0 전 세이브에는 없다
  state.notesRead = [...(data.notesRead ?? data.notes ?? [])]; // 옛 세이브는 다 읽은 것으로
  state.helps = [...(data.helps ?? [])];                   // v0.16.0 전 세이브에는 없다
}

// ── 저주 (data/curse.js) ──
export const curseLevel = (s = state) => s.flags.curse ?? 0;
// 지금 밤 환경: 저주가 풀렸으면 새벽, 아니면 진행도에 맞는 가장 높은 단계
export function curseEnv(s = state) {
  if (s.flags.curseLifted) return CURSE.dawn;
  const lv = curseLevel(s);
  return CURSE.stages.filter((st) => lv >= st.at).at(-1) ?? CURSE.stages[0];
}

// ── 대학원생의 도움 (data/helps.js) ──
// 숫자 효과: 받은 도움들의 값을 곱한다(없으면 1). 목록 효과(reveal·open): 합친다.
export const helpMult = (key) => state.helps.reduce((m, id) => m * (HELPS[id]?.effects?.[key] ?? 1), 1);
export const helpTags = (key) => state.helps.flatMap((id) => HELPS[id]?.effects?.[key] ?? []);

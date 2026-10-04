export const TILE = 32;
export const VIEW_COLS = 20;
export const VIEW_ROWS = 15;
export const SCREEN_W = TILE * VIEW_COLS; // 640
export const SCREEN_H = TILE * VIEW_ROWS; // 480

export const MOVE_SPEED = 5;   // 초당 이동 타일 수

// 달리기 (Shift). 스태미나는 0~1이고 세이브하지 않는다.
export const RUN_SPEED = 7.5;      // 달릴 때 초당 타일 수
export const STAMINA_DRAIN = 3;    // 가득 찬 스태미나로 몇 초 달릴 수 있나
export const STAMINA_REGEN = 5;    // 바닥에서 가득 찰 때까지 몇 초 (달리지 않을 때)
export const STAMINA_RECOVER = 0.3; // 바닥난 뒤 여기까지 차야 다시 달릴 수 있다
export const TEXT_SPEED = 45;  // 초당 출력 글자 수

export const DIRS = {
  up:    { x: 0,  y: -1 },
  down:  { x: 0,  y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1,  y: 0 },
};

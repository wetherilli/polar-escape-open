// 아이템 정의. 이벤트에서 c.give('id')로 지급하면 HUD에 name이, 메뉴 소지품에 desc와 flavor가 나온다.
//  desc    무엇에 쓰는지 (설명)
//  flavor  플레이버 텍스트 — 메뉴에서 설명 아래에 다른 색으로 나온다. 비워 둬도 된다.
//  consumable: true면 소모품 — 여러 개를 가질 수 있고(c.give('id', 3)), 쓸 때마다 하나씩 준다.
//              HUD·메뉴에는 「이름 ×개수」로 묶여 보인다.
//  iconImage   사람이 그린 아이콘 그림 경로 (예: 'assets/icons/flashlight.png'). 없으면 render.js ICONS의 같은 id 그림,
//              그것도 없으면 상자 그림이 이름 왼쪽 칸에 나온다.
//  use         async (c) => {} — 소지품에서 「사용」(Enter)했을 때의 스크립트. 바라보는 이벤트에 그 아이템의 useItem이
//              있으면 그쪽이 먼저 돈다(maps.js). 둘 다 없으면 「(여기서는 쓸 데가 없다)」.
export const ITEMS = {
  visitorPass: { name: '방문증', desc: '(설명 미정)', flavor: '(플레이버 텍스트 미정)' },
  // 번역기: 가지고 있으면 영어 대사에 한국어 자막이 붙는다. 진행 조건으로는 쓰지 않는다.
  translator: { name: '번역기', desc: '(설명 미정)', flavor: '(플레이버 텍스트 미정)' },
  // 비상용 손전등: 북서동 1층 화장실 옆 소방함. 가지고 있으면 밤에 앞쪽을 부채꼴로 비춘다.
  //   「사용」하면 L 키처럼 켜고 끈다.
  flashlight: {
    name: '비상용 손전등', desc: '(설명 미정)', flavor: '(플레이버 텍스트 미정)',
    use(c) { c.flag('flashlightOn', !c.flag('flashlightOn')); c.sfx('light'); },
  },
  // ── 소동물 채집 도구 (creatures.js의 tools) ──
  net: { name: '잠자리채', desc: '(설명 미정)', flavor: '(플레이버 텍스트 미정)' },
  jar: {
    name: '채집통', consumable: true,
    desc: '(설명 미정) — 소모품, 소동물을 하나 잡을 때마다 하나씩 쓴다',
    flavor: '(플레이버 텍스트 미정)',
  },
  // 305호 창고에서 다섯 개. 잔해·고인 물에서 의심스러운 것을 떠 담고, 현미경으로 확인한다
  vial: {
    name: '시료병', consumable: true,
    desc: '뚜껑 달린 작은 유리병. 눈에 보이지 않을 만큼 작은 것을 떠 담아 현미경으로 들여다본다 — 소모품',
    flavor: '(플레이버 텍스트 미정)',
  },
  // 시료병에 떠 간 시료 — 305호·광학현미경실의 현미경으로 들여다보면 무엇이 들었는지 안다 (creatures.js SPOTS.rubble·puddle)
  sampleRubble: {
    name: '잔해 시료', consumable: true,
    desc: '무너진 잔해에서 떠 온 시료. 현미경으로 들여다보면 무엇이 들었는지 알 수 있다.',
    flavor: '(플레이버 텍스트 미정)',
  },
  samplePuddle: {
    name: '고인 물 시료', consumable: true,
    desc: '고인 물을 떠 온 시료. 현미경으로 들여다보면 무엇이 들었는지 알 수 있다.',
    flavor: '(플레이버 텍스트 미정)',
  },
  // 305호 창고 선반 안쪽. 새·너구리·고양이처럼 잡을 수 없는 동물은 사진으로 기록한다
  camera: {
    name: '카메라',
    desc: '연구용 디지털 카메라. 잡을 수 없는 큰 동물을 찍어 도감에 기록한다.',
    flavor: '(플레이버 텍스트 미정)',
  },

  exampleItem: { name: '청현의 휴대폰', desc: '청현이 냉동실험실에 두고 온 휴대폰. 차갑게 식어 있다.' },
};

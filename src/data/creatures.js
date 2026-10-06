// ─────────────────────────────────────────────
// 소동물 도감 — 주요 수집 요소. Campbell이 준 목록(KOPRI Animal List, 56종, 2026-10-06)
//  잡거나 찍으면 도감에 등록되고 → Campbell에게 가져가면 호감도가 오른다.
//  설명·플레이버·힌트·반응은 Claude 초안(생태 사실 바탕) — 작가가 고쳐 쓴다. 대사 편집기에서 반응을 고칠 수 있다.
//
//  name      도감·알림 이름 (한국어)
//  en        영문명 · species 학명 · taxon 분류(문 · 강 · 목) — 도감에 함께 보인다
//  where     'inside' | 'outside' | 'any' — 도감에 「연구소 안 / 밖 / 어디서나」
//  spots     어디서 나오나 (SPOTS의 이름, 여럿이면 그중 아무 데서나):
//              ground 땅(잔디·화단의 꼼지락거리는 것) · wall 벽(가까이 가서 조사) · tree 강조된 나무 · flying 나는 빛
//              rubble·puddle 시료(잔해·고인 물 → 시료병 → 현미경) · observe 관찰(돌아다니다 멈춘 동물 → 카메라) · tank 사육 개체
//            같은 자리를 나누는 종끼리는 조사할 때 희귀도 가중치로 하나가 뽑힌다(RARITY.weight)
//  rarity    1 아주 흔함 ~ 5 아주 희귀, 'special' 특별 — 도감에 별 개수와 글자 색으로
//  event     true면 확률 뽑기에서 빠진다(러브버그처럼 따로 나오는 종)
//  tools     잡는 도구(items.js id). 없으면 자리(SPOTS)의 도구. 하나만 있으면 된다. 소모품이면 하나 쓴다
//  sound     울음소리가 있는 종 (audio.js의 이름) — 가까이 가면 들린다
//  heard     그 울음을 처음 가까이서 들었을 때 한 번 나오는 문구 (main.js 소리 힌트)
//  hint      못 찾았을 때 도감 ??? 칸에 보이는 힌트
//  desc      도감 설명 · flavor 플레이버 텍스트(설명 아래 다른 색)
//  affinity  Campbell에게 건넸을 때 오르는 호감도. 없으면 희귀도에 따라(RARITY.affinity)
//  reaction  { en, ko } — 건넸을 때 Campbell의 반응 (ko는 번역기 자막). 한 줄에 쓴다(대사 편집기)
//  icon      도감 아이콘 (render.js ICONS) · tint 아이콘 색 바꾸기 { 글자: 색 } — 비슷한 종은 아이콘을 돌려쓰고 색만 바꾼다
//  iconImage 사람이 그린 아이콘 그림 경로 (예: 'assets/icons/이름.png'). 주면 icon 대신 이것을 쓴다
//
// 고정 자리(수조 등)는 maps.js의 creatureSpot('id'), 무작위 자리는 맵의 creatureSpots(src/spots.js)로 둔다.
// ─────────────────────────────────────────────

// 희귀도: 별 개수 · 이름 · 글자 색 · 뽑기 가중치 · 기본 호감도 · appear 관찰 동물이 맵에 나올 확률(들어올 때마다)
export const RARITY = {
  1: { stars: '★', label: '아주 흔함', color: '#b8c0ca', weight: 40, affinity: 1, appear: 0.9 },
  2: { stars: '★★', label: '흔함', color: '#8fd18a', weight: 25, affinity: 1, appear: 0.75 },
  3: { stars: '★★★', label: '드묾', color: '#7fb5f0', weight: 12, affinity: 2, appear: 0.5 },
  4: { stars: '★★★★', label: '희귀', color: '#c49af0', weight: 5, affinity: 3, appear: 0.3 },
  5: { stars: '★★★★★', label: '아주 희귀', color: '#ffd166', weight: 1.5, affinity: 5, appear: 0.12 },
  special: { stars: '◆', label: '특별', color: '#f59ac0', weight: 5, affinity: 3, appear: 1 },
};

// 채집 자리: 필요한 도구 · 조사했을 때의 첫 문구 · 도감 힌트 앞머리
//  시료 자리(rubble·puddle)는 plain = 아무것도 없을 때 문구, sample = 떠 간 시료 아이템(items.js)
export const SPOTS = {
  ground: { tools: ['jar'], notice: '풀숲에서 무언가 꼼지락거린다.', hint: '땅' },
  wall: { tools: ['jar'], notice: '벽 틈에 무언가 붙어 있다.', hint: '벽' },
  tree: { tools: ['net'], notice: '나무 위에서 무언가 움직였다.', hint: '강조된 나무' },
  flying: { tools: ['net'], notice: '작은 빛이 눈앞을 맴돈다.', hint: '나는 빛' },
  rubble: { tools: ['vial'], notice: '잔해 틈에 무언가 의심스러운 것이 묻어 있다.', plain: '무너진 잔해다. 별다른 것은 보이지 않는다.', sample: 'sampleRubble', hint: '시료' },
  puddle: { tools: ['vial'], notice: '고인 물속에 무언가 의심스러운 것이 떠 있다.', plain: '고인 물이다. 별다른 것은 보이지 않는다.', sample: 'samplePuddle', hint: '시료' },
  observe: { tools: ['camera'], notice: '동물이 걸음을 멈췄다.', hint: '관찰' },
  tank: { tools: [], notice: '', hint: '사육' },
};

export const CREATURES = {
  slimeMould: {
    name: '격벽검뎅이먼지', en: 'Slime Mould', species: 'Fuligo septica', taxon: 'Amoebozoa · Myxogastria · Physarales',
    where: 'outside', spots: ['tree'], tools: ['net', 'jar'], rarity: 5, icon: 'slime', tint: { a: '#e8c43a', A: '#b08a20', z: '#fff1a0' },
    hint: '강조된 나무 — 오래된 그루터기 쪽',
    desc: '동물도 식물도 균류도 아닌 변형균이다. 비 온 뒤 썩은 나무와 그루터기 위에 노란 거품 덩어리처럼 퍼졌다가, 마르면 검은 포자 덩어리가 된다.',
    flavor: '영어 별명은 차마 옮길 수 없다. 개가… 아무튼 그런 뜻이다.',
    reaction: { en: 'A slime mould! Technically not even an animal, but I will allow it.', ko: '점균이다! 엄밀히 말하면 동물도 아니지만, 봐줄게.' },
  },
  earthworm: {
    name: '지렁이', en: 'Earthworm', species: 'Metaphire hilgendorfi', taxon: 'Annelida · Clitellata · Opisthopora',
    where: 'outside', spots: ['ground'], rarity: 3, icon: 'worm', tint: { a: '#c27a6a', A: '#9a5248', z: '#d89080' },
    hint: '땅 — 축축한 잔디밭',
    desc: '흙을 먹고 그 속의 유기물을 소화한 뒤 다시 흙으로 내보낸다. 덕분에 땅이 부드러워지고 기름져진다. 비가 오면 땅 위로 기어 나오곤 한다.',
    flavor: '밤의 잔디밭은 생각보다 바쁘다.',
    reaction: { en: 'A big healthy earthworm. The soil here must be good.', ko: '크고 튼튼한 지렁이네. 여기 흙이 좋은가 봐.' },
  },
  houseSpider: {
    name: '별무늬꼬마거미', en: 'Triangulate House Spider', species: 'Steatoda triangulosa', taxon: 'Arthropoda · Arachnida · Araneae',
    where: 'inside', spots: ['wall'], rarity: 3, icon: 'spider', tint: { a: '#7a4a2a', A: '#e8d8b0', z: '#e8d8b0' },
    hint: '벽 — 건물 안 구석',
    desc: '배에 삼각형 무늬가 줄지어 있는 작은 거미. 건물 구석에 엉성한 그물을 치고 개미 같은 작은 벌레를 잡는다.',
    flavor: '구석의 거미줄 주인. 청소 담당자와는 사이가 나쁘다.',
    reaction: { en: 'Steatoda! They keep the corners free of pests.', ko: '꼬마거미다! 구석의 해충을 잡아 주는 고마운 녀석이야.' },
  },
  mite: {
    name: '굵은다리가루진드기', en: 'Flour Mite', species: 'Acarus siro', taxon: 'Arthropoda · Arachnida · Sarcoptiformes',
    where: 'any', spots: ['rubble'], rarity: 2, icon: 'microbe', tint: { a: '#e8dcc0', A: '#b8a880' },
    hint: '시료 — 잔해를 시료병에 떠서 현미경으로',
    desc: '몸길이 0.5mm 안팎의 진드기. 밀가루·곡물 같은 마른 식량 속에서 살며 번식한다.',
    flavor: '현미경 아래에서는 꽤 늠름하다.',
    reaction: { en: 'Flour mites. Please tell me you did not find these in the cafe.', ko: '가루진드기네. 설마 카페에서 찾은 건 아니지?' },
  },
  houseCentipede: {
    name: '혹그리마', en: 'House Centipede', species: 'Thereuonema tuberculata', taxon: 'Arthropoda · Chilopoda · Scutigeromorpha',
    where: 'inside', spots: ['ground'], rarity: 2, icon: 'centipede', tint: { a: '#a08a6a', A: '#6a5a40', k: '#8a7a60', z: '#6a5a40' },
    hint: '땅 — 건물 안 어두운 바닥',
    desc: '긴 다리 열다섯 쌍으로 아주 빠르게 달리는 그리마. 바퀴벌레 같은 집 안의 벌레를 잡아먹는다.',
    flavor: '보기에는 무서워도 집 안에서는 익충이다.',
    reaction: { en: 'A house centipede! So many legs, so little time.', ko: '그리마다! 다리는 많고 시간은 없지.' },
  },
  blueCentipede: {
    name: '장수지네', en: 'Blue Centipede', species: 'Otostigmus politus', taxon: 'Arthropoda · Chilopoda · Scolopendromorpha',
    where: 'outside', spots: ['ground'], rarity: 4, icon: 'centipede', tint: { a: '#3a5a7a', A: '#24384e', k: '#c8a040', z: '#c8a040' },
    hint: '땅 — 돌과 낙엽 밑',
    desc: '푸르스름한 몸에 독이 있는 큰 턱을 가진 지네. 낮에는 돌과 낙엽 밑에 숨어 있다가 밤에 사냥한다.',
    flavor: '잡을 때는 머리 쪽을 조심할 것.',
    reaction: { en: 'Careful, that one bites! Nice find, though.', ko: '조심해, 그거 물어! 그래도 잘 찾았어.' },
  },
  millipede: {
    name: '황주까막노래기', en: 'Millipede', species: 'Orthomorphella pekuensis', taxon: 'Arthropoda · Diplopoda · Polydesmida',
    where: 'outside', spots: ['ground'], rarity: 1, icon: 'centipede', tint: { a: '#3a2e28', A: '#5a4636', k: '#c09060', z: '#c09060' },
    hint: '땅 — 썩은 낙엽 근처',
    desc: '몸마디마다 다리가 두 쌍씩 있는 노래기. 썩은 낙엽을 먹으며, 건드리면 몸을 말고 냄새 나는 물질을 낸다.',
    flavor: '지네와 헷갈리면 노래기가 섭섭해한다.',
    reaction: { en: 'A millipede. Smell your hands later, you will see.', ko: '노래기네. 이따 손 냄새 맡아 봐, 알게 될 거야.' },
  },
  orientalBeetle: {
    name: '동양풍뎅이', en: 'Oriental Beetle', species: 'Exomala orientalis', taxon: 'Arthropoda · Insecta · Coleoptera',
    where: 'outside', spots: ['ground'], rarity: 2, icon: 'beetle', tint: { e: '#b89a50', E: '#3a2a1a' },
    hint: '땅 — 잔디밭과 화단',
    desc: '잔디밭에 흔한 작은 풍뎅이. 애벌레는 땅속에서 잔디 뿌리를 갉아 먹는다.',
    flavor: '잔디 관리하시는 분이 이 녀석을 싫어한다.',
    reaction: { en: 'An oriental beetle. The groundskeepers will not miss it.', ko: '동양풍뎅이네. 조경 담당하시는 분들은 아쉬워하지 않을 거야.' },
  },
  ladybird: {
    name: '무당벌레', en: 'Asian Ladybird', species: 'Harmonia axyridis', taxon: 'Arthropoda · Insecta · Coleoptera',
    where: 'outside', spots: ['ground'], rarity: 1, icon: 'beetle', tint: { e: '#d0402a', E: '#1b1f27' },
    hint: '땅 — 화단의 풀',
    desc: '등의 점무늬가 개체마다 제각각인 무당벌레. 진딧물을 잡아먹고, 늦가을에는 떼 지어 건물 틈에서 겨울을 난다.',
    flavor: '점을 세어 봤자 나이는 알 수 없다.',
    reaction: { en: 'Harmonia axyridis. Every single one has a different pattern!', ko: '무당벌레야. 하나하나 무늬가 다 달라!' },
  },
  lovebug: {
    name: '러브버그', en: 'Love Bug', species: 'Plecia longiforceps', taxon: 'Arthropoda · Insecta · Diptera',
    where: 'outside', spots: ['ground', 'tree', 'flying'], rarity: 'special', event: true, icon: 'fly', tint: { a: '#1b1f27', A: '#c8402d', z: '#c8402d' },
    hint: '언젠가 갑자기 — 어느 날, 어느 장에',
    desc: '짝짓기한 채 두 마리가 붙어서 날아다니는 털파리. 초여름 도시에 갑자기 대발생했다가 금세 사라진다.',
    flavor: '한 마리를 보면 백 마리가 있다.',
    reaction: { en: 'Oh no. If there is one, there are thousands.', ko: '아 안 돼. 한 마리 있으면 수천 마리야.' },
  },
  robberFly: {
    name: '파리매', en: 'Robber Fly', species: 'Promachus yesonicus', taxon: 'Arthropoda · Insecta · Diptera',
    where: 'outside', spots: ['flying'], rarity: 3, icon: 'fly', tint: { a: '#6a5a40', A: '#c8b070', z: '#e0b040' },
    hint: '나는 빛 — 트인 곳',
    desc: '날아가는 다른 곤충을 공중에서 낚아채는 사냥꾼 파리. 잡은 먹이에 침 같은 입을 꽂아 체액을 빨아 먹는다.',
    flavor: '파리라고 얕보면 곤란하다.',
    reaction: { en: 'A robber fly. The tiger of the insect world.', ko: '파리매다. 곤충계의 호랑이지.' },
  },
  cicadaHorse: {
    name: '말매미', en: 'Eastern Horse Cicada', species: 'Cryptotympana atrata', taxon: 'Arthropoda · Insecta · Hemiptera',
    where: 'outside', spots: ['tree'], rarity: 2, sound: 'cicadaHorse', icon: 'cicada', tint: { a: '#2a2a2a', A: '#1b1b1b', x: '#9aa3ad', z: '#c8a040' },
    hint: '강조된 나무 — 쏴아 하는 큰 소리',
    heard: '가까운 나무에서 「쏴아아아—」 하는 큰 소리가 쏟아진다.',
    desc: '우리나라에서 가장 큰 매미. 도시 가로수에 많고, 「쏴아」 하는 큰 소리로 운다.',
    flavor: '여름 한낮 소음 민원의 단골 주인공.',
    reaction: { en: 'The loudest one! I can hear it from my desk every summer.', ko: '제일 시끄러운 녀석! 여름마다 내 자리까지 들려.' },
  },
  cicadaRobust: {
    name: '참매미', en: 'Robust Cicada', species: 'Hyalessa maculaticollis', taxon: 'Arthropoda · Insecta · Hemiptera',
    where: 'outside', spots: ['tree'], rarity: 2, sound: 'cicadaRobust', icon: 'cicada', tint: { a: '#3f6a3a', A: '#1f2a1a', x: '#d8e8ea', z: '#7aa060' },
    hint: '강조된 나무 — 맴맴',
    heard: '어디선가 「맴맴맴맴—」 하는 소리가 들린다.',
    desc: '「맴맴」 하고 우는, 가장 익숙한 매미 소리의 주인. 초록과 검정 얼룩무늬 몸에 투명한 날개를 가졌다.',
    flavor: '「매미 소리」라고 하면 대개 이 녀석이다.',
    reaction: { en: 'Meem meem meem! The classic.', ko: '맴맴맴! 이게 정석이지.' },
  },
  cicadaWalker: {
    name: '애매미', en: "Walker's Cicada", species: 'Sinfonia opalifera', taxon: 'Arthropoda · Insecta · Hemiptera',
    where: 'outside', spots: ['tree'], rarity: 4, sound: 'cicadaWalker', icon: 'cicada', tint: { a: '#4a5a3a', A: '#2a3220', x: '#d8e8ea', z: '#9ab070' },
    hint: '강조된 나무 — 소리를 바꿔 가며 길게',
    heard: '나무 쪽에서 소리를 이리저리 바꿔 가며 우는 소리가 들린다.',
    desc: '가늘고 날씬한 매미. 소리를 이리저리 바꿔 가며 길게 운다.',
    flavor: '노래를 제일 길게 끄는 매미.',
    reaction: { en: 'Listen to this one sing. It never does it the same way twice.', ko: '이 녀석 노래 들어 봐. 같은 소리를 두 번 안 내.' },
  },
  cicadaAutumn: {
    name: '쓰름매미', en: 'Autumn Cicada', species: 'Streeyola mongolica', taxon: 'Arthropoda · Insecta · Hemiptera',
    where: 'outside', spots: ['tree'], rarity: 3, sound: 'cicadaAutumn', icon: 'cicada', tint: { a: '#5a6a4a', A: '#3a4230', x: '#d8e8ea', z: '#a0b080' },
    hint: '강조된 나무 — 쓰름 쓰름',
    heard: '「쓰름— 쓰름—」 하는 소리가 들린다. 여름이 끝나 가는 소리다.',
    desc: '「쓰름 쓰름」 하고 우는 매미. 늦여름에 많이 울어 여름의 끝을 알린다.',
    flavor: '이 소리가 들리면 방학이 얼마 안 남았다.',
    reaction: { en: 'An autumn cicada. Summer is nearly over, then.', ko: '쓰름매미네. 그럼 여름도 거의 끝났구나.' },
  },
  cicadaKaempfer: {
    name: '털매미', en: "Kaempfer's Cicada", species: 'Platypleura kaempferi', taxon: 'Arthropoda · Insecta · Hemiptera',
    where: 'outside', spots: ['tree'], rarity: 3, sound: 'cicadaKaempfer', icon: 'cicada', tint: { a: '#6a5a48', A: '#4a3e30', x: '#a09078', z: '#c0b090' },
    hint: '강조된 나무 — 나무껍질을 잘 볼 것',
    heard: '나무껍질 쪽에서 「지이이이—」 하는 낮은 소리가 들린다.',
    desc: '몸이 짧고 통통하며 잔털이 많은 매미. 얼룩덜룩한 날개가 나무껍질과 비슷해 잘 숨는다.',
    flavor: '나무껍질인 줄 알았는데 울었다.',
    reaction: { en: 'Look at that camouflage! Perfect bark.', ko: '위장 좀 봐! 완벽한 나무껍질이야.' },
  },
  coniferBug: {
    name: '소나무허리노린재', en: 'Western Conifer Seed Bug', species: 'Leptoglossus occidentalis', taxon: 'Arthropoda · Insecta · Hemiptera',
    where: 'outside', spots: ['ground'], rarity: 3, icon: 'beetle', tint: { e: '#8a5a3a', E: '#e0c080' },
    hint: '땅 — 소나무 근처',
    desc: '북아메리카에서 들어온 노린재. 뒷다리에 잎사귀처럼 넓적한 부분이 있고, 솔방울 속 씨앗의 즙을 빨아 먹는다.',
    flavor: '가을이면 따뜻한 건물 안으로 들어오려 한다.',
    reaction: { en: 'An invasive one. Came all the way from North America, like me from Britain.', ko: '외래종이네. 북미에서 여기까지 왔어. 나는 영국에서 왔고.' },
  },
  lanternfly: {
    name: '꽃매미', en: 'Spotted Lanternfly', species: 'Lycorma delicatula', taxon: 'Arthropoda · Insecta · Hemiptera',
    where: 'outside', spots: ['tree'], rarity: 3, icon: 'butterfly', tint: { a: '#b0a898', A: '#c8402d', z: '#1b1f27' },
    hint: '강조된 나무 — 줄기에 붙어 있다',
    desc: '중국에서 들어온 곤충. 회색 앞날개를 펴면 새빨간 뒷날개가 드러나고, 가죽나무와 포도나무의 즙을 빨아 먹는다.',
    flavor: '이름은 매미지만 매미가 아니다.',
    reaction: { en: 'A spotted lanternfly. Pretty, but the vineyards hate it.', ko: '꽃매미다. 예쁘긴 한데 포도밭에서는 질색하지.' },
  },
  woodAnt: {
    name: '곰개미', en: 'Wood Ant', species: 'Formica japonica', taxon: 'Arthropoda · Insecta · Hymenoptera',
    where: 'outside', spots: ['ground'], rarity: 2, icon: 'ant', tint: { a: '#2a2a30' },
    hint: '땅 — 볕이 잘 드는 곳',
    desc: '검고 윤기 나는 개미. 양지바른 땅속에 집을 짓고 부지런히 먹이를 나른다.',
    flavor: '한 마리를 잡았다. 나머지 수천 마리는 신경 쓰지 않는다.',
    reaction: { en: 'Formica japonica. One down, about ten thousand to go.', ko: '곰개미네. 한 마리 잡았고, 만 마리쯤 남았어.' },
  },
  carpenterBee: {
    name: '어리호박벌', en: 'Carpenter Bee', species: 'Xylocopa appendiculata', taxon: 'Arthropoda · Insecta · Hymenoptera',
    where: 'outside', spots: ['flying'], rarity: 3, icon: 'bee', tint: { a: '#1b1f27', A: '#3a3f4a', z: '#e8c43a' },
    hint: '나는 빛 — 꽃 근처',
    desc: '통통하고 털이 많은 큰 벌. 죽은 나무나 목재에 굴을 뚫어 둥지를 만든다.',
    flavor: '덩치에 비해 순하다. 수컷은 침도 없다.',
    reaction: { en: 'A carpenter bee! Big, fluffy and very polite.', ko: '어리호박벌! 크고 복슬복슬하고 아주 얌전해.' },
  },
  pavementAnt: {
    name: '주름개미', en: 'Pavement Ant', species: 'Tetramorium tsushimae', taxon: 'Arthropoda · Insecta · Hymenoptera',
    where: 'outside', spots: ['ground'], rarity: 1, icon: 'ant', tint: { a: '#6a4a30' },
    hint: '땅 — 보도블록 근처',
    desc: '머리와 가슴에 잔주름이 진 작은 개미. 보도블록 틈에 집을 짓고 산다.',
    flavor: '보도블록 사이의 흙더미는 대개 이들의 공사 흔적이다.',
    reaction: { en: 'Tiny! I had to squint to see it.', ko: '작다! 눈을 가늘게 뜨고 봐야 보이네.' },
  },
  paleGrassBlue: {
    name: '남방부전나비', en: 'Pale Grass Blue', species: 'Pseudozizeeria maha', taxon: 'Arthropoda · Insecta · Lepidoptera',
    where: 'outside', spots: ['tree'], rarity: 3, icon: 'butterfly', tint: { a: '#9ab8e0', A: '#7a98c0', z: '#e8eef8' },
    hint: '강조된 나무 — 잎 뒤에서 잠든 것',
    desc: '날개 윗면이 연한 하늘색인 작은 부전나비. 애벌레는 괭이밥 잎을 먹고 자라서, 도시 화단에서도 흔하다.',
    flavor: '잎 뒤에서 날개를 접고 자고 있었다.',
    reaction: { en: 'A little blue. They sleep under leaves at night, you know.', ko: '부전나비네. 밤에는 잎 뒤에서 자거든.' },
  },
  caterpillar: {
    name: '애벌레', en: 'Caterpillar', species: 'Monema flavescens', taxon: 'Arthropoda · Insecta · Lepidoptera',
    where: 'outside', spots: ['tree'], rarity: 3, icon: 'caterpillar', tint: { a: '#8ac04a', A: '#c8402d', z: '#e8c43a' },
    hint: '강조된 나무 — 잎을 갉은 자국',
    desc: '노랑쐐기나방의 애벌레. 초록 몸에 독침 돌기가 돋아 있어, 맨살에 닿으면 쏘인 듯 아프다.',
    flavor: '「쐐기에 쏘였다」의 그 쐐기다.',
    reaction: { en: 'Do not touch the spines! Good thing you used the net.', ko: '가시 만지지 마! 잠자리채 써서 다행이다.' },
  },
  cocoon: {
    name: '번데기', en: 'Cocoon', species: 'Monema flavescens', taxon: 'Arthropoda · Insecta · Lepidoptera',
    where: 'outside', spots: ['tree'], rarity: 3, icon: 'cocoon', tint: { a: '#ece4d4', A: '#7a5a3a' },
    hint: '강조된 나무 — 가지에 붙은 새알 같은 것',
    desc: '노랑쐐기나방 애벌레가 나뭇가지에 만든 고치. 새알처럼 단단하고, 흰 바탕에 갈색 줄무늬가 있다.',
    flavor: '이 안에서 무언가가 다시 만들어지고 있다.',
    reaction: { en: 'A cocoon. Come spring, this will be a moth.', ko: '고치네. 봄이 되면 나방이 될 거야.' },
  },
  moth: {
    name: '노랑쐐기나방', en: 'Moth', species: 'Monema flavescens', taxon: 'Arthropoda · Insecta · Lepidoptera',
    where: 'outside', spots: ['tree'], rarity: 3, icon: 'butterfly', tint: { a: '#e0b040', A: '#a07a30', z: '#7a5a3a' },
    hint: '강조된 나무 — 잎에 앉아 쉬는 것',
    desc: '쐐기 애벌레가 자라 된 나방. 노란 날개에 갈색 무늬가 있다. 어른벌레는 독침이 없다.',
    flavor: '애벌레·번데기·나방을 모두 모으면 한살이가 이어진다.',
    reaction: { en: 'The adult moth. Much less spiky than the caterpillar.', ko: '어른벌레 나방이야. 애벌레보다 훨씬 덜 따갑지.' },
  },
  mantisGiant: {
    name: '넓적배사마귀', en: 'Giant Asian Mantis', species: 'Hierodula patellifera', taxon: 'Arthropoda · Insecta · Mantodea',
    where: 'outside', spots: ['tree', 'wall'], rarity: 2, icon: 'mantis', tint: { a: '#6aa04a', A: '#4a7a30', z: '#e8e070' },
    hint: '강조된 나무나 건물 외벽',
    desc: '배가 넓적하고 앞날개에 흰 점이 하나 있는 사마귀. 나무 위나 벽에 붙어 다가오는 벌레를 기다린다.',
    flavor: '눈이 마주쳤다. 먼저 고개를 돌린 건 이쪽이었다.',
    reaction: { en: 'Hierodula! Look at the white spot on the wings.', ko: '넓적배사마귀! 날개의 흰 점 봐.' },
  },
  mantisChinese: {
    name: '왕사마귀', en: 'Chinese Mantis', species: 'Tenodera sinensis', taxon: 'Arthropoda · Insecta · Mantodea',
    where: 'outside', spots: ['tree', 'wall'], rarity: 2, icon: 'mantis', tint: { a: '#7aa050', A: '#a08a50', z: '#e8e070' },
    hint: '강조된 나무나 건물 외벽',
    desc: '우리나라에서 가장 큰 사마귀. 몸길이가 손바닥만 하고, 가을이면 나뭇가지에 거품 같은 알집을 붙인다.',
    flavor: '앞다리에 잡히면 놓아주지 않는다.',
    reaction: { en: 'The big one! Mind the forelegs.', ko: '큰 녀석이다! 앞다리 조심해.' },
  },
  mantisJumping: {
    name: '좀사마귀', en: 'Asian Jumping Mantis', species: 'Statilia maculata', taxon: 'Arthropoda · Insecta · Mantodea',
    where: 'outside', spots: ['tree', 'wall'], rarity: 3, icon: 'mantis', tint: { a: '#8a6a48', A: '#5a4430', z: '#d8c090' },
    hint: '강조된 나무나 건물 외벽 — 갈색이라 잘 안 보인다',
    desc: '작은 갈색 사마귀. 낙엽과 나무껍질 색을 닮아 잘 숨고, 앞다리 안쪽에 검은 무늬가 있다.',
    flavor: '작아도 사마귀는 사마귀다.',
    reaction: { en: 'A small brown one. Easy to miss.', ko: '작은 갈색 녀석. 놓치기 쉽지.' },
  },
  mantisEuropean: {
    name: '황라사마귀', en: 'European Mantis', species: 'Mantis religiosa', taxon: 'Arthropoda · Insecta · Mantodea',
    where: 'outside', spots: ['tree', 'wall'], rarity: 5, icon: 'mantis', tint: { a: '#a0c060', A: '#7a9a40', z: '#1b1f27' },
    hint: '강조된 나무나 건물 외벽 — 아주 드물다',
    desc: '앞다리 밑동 안쪽에 검은 테를 두른 무늬가 있는 사마귀. 우리나라에서는 보기 드물다.',
    flavor: '앞다리를 모은 자세 때문에 영어로는 「기도하는 사마귀」.',
    reaction: { en: 'Mantis religiosa! I have only ever seen these in books here.', ko: '황라사마귀! 여기선 책에서만 봤는데.' },
  },
  dragonfly: {
    name: '된장잠자리', en: 'Wandering Glider', species: 'Pantala flavescens', taxon: 'Arthropoda · Insecta · Odonata',
    where: 'outside', spots: ['flying'], rarity: 2, icon: 'dragonfly', tint: { a: '#d0a040', A: '#a07a30', z: '#c8402d' },
    hint: '나는 빛 — 트인 곳',
    desc: '누런 된장색 몸의 잠자리. 바람을 타고 바다를 건너 대륙 사이를 오가는, 가장 멀리 나는 곤충 가운데 하나다.',
    flavor: '이 녀석은 어쩌면 남쪽 나라에서 왔을지도 모른다.',
    reaction: { en: 'A wandering glider. They cross whole oceans, you know.', ko: '된장잠자리네. 바다도 건너는 녀석이야.' },
  },
  longheadedLocust: {
    name: '방아깨비', en: 'Long-headed Locust', species: 'Acrida cinerea', taxon: 'Arthropoda · Insecta · Orthoptera',
    where: 'outside', spots: ['ground'], rarity: 2, icon: 'hopper', tint: { a: '#8ac060', A: '#6aa040', z: '#e8e070' },
    hint: '땅 — 풀이 긴 곳',
    desc: '머리가 뾰족하고 몸이 가는 큰 메뚜기. 뒷다리를 잡으면 방아를 찧듯 몸을 끄덕인다.',
    flavor: '방아를 몇 번 찧었는지는 비밀이다.',
    reaction: { en: 'Acrida! Hold its legs and it bows to you.', ko: '방아깨비! 다리를 잡으면 꾸벅꾸벅 인사해.' },
  },
  fieldCricket: {
    name: '왕귀뚜라미', en: 'Large Field Cricket', species: 'Teleogryllus emma', taxon: 'Arthropoda · Insecta · Orthoptera',
    where: 'outside', spots: ['ground'], rarity: 2, sound: 'cricket', icon: 'hopper', tint: { a: '#3a2a1a', A: '#2a1e14', z: '#8a6a40' },
    hint: '땅 — 귀뚤귀뚤',
    heard: '풀숲에서 「귀뚤귀뚤」 소리가 들린다.',
    desc: '가을밤 「귀뚤귀뚤」 소리의 주인. 수컷이 날개를 비벼 소리를 내 암컷을 부른다.',
    flavor: '울음소리를 따라가면 대개 바로 앞에서 그친다.',
    reaction: { en: 'An Emma field cricket. The sound of autumn.', ko: '왕귀뚜라미야. 가을의 소리지.' },
  },
  smallLocust: {
    name: '섬서구메뚜기', en: 'Small Long-headed Locust', species: 'Atractomorpha lata', taxon: 'Arthropoda · Insecta · Orthoptera',
    where: 'outside', spots: ['ground'], rarity: 4, icon: 'hopper', tint: { a: '#7ab050', A: '#5a9040', z: '#e8e070' },
    hint: '땅 — 화단의 잎 위',
    desc: '방아깨비를 닮았지만 훨씬 작은 메뚜기. 수컷이 암컷 등에 업혀 다니는 모습을 자주 볼 수 있다.',
    flavor: '업혀 있는 쪽이 수컷이다.',
    reaction: { en: 'A small one. Usually there is a male riding on top.', ko: '작은 메뚜기네. 보통 등에 수컷이 업혀 있어.' },
  },
  brownKatydid: {
    name: '애여치', en: 'Brown Katydid', species: 'Eobiana engelhardti', taxon: 'Arthropoda · Insecta · Orthoptera',
    where: 'outside', spots: ['ground'], rarity: 4, sound: 'katydid', icon: 'hopper', tint: { a: '#8a6a48', A: '#6a5038', z: '#c0a070' },
    hint: '땅 — 풀숲에서 찌르르',
    heard: '풀숲 깊은 곳에서 「찌르르」 하는 소리가 들린다.',
    desc: '갈색 몸의 작은 여치. 풀숲 사이에 숨어 「찌르르」 하고 운다.',
    flavor: '소리는 가까운데 몸은 보이지 않는다.',
    reaction: { en: 'A brown katydid. Very hard to spot in the grass.', ko: '갈색 여치네. 풀숲에서 찾기 정말 힘들지.' },
  },
  smallCricket: {
    name: '각시귀뚜라미', en: 'Small Field Cricket', species: 'Turanogryllus eous', taxon: 'Arthropoda · Insecta · Orthoptera',
    where: 'outside', spots: ['ground'], rarity: 3, sound: 'cricketSmall', icon: 'hopper', tint: { a: '#6a5038', A: '#4a3828', z: '#a08060' },
    hint: '땅 — 가늘고 맑은 소리',
    heard: '발치 어딘가에서 가늘고 맑은 울음소리가 들린다.',
    desc: '작고 날씬한 귀뚜라미. 풀밭 땅 위에서 가늘고 맑은 소리로 운다.',
    flavor: '각시라는 이름답게 조용조용하다.',
    reaction: { en: 'Smaller and quieter than the big cricket.', ko: '왕귀뚜라미보다 작고 조용해.' },
  },
  greenKatydid: {
    name: '긴날개여치', en: 'Green Katydid', species: 'Gampsocleis ussuriensis', taxon: 'Arthropoda · Insecta · Orthoptera',
    where: 'outside', spots: ['ground'], rarity: 3, sound: 'katydidLong', icon: 'hopper', tint: { a: '#6ab04a', A: '#4a8a30', z: '#d8e070' },
    hint: '땅 — 풀밭에서 길게 찌르르르',
    heard: '풀밭에서 「찌르르르르—」 하고 길게 우는 소리가 들린다.',
    desc: '날개가 긴 초록 여치. 한여름 풀밭에서 「찌르르르」 길게 운다.',
    flavor: '옛날 여치 집에 넣던 그 여치의 친척.',
    reaction: { en: 'Gampsocleis! Look how long the wings are.', ko: '긴날개여치! 날개 긴 것 좀 봐.' },
  },
  barklouse: {
    name: '노랑다듬이벌레', en: 'Yellow Barklouse', species: 'Valenzuela flavidus', taxon: 'Arthropoda · Insecta · Psocodea',
    where: 'any', spots: ['rubble'], rarity: 4, icon: 'microbe', tint: { a: '#e8c43a', A: '#b09020' },
    hint: '시료 — 잔해를 시료병에 떠서 현미경으로',
    desc: '몇 밀리미터 남짓한 노란 다듬이벌레. 나무껍질과 잎에 붙은 곰팡이·조류를 갉아 먹는다.',
    flavor: '너무 작아서 이름을 불러 줄 일이 거의 없었다.',
    reaction: { en: 'A barklouse! You really looked closely.', ko: '다듬이벌레! 정말 자세히 봤구나.' },
  },
  crayfish: {
    name: '붉은발남방가재', en: 'Australian Red Claw Crayfish', species: 'Cherax quadricarinatus', taxon: 'Arthropoda · Malacostraca · Decapoda',
    where: 'inside', spots: ['tank'], rarity: 'special', icon: 'crayfish', tint: { a: '#3a6a8a', A: '#c8402d' },
    hint: '305호 수조',
    desc: '호주 북부가 고향인 민물가재. 수컷은 집게발 바깥쪽에 붉은 띠가 있다.',
    flavor: '305호 수조의 터줏대감.',
    reaction: { en: 'Hello, little one. Has anyone fed you?', ko: '안녕, 꼬맹아. 누가 밥은 줬니?' },
  },
  woodlouse: {
    name: '쥐며느리', en: 'Korean Woodlouse', species: 'Koreoniscus racovitzai', taxon: 'Arthropoda · Malacostraca · Isopoda',
    where: 'outside', spots: ['ground'], rarity: 4, icon: 'isopod', tint: { a: '#7a7068', A: '#5a524a' },
    hint: '땅 — 축축한 돌 밑',
    desc: '곤충이 아니라 게·새우와 같은 갑각류. 축축한 낙엽과 돌 밑에 살며, 공벌레와 달리 몸을 동그랗게 말지 못한다.',
    flavor: '말지 못하는 쪽이 쥐며느리다.',
    reaction: { en: 'A woodlouse. It cannot roll up, unlike the pill bug.', ko: '쥐며느리네. 공벌레랑 달리 몸을 못 말아.' },
  },
  pillBug: {
    name: '공벌레', en: 'Pill Bug', species: 'Armadillidium vulgare', taxon: 'Arthropoda · Malacostraca · Isopoda',
    where: 'outside', spots: ['ground'], rarity: 1, icon: 'isopod', tint: { a: '#5a5a62', A: '#3a3a42' },
    hint: '땅 — 화단 흙 위',
    desc: '건드리면 몸을 공처럼 동그랗게 마는 갑각류. 유럽에서 건너와 지금은 세계 어디에나 산다.',
    flavor: '굴리지 말 것.',
    reaction: { en: 'Armadillidium! We have the very same species back home.', ko: '공벌레! 우리 고향에도 똑같은 종이 있어.' },
  },
  icefish: {
    name: '줄무늬암치', en: 'Striped Rockcod', species: 'Trematomus hansoni', taxon: 'Chordata · Actinopterygii · Perciformes',
    where: 'inside', spots: ['tank'], rarity: 'special', icon: 'fish', tint: { f: '#9aa8b8', F: '#5a6878' },
    hint: '얼음 수조',
    desc: '남극 바다에 사는 물고기. 피 속에 결빙 방지 단백질이 있어 영하의 바닷물에서도 얼지 않는다.',
    flavor: '남극에서 송도까지, 아주 먼 길을 왔다.',
    reaction: { en: 'From the Southern Ocean! They have antifreeze in their blood.', ko: '남극해에서 왔어! 피 속에 부동액이 있거든.' },
  },
  treeFrog: {
    name: '청개구리', en: 'Japanese Tree Frog', species: 'Dryophytes japonicus', taxon: 'Chordata · Amphibia · Anura',
    where: 'outside', spots: ['ground'], rarity: 2, icon: 'frog', tint: { a: '#6ac04a', A: '#4a9a30', z: '#1b1f27' },
    hint: '땅 — 화단과 풀숲',
    desc: '발가락 끝에 빨판이 있어 풀잎과 벽을 잘 타는 작은 개구리. 주변에 따라 몸 색을 초록에서 회갈색으로 바꾼다.',
    flavor: '비가 오기 전에 유난히 크게 운다.',
    reaction: { en: 'A tree frog! So small and so very green.', ko: '청개구리! 작고 정말 초록색이야.' },
  },
  diggingFrog: {
    name: '맹꽁이', en: 'Boreal Digging Frog', species: 'Kaloula borealis', taxon: 'Chordata · Amphibia · Anura',
    where: 'outside', spots: ['ground'], rarity: 3, icon: 'frog', tint: { a: '#8a8a50', A: '#5a5a30', z: '#1b1f27' },
    hint: '땅 — 비 온 뒤 물웅덩이 근처',
    desc: '몸이 둥글고 다리가 짧은 개구리. 장마철 밤에 「맹- 꽁-」 하고 울며, 멸종위기 야생생물 2급이다.',
    flavor: '맹 하면 다른 녀석이 꽁 한다.',
    reaction: { en: 'Kaloula! These are protected, so let us be gentle.', ko: '맹꽁이! 보호종이니까 살살 다루자.' },
  },
  magpie: {
    name: '까치', en: 'Magpie', species: 'Pica serica', taxon: 'Chordata · Aves · Passeriformes',
    where: 'outside', spots: ['observe'], rarity: 2, icon: 'bird', tint: { a: '#1b1f27', A: '#2a3a6a', x: '#f2f2ee', z: '#1b1f27' },
    hint: '관찰 — 땅과 나무를 오가는 흑백 새',
    desc: '흑백 깃에 긴 꼬리를 가진 텃새. 영리해서 사람 얼굴을 알아본다는 연구도 있다.',
    flavor: '반가운 손님이 온다는데, 오늘 밤 손님은 이쪽이다.',
    reaction: { en: 'A magpie photo! They remember faces, so it probably remembers you now.', ko: '까치 사진! 얼굴을 기억하니까 이제 너도 기억할걸.' },
  },
  bulbul: {
    name: '직박구리', en: 'Brown-eared Bulbul', species: 'Hypsipetes amaurotis', taxon: 'Chordata · Aves · Passeriformes',
    where: 'outside', spots: ['observe'], rarity: 2, sound: 'bulbul', icon: 'bird', tint: { a: '#7a7a80', A: '#5a5a60', x: '#9a9aa0', z: '#3a3a40' },
    hint: '관찰 — 시끄럽게 우는 회색 새',
    heard: '어디선가 「삐이요— 삐이요—」 하고 시끄럽게 우는 소리가 들린다.',
    desc: '회갈색 몸에 뺨이 밤색인 새. 「삐이요」 하고 시끄럽게 울며 열매와 꽃꿀을 좋아한다.',
    flavor: '도시에서 제일 수다스러운 새.',
    reaction: { en: 'The noisiest bird on campus.', ko: '캠퍼스에서 제일 시끄러운 새야.' },
  },
  lightVentedBulbul: {
    name: '검은이마직박구리', en: 'Light-vented Bulbul', species: 'Pycnonotus sinensis', taxon: 'Chordata · Aves · Passeriformes',
    where: 'outside', spots: ['observe'], rarity: 4, sound: 'bulbulLight', icon: 'bird', tint: { a: '#7a8a6a', A: '#5a6a4a', x: '#f2f2ee', z: '#1b1f27' },
    hint: '관찰 — 뒷머리가 하얀 새',
    heard: '처음 듣는 맑은 새소리가 짧게 이어진다.',
    desc: '뒷머리가 하얀 직박구리 무리의 새. 원래 중국 남부의 새인데, 근래 우리나라 섬과 서해안에서 보이기 시작했다.',
    flavor: '새로 이사 온 이웃.',
    reaction: { en: 'A light-vented bulbul! They have only recently arrived in Korea.', ko: '검은이마직박구리! 우리나라에 온 지 얼마 안 된 새야.' },
  },
  tit: {
    name: '박새', en: 'Japanese Tit', species: 'Parus cinereus', taxon: 'Chordata · Aves · Passeriformes',
    where: 'outside', spots: ['observe'], rarity: 3, sound: 'tit', icon: 'bird', tint: { a: '#5a6a7a', A: '#1b1f27', x: '#e8eef0', z: '#1b1f27' },
    hint: '관찰 — 가슴에 검은 넥타이',
    heard: '「쯔쯔삐— 쯔쯔삐—」 하는 작은 새소리가 들린다.',
    desc: '가슴에 검은 넥타이 같은 줄무늬가 있는 작은 새. 나무 구멍이나 새집에 둥지를 튼다.',
    flavor: '넥타이가 굵은 수컷이 인기가 많다고 한다.',
    reaction: { en: 'A Japanese tit. Lovely little tie.', ko: '박새네. 넥타이가 귀엽다.' },
  },
  redstart: {
    name: '딱새', en: 'Daurian Redstart', species: 'Phoenicurus auroreus', taxon: 'Chordata · Aves · Passeriformes',
    where: 'outside', spots: ['observe'], rarity: 3, sound: 'redstart', icon: 'bird', tint: { a: '#e07a30', A: '#3a3a40', x: '#e07a30', z: '#1b1f27' },
    hint: '관찰 — 꼬리를 까딱거리는 주황 새',
    heard: '「딱, 딱」 하고 무언가 부딪치는 듯한 소리가 들린다.',
    desc: '수컷은 주황 배와 날개의 흰 점이 눈에 띄는 작은 새. 꼬리를 까딱거리며 「딱딱」 하는 소리를 낸다.',
    flavor: '꼬리를 쉬지 않고 까딱거린다.',
    reaction: { en: 'A redstart. Always bobbing that tail.', ko: '딱새네. 늘 꼬리를 까딱거려.' },
  },
  azureMagpie: {
    name: '물까치', en: 'Azure-winged Magpie', species: 'Cyanopica cyanus', taxon: 'Chordata · Aves · Passeriformes',
    where: 'outside', spots: ['observe'], rarity: 3, sound: 'azureMagpie', icon: 'bird', tint: { a: '#7ab0d8', A: '#5a90b8', x: '#d8dcd8', z: '#1b1f27' },
    hint: '관찰 — 하늘색 날개, 무리 지어',
    heard: '「캐애— 캐애—」 하는 거친 새소리가 여럿 겹쳐 들린다.',
    desc: '하늘색 날개와 긴 꼬리, 검은 모자를 쓴 듯한 머리의 새. 늘 무리 지어 다니며, 둥지 근처에 가면 떼로 덤빈다.',
    flavor: '혼자 있는 물까치는 드물다.',
    reaction: { en: 'An azure-winged magpie. Where there is one, there is a gang.', ko: '물까치네. 하나 있으면 무리가 있어.' },
  },
  woodpecker: {
    name: '오색딱다구리', en: 'Great Spotted Woodpecker', species: 'Dendrocopos major', taxon: 'Chordata · Aves · Piciformes',
    where: 'outside', spots: ['observe'], rarity: 5, sound: 'woodpecker', icon: 'bird', tint: { a: '#1b1f27', A: '#1b1f27', x: '#f2f2ee', z: '#c8402d' },
    hint: '관찰 — 드르르륵, 나무 두드리는 소리',
    heard: '「드르르르륵」 — 어디선가 나무를 두드리는 소리가 울린다.',
    desc: '검정·흰색 깃에 아랫배가 붉은 딱다구리. 부리로 나무를 두드려 벌레를 찾고 둥지 구멍을 판다.',
    flavor: '드르르륵 — 저 소리는 노크가 아니다.',
    reaction: { en: 'A great spotted woodpecker! I have heard it, but never seen it.', ko: '오색딱다구리! 소리만 들었지 본 적은 없었는데.' },
  },
  raccoonDog: {
    name: '너구리', en: 'Raccoon Dog', species: 'Nyctereutes procyonoides', taxon: 'Chordata · Mammalia · Carnivora',
    where: 'outside', spots: ['observe'], rarity: 4, icon: 'mammal', tint: { a: '#7a6a58', A: '#5a4a3a', z: '#1b1f27' },
    hint: '관찰 — 밤에 어슬렁거리는 것',
    desc: '이름과 달리 갯과 동물. 밤에 돌아다니며 무엇이든 먹고, 겨울에는 활동을 줄이고 웅크려 지낸다.',
    flavor: '라쿤과는 남남이다.',
    reaction: { en: 'A raccoon dog! Not a raccoon, and not really a dog.', ko: '너구리다! 라쿤도 아니고 딱히 개도 아니지.' },
  },
  cat: {
    name: '고양이', en: 'Cat', species: 'Felis catus', taxon: 'Chordata · Mammalia · Carnivora',
    where: 'outside', spots: ['observe'], rarity: 'special', sound: 'cat', icon: 'mammal', tint: { a: '#e8913a', A: '#d9b384', z: '#f4efe6' },
    hint: '관찰 — 연구소 밖의 한 마리',
    heard: '「야옹」. 어둠 속 어딘가에서 고양이 소리가 들린다.',
    desc: '연구소 밖을 어슬렁거리는 고양이 한 마리. 이 밤에도 어디로 가야 할지 아는 듯하다.',
    flavor: '이름은 아직 없다.',
    reaction: { en: 'The campus cat! Everyone has a name for it, and none of them match.', ko: '연구소 고양이! 다들 부르는 이름이 있는데 하나도 안 겹쳐.' },
  },
  gecko: {
    name: '크레스티드게코', en: 'Crested Gecko', species: 'Correlophus ciliatus', taxon: 'Chordata · Reptilia · Squamata',
    where: 'inside', spots: ['tank'], rarity: 'special', icon: 'lizard', tint: { a: '#c8904a', A: '#9a6a30', z: '#1b1f27' },
    hint: '어딘가의 사육장',
    desc: '뉴칼레도니아가 고향인 도마뱀붙이. 눈 위에 속눈썹 같은 돌기가 있고, 꼬리가 한 번 끊어지면 다시 자라지 않는다.',
    flavor: '사육장 유리에 붙어 이쪽을 보고 있다.',
    reaction: { en: 'Someone in this building keeps a crested gecko? Wonderful.', ko: '건물에서 누가 크레스티드게코를 키운다고? 멋지다.' },
  },
  snail: {
    name: '달팽이', en: 'Snail', species: 'Acusta redfieldi', taxon: 'Mollusca · Gastropoda · Stylommatophora',
    where: 'outside', spots: ['ground'], rarity: 3, icon: 'snail', tint: { a: '#c8a070', A: '#8a6a48', z: '#a09080' },
    hint: '땅 — 축축한 화단',
    desc: '비 온 뒤 축축한 밤에 나와 잎을 갉아 먹는 달팽이. 껍데기는 몸과 함께 자란다.',
    flavor: '지나간 자리가 반짝인다.',
    reaction: { en: 'A snail. Slow, but it got here before you did.', ko: '달팽이네. 느려도 너보다 먼저 와 있었잖아.' },
  },
  rotifer: {
    name: '콜루렐라', en: 'Rotifer', species: 'Colurella sp.', taxon: 'Rotifera · Monogononta · Ploima',
    where: 'any', spots: ['puddle'], rarity: 'special', icon: 'microbe', tint: { a: '#d8e8f0', A: '#a8c0d0' },
    hint: '시료 — 고인 물을 시료병에 떠서 현미경으로',
    desc: '몸길이 0.1mm 남짓한 윤형동물. 머리의 섬모를 바퀴처럼 돌려 물살을 일으키고 먹이를 모은다.',
    flavor: '물 한 방울 속에도 사는 것이 있다.',
    reaction: { en: 'A rotifer! A whole animal in a single drop of water.', ko: '윤형동물! 물 한 방울 속에 동물 하나가 통째로.' },
  },
  tardigrade: {
    name: '완보동물', en: 'Tardigrade', species: 'Doryphoribius sp.', taxon: 'Tardigrada · Eutardigrada · Parachela',
    where: 'any', spots: ['rubble', 'puddle'], rarity: 'special', icon: 'microbe', tint: { a: '#c8a8a0', A: '#a08078' },
    hint: '시료 — 잔해나 고인 물, 이끼 낀 곳',
    desc: '0.5mm 안팎의 작은 동물. 물이 마르면 몸을 웅크려 거의 죽은 듯 버티다가, 물을 만나면 다시 깨어난다.',
    flavor: '별명은 물곰. 우주에 내보냈다가 살아 돌아온 적도 있다.',
    reaction: { en: 'A tardigrade! The toughest animal on Earth, and you found one.', ko: '완보동물! 지구에서 제일 질긴 동물인데, 그걸 찾았네.' },
  },
};

// 이 종을 잡을 수 있는 도구들 (종에 tools가 없으면 자리들의 도구를 모은다)
export const toolsOf = (id) => {
  const cr = CREATURES[id];
  return cr.tools ?? [...new Set((cr.spots ?? []).flatMap((s) => SPOTS[s]?.tools ?? []))];
};
export const rarityOf = (id) => RARITY[CREATURES[id].rarity] ?? RARITY[1];
// 관찰(카메라) 종은 사진, 시료(현미경) 종은 시료 — 소지품·건네기 목록에 「○○ 사진」「○○ 시료」로
export const isPhoto = (id) => (CREATURES[id].spots ?? []).includes('observe');
export const isSample = (id) => (CREATURES[id].spots ?? []).some((s) => SPOTS[s]?.sample);
export const carriedName = (id) => {
  const name = CREATURES[id].name;
  return isPhoto(id) ? `${name} 사진` : isSample(id) ? `${name} 시료` : name;
};

// 뽑기: 그 자리(spot)에 나올 수 있는 종 가운데 아직 도감에 없는 것(have(id)가 거짓)을 희귀도 가중치로 하나. 없으면 null
//  where = 'outside' | 'inside' — 그 맵이 연구소 밖인지 안인지 (종의 where가 'any'면 어디서나)
export function rollCreature(spot, where, have = () => false) {
  const pool = Object.keys(CREATURES).filter((id) => {
    const cr = CREATURES[id];
    return !cr.event && !have(id) && (cr.spots ?? []).includes(spot) && (cr.where === 'any' || !where || cr.where === where);
  });
  let r = Math.random() * pool.reduce((n, id) => n + rarityOf(id).weight, 0);
  for (const id of pool) if ((r -= rarityOf(id).weight) < 0) return id;
  return pool.at(-1) ?? null;
}

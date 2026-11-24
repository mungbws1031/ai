/* 챙겨줘 트립 — 큐레이션 데이터
 * 코스·국가 규칙은 손으로 검수한 정적 데이터다. 입국 규정은 자주 바뀌므로
 * 화면에서 항상 "출발 전 공식 사이트 확인"을 함께 안내한다.
 *
 * spot 필드: n 이름, q 지도 검색어, t 이전 장소에서 이동, k 아이들이 좋아함,
 *   s 계단·오르막·장거리 도보, alt s일 때 대안, c 복장 규정,
 *   r [며칠 전까지 예약, 무엇을] → D-day 할 일로 자동 등록
 * food: [이름, 지도 검색어, 태그] 태그 k=아이 동반 무난, v=채식 가능, h=매움
 * climate: 1~12월 기후 코드 c 추움, m 선선, w 따뜻, h 더움, r 우기(덥고 비)
 */
window.TRIP_DATA = (function () {
  const COUNTRIES = {
    jp: { name: '일본', region: '일본', cur: '엔화(JPY)', plug: 'A타입 100V — 돼지코 어댑터 필요', adapter: true,
      visa: '무비자 90일',
      entry: [{ off: -7, t: 'Visit Japan Web 등록 (입국·세관 QR 미리 만들기)', link: 'https://www.vjw.digital.go.jp/', red: true }] },
    cn: { name: '중국', region: '중국·홍콩·대만', cur: '위안(CNY) — 현금보다 알리페이/위챗페이', plug: 'A·C·I타입 220V — 한국 플러그 대부분 사용 가능', adapter: false,
      visa: '무비자 30일 (한시 정책 — 연장 여부를 출발 전 꼭 확인)',
      entry: [
        { off: -30, t: '중국 무비자 정책 유지 여부 확인', link: 'https://overseas.mofa.go.kr/cn-ko/index.do', red: true, why: '한시 정책이라 종료되면 비자가 필요해요. 비자 발급엔 1~2주 걸려요.' },
        { off: -7, t: '알리페이 설치 + 해외 카드 연결', link: 'https://global.alipay.com/', why: '현지는 거의 모든 결제가 QR이에요. 택시·편의점도 현금을 잘 안 받아요.' },
        { off: -7, t: '구글·카카오톡·인스타 차단 대비 — 로밍 또는 eSIM으로 준비', why: '현지 와이파이에선 막혀요. 한국 통신사 로밍/eSIM 데이터로는 열려요. 지도는 고덕(Amap) 앱을 받아두세요.' }
      ] },
    hk: { name: '홍콩·마카오', region: '중국·홍콩·대만', cur: '홍콩달러(HKD) — 마카오도 HKD 사용 가능', plug: 'G타입 220V — 어댑터 필요', adapter: true,
      visa: '무비자 90일',
      entry: [{ off: -7, t: '옥토퍼스 카드 준비 (애플페이/공항 구매)', why: '지하철·버스·편의점·트램 모두 이 카드 하나로 돼요. 아이 요금 카드는 공항에서 따로 사요.' }] },
    tw: { name: '대만', region: '중국·홍콩·대만', cur: '대만달러(TWD)', plug: 'A타입 110V — 돼지코 어댑터 필요', adapter: true,
      visa: '무비자 90일',
      entry: [{ off: -3, t: '대만 온라인 입국신고서 작성', link: 'https://niaspeedy.immigration.gov.tw/webacard/', why: '미리 내면 입국 때 종이를 안 써도 돼요. 가족 모두 각자 작성해요.' }] },
    vn: { name: '베트남', region: '동남아', cur: '동(VND) — 0이 많으니 계산기 앱 준비', plug: 'A·C타입 220V — 한국 플러그 대부분 사용 가능', adapter: false,
      visa: '무비자 45일 · 여권 잔여 6개월 이상',
      entry: [] },
    th: { name: '태국', region: '동남아', cur: '바트(THB)', plug: 'A·B·C·O타입 220V — 한국 플러그 대부분 사용 가능', adapter: false,
      visa: '무비자 (체류 기간이 자주 바뀌니 출발 전 확인)',
      entry: [{ off: -3, t: '태국 전자입국신고(TDAC) 제출 — 도착 3일 이내', link: 'https://tdac.immigration.go.th/', red: true, why: '도착 3일 전부터 제출할 수 있어요. 아이도 1명씩 따로 내야 해요.' }] },
    ph: { name: '필리핀', region: '동남아', cur: '페소(PHP)', plug: 'A·B타입 220V — 어댑터 필요', adapter: true,
      visa: '무비자 30일 · 여권 잔여 6개월 이상',
      entry: [{ off: -3, t: '필리핀 eTravel 등록 — 출발 72시간 이내', link: 'https://etravel.gov.ph/', red: true, why: '등록 QR이 없으면 체크인 카운터에서 막혀요.' }] },
    my: { name: '말레이시아', region: '동남아', cur: '링깃(MYR)', plug: 'G타입 240V — 어댑터 필요', adapter: true,
      visa: '무비자 90일',
      entry: [{ off: -3, t: '말레이시아 디지털 입국카드(MDAC) 제출 — 도착 3일 이내', link: 'https://imigresen-online.imi.gov.my/mdac/main', red: true }] },
    sg: { name: '싱가포르', region: '동남아', cur: '싱가포르달러(SGD)', plug: 'G타입 230V — 어댑터 필요', adapter: true,
      visa: '무비자 90일',
      entry: [{ off: -3, t: 'SG Arrival Card 제출 — 도착 3일 이내', link: 'https://eservices.ica.gov.sg/sgarrivalcard/', red: true, why: '무료예요. 비슷하게 생긴 유료 대행 사이트를 조심하세요.' }] }
  };

  const C = (s) => s.split(''); // 'ccmmmrhhhmmc' → 월별 배열

  const COURSES = [
    /* ───────── 일본 ───────── */
    { id: 'jp-kansai', c: 'jp', name: '오사카·교토·나라 + 유니버설', nights: 4, air: 'KIX', airName: '간사이공항',
      base: '난바', lat: 34.665, lon: 135.501, climate: C('ccmmwrhhhwmc'),
      tip: '난바에 숙소를 잡으면 공항·USJ·교토·나라가 모두 전철 한 번이에요.',
      days: [
        { t: '도착 · 도톤보리', s: [
          { n: '간사이공항 → 난바', q: 'Namba Station', t: '난카이 라피트 약 40분 (짐이 많으면 리무진버스)' },
          { n: '도톤보리 글리코 사인', q: 'Dotonbori Glico Sign', t: '숙소에서 도보', k: 1 },
          { n: '신사이바시 상점가', q: 'Shinsaibashi-suji', t: '도보 5분', k: 1 }],
          f: [['타코야키', 'Dotonbori takoyaki', 'k'], ['오코노미야키', 'Dotonbori okonomiyaki', 'kv'], ['이치란 라멘 도톤보리', 'Ichiran Dotonbori', '']] },
        { t: '유니버설 스튜디오 재팬', p: 3, s: [
          { n: '유니버설 스튜디오 재팬', q: 'Universal Studios Japan', t: 'JR 유니버설시티역 (난바에서 약 25분)', k: 1,
            r: [30, 'USJ 입장권 + 닌텐도 월드 입장 확약권(익스프레스 패스)'] }],
          f: [['파크 안 키노피오 카페', 'Kinopio Cafe USJ', 'k']] },
        { t: '교토', p: 2, s: [
          { n: '후시미 이나리 신사', q: 'Fushimi Inari Taisha', t: '게이한 전철 약 50분', s: 1, alt: '정상까지 2시간 — 아이와는 입구~첫 갈림길(30분)까지만' },
          { n: '기요미즈데라', q: 'Kiyomizu-dera', t: '택시 15분', s: 1, alt: '언덕길이 길어요 — 택시로 고조자카 위쪽까지 올라가기' },
          { n: '기온 · 하나미코지', q: 'Hanamikoji Street', t: '도보 15분' }],
          f: [['교토 우동·소바', 'Gion udon', 'kv'], ['말차 디저트', 'Gion matcha parfait', 'kv']] },
        { t: '나라 사슴공원', p: 2, s: [
          { n: '나라공원 (사슴 센베 주기)', q: 'Nara Park', t: '긴테쓰 난바역 → 나라역 약 40분', k: 1 },
          { n: '도다이지 대불', q: 'Todaiji', t: '도보 10분', k: 1 }],
          f: [['카키노하즈시(감잎 초밥)', 'Nara kakinoha sushi', ''], ['나라 가마메시', 'Nara kamameshi', 'k']] },
        { t: '수족관 · 오사카성', p: 1, s: [
          { n: '가이유칸 수족관', q: 'Osaka Aquarium Kaiyukan', t: '지하철 주오선 오사카코역', k: 1 },
          { n: '덴포잔 대관람차', q: 'Tempozan Ferris Wheel', t: '도보 3분', k: 1 },
          { n: '오사카성 공원', q: 'Osaka Castle', t: '지하철 약 30분', k: 1 }],
          f: [['쿠시카츠 (신세카이)', 'Shinsekai kushikatsu Daruma', 'k']] },
        { t: '구로몬 시장 · 귀국', s: [
          { n: '구로몬 시장', q: 'Kuromon Market', t: '숙소에서 도보', k: 1 },
          { n: '간사이공항', q: 'Kansai International Airport', t: '난카이 라피트 약 40분 — 출발 3시간 전 도착' }],
          f: [['구로몬 시장 해산물 꼬치', 'Kuromon Market food', 'k']] }
      ] },

    { id: 'jp-tokyo', c: 'jp', name: '도쿄 + 디즈니', nights: 4, air: 'NRT', airName: '나리타·하네다공항',
      base: '도쿄역·마이하마', lat: 35.681, lon: 139.767, climate: C('ccmmwrhhhwmc'),
      tip: '디즈니 이틀이면 마이하마 숙소, 하루면 도쿄역 근처가 이동이 편해요.',
      days: [
        { t: '도착 · 아사쿠사', s: [
          { n: '공항 → 도쿄역', q: 'Tokyo Station', t: '리무진버스 약 60~80분 (유모차·짐 많을 때 편함)' },
          { n: '센소지 · 나카미세 거리', q: 'Senso-ji', t: '지하철 약 20분', k: 1 },
          { n: '도쿄 스카이트리', q: 'Tokyo Skytree', t: '도보 20분 또는 지하철 1정거장', k: 1 }],
          f: [['텐동', 'Asakusa tendon', 'k'], ['몬자야키 (쓰키시마)', 'Tsukishima monjayaki', 'k']] },
        { t: '도쿄 디즈니랜드', p: 3, s: [
          { n: '도쿄 디즈니랜드', q: 'Tokyo Disneyland', t: 'JR 게이요선 마이하마역', k: 1,
            r: [30, '디즈니 날짜 지정 티켓 + 프리미어 액세스'] }],
          f: [['파크 안 레스토랑 (앱으로 모바일 오더)', 'Tokyo Disneyland restaurant', 'k']] },
        { t: '도쿄 디즈니씨', p: 2, s: [
          { n: '도쿄 디즈니씨', q: 'Tokyo DisneySea', t: '디즈니 리조트 라인', k: 1, r: [30, '디즈니씨 날짜 지정 티켓'] }],
          f: [] },
        { t: '오다이바', p: 2, s: [
          { n: '팀랩 플래닛', q: 'teamLab Planets Tokyo', t: '유리카모메 신토요스역', k: 1, r: [14, '팀랩 플래닛 시간 지정 티켓'] },
          { n: '실물 크기 건담 (다이버시티)', q: 'DiverCity Tokyo Plaza Gundam', t: '유리카모메 약 10분', k: 1 },
          { n: '오다이바 해변공원', q: 'Odaiba Marine Park', t: '도보 10분', k: 1 }],
          f: [['회전초밥', 'Odaiba conveyor belt sushi', 'k']] },
        { t: '시부야 · 하라주쿠', p: 1, s: [
          { n: '메이지 신궁', q: 'Meiji Jingu', t: 'JR 하라주쿠역' },
          { n: '다케시타 거리', q: 'Takeshita Street', t: '도보 5분', k: 1 },
          { n: '포켓몬센터 시부야', q: 'Pokemon Center Shibuya', t: 'JR 1정거장', k: 1 },
          { n: '시부야 스크램블 교차로', q: 'Shibuya Scramble Crossing', t: '도보 5분' }],
          f: [['함바그', 'Shibuya hamburg steak', 'k']] },
        { t: '귀국', s: [{ n: '공항', q: 'Narita International Airport', t: '리무진버스 — 출발 3시간 전 도착' }], f: [] }
      ] },

    { id: 'jp-fukuoka', c: 'jp', name: '후쿠오카·유후인 온천', nights: 2, air: 'FUK', airName: '후쿠오카공항',
      base: '하카타역', lat: 33.590, lon: 130.420, climate: C('ccmmwrhhhwmc'),
      tip: '공항에서 하카타역까지 지하철 5분. 아이와 가기 가장 가까운 해외예요.',
      days: [
        { t: '도착 · 하카타', s: [
          { n: '후쿠오카공항 → 하카타역', q: 'Hakata Station', t: '지하철 5분' },
          { n: '캐널시티 하카타 (분수쇼)', q: 'Canal City Hakata', t: '도보 10분', k: 1 },
          { n: '나카스 포장마차 거리', q: 'Nakasu Yatai', t: '도보 10분' }],
          f: [['이치란 라멘 본점', 'Ichiran Honten Fukuoka', ''], ['모츠나베', 'Hakata motsunabe', ''], ['멘타이코 오니기리', 'Hakata mentaiko', 'k']] },
        { t: '유후인', p: 3, s: [
          { n: '유후인노모리 관광열차', q: 'Yufuin Station', t: '하카타역에서 약 2시간 10분', k: 1, r: [30, '유후인노모리 지정석 (1개월 전 오전 10시 발매)'] },
          { n: '유노츠보 거리', q: 'Yunotsubo Street Yufuin', t: '도보', k: 1 },
          { n: '긴린코 호수', q: 'Lake Kinrin', t: '도보 15분' },
          { n: '가족탕 (대절 온천)', q: 'Yufuin family bath', t: '숙소 또는 도보', k: 1, r: [14, '가족탕(대절 온천) 시간 예약'] }],
          f: [['유후인 롤케이크', 'Yufuin roll cake B-speak', 'kv'], ['금상 고로케', 'Yufuin croquette', 'k']] },
        { t: '수족관 · 후쿠오카 타워', p: 1, s: [
          { n: '마린월드 우미노나카미치', q: 'Marine World Uminonakamichi', t: 'JR 약 30분', k: 1 },
          { n: '후쿠오카 타워', q: 'Fukuoka Tower', t: '버스 약 40분', k: 1 }],
          f: [['스시 (나가하마 시장 근처)', 'Fukuoka sushi', 'k']] },
        { t: '다자이후 · 귀국', s: [
          { n: '다자이후 텐만구', q: 'Dazaifu Tenmangu', t: '하카타 버스터미널 직행버스 약 40분', k: 1 },
          { n: '후쿠오카공항', q: 'Fukuoka Airport', t: '버스·지하철 약 30분 — 출발 2시간 전 도착' }],
          f: [['우메가에모치', 'Dazaifu umegaemochi', 'kv']] }
      ] },

    { id: 'jp-okinawa', c: 'jp', name: '오키나와 렌터카 여행', nights: 3, air: 'OKA', airName: '나하공항',
      base: '나하·중부 리조트', lat: 26.212, lon: 127.679, climate: C('mmwwhrhhhwwm'),
      tip: '대중교통이 불편해 렌터카가 기본이에요. 6세 미만은 카시트가 법적 의무예요.',
      extra: [
        { off: -30, t: '렌터카 예약 + 유아·아동 카시트 추가', red: true, why: '6세 미만 카시트는 일본 법적 의무예요. 성수기엔 카시트가 먼저 동나요.' },
        { off: -14, t: '국제운전면허증 발급 (경찰서·운전면허시험장)', red: true, link: 'https://www.safedriving.or.kr/', why: '없으면 렌터카를 못 빌려요. 여권·사진·면허증을 챙겨가세요.' }],
      days: [
        { t: '도착 · 국제거리', s: [
          { n: '나하공항 → 렌터카 영업소', q: 'Naha Airport', t: '렌터카 셔틀 약 15분' },
          { n: '국제거리 (고쿠사이도리)', q: 'Kokusai Dori', t: '차로 15분', k: 1 }],
          f: [['오키나와 소바', 'Naha Okinawa soba', 'k'], ['블루씰 아이스크림', 'Blue Seal Kokusai', 'kv']] },
        { t: '츄라우미 수족관', p: 3, s: [
          { n: '츄라우미 수족관', q: 'Okinawa Churaumi Aquarium', t: '차로 약 2시간', k: 1 },
          { n: '비세 후쿠기 가로수길', q: 'Bise Fukugi Tree Road', t: '차로 5분', k: 1 },
          { n: '코우리 대교 · 코우리섬', q: 'Kouri Bridge', t: '차로 30분', k: 1 }],
          f: [['아구 돼지 샤브샤브', 'Agu pork shabu Motobu', 'k']] },
        { t: '중부 · 바다 놀이', p: 2, s: [
          { n: '만좌모', q: 'Cape Manzamo', t: '차로 약 1시간' },
          { n: '트로피컬 비치 (물놀이)', q: 'Tropical Beach Ginowan', t: '차로 40분', k: 1 },
          { n: '아메리칸 빌리지', q: 'American Village Chatan', t: '차로 15분', k: 1 }],
          f: [['타코라이스', 'Chatan taco rice', 'k']] },
        { t: '귀국', s: [{ n: '렌터카 반납 → 나하공항', q: 'Naha Airport', t: '반납 후 셔틀 — 출발 2시간 30분 전 반납' }], f: [] }
      ] },

    { id: 'jp-hokkaido', c: 'jp', name: '삿포로·오타루 (눈 여행)', nights: 3, air: 'CTS', airName: '신치토세공항',
      base: '삿포로역·스스키노', lat: 43.062, lon: 141.354, climate: C('cccmmwwwmmcc'),
      tip: '2월 초엔 삿포로 눈축제가 열려요. 겨울엔 아이 방한화·장갑 여벌이 필수예요.',
      days: [
        { t: '도착 · 오도리 공원', s: [
          { n: '신치토세공항 → 삿포로역', q: 'Sapporo Station', t: 'JR 쾌속 에어포트 약 40분' },
          { n: '오도리 공원 · TV타워', q: 'Odori Park', t: '지하철 1정거장', k: 1 }],
          f: [['수프카레', 'Sapporo soup curry', 'h'], ['징기스칸 (양고기 구이)', 'Sapporo jingisukan', '']] },
        { t: '오타루', p: 3, s: [
          { n: '오타루 운하', q: 'Otaru Canal', t: 'JR 약 35분' },
          { n: '오르골당 본관', q: 'Otaru Music Box Museum', t: '도보 15분', k: 1 },
          { n: '르타오 본점', q: 'LeTAO Otaru', t: '도보 1분', k: 1 }],
          f: [['오타루 초밥 거리', 'Otaru sushi street', ''], ['르타오 치즈케이크', 'LeTAO Otaru', 'kv']] },
        { t: '삿포로 아이들 하루', p: 2, s: [
          { n: '시로이 코이비토 파크', q: 'Shiroi Koibito Park', t: '지하철 도자이선 약 20분', k: 1 },
          { n: '모이와산 로프웨이 야경', q: 'Mt. Moiwa Ropeway', t: '노면전차 + 셔틀', k: 1 }],
          f: [['미소라멘', 'Sapporo miso ramen', 'k']] },
        { t: '귀국', s: [{ n: '신치토세공항 (공항 안 도라에몽 와쿠와쿠 파크)', q: 'Doraemon Wakuwaku Sky Park', t: 'JR 약 40분 — 출발 3시간 전 도착', k: 1 }], f: [] }
      ] },

    /* ───────── 중국·홍콩·대만 ───────── */
    { id: 'cn-shanghai', c: 'cn', name: '상하이 + 디즈니', nights: 3, air: 'PVG', airName: '푸둥공항',
      base: '인민광장·와이탄', lat: 31.230, lon: 121.474, climate: C('ccmmwhhhwmmc'),
      tip: '비행 2시간이면 도착. 디즈니는 상하이 지하철 11호선으로 바로 가요.',
      days: [
        { t: '도착 · 와이탄 야경', s: [
          { n: '푸둥공항 → 시내', q: 'Longyang Road Station', t: '자기부상열차 8분 + 지하철 (택시는 약 1시간)' },
          { n: '와이탄 야경', q: 'The Bund Shanghai', t: '지하철 2호선 난징동루역', k: 1 },
          { n: '난징동루 보행가', q: 'Nanjing Road Pedestrian Street', t: '도보', k: 1 }],
          f: [['샤오룽바오', 'Shanghai xiaolongbao', 'k'], ['셩지엔바오 (군만두)', 'Yang\'s Dumpling Shanghai', 'k']] },
        { t: '상하이 디즈니랜드', p: 3, s: [
          { n: '상하이 디즈니랜드', q: 'Shanghai Disneyland', t: '지하철 11호선 디즈니역', k: 1, r: [14, '상하이 디즈니 날짜 지정 티켓 (공식 앱)'] }],
          f: [] },
        { t: '예원 · 동방명주', p: 2, s: [
          { n: '예원 · 성황묘', q: 'Yu Garden', t: '지하철 10호선 예원역', k: 1 },
          { n: '동방명주 타워', q: 'Oriental Pearl Tower', t: '지하철 약 20분', k: 1 },
          { n: '상하이 해양수족관', q: 'Shanghai Ocean Aquarium', t: '도보 5분', k: 1 }],
          f: [['난샹 만두 (예원)', 'Nanxiang Mantou Dian Yu Garden', 'k']] },
        { t: '주자자오 수향마을', p: 1, s: [
          { n: '주자자오 수향마을 (나룻배)', q: 'Zhujiajiao Water Town', t: '지하철 17호선 약 1시간', k: 1 }],
          f: [['수향마을 쫑즈', 'Zhujiajiao zongzi', 'k']] },
        { t: '신톈디 · 귀국', s: [
          { n: '신톈디', q: 'Xintiandi Shanghai', t: '지하철' },
          { n: '푸둥공항', q: 'Shanghai Pudong International Airport', t: '자기부상열차 — 출발 3시간 전 도착' }],
          f: [] }
      ] },

    { id: 'cn-beijing', c: 'cn', name: '베이징 만리장성·자금성', nights: 3, air: 'PEK', airName: '서우두공항',
      base: '왕푸징', lat: 39.914, lon: 116.411, climate: C('ccmmwhhhwmcc'),
      tip: '자금성·천안문은 실명(여권번호) 사전 예약제예요. 아이 여권번호도 필요해요.',
      days: [
        { t: '도착 · 왕푸징', s: [
          { n: '서우두공항 → 시내', q: 'Wangfujing', t: '공항철도 + 지하철 약 1시간' },
          { n: '왕푸징 거리', q: 'Wangfujing Street', t: '도보', k: 1 }],
          f: [['베이징 카오야 (오리구이)', 'Quanjude Wangfujing', 'k'], ['짜장면 (자장몐)', 'Beijing zhajiangmian', 'k']] },
        { t: '자금성 · 징산공원', p: 3, s: [
          { n: '천안문 광장', q: 'Tiananmen Square', t: '지하철 1호선', r: [7, '천안문 광장 실명 예약'] },
          { n: '자금성 (고궁박물원)', q: 'Forbidden City', t: '도보', s: 1, alt: '매우 넓어요 — 중축선만 보고 나오는 2시간 코스 + 유모차', r: [7, '자금성 입장권 실명 예약 (7일 전 오픈, 가족 여권번호)'] },
          { n: '징산공원 전망', q: 'Jingshan Park', t: '도보 5분', s: 1, alt: '계단 약 10분 — 힘들면 공원 아래만' }],
          f: [['자금성 근처 만두집', 'Beijing jiaozi', 'k']] },
        { t: '만리장성 무톈위', p: 3, s: [
          { n: '무톈위 장성 (케이블카 + 터보건 썰매)', q: 'Mutianyu Great Wall', t: '전용차·투어 약 1시간 30분', k: 1, r: [7, '무톈위 장성 입장권·케이블카'] }],
          f: [['무톈위 마을 송어구이', 'Mutianyu trout', 'k']] },
        { t: '베이징 유니버설', p: 2, s: [
          { n: '유니버설 베이징 리조트', q: 'Universal Beijing Resort', t: '지하철 7호선 종점', k: 1, r: [14, '유니버설 베이징 티켓'] }],
          f: [] },
        { t: '천단공원 · 귀국', s: [
          { n: '천단공원', q: 'Temple of Heaven', t: '지하철 5호선', k: 1 },
          { n: '서우두공항', q: 'Beijing Capital International Airport', t: '공항철도 — 출발 3시간 전 도착' }],
          f: [] }
      ] },

    { id: 'hk-hkmo', c: 'hk', name: '홍콩·마카오 + 디즈니', nights: 3, air: 'HKG', airName: '홍콩공항',
      base: '침사추이', lat: 22.297, lon: 114.172, climate: C('mmwwhrrrhwwm'),
      tip: '홍콩 디즈니는 작아서 아이 키 기준 놀이기구가 많아요. 마카오는 페리로 1시간이에요.',
      days: [
        { t: '도착 · 심포니 오브 라이트', s: [
          { n: '홍콩공항 → 침사추이', q: 'Tsim Sha Tsui', t: 'A21 버스 약 50분 또는 AEL + 택시' },
          { n: '스타의 거리 · 심포니 오브 라이트 (20시)', q: 'Avenue of Stars Hong Kong', t: '도보', k: 1 },
          { n: '스타페리', q: 'Star Ferry Tsim Sha Tsui', t: '도보 5분', k: 1 }],
          f: [['팀호완 딤섬', 'Tim Ho Wan', 'k'], ['완탕면', 'Mak\'s Noodle', 'k']] },
        { t: '홍콩 디즈니랜드', p: 3, s: [
          { n: '홍콩 디즈니랜드', q: 'Hong Kong Disneyland', t: 'MTR 디즈니랜드 리조트선', k: 1, r: [14, '홍콩 디즈니 날짜 지정 티켓'] }],
          f: [] },
        { t: '마카오 당일치기', p: 2, s: [
          { n: '홍콩 → 마카오 페리', q: 'Hong Kong Macau Ferry Terminal', t: '터보젯 약 1시간 (여권 필요)' },
          { n: '세나도 광장', q: 'Senado Square', t: '택시·버스 15분', k: 1 },
          { n: '성 바울 성당 유적', q: 'Ruins of St. Paul\'s', t: '도보 10분', s: 1, alt: '계단 앞 광장에서 사진만' }],
          f: [['로드 스토우즈 에그타르트', 'Lord Stow\'s Bakery', 'kv'], ['포르투갈식 치킨', 'Macau Portuguese restaurant', 'k']] },
        { t: '오션파크', p: 1, s: [
          { n: '오션파크 (판다·수족관)', q: 'Ocean Park Hong Kong', t: 'MTR 오션파크역', k: 1, r: [7, '오션파크 티켓'] }],
          f: [] },
        { t: '빅토리아 피크 · 귀국', s: [
          { n: '피크트램 · 빅토리아 피크', q: 'Peak Tram', t: 'MTR 센트럴역 + 도보', k: 1 },
          { n: '홍콩공항', q: 'Hong Kong International Airport', t: 'AEL 약 25분 — 출발 3시간 전 도착' }],
          f: [] }
      ] },

    { id: 'tw-taipei', c: 'tw', name: '타이베이 + 예스진지', nights: 3, air: 'TPE', airName: '타오위안공항',
      base: '타이베이역·시먼딩', lat: 25.047, lon: 121.517, climate: C('mmmwhhhhhwmm'),
      tip: '야시장은 저녁 6시 이후. 아이가 어리면 유모차보다 아기띠가 편해요.',
      days: [
        { t: '도착 · 야시장', s: [
          { n: '타오위안공항 → 타이베이역', q: 'Taipei Main Station', t: '공항 MRT 약 35분' },
          { n: '시먼딩', q: 'Ximending', t: 'MRT 1정거장', k: 1 },
          { n: '라오허제 야시장', q: 'Raohe Street Night Market', t: 'MRT 약 25분', k: 1 }],
          f: [['후자오빙 (라오허제 후추빵)', 'Fuzhou Shizu Pepper Buns Raohe', 'k'], ['지파이 (닭튀김)', 'Ximending fried chicken cutlet', 'k']] },
        { t: '예스진지', p: 3, s: [
          { n: '예류 지질공원', q: 'Yehliu Geopark', t: '투어버스 약 1시간', k: 1, r: [14, '예스진지 버스투어 (가족석)'] },
          { n: '스펀 천등 날리기', q: 'Shifen Old Street', t: '투어버스', k: 1 },
          { n: '지우펀 옛거리', q: 'Jiufen Old Street', t: '투어버스', s: 1, alt: '계단 골목이 좁고 붐벼요 — 아기띠로' }],
          f: [['지우펀 땅콩 아이스크림 롤', 'Jiufen peanut ice cream roll', 'kv'], ['토란 경단 (위위안)', 'Jiufen taro ball', 'kv']] },
        { t: '타이베이 시내', p: 2, s: [
          { n: '중정기념당 근위병 교대식 (매시 정각)', q: 'Chiang Kai-shek Memorial Hall', t: 'MRT', k: 1 },
          { n: '융캉제', q: 'Yongkang Street', t: '도보 10분', k: 1 },
          { n: '타이베이 101 전망대', q: 'Taipei 101', t: 'MRT 약 15분', k: 1 }],
          f: [['딘타이펑 본점', 'Din Tai Fung Xinyi', 'k'], ['망고빙수', 'Smoothie House Yongkang', 'kv'], ['우육면', 'Yongkang beef noodle', '']] },
        { t: '동물원 · 마오쿵 곤돌라', p: 1, s: [
          { n: '타이베이 시립동물원 (판다관)', q: 'Taipei Zoo', t: 'MRT 원후선 종점', k: 1 },
          { n: '마오쿵 곤돌라', q: 'Maokong Gondola', t: '동물원역 바로 옆', k: 1 }],
          f: [['마오쿵 찻집', 'Maokong tea house', 'kv']] },
        { t: '귀국', s: [{ n: '타오위안공항', q: 'Taoyuan International Airport', t: '공항 MRT (타이베이역 얼리 체크인 가능) — 출발 2시간 30분 전' }], f: [] }
      ] },

    /* ───────── 동남아 ───────── */
    { id: 'vn-danang', c: 'vn', name: '다낭·호이안 + 바나힐', nights: 4, air: 'DAD', airName: '다낭공항',
      base: '미케비치', lat: 16.054, lon: 108.247, climate: C('mmwhhhhhrrrr'),
      tip: '공항에서 시내까지 차로 15분. 9~12월은 우기라 실내 대안을 챙겨요.',
      days: [
        { t: '도착 · 미케비치', s: [
          { n: '다낭공항 → 미케비치', q: 'My Khe Beach', t: '그랩 약 15분 (카시트 없음 — 아이 안고 탑승 주의)' },
          { n: '미케비치', q: 'My Khe Beach', t: '숙소 앞', k: 1 },
          { n: '한시장', q: 'Han Market', t: '그랩 10분' }],
          f: [['반쎄오', 'Banh xeo Ba Duong', 'k'], ['해산물 (미케비치)', 'My Khe seafood restaurant', 'k']] },
        { t: '바나힐', p: 3, s: [
          { n: '바나힐 골든브릿지', q: 'Golden Bridge Ba Na Hills', t: '그랩 약 40분 + 케이블카', k: 1, r: [7, '바나힐 케이블카 입장권 (뷔페 포함권 비교)'] },
          { n: '판타지파크 (실내 놀이공원)', q: 'Fantasy Park Ba Na Hills', t: '바나힐 안', k: 1 }],
          f: [['바나힐 뷔페', 'Ba Na Hills buffet', 'kv']] },
        { t: '호이안 올드타운', p: 3, s: [
          { n: '코코넛 마을 바구니배', q: 'Bay Mau Coconut Forest', t: '그랩 약 40분', k: 1 },
          { n: '호이안 올드타운', q: 'Hoi An Ancient Town', t: '그랩 15분', k: 1 },
          { n: '투본강 소원등 보트 (해질녘)', q: 'Thu Bon River Hoi An', t: '도보', k: 1 }],
          f: [['반미 프엉', 'Banh Mi Phuong', 'k'], ['까오러우', 'Hoi An cao lau', 'k']] },
        { t: '빈원더스 남호이안', p: 2, s: [
          { n: '빈원더스 남호이안 (사파리·워터파크)', q: 'VinWonders Nam Hoi An', t: '그랩 약 50분', k: 1, r: [7, '빈원더스 남호이안 티켓'] }],
          f: [] },
        { t: '오행산 · 귀국', s: [
          { n: '오행산 (마블마운틴)', q: 'Marble Mountains', t: '그랩 15분', s: 1, alt: '엘리베이터로 올라가는 투이선만' },
          { n: '다낭공항', q: 'Da Nang International Airport', t: '그랩 15분 — 출발 2시간 30분 전' }],
          f: [['미꽝', 'Mi Quang Ba Mua', 'k']] }
      ] },

    { id: 'vn-nhatrang', c: 'vn', name: '나트랑 휴양 + 빈원더스', nights: 4, air: 'CXR', airName: '깜란공항',
      base: '나트랑 해변', lat: 12.238, lon: 109.196, climate: C('wwhhhhhhhrrr'),
      tip: '빈원더스는 섬에 있어 케이블카·보트로 들어가요. 하루를 통째로 비워두세요.',
      days: [
        { t: '도착 · 나트랑 해변', s: [
          { n: '깜란공항 → 시내', q: 'Nha Trang Beach', t: '택시 약 40분' },
          { n: '나트랑 해변 산책', q: 'Nha Trang Beach', t: '도보', k: 1 }],
          f: [['넴느엉 (구운 쌈)', 'Nem Nuong Dang Van Quyen', 'k'], ['해산물', 'Nha Trang seafood', 'k']] },
        { t: '빈원더스 나트랑', p: 3, s: [
          { n: '빈원더스 나트랑 (놀이공원·아쿠아리움·워터파크)', q: 'VinWonders Nha Trang', t: '케이블카·보트', k: 1, r: [7, '빈원더스 나트랑 티켓'] }],
          f: [] },
        { t: '섬 호핑투어', p: 2, s: [
          { n: '호핑투어 (스노클링)', q: 'Nha Trang island hopping', t: '투어 픽업', k: 1, r: [3, '호핑투어 예약 (아이 구명조끼 사이즈 확인)'] }],
          f: [['섬 해산물 점심', 'Hon Mun seafood', 'k']] },
        { t: '머드 온천', p: 2, s: [
          { n: '포나가르 참탑', q: 'Po Nagar Cham Towers', t: '그랩 10분', c: 1 },
          { n: '머드 온천 (아이 탕 있는 곳)', q: 'I-Resort Nha Trang', t: '그랩 10분', k: 1 }],
          f: [['반깐', 'Nha Trang banh can', 'k']] },
        { t: '귀국', s: [{ n: '깜란공항', q: 'Cam Ranh International Airport', t: '택시 40분 — 출발 2시간 30분 전' }], f: [] }
      ] },

    { id: 'th-bangkok', c: 'th', name: '방콕 시내 + 수상시장', nights: 4, air: 'BKK', airName: '수완나품공항',
      base: '시암·짜오프라야강', lat: 13.746, lon: 100.534, climate: C('hhhhhrrrrrhh'),
      tip: '왕궁·사원은 긴 바지와 어깨 가리는 옷이 필수예요 (아이도 포함).',
      days: [
        { t: '도착 · 아이콘시암', s: [
          { n: '수완나품공항 → 시내', q: 'Phaya Thai Station', t: '공항철도 약 30분' },
          { n: '아이콘시암 (실내 수상시장)', q: 'ICONSIAM', t: 'BTS + 셔틀보트', k: 1 }],
          f: [['팁사마이 팟타이', 'Thipsamai Pad Thai', 'k'], ['망고 찹쌀밥', 'mango sticky rice Bangkok', 'kv']] },
        { t: '왕궁 · 왓포 · 왓아룬', p: 3, s: [
          { n: '왕궁 · 에메랄드 사원', q: 'Grand Palace Bangkok', t: '수상버스 타창 선착장', c: 1, s: 1, alt: '한낮 땡볕 — 오전 8시 30분 개장 직후로' },
          { n: '왓포 (와불)', q: 'Wat Pho', t: '도보 10분', c: 1, k: 1 },
          { n: '왓아룬 (새벽사원)', q: 'Wat Arun', t: '나룻배 5분', c: 1 }],
          f: [['쏨땀 (매운 정도 "마이 펫" 요청)', 'Bangkok som tam', 'hv'], ['카오만가이', 'Bangkok khao man gai', 'k']] },
        { t: '아이들 하루', p: 2, s: [
          { n: '씨라이프 방콕 (시암파라곤)', q: 'SEA LIFE Bangkok Ocean World', t: 'BTS 시암역', k: 1 },
          { n: '키자니아 방콕', q: 'KidZania Bangkok', t: '같은 건물', k: 1 }],
          f: [['푸드코트 (시암파라곤)', 'Siam Paragon food hall', 'kv']] },
        { t: '수상시장 · 기찻길 시장', p: 2, s: [
          { n: '담넌사두억 수상시장', q: 'Damnoen Saduak Floating Market', t: '투어 차량 약 1시간 30분', k: 1, r: [3, '수상시장 + 매끌롱 투어 (가족 단독 차량)'] },
          { n: '매끌롱 기찻길 시장', q: 'Maeklong Railway Market', t: '차로 20분', k: 1 }],
          f: [['보트 국수', 'boat noodles', 'k']] },
        { t: '귀국', s: [{ n: '수완나품공항', q: 'Suvarnabhumi Airport', t: '공항철도 — 출발 3시간 전' }], f: [] }
      ] },

    { id: 'th-phuket', c: 'th', name: '푸껫 + 피피섬', nights: 4, air: 'HKT', airName: '푸껫공항',
      base: '빠통·카론', lat: 7.890, lon: 98.298, climate: C('hhhhrrrrrrhh'),
      tip: '5~10월은 파도가 높아 섬 투어가 취소될 수 있어요. 예비일을 하루 두세요.',
      days: [
        { t: '도착 · 빠통 비치', s: [
          { n: '푸껫공항 → 빠통', q: 'Patong Beach', t: '차로 약 1시간' },
          { n: '빠통 비치', q: 'Patong Beach', t: '도보', k: 1 }],
          f: [['똠얌꿍 (안 맵게 요청 가능)', 'Patong tom yum', 'h'], ['파인애플 볶음밥', 'Patong pineapple fried rice', 'k']] },
        { t: '피피섬', p: 3, s: [
          { n: '피피섬 스피드보트 투어', q: 'Phi Phi Islands', t: '선착장 픽업', k: 1, r: [3, '피피섬 투어 (멀미약 챙기기)'] }],
          f: [] },
        { t: '빅부다 · 올드타운', p: 2, s: [
          { n: '빅부다', q: 'Big Buddha Phuket', t: '차로 30분', c: 1 },
          { n: '푸껫 올드타운', q: 'Phuket Old Town', t: '차로 30분', k: 1 }],
          f: [['미끼 (푸껫식 국수)', 'Phuket Old Town mee hokkien', 'k']] },
        { t: '워터파크', p: 2, s: [
          { n: '안다만다 워터파크', q: 'Andamanda Phuket', t: '차로 30분', k: 1, r: [3, '워터파크 티켓'] }],
          f: [] },
        { t: '귀국', s: [{ n: '푸껫공항', q: 'Phuket International Airport', t: '차로 1시간 — 출발 3시간 전 출발' }], f: [] }
      ] },

    { id: 'ph-cebu', c: 'ph', name: '세부 리조트 + 호핑', nights: 4, air: 'CEB', airName: '막탄공항',
      base: '막탄섬 리조트', lat: 10.311, lon: 123.977, climate: C('wwhhhrrrrrrw'),
      tip: '대부분 새벽 비행이라 도착 첫날은 리조트에서 쉬는 걸로 잡았어요.',
      days: [
        { t: '도착 · 리조트', s: [
          { n: '막탄공항 → 리조트', q: 'Mactan Island resort', t: '차로 20~30분' },
          { n: '리조트 수영장 · 키즈클럽', q: 'Mactan resort', t: '리조트', k: 1 }],
          f: [['망고 셰이크', 'Cebu mango shake', 'kv']] },
        { t: '아일랜드 호핑', p: 3, s: [
          { n: '아일랜드 호핑 (날루수안·힐루뚱안)', q: 'Nalusuan Island', t: '방카 보트', k: 1, r: [3, '호핑투어 (아이 구명조끼·래시가드)'] }],
          f: [['섬 해산물 바비큐', 'Cebu island hopping lunch', 'k']] },
        { t: '세부 시티', p: 2, s: [
          { n: '마젤란 십자가', q: 'Magellan\'s Cross', t: '차로 약 40분', c: 1 },
          { n: '산토니뇨 성당', q: 'Basilica del Santo Nino', t: '도보 2분', c: 1 },
          { n: 'SM 시사이드 몰', q: 'SM Seaside City Cebu', t: '차로 20분', k: 1 }],
          f: [['주부촌 레촌 (통돼지 구이)', 'Zubuchon', 'k']] },
        { t: '리조트 데이', p: 1, s: [{ n: '리조트 물놀이 · 마사지', q: 'Mactan resort', t: '리조트', k: 1 }], f: [] },
        { t: '귀국', s: [{ n: '막탄공항', q: 'Mactan-Cebu International Airport', t: '차로 30분 — 출발 3시간 전 (새벽 비행 주의)' }], f: [] }
      ] },

    { id: 'my-kk', c: 'my', name: '코타키나발루 선셋 + 반딧불', nights: 4, air: 'BKI', airName: '코타키나발루공항',
      base: '시내·탄중아루', lat: 5.980, lon: 116.073, climate: C('hhhhhhhhhrrr'),
      tip: '세계 3대 선셋으로 꼽히는 곳이에요. 반딧불 투어는 모기 기피제가 필수예요.',
      days: [
        { t: '도착 · 워터프론트', s: [
          { n: '공항 → 시내', q: 'Kota Kinabalu Waterfront', t: '그랩 약 20분' },
          { n: '워터프론트 선셋', q: 'Kota Kinabalu Waterfront', t: '도보', k: 1 },
          { n: '필리피노 마켓 (야시장)', q: 'Filipino Market Kota Kinabalu', t: '도보 5분' }],
          f: [['야시장 해산물·꼬치', 'Filipino Market seafood', 'k'], ['락사', 'Kota Kinabalu laksa', 'h']] },
        { t: '섬 투어', p: 3, s: [
          { n: '툰구 압둘 라만 해양공원 (마누칸·사피섬)', q: 'Manukan Island', t: '제셀톤 포인트 보트 15분', k: 1 }],
          f: [] },
        { t: '반딧불 투어', p: 2, s: [
          { n: '클리아스 강 반딧불·원숭이 투어', q: 'Klias Wetlands', t: '투어 차량 약 2시간', k: 1, r: [3, '반딧불 투어 (석식 포함)'] }],
          f: [] },
        { t: '탄중아루 비치', p: 1, s: [{ n: '탄중아루 비치', q: 'Tanjung Aru Beach', t: '그랩 15분', k: 1 }], f: [['사테 (꼬치)', 'Tanjung Aru satay', 'k']] },
        { t: '귀국', s: [{ n: '코타키나발루공항', q: 'Kota Kinabalu International Airport', t: '그랩 20분 — 출발 3시간 전' }], f: [] }
      ] },

    { id: 'sg-singapore', c: 'sg', name: '싱가포르 + 유니버설·동물원', nights: 4, air: 'SIN', airName: '창이공항',
      base: '마리나베이·시티홀', lat: 1.290, lon: 103.852, climate: C('rrhhhhhhhhrr'),
      tip: '지하철·버스가 깨끗하고 유모차로 다니기 가장 편한 도시예요. 껌 반입 금지.',
      days: [
        { t: '도착 · 쥬얼 · 마리나베이', s: [
          { n: '창이공항 쥬얼 실내 폭포', q: 'Jewel Changi Airport', t: '공항 안', k: 1 },
          { n: '공항 → 시내', q: 'City Hall MRT', t: 'MRT 약 40분 또는 택시 20분' },
          { n: '스펙트라 분수쇼 (마리나베이샌즈)', q: 'Spectra Light and Water Show', t: 'MRT 베이프런트역', k: 1 }],
          f: [['야쿤 카야토스트', 'Ya Kun Kaya Toast', 'kv'], ['티안티안 치킨라이스', 'Tian Tian Hainanese Chicken Rice', 'k']] },
        { t: '센토사 유니버설', p: 3, s: [
          { n: '유니버설 스튜디오 싱가포르', q: 'Universal Studios Singapore', t: '센토사 익스프레스', k: 1, r: [14, '유니버설 싱가포르 티켓'] },
          { n: 'S.E.A. 아쿠아리움', q: 'S.E.A. Aquarium', t: '도보 5분', k: 1 }],
          f: [] },
        { t: '가든스 바이 더 베이', p: 3, s: [
          { n: '플라워돔 · 클라우드 포레스트', q: 'Gardens by the Bay', t: 'MRT 베이프런트역', k: 1, r: [7, '플라워돔·클라우드 포레스트 티켓'] },
          { n: '칠드런스 가든 (물놀이 — 수영복)', q: 'Far East Organization Children\'s Garden', t: '도보', k: 1 },
          { n: '가든 랩소디 (19:45)', q: 'Supertree Grove', t: '도보', k: 1 }],
          f: [['사테 거리 (라우파삿)', 'Lau Pa Sat Satay Street', 'k'], ['칠리크랩', 'Jumbo Seafood Riverside', 'h']] },
        { t: '동물원 · 나이트 사파리', p: 2, s: [
          { n: '싱가포르 동물원', q: 'Singapore Zoo', t: '택시 약 30분', k: 1, r: [7, '동물원 + 나이트 사파리 티켓'] },
          { n: '나이트 사파리', q: 'Night Safari Singapore', t: '도보', k: 1 }],
          f: [] },
        { t: '차이나타운 · 귀국', s: [
          { n: '차이나타운', q: 'Chinatown Singapore', t: 'MRT' },
          { n: '창이공항', q: 'Singapore Changi Airport', t: 'MRT·택시 — 출발 3시간 전' }],
          f: [['맥스웰 호커센터', 'Maxwell Food Centre', 'kv']] }
      ] }
  ];

  const AIRPORTS = [
    ['ICN', '인천'], ['GMP', '김포'], ['PUS', '김해(부산)'], ['CJU', '제주'], ['TAE', '대구'], ['CJJ', '청주'], ['MWX', '무안']
  ];

  const CLIMATE = {
    c: { name: '추움', items: ['패딩·두꺼운 외투', '핫팩', '장갑·목도리·모자', '보습 크림·립밤'] },
    m: { name: '선선함', items: ['가벼운 겉옷 (아침저녁 쌀쌀)', '긴팔·긴바지'] },
    w: { name: '따뜻함', items: ['얇은 겉옷', '선크림', '모자'] },
    h: { name: '더움', items: ['반팔·반바지 넉넉히', '선크림 (아이용)', '모자·선글라스', '휴대용 선풍기', '물병'] },
    r: { name: '덥고 비 잦음', items: ['우비·접이식 우산', '아쿠아슈즈·샌들', '여벌 신발', '선크림 (아이용)', '방수 가방'] }
  };

  return { COUNTRIES, COURSES, AIRPORTS, CLIMATE };
})();

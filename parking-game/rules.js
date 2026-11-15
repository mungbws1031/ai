/*
 * rules.js — 구역(zone) 유형별 정차·주차 판정 규칙
 *
 * 근거: 도로교통법 제2조(정의), 제32조(정차 및 주차의 금지), 제33조(주차금지의 장소),
 *       제34조(정차 또는 주차의 방법), 제35조(주차위반에 대한 조치), 시행령 별표6(과태료),
 *       시행규칙 별표6(안전표지·노면표시), 장애인등편의법 제17조, 안전신문고 주민신고제.
 *
 * ⚠ 게임용 단순화 모델입니다. 과태료는 승용차 기준 대표값이며 지자체·시간대·
 *   탄력적 허용 구간·개정 시점에 따라 달라질 수 있습니다. 실제 운전 시 현장 표지판과
 *   최신 법령(law.go.kr)을 확인하세요.
 */
(function (root) {
  // 정차(停車): 운전자가 5분을 초과하지 않고 차를 정지시키는 것 (제2조 제25호)
  // 주차(駐車): 계속 정지 상태 또는 운전자가 차를 떠나 즉시 운전할 수 없는 상태 (제2조 제24호)
  const STOP_LIMIT_MIN = 5;

  // severity: 여러 구역이 겹칠 때 가장 큰 값이 최종 판정이 됩니다.
  // report: 안전신문고 주민신고 대상(6대 불법 주정차) 여부
  // cctvGrace: 고정식 CCTV가 단속을 확정하기까지 걸리는 (게임)분
  // tow: 운전자가 없을 때 장시간 방치 시 견인 가능성 가중치(0~1)
  const RULES = {
    slot: {
      name: '주차구획(공영주차장)', short: '주차구획',
      stop: true, park: true, severity: 0, fine: 0, report: false, tow: 0, cctvGrace: 999,
      law: '주차장법 — 주차구획선 안에 주차',
      desc: '흰색 구획선 안에 반듯하게 세우면 정식 주차입니다. 주차요금은 별도입니다.',
    },
    street_slot: {
      name: '노상 주차구획', short: '노상 구획',
      stop: true, park: true, severity: 0, fine: 0, report: false, tow: 0, cctvGrace: 999,
      law: '주차장법 제7조(노상주차장) — 도로 위 흰색 구획선',
      desc: '도로 가장자리의 흰색 평행 구획입니다. 구획 안에 들어가야 합니다(보통 2.0×6.0m).',
    },
    white_edge: {
      name: '백색 실선 가장자리', short: '백색 실선',
      stop: true, park: true, severity: 1, fine: 0, report: false, tow: 0, cctvGrace: 999,
      law: '도로교통법 제34조 — 도로 오른쪽 가장자리에 다른 교통을 방해하지 않게 정차·주차',
      desc: '주정차 금지 표시가 없는 가장자리입니다. 진행 방향 오른쪽에, 차로를 막지 않게 붙여 세워야 합니다.',
    },
    lot_aisle: {
      name: '주차장 통로', short: '통로',
      stop: true, park: false, severity: 2, fine: 0, report: false, tow: 0, cctvGrace: 999,
      law: '주차장 관리규정 — 통로 주차는 출차 방해(도로교통법상 단속 대상은 아님)',
      desc: '잠깐 멈추는 건 괜찮지만 통로에 세워두면 다른 차가 못 나갑니다. 과태료는 없지만 민원·감점 대상입니다.',
      penalty: 150,
    },
    yellow_dashed: {
      name: '황색 점선 가장자리', short: '황색 점선',
      stop: true, park: false, severity: 3, fine: 40000, report: false, tow: 0.3, cctvGrace: 5,
      law: '도로교통법 시행규칙 별표6 노면표시 — 황색 점선: 주차 금지, 5분 이내 정차 허용',
      desc: '승하차·짐 싣기 같은 5분 이내 정차만 됩니다. 5분을 넘기거나 운전자가 차를 떠나면 주차로 보고 단속합니다.',
    },
    yellow_solid: {
      name: '황색 실선 가장자리', short: '황색 실선',
      stop: false, park: false, severity: 4, fine: 40000, report: false, tow: 0.5, cctvGrace: 5,
      law: '도로교통법 시행규칙 별표6 노면표시 — 황색 실선: 정차·주차 모두 금지(탄력적 허용 시간은 보조표지 확인)',
      desc: '잠깐 정차도 안 됩니다. 일부 구간은 보조표지로 특정 시간에만 허용하니 표지판을 확인하세요.',
    },
    lane: {
      name: '차로 위', short: '차로',
      stop: false, park: false, severity: 4, fine: 40000, report: false, tow: 0.6, cctvGrace: 3,
      law: '도로교통법 제34조 — 정차는 도로 오른쪽 가장자리에. 차로 한가운데 정차는 정차·주차 방법 위반',
      desc: '가장자리가 아닌 차로에 멈추면 뒤차 통행을 막습니다. 차체 일부만 튀어나와도 위반입니다.',
    },
    wrong_way: {
      name: '역방향 정차', short: '역방향',
      stop: false, park: false, severity: 4, fine: 40000, report: false, tow: 0.3, cctvGrace: 5,
      law: '도로교통법 제34조 — 도로의 오른쪽 가장자리에 정차(진행 방향 반대로 세우면 위반)',
      desc: '맞은편 차로 가장자리에 거꾸로 세웠습니다. 우리나라는 진행 방향 오른쪽 가장자리에만 세울 수 있습니다.',
    },
    crosswalk_near: {
      name: '횡단보도 10m 이내', short: '횡단보도 10m',
      stop: false, park: false, severity: 5, fine: 40000, report: true, tow: 0.6, cctvGrace: 1,
      law: '도로교통법 제32조 제5호 — 건널목 가장자리·횡단보도로부터 10m 이내 정차·주차 금지',
      desc: '보행자가 차에 가려 운전자 눈에 안 보이게 됩니다. 주민신고 대상입니다.',
    },
    corner: {
      name: '교차로 모퉁이 5m 이내', short: '모퉁이 5m',
      stop: false, park: false, severity: 5, fine: 40000, report: true, tow: 0.7, cctvGrace: 1,
      law: '도로교통법 제32조 제2호 — 교차로 가장자리나 도로 모퉁이로부터 5m 이내 정차·주차 금지',
      desc: '회전하는 차의 시야와 회전 반경을 막습니다. 주민신고 대상입니다.',
    },
    bus_stop: {
      name: '버스정류소 10m 이내', short: '버스정류소',
      stop: false, park: false, severity: 5, fine: 40000, report: true, tow: 0.7, cctvGrace: 1,
      law: '도로교통법 제32조 제4호 — 버스정류장 기둥·표지판·선으로부터 10m 이내 정차·주차 금지',
      desc: '버스가 정류장에 붙지 못해 승객이 차도로 내려야 합니다. 주민신고 대상입니다.',
    },
    disabled: {
      name: '장애인전용 주차구역', short: '장애인전용',
      stop: false, park: false, severity: 6, fine: 100000, report: true, tow: 0, cctvGrace: 1,
      law: '장애인·노인·임산부 등의 편의증진 보장에 관한 법률 제17조 — 표지 없는 차량 주차 시 과태료 10만원',
      desc: '장애인 사용 자동차 표지가 있는 차만 주차할 수 있습니다. 앞을 막거나 선을 침범하면 주차방해로 50만원입니다.',
    },
    intersection: {
      name: '교차로 안', short: '교차로',
      stop: false, park: false, severity: 6, fine: 40000, report: true, tow: 0.8, cctvGrace: 1,
      law: '도로교통법 제32조 제1호 — 교차로 안 정차·주차 금지',
      desc: '교차로 한가운데에 멈추면 모든 방향 통행이 막힙니다.',
    },
    crosswalk: {
      name: '횡단보도 위', short: '횡단보도',
      stop: false, park: false, severity: 6, fine: 40000, report: true, tow: 0.9, cctvGrace: 1,
      law: '도로교통법 제32조 제1호 — 횡단보도 위 정차·주차 금지',
      desc: '보행자 통로를 막습니다. 주민신고 대상이며 즉시 견인될 수 있습니다.',
    },
    sidewalk: {
      name: '보도(인도)', short: '인도',
      stop: false, park: false, severity: 7, fine: 40000, report: true, tow: 0.8, cctvGrace: 1,
      law: '도로교통법 제32조 제1호 — 차도와 보도가 구분된 도로의 보도 정차·주차 금지',
      desc: '바퀴 하나만 올려도 위반입니다. 2023년부터 인도 주정차도 주민신고 대상입니다.',
    },
    hydrant: {
      name: '소화전 5m 이내', short: '소화전 5m',
      stop: false, park: false, severity: 8, fine: 80000, report: true, tow: 1.0, cctvGrace: 1,
      law: '도로교통법 제32조 제6호 — 소방용수시설·비상소화장치 5m 이내 정차·주차 금지 (승용 과태료 8만원)',
      desc: '화재 때 소방차가 물을 못 씁니다. 적색 연석·노면 표시가 있고, 일반 위반의 2배 과태료입니다. 주민신고 대상입니다.',
    },
    school_zone: {
      name: '어린이보호구역', short: '어린이보호구역',
      stop: false, park: false, severity: 9, fine: 120000, report: true, tow: 1.0, cctvGrace: 1, speedLimit: 30,
      law: '도로교통법 제32조 제8호(2021.10.21 시행) — 어린이보호구역 정차·주차 금지 (승용 과태료 12만원, 일반의 3배)',
      desc: '적색 포장 구간입니다. 잠깐 정차도 안 되며, 과태료가 일반의 3배입니다. 제한속도는 시속 30km입니다.',
    },
  };

  // 정차·주차 외의 운전 중 위반 (이벤트)
  const DRIVE_VIOLATIONS = {
    phone: {
      name: '운전 중 휴대전화 사용', fine: 60000, points: 15,
      law: '도로교통법 제49조 제1항 제10호 — 운전 중 휴대전화 사용 금지 (승용 범칙금 6만원, 벌점 15점)',
      desc: '차가 멈춘 상태에서만 전화를 받을 수 있습니다.',
    },
    center_line: {
      name: '중앙선 침범', fine: 60000, points: 30,
      law: '도로교통법 제13조 제3항 — 도로 중앙 우측 부분 통행 (승용 범칙금 6만원, 벌점 30점)',
      desc: '황색 복선 중앙선은 넘을 수 없습니다. 교차로나 유턴 구간을 이용하세요.',
    },
    school_speed: {
      name: '어린이보호구역 속도위반', fine: 60000, points: 15,
      law: '도로교통법 제12조·시행령 별표8 — 어린이보호구역 제한속도 30km/h 초과 (승용 범칙금 6만원~)',
      desc: '어린이보호구역에서는 범칙금·벌점이 2배입니다.',
    },
    sidewalk_drive: {
      name: '보도 통행', fine: 40000, points: 10,
      law: '도로교통법 제13조 제1항 — 보도와 차도가 구분된 도로에서는 차도로 통행',
      desc: '건물 진출입로가 아닌 곳에서 보도를 밟고 지나갔습니다.',
    },
    crash: {
      name: '접촉 사고', fine: 0, points: 0,
      law: '도로교통법 제54조 — 사고 발생 시 즉시 정차·사상자 구호·피해 차주에게 연락처 제공',
      desc: '주차된 차를 긁으면 연락처를 남겨야 합니다(미이행 시 물피도주 범칙금 12만원).',
      penalty: 100,
    },
  };

  const TOW_NOTE = '도로교통법 제35조 — 경찰공무원·시군공무원이 이동을 명령하고, 운전자가 없으면 견인할 수 있습니다. 견인료(서울 승용 약 4만원)와 보관료가 따로 붙습니다.';
  const REPORT_NOTE = '안전신문고 주민신고 — 같은 위치에서 1분 이상 간격으로 찍은 사진 2장(차량번호·위반 장소 식별)이 있으면 과태료가 부과됩니다. 6대 대상: 소화전·교차로 모퉁이·버스정류소·횡단보도·어린이보호구역·인도.';
  const OVERTIME_NOTE = '같은 장소에서 2시간을 넘기면 일반 주정차 위반 과태료가 1만원 가산됩니다(승용 4만→5만원).';

  const api = { RULES, DRIVE_VIOLATIONS, STOP_LIMIT_MIN, TOW_NOTE, REPORT_NOTE, OVERTIME_NOTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);

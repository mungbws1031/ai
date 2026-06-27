// 일정 유형별 준비 체크리스트 템플릿 (AI 키 없이 동작).
// 일정 제목에 키워드가 있으면 단계별 준비 할 일을 'D-며칠' 단위로 제안한다.
// 예: 출장 → 출장 신청서 작성(D-3)부터.

export interface PrepTemplateTask {
  text: string;
  daysBefore: number;
}
export interface PrepTemplate {
  name: string;
  keywords: string[];
  tasks: PrepTemplateTask[];
}

const TEMPLATES: PrepTemplate[] = [
  {
    name: '출장',
    keywords: ['출장'],
    tasks: [
      { text: '출장 신청서 작성하기', daysBefore: 3 },
      { text: '교통편 예약하기 (기차/항공)', daysBefore: 3 },
      { text: '숙소 예약하기', daysBefore: 3 },
      { text: '출장비·경비 규정 확인하기', daysBefore: 2 },
      { text: '회의 자료·필요 서류 준비하기', daysBefore: 2 },
      { text: '짐 싸기', daysBefore: 1 },
      { text: '신분증·법인카드·충전기 챙기기', daysBefore: 0 },
    ],
  },
  {
    name: '여행',
    keywords: ['여행', '휴가'],
    tasks: [
      { text: '숙소 예약하기', daysBefore: 7 },
      { text: '교통편 예약하기', daysBefore: 7 },
      { text: '짐 리스트 만들기', daysBefore: 2 },
      { text: '짐 싸기', daysBefore: 1 },
      { text: '여권·충전기·상비약 챙기기', daysBefore: 0 },
    ],
  },
  {
    name: '면접',
    keywords: ['면접'],
    tasks: [
      { text: '회사·직무 조사하기', daysBefore: 3 },
      { text: '예상 질문 정리하기', daysBefore: 2 },
      { text: '복장 준비하기', daysBefore: 1 },
      { text: '서류·신분증 챙기기', daysBefore: 0 },
    ],
  },
  {
    name: '병원',
    keywords: ['병원', '진료', '검진'],
    tasks: [
      { text: '예약 시간 확인하기', daysBefore: 2 },
      { text: '보험증·신분증 챙기기', daysBefore: 1 },
      { text: '금식·주의사항 확인하기', daysBefore: 1 },
    ],
  },
  {
    name: '결혼식',
    keywords: ['결혼식', '예식', '웨딩'],
    tasks: [
      { text: '축의금 준비하기', daysBefore: 2 },
      { text: '하객 복장 준비하기', daysBefore: 1 },
      { text: '장소·교통 확인하기', daysBefore: 0 },
    ],
  },
  {
    name: '시험',
    keywords: ['시험', '고사'],
    tasks: [
      { text: '시험 범위 정리하기', daysBefore: 3 },
      { text: '핵심 요약 복습하기', daysBefore: 1 },
      { text: '준비물·신분증 챙기기', daysBefore: 0 },
    ],
  },
];

/** 제목에서 준비 템플릿을 찾는다(없으면 null). */
export function detectTemplate(title: string): PrepTemplate | null {
  const t = title || '';
  return TEMPLATES.find((tpl) => tpl.keywords.some((k) => t.includes(k))) ?? null;
}

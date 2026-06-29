# PRD — 전자혀: 요똥을 위한 맛 튜닝 앱

- **문서 버전:** v1.0
- **작성일:** 2026-06-19
- **제품명:** 전자혀 / Electronic Tongue
- **한 줄 설명:** 요리 초보가 음식 무게와 원하는 맛 스타일을 고르면, 짠맛·단맛·신맛·기름·감칠맛 배합을 g 단위로 계산해주는 맛 튜닝 앱
- **MVP 권장 형태:** 모바일 우선 반응형 웹앱(PWA). 추후 React Native/Expo 앱으로 확장 가능
- **개발 대상:** Codex가 바로 구현할 수 있는 React + TypeScript 기반 MVP

---

## 1. 제품 배경

요리 초보자는 레시피를 그대로 따라 해도 맛이 안 나는 경우가 많다. 이유는 다음과 같다.

1. 재료량이 레시피와 다름
2. 간장, 설탕, 식초, 기름의 비율 감각이 없음
3. “싱겁다/짜다/느끼하다/밋밋하다”를 어떻게 보정해야 하는지 모름
4. 아이용, 요즘 유행 맛, 유명 요리사 스타일처럼 목적에 맞는 배합 조절이 어려움
5. 숟가락 계량은 편하지만 정확도가 낮고, g 단위 계산은 번거로움

**전자혀**는 이런 문제를 해결하기 위해, 음식을 “맛의 파라미터”로 해석한다.

> 요리 = 음식 무게 × 맛 프리셋 × 조미료 기여도 × 보정 규칙

앱은 사용자가 음식 무게와 스타일을 입력하면, 목표 염도·당도·산미·지방감·감칠맛에 맞춰 조미료 배합을 추천한다.

---

## 2. 제품 비전

**전자혀는 요리 초보를 위한 맛 설계 계산기다.**

사용자는 감으로 조미료를 넣지 않고, 다음과 같은 방식으로 요리한다.

1. 음식 종류 선택
2. 음식 무게 입력
3. 원하는 맛 스타일 선택
4. 조미료 배합 확인
5. 맛을 본 뒤 증상 기반으로 보정

최종 목표는 사용자가 “내가 왜 맛을 못 냈는지” 이해하고, 점점 감각을 학습하도록 돕는 것이다.

---

## 3. 핵심 사용자

### 3.1 요똥/요리 초보

- 레시피를 봐도 맛이 안 남
- “간을 맞춘다”는 개념이 추상적으로 느껴짐
- 숟가락 계량은 가능한데 비율 계산은 어려움
- 목표: 실패 확률 낮추기

### 3.2 아이 밥을 만드는 보호자

- 아이가 매운맛, 강한 산미, 쓴맛을 싫어함
- 달달짭짤하고 부드러운 맛을 원함
- 목표: 아이들이 잘 먹는 맛 만들기

### 3.3 요즘 유행 맛을 따라 하고 싶은 사용자

- 로제, 크리미 매콤, 핫허니, 칠리크리스프, 고추장마요 같은 맛을 만들고 싶음
- 목표: 집밥을 외식/분식/트렌디한 맛으로 바꾸기

### 3.4 레시피를 응용하고 싶은 사용자

- 재료량이 레시피와 달라도 배합을 다시 계산하고 싶음
- 목표: 음식 무게 기준으로 양념을 스케일링

---

## 4. MVP 목표

MVP는 실제 센서형 전자혀가 아니라, **계산형 전자혀**다.

### 4.1 MVP에서 반드시 제공할 기능

1. 음식 무게 기반 양념 계산
2. 음식 카테고리 선택
3. 맛 스타일 프리셋 선택
4. g 단위 및 숟가락 단위 환산
5. 맛 보정 가이드
6. 나만의 레시피 저장
7. 기본 조미료 DB 제공
8. 모바일 화면 최적화

### 4.2 MVP에서 제외할 기능

- 실제 미각 센서 연동
- 사진 인식 기반 재료 자동 분석
- 영양성분 정밀 계산
- 회원가입/로그인
- 서버 동기화
- AI 챗봇 기반 레시피 생성
- 실시간 재고 관리

이 기능들은 추후 버전에서 확장한다.

---

## 5. 제품 핵심 컨셉

### 5.1 앱의 핵심 문장

> “음식 무게만 알려줘. 존맛탱 배합은 전자혀가 계산해줄게.”

### 5.2 UX 원칙

1. **숫자는 정확하게, 설명은 쉽게**
2. 사용자는 맛 과학을 몰라도 결과를 이해할 수 있어야 함
3. 모든 추천은 g 단위와 숟가락 단위를 함께 제공
4. 초보자는 “초간단 모드”, 숙련자는 “정밀 모드” 사용
5. 맛이 실패했을 때도 보정 루트를 제공

---

## 6. 핵심 기능 상세

## 6.1 홈 화면

### 목적
사용자가 바로 계산을 시작하도록 한다.

### 주요 요소

- 앱 로고/타이틀: 전자혀
- 서브카피: 요똥을 위한 맛 튜닝 계산기
- CTA 버튼: “맛 계산하기”
- 보조 CTA: “맛 보정하기”
- 최근 저장한 레시피 목록
- 빠른 프리셋 카드
  - 아이들이 좋아하는 맛
  - 요즘 로제/매콤달콤
  - 백종원식 단짠 한식
  - 이연복식 중식풍
  - 고든 램지식 버터허브

---

## 6.2 맛 계산하기 플로우

### Step 1. 음식 카테고리 선택

사용자는 만들 음식의 타입을 고른다.

- 국/탕
- 찌개
- 볶음
- 무침
- 조림
- 구이
- 덮밥/밥요리
- 면/파스타
- 드레싱/샐러드
- 소스/디핑소스
- 아이 반찬

### Step 2. 음식 무게 입력

- 숫자 입력: 예) 300g
- 빠른 선택: 100g, 200g, 300g, 500g, 1kg
- 설명: “완성될 음식 전체 무게를 대략 입력하세요.”

### Step 3. 맛 스타일 선택

기본 프리셋:

1. 기본 집밥
2. 아이용 달달짭짤
3. 요즘 로제/크리미 매콤
4. 핫허니/양념치킨
5. 칠리크리스프/바삭 매콤
6. 유자라임 새콤매콤
7. 고추장마요/김치마요
8. 백종원식 대중 한식
9. 류수영식 원팬 집밥
10. 이연복식 중식풍
11. 최강록식 섬세한 감칠맛
12. 고든 램지식 서양식
13. 파인다이닝풍

### Step 4. 사용 가능한 조미료 선택

기본 체크박스:

- 소금
- 간장
- 저염간장
- 설탕
- 올리고당/물엿
- 꿀
- 식초
- 레몬즙
- 케첩
- 고추장
- 된장
- 굴소스
- 액젓
- 마요네즈
- 참기름
- 들기름
- 식용유
- 버터
- 다진 마늘
- 대파
- 후추
- 고춧가루

MVP에서는 사용자가 조미료를 선택하지 않아도, 프리셋별 기본 조합을 자동 추천한다.

### Step 5. 결과 화면

결과는 다음을 보여준다.

1. 추천 양념 배합표
2. g 단위
3. 숟가락/작은술 환산
4. 조리 순서
5. 맛 프로필 레이더 또는 막대 그래프
6. “맛봤는데 이상해요” 보정 버튼
7. 저장 버튼

---

## 6.3 맛 보정하기 기능

### 목적
이미 만든 음식이 실패했을 때, 증상 기반으로 추가 조미료를 추천한다.

### 사용자 입력

- 음식 무게
- 현재 상태 선택

상태 목록:

1. 밍밍해요
2. 짜기만 해요
3. 너무 달아요
4. 너무 셔요
5. 너무 느끼해요
6. 감칠맛이 없어요
7. 맛이 따로 놀아요
8. 텁텁해요
9. 매운맛만 튀어요
10. 아이가 안 먹어요

### 보정 규칙

| 상태 | 1차 보정 | 2차 보정 | 설명 |
|---|---|---|---|
| 밍밍함 | 소금/간장 +0.1~0.2% | 감칠맛 재료 추가 | 기본 간이 부족한 상태 |
| 짜기만 함 | 물/재료 추가 | 설탕 +0.3%, 기름 +0.5% | 짠맛의 날카로움을 둥글게 |
| 너무 달음 | 식초 +0.3~0.8% | 소금 +0.1% | 단맛을 산미와 짠맛으로 정리 |
| 너무 셈 | 설탕 +0.5~1% | 기름 +0.5% | 산미를 둥글게 함 |
| 느끼함 | 식초/레몬 +0.3~1% | 매운맛/향채 | 지방감을 산미로 절단 |
| 깊이 없음 | 간장/액젓/굴소스 +0.2~0.5% | 마늘/파기름 | 감칠맛 부족 |
| 따로 놂 | 설탕 +0.3%, 기름 +0.5% | 가열/졸이기 | 맛의 접착력 부족 |
| 텁텁함 | 물 추가 | 산미 +0.2% | 농도 또는 양념 과다 |
| 매운맛만 튐 | 설탕 +0.5%, 기름 +0.5% | 유제품/마요 | 캡사이신 완화 |
| 아이가 안 먹음 | 매운맛/산미 줄임 | 단맛+기름+감칠맛 | 날카로운 맛 제거 |

---

## 7. 맛 계산 엔진

## 7.1 기본 개념

전자혀는 음식의 최종 맛을 다음 6개 축으로 해석한다.

1. Saltiness: 짠맛
2. Sweetness: 단맛
3. Acidity: 신맛
4. Fatness: 기름/지방감
5. Umami: 감칠맛
6. Aroma/Spice: 향·매운맛

MVP에서는 실제 화학 농도를 정밀 계산하지 않고, **요리 실무 기준의 상대값**으로 계산한다.

---

## 7.2 기본 공식

```ts
requiredAmountG = foodWeightG * targetPercent / 100
```

예:

```ts
foodWeightG = 300
targetSweetPercent = 3
requiredSugarG = 300 * 3 / 100 // 9g
```

---

## 7.3 염도 계산

염도는 소금 등가량으로 계산한다.

```ts
targetSaltEqG = foodWeightG * saltPercent / 100
```

예:

- 음식 300g
- 목표 염도 1%
- 필요 소금 등가량 = 3g

간장은 소금 100%가 아니므로 조미료별 saltEquivalent를 사용한다.

```ts
condimentAmountG = targetSaltEqG / condiment.saltEqPerG
```

예:

```ts
soySauce.saltEqPerG = 0.16
targetSaltEqG = 3
soySauceAmountG = 3 / 0.16 // 18.75g
```

주의:

- 제품마다 실제 염도는 다르다.
- 앱에는 “대략값입니다. 제품 라벨에 따라 조정하세요.”라는 안내를 넣는다.

---

## 7.4 기본 조미료 기여도

MVP 기본값이다. 사용자가 추후 직접 수정할 수 있게 설계한다.

```ts
const CONDIMENTS = [
  {
    id: "salt",
    name: "소금",
    saltEqPerG: 1.0,
    sweetEqPerG: 0,
    acidEqPerG: 0,
    fatEqPerG: 0,
    umamiLevel: 0,
    defaultUnit: "g"
  },
  {
    id: "soy_sauce",
    name: "간장",
    saltEqPerG: 0.16,
    sweetEqPerG: 0.01,
    acidEqPerG: 0,
    fatEqPerG: 0,
    umamiLevel: 3,
    defaultUnit: "g"
  },
  {
    id: "low_sodium_soy_sauce",
    name: "저염간장",
    saltEqPerG: 0.10,
    sweetEqPerG: 0.01,
    acidEqPerG: 0,
    fatEqPerG: 0,
    umamiLevel: 2,
    defaultUnit: "g"
  },
  {
    id: "sugar",
    name: "설탕",
    saltEqPerG: 0,
    sweetEqPerG: 1.0,
    acidEqPerG: 0,
    fatEqPerG: 0,
    umamiLevel: 0,
    defaultUnit: "g"
  },
  {
    id: "oligosaccharide",
    name: "올리고당/물엿",
    saltEqPerG: 0,
    sweetEqPerG: 0.7,
    acidEqPerG: 0,
    fatEqPerG: 0,
    umamiLevel: 0,
    defaultUnit: "g"
  },
  {
    id: "vinegar",
    name: "식초",
    saltEqPerG: 0,
    sweetEqPerG: 0,
    acidEqPerG: 1.0,
    fatEqPerG: 0,
    umamiLevel: 0,
    defaultUnit: "g"
  },
  {
    id: "lemon_juice",
    name: "레몬즙",
    saltEqPerG: 0,
    sweetEqPerG: 0.02,
    acidEqPerG: 0.8,
    fatEqPerG: 0,
    umamiLevel: 0,
    defaultUnit: "g"
  },
  {
    id: "ketchup",
    name: "케첩",
    saltEqPerG: 0.02,
    sweetEqPerG: 0.23,
    acidEqPerG: 0.15,
    fatEqPerG: 0,
    umamiLevel: 2,
    defaultUnit: "g"
  },
  {
    id: "gochujang",
    name: "고추장",
    saltEqPerG: 0.06,
    sweetEqPerG: 0.18,
    acidEqPerG: 0.02,
    fatEqPerG: 0,
    umamiLevel: 3,
    spiceLevel: 4,
    defaultUnit: "g"
  },
  {
    id: "doenjang",
    name: "된장",
    saltEqPerG: 0.12,
    sweetEqPerG: 0.02,
    acidEqPerG: 0.01,
    fatEqPerG: 0.02,
    umamiLevel: 4,
    defaultUnit: "g"
  },
  {
    id: "oyster_sauce",
    name: "굴소스",
    saltEqPerG: 0.09,
    sweetEqPerG: 0.12,
    acidEqPerG: 0,
    fatEqPerG: 0,
    umamiLevel: 5,
    defaultUnit: "g"
  },
  {
    id: "fish_sauce",
    name: "액젓",
    saltEqPerG: 0.20,
    sweetEqPerG: 0,
    acidEqPerG: 0,
    fatEqPerG: 0,
    umamiLevel: 5,
    defaultUnit: "g"
  },
  {
    id: "mayo",
    name: "마요네즈",
    saltEqPerG: 0.01,
    sweetEqPerG: 0.02,
    acidEqPerG: 0.03,
    fatEqPerG: 0.70,
    umamiLevel: 1,
    defaultUnit: "g"
  },
  {
    id: "sesame_oil",
    name: "참기름",
    saltEqPerG: 0,
    sweetEqPerG: 0,
    acidEqPerG: 0,
    fatEqPerG: 1.0,
    umamiLevel: 1,
    aromaLevel: 5,
    defaultUnit: "g"
  },
  {
    id: "butter",
    name: "버터",
    saltEqPerG: 0.01,
    sweetEqPerG: 0,
    acidEqPerG: 0,
    fatEqPerG: 0.8,
    umamiLevel: 2,
    aromaLevel: 4,
    defaultUnit: "g"
  }
]
```

---

## 7.5 음식 카테고리별 기본 목표값

단위는 완성 음식 전체 무게 대비 %.

```ts
const DISH_CATEGORY_PROFILES = {
  soup: {
    name: "국/탕",
    saltPct: [0.6, 0.8],
    sweetPct: [0, 0.3],
    acidPct: [0, 0.2],
    fatPct: [0, 3],
    umami: 4
  },
  stew: {
    name: "찌개",
    saltPct: [0.8, 1.0],
    sweetPct: [0, 0.5],
    acidPct: [0, 0.5],
    fatPct: [1, 5],
    umami: 5
  },
  stir_fry: {
    name: "볶음",
    saltPct: [0.9, 1.3],
    sweetPct: [1, 4],
    acidPct: [0, 0.8],
    fatPct: [3, 8],
    umami: 4
  },
  muchim: {
    name: "무침",
    saltPct: [0.9, 1.2],
    sweetPct: [1, 3],
    acidPct: [0, 3],
    fatPct: [1, 3],
    umami: 3
  },
  braise: {
    name: "조림",
    saltPct: [1.0, 1.5],
    sweetPct: [3, 8],
    acidPct: [0, 0.5],
    fatPct: [1, 5],
    umami: 5
  },
  grill: {
    name: "구이",
    saltPct: [0.8, 1.2],
    sweetPct: [0, 2],
    acidPct: [0, 1],
    fatPct: [5, 15],
    umami: 3
  },
  rice_bowl: {
    name: "덮밥/밥요리",
    saltPct: [0.8, 1.2],
    sweetPct: [1, 4],
    acidPct: [0, 0.8],
    fatPct: [3, 8],
    umami: 4
  },
  noodle_pasta: {
    name: "면/파스타",
    saltPct: [0.8, 1.2],
    sweetPct: [0, 3],
    acidPct: [0, 2],
    fatPct: [5, 15],
    umami: 4
  },
  dressing: {
    name: "드레싱/샐러드",
    saltPct: [0.6, 1.2],
    sweetPct: [2, 8],
    acidPct: [5, 25],
    fatPct: [20, 60],
    umami: 2
  },
  dipping_sauce: {
    name: "소스/디핑소스",
    saltPct: [1.5, 3.5],
    sweetPct: [3, 15],
    acidPct: [0, 10],
    fatPct: [0, 70],
    umami: 5
  },
  kids_side: {
    name: "아이 반찬",
    saltPct: [0.7, 1.0],
    sweetPct: [2, 5],
    acidPct: [0, 0.5],
    fatPct: [3, 7],
    umami: 4
  }
}
```

---

## 7.6 맛 스타일 프리셋

스타일 프리셋은 카테고리 목표값 위에 덮어씌우는 modifier다.

```ts
const TASTE_STYLE_PRESETS = {
  basic_home: {
    name: "기본 집밥",
    description: "실패 확률 낮은 기본 단짠 감칠맛",
    saltMultiplier: 1.0,
    sweetMultiplier: 1.0,
    acidMultiplier: 1.0,
    fatMultiplier: 1.0,
    umamiBoost: 0,
    spiceLevel: 0,
    recommendedCondiments: ["soy_sauce", "sugar", "garlic", "sesame_oil"]
  },
  kids_sweet_savory: {
    name: "아이용 달달짭짤",
    description: "신맛과 매운맛을 줄이고 단맛과 감칠맛을 올린 맛",
    targetOverride: {
      saltPct: [0.7, 1.0],
      sweetPct: [2, 5],
      acidPct: [0, 0.5],
      fatPct: [3, 7],
      umami: 4
    },
    recommendedCondiments: ["soy_sauce", "oligosaccharide", "butter", "ketchup"]
  },
  trendy_rose: {
    name: "요즘 로제/크리미 매콤",
    description: "크리미함을 중심으로 매콤달콤하게",
    targetOverride: {
      saltPct: [1.0, 1.3],
      sweetPct: [3, 7],
      acidPct: [0.3, 1.0],
      fatPct: [8, 15],
      umami: 5
    },
    recommendedCondiments: ["gochujang", "ketchup", "soy_sauce", "sugar", "butter", "milk_or_cream", "cheese"]
  },
  hot_honey_chicken: {
    name: "핫허니/양념치킨",
    description: "달콤함이 강한 매콤새콤 분식/치킨집 맛",
    targetOverride: {
      saltPct: [1.0, 1.3],
      sweetPct: [6, 12],
      acidPct: [1, 3],
      fatPct: [2, 6],
      umami: 4
    },
    recommendedCondiments: ["gochujang", "ketchup", "soy_sauce", "honey", "vinegar", "garlic"]
  },
  chili_crisp: {
    name: "칠리크리스프/바삭 매콤",
    description: "매운 기름과 바삭한 마늘/양파 식감",
    targetOverride: {
      saltPct: [1.0, 1.3],
      sweetPct: [1, 3],
      acidPct: [0, 0.5],
      fatPct: [10, 20],
      umami: 4
    },
    recommendedCondiments: ["chili_powder", "oil", "fried_garlic", "fried_onion", "soy_sauce", "sesame"]
  },
  yuzu_lime_spicy: {
    name: "유자라임 새콤매콤",
    description: "산미와 단맛이 살아 있는 상큼한 매콤함",
    targetOverride: {
      saltPct: [0.9, 1.2],
      sweetPct: [3, 7],
      acidPct: [3, 8],
      fatPct: [1, 5],
      umami: 3
    },
    recommendedCondiments: ["soy_sauce", "yuzu_syrup", "lime_juice", "vinegar", "chili_sauce"]
  },
  gochujang_mayo: {
    name: "고추장마요/김치마요",
    description: "고소한 마요를 중심으로 매콤새콤하게",
    targetOverride: {
      saltPct: [1.0, 1.5],
      sweetPct: [2, 6],
      acidPct: [1, 5],
      fatPct: [35, 70],
      umami: 4
    },
    recommendedCondiments: ["mayo", "gochujang", "sugar", "vinegar", "soy_sauce"]
  },
  baek_jongwon: {
    name: "백종원식 대중 한식",
    description: "단짠, 마늘, 파기름 중심의 밥도둑 스타일",
    targetOverride: {
      saltPct: [1.1, 1.4],
      sweetPct: [2, 6],
      acidPct: [0, 1],
      fatPct: [4, 8],
      umami: 5
    },
    recommendedCondiments: ["soy_sauce", "sugar", "garlic", "green_onion", "oil", "sesame_oil"]
  },
  ryu_sooyoung: {
    name: "류수영식 원팬 집밥",
    description: "진하고 눅진한 원팬 밥반찬 스타일",
    targetOverride: {
      saltPct: [1.0, 1.3],
      sweetPct: [2, 5],
      acidPct: [0, 1],
      fatPct: [5, 10],
      umami: 5
    },
    recommendedCondiments: ["soy_sauce", "oyster_sauce", "sugar", "garlic", "oil", "gochujang_or_ketchup"]
  },
  lee_yeonbok: {
    name: "이연복식 중식풍",
    description: "파마늘생강 기름향, 굴소스, 전분 농도 중심",
    targetOverride: {
      saltPct: [1.0, 1.3],
      sweetPct: [1, 4],
      acidPct: [0.5, 3],
      fatPct: [8, 15],
      umami: 5
    },
    recommendedCondiments: ["soy_sauce", "oyster_sauce", "sugar", "vinegar", "oil", "starch_water", "garlic", "ginger"]
  },
  choi_kangrok: {
    name: "최강록식 섬세한 감칠맛",
    description: "다시, 간장, 미림으로 조용하게 깊은 맛",
    targetOverride: {
      saltPct: [0.8, 1.1],
      sweetPct: [1, 3],
      acidPct: [0, 1],
      fatPct: [2, 6],
      umami: 5
    },
    recommendedCondiments: ["soy_sauce", "mirin", "dashi", "sugar"]
  },
  gordon_ramsay: {
    name: "고든 램지식 서양식",
    description: "정확한 소금, 버터, 허브, 산미 마무리",
    targetOverride: {
      saltPct: [0.9, 1.2],
      sweetPct: [0, 1],
      acidPct: [0.5, 2],
      fatPct: [8, 20],
      umami: 3
    },
    recommendedCondiments: ["salt", "butter", "olive_oil", "lemon_juice", "herbs", "garlic", "pepper"]
  },
  fine_dining: {
    name: "파인다이닝풍",
    description: "절제된 간, 산미, 향, 식감 포인트",
    targetOverride: {
      saltPct: [0.8, 1.1],
      sweetPct: [0, 2],
      acidPct: [1, 3],
      fatPct: [5, 15],
      umami: 4
    },
    recommendedCondiments: ["salt", "lemon_juice", "olive_oil", "herbs", "butter"]
  }
}
```

---

## 7.7 프리셋별 템플릿 레시피

MVP에서는 완전한 수학적 최적화보다, 안정적인 템플릿 기반 계산을 우선한다.

### 예시: 아이용 간장버터 스타일

300g 기준 원형:

```ts
const kidSoyButterTemplate = {
  baseWeightG: 300,
  ingredients: [
    { condimentId: "soy_sauce", amountG: 15 },
    { condimentId: "oligosaccharide", amountG: 10 },
    { condimentId: "butter", amountG: 10 },
    { condimentId: "garlic", amountG: 2 },
    { condimentId: "water", amountG: 40 }
  ]
}
```

스케일링 공식:

```ts
scaledAmountG = templateAmountG * foodWeightG / template.baseWeightG
```

### 예시: 핫허니 양념치킨 스타일

300g 기준 원형:

```ts
const hotHoneyTemplate = {
  baseWeightG: 300,
  ingredients: [
    { condimentId: "gochujang", amountG: 20 },
    { condimentId: "ketchup", amountG: 20 },
    { condimentId: "soy_sauce", amountG: 8 },
    { condimentId: "honey", amountG: 25 },
    { condimentId: "vinegar", amountG: 5 },
    { condimentId: "garlic", amountG: 4 }
  ]
}
```

### 예시: 중식풍 볶음

300g 기준 원형:

```ts
const chineseStirFryTemplate = {
  baseWeightG: 300,
  ingredients: [
    { condimentId: "oyster_sauce", amountG: 15 },
    { condimentId: "soy_sauce", amountG: 8 },
    { condimentId: "sugar", amountG: 5 },
    { condimentId: "oil", amountG: 25 },
    { condimentId: "garlic", amountG: 4 },
    { condimentId: "ginger", amountG: 1 },
    { condimentId: "starch_water", amountG: 20 }
  ]
}
```

---

## 8. 단위 환산

앱은 g 단위와 함께 생활 계량을 제공한다.

기본 환산값:

```ts
const UNIT_CONVERSIONS = {
  teaspoon: {
    label: "작은술",
    ml: 5
  },
  tablespoon: {
    label: "큰술",
    ml: 15
  },
  pinch: {
    label: "한 꼬집",
    gramApprox: 0.3
  }
}
```

재료별 g/ml 밀도는 대략값으로 제공한다.

```ts
const DENSITIES = {
  water: 1.0,
  soy_sauce: 1.15,
  vinegar: 1.0,
  oil: 0.92,
  sesame_oil: 0.92,
  sugar: 0.85,
  salt: 1.2,
  gochujang: 1.2,
  ketchup: 1.1,
  mayo: 0.95,
  honey: 1.4,
  butter: 0.96
}
```

환산 공식:

```ts
ml = grams / density
teaspoon = ml / 5
tablespoon = ml / 15
```

UI 표기 예:

- 간장 18g ≈ 1큰술
- 설탕 8g ≈ 2작은술
- 식초 5g ≈ 1작은술

주의 문구:

> 숟가락 환산은 대략값입니다. 정확한 맛을 원하면 저울을 사용하세요.

---

## 9. 화면 설계

## 9.1 화면 목록

1. HomePage
2. CalculatePage
3. CategoryStep
4. WeightStep
5. StyleStep
6. CondimentStep
7. ResultPage
8. FixTastePage
9. SavedRecipesPage
10. RecipeDetailPage
11. SettingsPage

---

## 9.2 HomePage

### Components

- Header
- HeroCard
- QuickStartButton
- TastePresetCards
- RecentRecipesList
- BottomNavigation

### CTA

- “맛 계산하기”
- “망한 음식 살리기”

---

## 9.3 CalculatePage

### State

```ts
type CalculationState = {
  categoryId: string | null
  foodWeightG: number | null
  stylePresetId: string | null
  selectedCondimentIds: string[]
  intensity: "mild" | "normal" | "strong"
}
```

### Validation

- foodWeightG는 1 이상이어야 함
- 2000g 이상 입력 시 “대량 조리입니다. 간은 80%만 먼저 넣고 맛보며 추가하세요.” 안내
- 스타일 미선택 시 basic_home 기본 적용

---

## 9.4 ResultPage

### 보여줄 내용

1. 결과 요약
   - “300g 볶음 / 아이용 달달짭짤 기준”
2. 추천 조미료 표
   - 재료명
   - g
   - 숟가락 환산
   - 넣는 타이밍
3. 맛 프로필
   - 짠맛: 0~5
   - 단맛: 0~5
   - 신맛: 0~5
   - 기름감: 0~5
   - 감칠맛: 0~5
   - 매운맛: 0~5
4. 조리 순서
5. 보정 CTA
6. 저장 CTA

### 예시 결과 문구

> 300g 기준, 아이들이 먹기 좋은 달달짭짤 배합이에요. 간장은 한 번에 다 넣지 말고 80%만 먼저 넣은 뒤 마지막에 조절하세요.

---

## 9.5 FixTastePage

### 사용 흐름

1. 음식 무게 입력
2. 문제 상태 선택
3. 앱이 추가 조미료 제안
4. “한 번에 다 넣지 말고 절반부터” 안내

### 예시 결과

상태: 밍밍해요
음식 무게: 300g

추천:

- 간장 3~5g 추가
- 또는 소금 0.5g 추가
- 깊이가 없으면 굴소스 2g 또는 액젓 1g 추가

설명:

> 밍밍한 건 대부분 염도나 감칠맛이 부족한 상태예요. 먼저 간장을 아주 조금 넣고 섞은 뒤 다시 맛보세요.

---

## 10. 데이터 모델

## 10.1 TypeScript 타입

```ts
export type TasteAxis = {
  saltiness: number
  sweetness: number
  acidity: number
  fatness: number
  umami: number
  spice: number
  aroma: number
}

export type PercentRange = [number, number]

export type DishCategoryProfile = {
  id: string
  name: string
  description?: string
  saltPct: PercentRange
  sweetPct: PercentRange
  acidPct: PercentRange
  fatPct: PercentRange
  umami: number
}

export type Condiment = {
  id: string
  name: string
  saltEqPerG: number
  sweetEqPerG: number
  acidEqPerG: number
  fatEqPerG: number
  umamiLevel: number
  spiceLevel?: number
  aromaLevel?: number
  density?: number
  defaultUnit: "g" | "ml"
}

export type TasteStylePreset = {
  id: string
  name: string
  description: string
  targetOverride?: Partial<{
    saltPct: PercentRange
    sweetPct: PercentRange
    acidPct: PercentRange
    fatPct: PercentRange
    umami: number
  }>
  saltMultiplier?: number
  sweetMultiplier?: number
  acidMultiplier?: number
  fatMultiplier?: number
  umamiBoost?: number
  spiceLevel?: number
  recommendedCondiments: string[]
}

export type RecipeTemplateIngredient = {
  condimentId: string
  amountG: number
  timing?: "early" | "middle" | "finish"
  note?: string
}

export type RecipeTemplate = {
  id: string
  name: string
  stylePresetId: string
  categoryIds: string[]
  baseWeightG: number
  ingredients: RecipeTemplateIngredient[]
  steps: string[]
}

export type CalculationResultIngredient = {
  condimentId: string
  name: string
  amountG: number
  tablespoonApprox?: number
  teaspoonApprox?: number
  timing?: string
  note?: string
}

export type CalculationResult = {
  foodWeightG: number
  categoryId: string
  stylePresetId: string
  ingredients: CalculationResultIngredient[]
  tasteAxis: TasteAxis
  warnings: string[]
  steps: string[]
}

export type SavedRecipe = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  categoryId: string
  stylePresetId: string
  foodWeightG: number
  ingredients: CalculationResultIngredient[]
  memo?: string
  rating?: 1 | 2 | 3 | 4 | 5
}
```

---

## 11. 계산 로직 상세

## 11.1 기본 계산 우선순위

1. 선택한 스타일에 전용 템플릿이 있으면 템플릿 기반 계산 사용
2. 템플릿이 없으면 카테고리 목표값 + 스타일 modifier 사용
3. 사용자가 조미료를 선택했으면 선택 조미료 안에서 추천
4. 선택 조미료가 부족하면 대체 조미료 제안

---

## 11.2 템플릿 기반 계산

```ts
function scaleTemplate(template, foodWeightG) {
  const ratio = foodWeightG / template.baseWeightG
  return template.ingredients.map(item => ({
    ...item,
    amountG: roundToOneDecimal(item.amountG * ratio)
  }))
}
```

---

## 11.3 목표값 기반 계산

```ts
function getMidpoint(range: [number, number]) {
  return (range[0] + range[1]) / 2
}

function calculateTargets(foodWeightG, categoryProfile, stylePreset) {
  const profile = {
    ...categoryProfile,
    ...stylePreset.targetOverride
  }

  return {
    saltEqG: foodWeightG * getMidpoint(profile.saltPct) / 100,
    sweetEqG: foodWeightG * getMidpoint(profile.sweetPct) / 100,
    acidEqG: foodWeightG * getMidpoint(profile.acidPct) / 100,
    fatEqG: foodWeightG * getMidpoint(profile.fatPct) / 100,
    umami: profile.umami
  }
}
```

---

## 11.4 강도 조절

사용자가 맛 강도를 선택할 수 있다.

- 순한맛: 0.85배
- 기본맛: 1.0배
- 진한맛: 1.15배

단, 산미와 매운맛은 강도 증가 시 1.1배까지만 적용한다.

```ts
const INTENSITY_MULTIPLIER = {
  mild: 0.85,
  normal: 1.0,
  strong: 1.15
}
```

---

## 11.5 안전 보정

초보자용 안전 장치:

- 소금/간장/액젓은 계산량의 80%만 먼저 넣으라고 안내
- 식초/레몬즙은 절반만 먼저 넣으라고 안내
- 매운 재료는 항상 “조금씩 추가” 문구 표시
- 5세 이하 아이용/저염 모드에서는 염도 상한을 0.8%로 제한하는 옵션 제공

---

## 12. 프리셋별 UX 문구

### 아이용 달달짭짤

> 아이들이 좋아하는 둥근 맛이에요. 신맛과 매운맛은 낮추고, 단맛과 고소함으로 맛을 부드럽게 만들어요.

### 요즘 로제/크리미 매콤

> 크리미함에 매콤달콤함을 얹은 요즘식 맛이에요. 우유, 치즈, 고추장, 케첩 조합이 잘 맞아요.

### 핫허니/양념치킨

> 달콤함이 먼저 오고 뒤에 매콤함이 오는 분식/치킨집 스타일이에요.

### 칠리크리스프

> 매운맛보다 바삭한 기름향이 핵심이에요. 튀긴 마늘, 양파, 깨를 더하면 완성도가 올라가요.

### 백종원식 대중 한식

> 단짠, 마늘, 파기름으로 밥이랑 잘 맞는 진한 한식 스타일이에요.

### 이연복식 중식풍

> 기름에 파·마늘·생강 향을 먼저 뽑고, 굴소스와 전분으로 윤기를 만드는 스타일이에요.

### 고든 램지식 서양식

> 소금 간을 정확히 하고, 버터와 허브로 풍미를 올린 뒤 산미로 마무리하는 스타일이에요.

---

## 13. 저장 기능

### 요구사항

- 사용자는 계산 결과를 저장할 수 있다.
- 저장 시 이름을 입력한다.
- 저장 항목은 localStorage에 보관한다.
- 저장한 레시피는 목록에서 다시 볼 수 있다.
- 사용자는 별점과 메모를 남길 수 있다.

### localStorage key

```ts
const STORAGE_KEY = "electronic_tongue_saved_recipes"
```

---

## 14. 설정 기능

MVP 설정 항목:

1. 기본 계량 단위
   - g 우선
   - 숟가락 우선
2. 기본 맛 강도
   - 순한맛
   - 기본맛
   - 진한맛
3. 아이용 안전 모드
   - 켜기/끄기
4. 저염 모드
   - 켜기/끄기
5. 자주 쓰는 조미료 편집

---

## 15. 디자인 방향

### 톤앤매너

- 귀엽지만 유치하지 않게
- 요리 초보를 혼내지 않는 친절한 톤
- “망했어요” 같은 감정적 입력을 허용
- 결과는 실험실 수치처럼 명확하게

### 추천 비주얼

- 맛 축을 막대 그래프로 표시
- 프리셋 카드는 칩 형태
- 결과표는 모바일에서 읽기 쉬운 카드형
- 조미료량은 가장 크게 표시

### 컬러 제안

- 메인: 따뜻한 오렌지/코랄 계열
- 서브: 크림/아이보리
- 강조: 고추장 레드, 간장 브라운, 레몬 옐로우
- 경고: 과다 염도/산미는 붉은 배지

---

## 16. 접근성

- 모든 버튼은 최소 44px 높이
- 색상만으로 상태를 구분하지 않음
- 숫자 입력은 모바일 숫자 키패드 사용
- 결과표는 스크린리더가 읽을 수 있는 semantic table 사용
- 단위 환산은 텍스트로도 제공

---

## 17. 에러/예외 처리

| 상황 | 처리 |
|---|---|
| 음식 무게 미입력 | “음식 무게를 입력해야 계산할 수 있어요.” |
| 0g 이하 입력 | “1g 이상 입력해 주세요.” |
| 2000g 이상 입력 | “대량 조리는 80%만 먼저 넣고 맛보며 조절하세요.” |
| 프리셋 없음 | 기본 집밥 프리셋 적용 |
| 조미료 정보 없음 | “이 조미료는 아직 계산 DB에 없어요.” |
| localStorage 오류 | 저장 실패 안내 후 다시 시도 버튼 |

---

## 18. MVP 성공 기준

### 기능 기준

- 사용자는 1분 안에 양념 배합 결과를 얻을 수 있어야 함
- 최소 10개 이상의 스타일 프리셋 제공
- 최소 15개 이상의 조미료 DB 제공
- 결과가 g과 숟가락 단위로 모두 표시됨
- 맛 보정 기능이 최소 8개 상태를 지원함
- 저장/불러오기 가능

### 사용자 경험 기준

- 초보자가 “뭘 얼마나 넣어야 할지” 바로 이해해야 함
- 결과 화면에서 가장 중요한 양념량이 한눈에 보여야 함
- “한 번에 다 넣지 말고 80%부터” 안내가 반복적으로 노출되어야 함

---

## 19. 수동 테스트 시나리오

### Test 1. 아이용 닭고기볶음

입력:

- 카테고리: 아이 반찬
- 무게: 300g
- 스타일: 아이용 달달짭짤

기대:

- 간장 12~18g 범위
- 올리고당 6~12g 범위
- 버터/기름 8~15g 범위
- 산미 거의 없음
- 매운 재료 없음

### Test 2. 로제떡볶이

입력:

- 카테고리: 면/파스타 또는 볶음
- 무게: 500g
- 스타일: 요즘 로제/크리미 매콤

기대:

- 고추장/케첩/간장/설탕/우유/치즈/버터 조합 제안
- 지방감 높음
- 단맛 3~7% 수준

### Test 3. 망한 음식 보정 — 너무 짬

입력:

- 무게: 300g
- 상태: 짜기만 해요

기대:

- 물/무염 재료 추가 안내
- 설탕 소량, 기름 소량 추천
- “소금/간장 추가 금지” 안내

### Test 4. 중식풍 볶음

입력:

- 카테고리: 볶음
- 무게: 300g
- 스타일: 이연복식 중식풍

기대:

- 굴소스, 간장, 설탕, 기름, 전분물, 마늘/생강 조합
- 기름 8~15% 수준
- 전분물 사용 타이밍 표시

### Test 5. 서양식 구이

입력:

- 카테고리: 구이
- 무게: 300g
- 스타일: 고든 램지식 서양식

기대:

- 소금, 버터, 올리브오일, 마늘, 레몬즙, 후추/허브 조합
- 단맛 거의 없음
- 마지막 산미 마무리 안내

---

## 20. 개발 작업 분해

### Phase 1. 프로젝트 세팅

- React + TypeScript 프로젝트 생성
- 모바일 우선 CSS 구성
- 기본 라우팅 구성
- 데이터 파일 생성
  - condiments.ts
  - dishCategories.ts
  - tastePresets.ts
  - recipeTemplates.ts
  - adjustmentRules.ts

### Phase 2. 계산 엔진

- scaleTemplate 구현
- calculateTargets 구현
- unit conversion 구현
- tasteAxis 계산 구현
- warning generator 구현

### Phase 3. UI 구현

- HomePage
- CalculatePage
- ResultPage
- FixTastePage
- SavedRecipesPage
- SettingsPage

### Phase 4. 저장 기능

- localStorage 저장/삭제/수정
- 별점/메모 기능

### Phase 5. QA

- 테스트 시나리오 검증
- 모바일 화면 확인
- 빈값/오류 처리
- 단위 환산 검증

---

## 21. 권장 폴더 구조

```txt
electronic-tongue/
  src/
    app/
      App.tsx
      routes.tsx
    components/
      Header.tsx
      BottomNav.tsx
      PresetCard.tsx
      NumberInput.tsx
      IngredientResultCard.tsx
      TasteBarChart.tsx
      WarningBox.tsx
    data/
      condiments.ts
      dishCategories.ts
      tastePresets.ts
      recipeTemplates.ts
      adjustmentRules.ts
    features/
      calculator/
        CalculatePage.tsx
        ResultPage.tsx
        calculatorEngine.ts
        unitConversion.ts
        types.ts
      fixer/
        FixTastePage.tsx
        fixTasteEngine.ts
      recipes/
        SavedRecipesPage.tsx
        RecipeDetailPage.tsx
        recipeStorage.ts
      settings/
        SettingsPage.tsx
        settingsStorage.ts
    styles/
      globals.css
    utils/
      number.ts
      storage.ts
  package.json
  README.md
```

---

## 22. Codex 구현 지시문

아래 지시문을 Codex에 그대로 넣으면 된다.

```txt
Build a mobile-first React + TypeScript PWA called “전자혀” based on the attached PRD.

Core requirements:
1. Implement a taste seasoning calculator for cooking beginners.
2. The user selects a dish category, enters food weight in grams, selects a taste style preset, and gets ingredient amounts in grams and spoon approximations.
3. Implement the data models, preset data, calculation engine, unit conversion, result screen, taste-fix screen, saved recipe list using localStorage, and settings screen.
4. Use clean component structure and TypeScript types.
5. Do not require backend, login, or external API.
6. Make the UI mobile-first, friendly, clear, and Korean-language.
7. Include sample data for condiments, dish categories, taste presets, recipe templates, and adjustment rules.
8. Include manual test cases from the PRD in the README.
9. Ensure that salt/soy sauce/acid/spice recommendations include safety copy: “처음에는 80%만 넣고 맛보며 조절하세요.”

Please generate the full working app with all files needed to run locally.
```

---

## 23. README에 포함할 실행 안내

```md
# 전자혀

요리 초보를 위한 맛 튜닝 계산기입니다.

## 실행

```bash
npm install
npm run dev
```

## 주요 기능

- 음식 무게 기반 양념 계산
- 아이용/요즘식/셰프식 맛 프리셋
- g 및 숟가락 환산
- 망한 음식 맛 보정
- 레시피 저장

## 주의

계산값은 제품별 조미료 농도 차이와 개인 취향에 따라 달라질 수 있습니다. 짠맛, 신맛, 매운맛은 처음에 80%만 넣고 맛보며 조절하세요.
```

---

## 24. 향후 확장 아이디어

1. 사진으로 음식량 추정
2. 음성 입력: “닭고기 300g 볶을 건데 아이용으로 알려줘”
3. AI 레시피 생성
4. 실제 제품 라벨 기반 조미료 DB 커스터마이징
5. 사용자별 맛 선호 학습
6. 아이별 선호 프로필
7. 장보기 리스트 자동 생성
8. 냉장고 재료 기반 추천
9. 영양성분/나트륨 계산
10. 실제 전자혀 센서 또는 염도계 연동
11. 레시피 공유 기능
12. 요리 실패 기록 분석

---

## 25. 핵심 한 줄

**전자혀는 요리를 감이 아니라 계산과 튜닝으로 바꾸는 앱이다.**

요리 초보가 실패하는 지점을 “맛의 좌표”로 번역하고, 음식 무게와 목적에 맞춰 조미료 배합을 g 단위로 제안한다.

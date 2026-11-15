# GULZA — 무료 모션 자막 제작기

GULZA는 한국어 ‘글자’를 영문으로 짧게 쓴 이름입니다. SRT 자막이나 LRC 가사를 불러와 브라우저에서 모션 자막 영상을 만들고 MP4로 내보내는 무료 도구입니다. 원본 JIZURA의 모션 그래픽 엔진을 바탕으로 SRT 자막 작업 흐름을 더했습니다.

**[GULZA 웹사이트](https://ruruoni1.github.io/gulza/)** · [GULZA 저장소](https://github.com/ruruoni1/gulza) · [원본 JIZURA](https://github.com/852wa/JIZURA)

다른 언어 안내: [日本語](README.ja.md) · [English](README.en.md) · [繁體中文](README.zh-Hant.md) · [简体中文](README.zh-Hans.md) · [Bahasa Indonesia](README.id.md) · [Tiếng Việt](README.vi.md)

기본 화면은 한국어입니다. 사이트 위쪽의 **화면 언어** 메뉴에서 다른 언어로 바꿀 수 있습니다.

<details>
<summary><h2>빠른 시작</h2></summary>

1. **SRT/LRC 불러오기**로 자막 파일을 가져오거나, 가사 입력란에 한 줄씩 직접 입력합니다.
2. 필요하면 음원을 불러옵니다. GULZA가 박자를 감지해 컷을 맞출 수 있으며, **탭으로 동기화**에서 각 줄이 시작될 때 Space를 눌러 직접 타이밍을 지정할 수도 있습니다.
3. **자동으로 만들기**(또는 R)를 눌러 스타일, 분위기, 움직임, 배색, 구성을 랜덤으로 만듭니다. **이전 / 다음**으로 버전을 오가거나 **이 부분만 변경**으로 일부만 다시 만들 수 있습니다.
4. 화면비, 해상도, 프레임레이트를 선택하고 MP4로 내보냅니다. 고급 모드에서는 PNG 시퀀스, 투명 PNG, 합성용 배경, 개별 기법 설정도 사용할 수 있습니다.

<details>
<summary><h3>한글 가사</h3></summary>

가사 입력란 아래의 **가사 언어**는 기본값이 **자동 감지**입니다. 한글이 포함된 가사는 자동으로 한국어로 감지되며, 각 스타일의 일본어 글꼴은 비슷한 인상의 한국어 글꼴로 바뀝니다.

예를 들어 Noto Sans JP 계열은 Noto Sans KR, Noto Serif JP 계열은 Noto Serif KR로 대응하고, Dela Gothic One은 Black Han Sans, 둥근 글꼴은 Jua, 손글씨 계열은 Gowun Batang 또는 Nanum Brush Script 등으로 대응합니다. 필요한 글꼴은 Google Fonts에서 현재 구성에 필요한 것만 불러옵니다.

가사 표기법:

- 새벽의 색을/기억하고 있어 — / 위치에서 컷 분할
- *투명* — 강조
- 줄 끝의 ! — 플래시와 흔들림
- 가사|메모 — 주석용 작은 글자
- [01:23.45]가사 — LRC 타임스탬프
- # 주석 — 무시되는 줄

</details>

<details>
<summary><h2>SRT 자막 불러오기</h2></summary>

1. SRT를 LRC로 변환하지 말고 **SRT/LRC 불러오기**에서 `.srt` 파일을 바로 선택합니다.
2. SRT의 각 자막 문장은 `[SRT:시작-->종료]` 표식과 함께 편집란에 들어옵니다. 이 표식은 시작·종료 시각과 자막 사이의 공백을 보존합니다.
3. 기존 **LRC 내보내기**를 누르면 시작 시각을 담은 `.lrc` 파일로 변환해 저장할 수 있습니다. LRC 형식에는 종료 시각이 없으므로 SRT 시간 구간을 모두 보존하려면 프로젝트에서 SRT 자막을 직접 사용하세요.

UTF-8, UTF-16, 한국어 Windows 인코딩 파일을 지원합니다. 파일 크기는 2 MB까지이며, 자막과 음원은 브라우저 안에서 처리합니다.

</details>

</details>

<details>
<summary><h2>개인정보와 출력물</h2></summary>

자막과 음원은 브라우저 안에서 처리되며 서버로 전송되지 않습니다. 필요한 Google Fonts만 외부에서 불러옵니다.

이 도구로 만든 동영상과 이미지의 권리는 제작자에게 있으며, 사용한 자막·가사와 음원의 권리는 각각의 권리자에게 있습니다. GULZA는 MIT License인 JIZURA를 바탕으로 수정한 프로젝트입니다. 원본 저작권 고지와 서드파티 고지를 유지합니다. 자세한 내용은 [LICENSE](LICENSE)와 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인해 주세요.

</details>

<details>
<summary><h2>빌드</h2></summary>

저장소 루트에서 `python3 build.py`를 실행합니다.

한국어 기본 화면인 `index.html`, 여섯 개 언어 폴더의 HTML, 검색 엔진용 `sitemap.xml`이 생성됩니다.

After Effects 패널은 `python3 build_ae.py`와 `python3 build_cep.py`로 빌드합니다. 배포 파일은 [GULZA_AE.jsx](GULZA_AE.jsx)와 [GULZA_CEP.zip](GULZA_CEP.zip)입니다. 프로젝트 JSON 형식은 기존과 같습니다.

</details>

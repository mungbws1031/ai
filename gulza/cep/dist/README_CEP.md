# GULZA — After Effects CEP 패널

브라우저판 GULZA의 편집 화면을 After Effects 안에서 사용하는 패널입니다. 현재 구성을 AE 컴포지션으로 만들 수 있습니다.

- 권장 환경: After Effects 2022(22.0) 이상, Windows 또는 macOS
- 패널 ID: `com.ruruoni1.gulza`
- 패널 메뉴: **창 → 확장 기능 → GULZA**

## 설치

1. ZIP 압축을 풀고 `GULZA_CEP` 폴더 안에서 운영체제에 맞는 설치 파일을 실행합니다.
   - Windows: `install_win.bat`
   - macOS: `install_mac.command`
2. After Effects를 완전히 종료하고 다시 엽니다.
3. **창 → 확장 기능 → GULZA**에서 패널을 엽니다.

설치 파일은 `com.ruruoni1.gulza`를 사용자 CEP 확장 폴더에 복사하고 Adobe의 서명되지 않은 CEP 패널 실행 설정(PlayerDebugMode)을 켭니다. 원본 JIZURA 패널의 별도 ID는 건드리지 않습니다.

| 운영체제 | 확장 폴더 |
|---|---|
| Windows | `%APPDATA%\Adobe\CEP\extensions\` |
| macOS | `~/Library/Application Support/Adobe/CEP/extensions/` |

## 사용

- 가사·SRT/LRC 파일, 스타일과 타이밍을 브라우저판처럼 편집합니다.
- **AE에서 컴포지션 만들기**를 누르면 현재 구성을 새 컴포지션으로 만듭니다.
- **AE에서 선택한 음원**은 선택한 오디오 레이어를 읽어 박자를 맞춥니다.
- **AE 마커를 줄 시작에 적용**은 선택한 레이어 또는 컴포지션의 마커를 줄 타이밍에 사용합니다.
- **가벼운 생성**은 일부 질감·입자 효과를 생략해 AE에서 재생할 때 부담을 줄입니다.
- **진단 보고서 저장**은 마지막으로 만든 컴포지션을 검사하고 `GULZA_report.txt`를 저장합니다.

CEP 패널은 ScriptUI 패널의 글꼴 설정을 함께 사용합니다. 브라우저와 동일한 서체가 필요하면 해당 글꼴을 PC에도 설치하세요.

## 배포용 ZXP 만들기

Adobe CEP용 `ZXPSignCmd`를 준비하고 `sign_zxp_win.bat` 또는 `sign_zxp_mac.sh`를 실행합니다. 서명 암호는 `GULZA_CERT_PASS` 환경 변수로 지정하며, 결과물은 `GULZA.zxp`입니다. 이 절차는 패널 ZIP을 단순히 설치할 때는 필요하지 않습니다.

## 문제가 있을 때

- 메뉴에 보이지 않으면 AE를 완전히 종료하고 다시 시작한 뒤 설치 경로와 PlayerDebugMode를 확인하세요.
- 연결에 실패하면 `com.ruruoni1.gulza/jsx/` 안에 `host.jsx`와 `gulza_core.jsx`가 있는지 확인하세요.
- 컴포지션 내용이 다르면 진단 보고서를 저장해 오류와 대체 부품을 확인하세요.

GULZA는 MIT 라이선스의 [JIZURA](https://github.com/852wa/JIZURA)를 바탕으로 합니다. 라이선스와 외부 소프트웨어 고지는 ZIP 안의 `LICENSE`, `THIRD_PARTY_NOTICES.md`를 확인하세요.

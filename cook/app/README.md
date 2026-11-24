# 전자혀 안드로이드 앱 (Capacitor 셸)

이 폴더는 `cook/index.html`(웹/PWA 원본)을 **안드로이드 앱(AAB)** 으로 감싸는 프로젝트입니다.
웹 코드는 따로 복사해 두지 않습니다. 원본은 항상 `cook/index.html` 하나이고,
`npm run sync` 가 필요한 파일만 `www/` 로 복사해 안드로이드 프로젝트에 넣어 줍니다.

- 앱 ID: `com.jeonjahyeo.app` / 앱 이름: 전자혀 / 버전: 1.0.0 (versionCode 1)
- 플러그인: `@capacitor/share` (공유) 하나만 사용
- 안드로이드: minSdk 24, targetSdk/compileSdk 36 (`android/variables.gradle`)

## 폴더 구성

| 경로 | 설명 |
|---|---|
| `package.json` | 스크립트와 의존성 |
| `capacitor.config.json` | 앱 ID·이름·배경색(`#F4EEE3`) |
| `scripts/build-web.mjs` | `cook/` 의 웹 파일 6개를 `www/` 로 복사 |
| `scripts/icons.py` | `cook/icon-512.png` 로 런처 아이콘·스플래시 생성 |
| `android/` | Capacitor 가 만든 안드로이드 프로젝트 (커밋함) |
| `www/`, `node_modules/` | 자동 생성물 (커밋 안 함) |

## 처음 시작하기

Node.js 20 이상이 필요합니다.

```bash
cd cook/app
npm install        # 처음 한 번
npm run sync       # 웹 파일 복사 + 안드로이드 프로젝트에 반영
npx cap open android   # Android Studio 로 열기
```

Android Studio 에서 `Build > Generate Signed Bundle / APK` 로 AAB 를 만들 수 있습니다.
명령줄로는 (Android SDK 와 JDK 17 이상이 있을 때) `npm run android:bundle` 입니다.
결과물: `android/app/build/outputs/bundle/release/app-release.aab`

### `cook/index.html` 을 고쳤다면

반드시 **`npm run sync`** 를 다시 실행하세요. 안 하면 앱에는 옛날 화면이 들어갑니다.
(웹/PWA 쪽은 sync 없이 그대로 동작합니다.)

### 아이콘을 바꿨다면

`cook/icon-512.png` 를 교체한 뒤 `python3 scripts/icons.py` 를 실행하세요.

## 릴리스 서명 키 만들기

```bash
keytool -genkey -v -keystore jeonjahyeo-release.jks -alias jeonjahyeo -keyalg RSA -keysize 2048 -validity 10000
```

> **중요: 키스토어(`.jks`)와 비밀번호는 저장소 밖에 보관하고, 반드시 백업하세요.**
> 이 키를 잃어버리면 같은 앱을 **다시는 업데이트할 수 없습니다.**
> (Play App Signing 을 쓰면 복구 절차가 있지만 번거롭습니다.)
> `.gitignore` 가 `*.jks`, `*.keystore` 를 막아 두었지만, 애초에 이 폴더 안에 두지 않는 것이 안전합니다.

### 로컬에서 서명해서 빌드하기

`android/app/build.gradle` 은 아래 환경변수가 **있을 때만** 릴리스 빌드를 서명합니다.
없으면 서명 없이 빌드됩니다.

```bash
export CJ_KEYSTORE_PATH=/안전한/경로/jeonjahyeo-release.jks
export CJ_KEYSTORE_PASSWORD='키스토어 비밀번호'
export CJ_KEY_ALIAS=jeonjahyeo
export CJ_KEY_PASSWORD='키 비밀번호'
npm run android:bundle
```

### GitHub Actions 시크릿 (CI)

저장소 Settings > Secrets 에 아래 4개를 등록합니다.

| 시크릿 이름 | 내용 |
|---|---|
| `CJ_KEYSTORE_BASE64` | `base64 -w0 jeonjahyeo-release.jks` 결과 (워크플로가 파일로 풀어서 `CJ_KEYSTORE_PATH` 로 지정) |
| `CJ_KEYSTORE_PASSWORD` | 키스토어 비밀번호 |
| `CJ_KEY_ALIAS` | 키 별칭 (`jeonjahyeo`) |
| `CJ_KEY_PASSWORD` | 키 비밀번호 |

CI 에서는 `npm ci` 를 쓰므로 `package-lock.json` 도 커밋되어 있어야 합니다.

## 외부 링크는 앱 안에서 열리지 않습니다

`capacitor.config.json` 에 `server.allowNavigation` 을 **일부러 넣지 않았습니다.**
그래서 쇼핑몰 같은 외부 주소는 WebView 안에서 이동하지 않고 기본 브라우저/앱으로 열립니다
(`index.html` 이 `window.open(url, "_system")` 을 쓰는 이유). 이 설정을 추가하지 마세요.

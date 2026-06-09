# 옵시디언 + GitHub 자동화 스타터

옵시디언 vault를 GitHub에 두고 쓸 때 **가장 흔하면서 바로 쓸 수 있는 자동화 세트**입니다. 그대로 vault에 복사해 넣으면 작동합니다.

## 무엇이 들어 있나

| 파일 | 어디서 작동 | 역할 |
|---|---|---|
| `.gitignore` | 로컬 Git | 옵시디언 워크스페이스 상태·캐시·OS 부산물 제외 |
| `.github/workflows/daily-backup.yml` | GitHub 서버 | 매일 자정(UTC)에 `backup/YYYY-MM-DD` 태그 생성 → 시점 복원용 스냅샷 |
| `.github/workflows/markdown-check.yml` | GitHub 서버 | 푸시/PR 시 마크다운 링크·이미지 깨짐 검사 |
| `.github/markdown-link-check.json` | 위 워크플로우 설정 | `[[위키링크]]` 패턴 무시 등 옵시디언용 튜닝 |

## 설치 (한 번만)

1. **로컬에서:** vault 폴더에서 Git 초기화 후 GitHub 저장소 연결
   ```bash
   cd /path/to/your-vault
   git init
   git remote add origin git@github.com:<you>/<vault-repo>.git
   ```
2. **이 폴더의 내용을 vault 루트로 복사** (`.github/` · `.gitignore` 포함)
3. 첫 커밋 후 푸시
   ```bash
   git add . && git commit -m "init: vault + automation"
   git push -u origin main
   ```
4. **GitHub Settings → Actions → General → Workflow permissions** 에서 **"Read and write permissions"** 체크 → Save
   - 매일 백업 태그를 푸시하려면 이 권한이 필요합니다.

## 옵시디언 쪽 자동화 — Obsidian Git 플러그인

GitHub Actions만으로는 "내가 적는 즉시 자동 푸시"가 안 됩니다(서버는 옵시디언이 적는 걸 모르므로). 클라이언트 자동화는 **Obsidian Git 커뮤니티 플러그인**이 담당합니다.

**설치:** Settings → Community plugins → Browse → "Obsidian Git" 설치·활성화

**권장 설정**

| 항목 | 권장값 |
|---|---|
| Vault backup interval (minutes) | `5` |
| Auto pull interval (minutes) | `10` |
| Auto push after commit | `on` |
| Commit message | `vault backup: {{date}}` |
| Date placeholder format | `YYYY-MM-DD HH:mm` |
| Pull updates on startup | `on` |

→ 옵시디언이 켜져 있는 동안 5분마다 자동으로 commit + push.
→ 다른 기기에서 열 때는 자동 pull로 최신 상태부터 시작.

**모바일(iOS/Android):** 옵시디언 모바일 + Obsidian Git이 동일하게 동작합니다(초회 동기화는 시간이 좀 걸림).

## 자동화 동작 흐름

```
[옵시디언에서 메모 작성]
   ↓  Obsidian Git 플러그인 (5분 주기 commit + push)
[GitHub 저장소 갱신]
   ↓  Actions 트리거
   ├─ markdown-check.yml  →  깨진 링크 알림 (PR/푸시 시)
   └─ daily-backup.yml    →  매일 00:00 UTC에 backup/날짜 태그
```

## 시점 복원 방법

매일 백업 태그가 쌓이므로 어느 날짜로든 잠시 되돌아갈 수 있습니다.

```bash
git tag --list 'backup/*'           # 백업 태그 목록
git checkout backup/2026-06-05      # 그날 상태로 이동 (read-only)
git checkout main                   # 다시 최신으로
```

특정 파일만 그날 버전으로 복원:
```bash
git checkout backup/2026-06-05 -- path/to/note.md
```

## 확장 아이디어 (선택)

- **디지털 가든 자동 배포:** Quartz·Hugo·Jekyll + Pages 워크플로우 추가
- **주간 통계 리포트:** 노트 수·태그·백링크를 매주 일요일 Issue로 자동 등록
- **변경 알림:** 새 노트 푸시 시 Slack/Discord 웹훅
- **태그·메타데이터 lint:** YAML frontmatter 규칙 검사

원하시면 위 확장도 같은 방식으로 추가할 수 있습니다.

## 트러블슈팅 한 줄

- **백업 태그가 안 생김:** Workflow permissions 가 "Read and write"인지, 저장소가 활성 상태(60일 비활성 시 schedule 일시정지)인지 확인.
- **링크 검사가 위키링크에 실패:** `.github/markdown-link-check.json` 의 `ignorePatterns` 가 `[[` 로 시작하는 패턴을 제외하도록 설정돼 있음(이미 포함).
- **모바일에서 충돌:** 동기화 전 다른 기기에서 push 완료됐는지 확인. Obsidian Git 의 "Pull on startup" 켜두면 거의 사라짐.

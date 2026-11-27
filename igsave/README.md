# igsave (짤저장)

폰에서 인스타그램(사진·릴스·영상)과 스레드(짤) **공개 게시물** 링크를 붙여넣어 저장하는 PWA. 개인 소장용입니다. 저작권은 원작자에게 있으니 재배포하지 마세요.

## 쓰는 법
1. 배포(또는 로컬 서버) 주소를 폰 브라우저로 열고 **홈 화면에 추가**합니다.
2. 링크를 붙여넣고 **가져오기** → 미리보기에서 **저장** 또는 **전체 저장**.
3. 홈 화면에 추가한 뒤에는 인스타/스레드의 **공유 → 짤저장**으로 바로 보낼 수 있어요(안드로이드 Chrome 기준. iOS는 공유 대상 등록을 지원하지 않아 붙여넣기로 쓰세요).

## 구조
- `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`: 폰용 PWA
- `api/resolve.py`: 링크 → 미디어 목록 (gallery-dl, 실패 시 yt-dlp)
- `api/download.py`: 인스타/페이스북 CDN 파일만 받아 첨부파일로 내려줌
- `api/core.py`, `validate.py`, `resolver.py`: 공통 로직(도메인 허용 목록 등)
- `server.py`: 집 PC/서버용 로컬 서버(같은 API + 정적 파일)

## 실행
```bash
pip install -r requirements.txt pytest
python -m pytest tests -v        # 테스트
python server.py 8000            # 로컬 서버
```

## 배포 방식과 한계
- **Vercel**: `igsave/`를 프로젝트 루트로 배포. 단 **서버리스 응답이 약 4.5MB로 제한**돼서 큰 영상 저장은 실패할 수 있어요. 사진은 대부분 문제없습니다.
- **집 PC/서버**: `python server.py`로 돌리면 용량 제한이 없고, 클라우드보다 인스타 차단도 덜 받아요. 밖에서 쓰려면 Tailscale/Cloudflare Tunnel 등으로 연결하세요.
- 인스타그램은 클라우드 서버 IP를 자주 막습니다. 화면에 "인스타가 서버 접근을 막았어요"가 뜨면 그 경우입니다.
- 비공개 계정, 로그인이 필요한 게시물, 스토리는 지원하지 않아요.

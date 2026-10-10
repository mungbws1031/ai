# AI 오피스 (office/)

도트 이미지 사무실에서 총괄(GM)에게 업무를 지시하면, GM이 키워드로 필요한 팀을 고르고
직원을 투입합니다. 서버와 API 키가 있으면 각 팀이 **실제 Claude 호출**로 검토하고,
GM이 팀별 결과를 종합합니다.

## 실행

```bash
pip install anthropic
export ANTHROPIC_API_KEY=sk-ant-...
python office/server.py        # http://127.0.0.1:8765
```

- API 키는 서버에만 있고 브라우저로 전달되지 않습니다. 서버는 기본적으로 `127.0.0.1`에만 바인딩됩니다.
- 키가 없거나 `index.html`을 파일로 직접 열면 시뮬레이션 모드(화면 연출만, AI 호출 없음)로 동작합니다.
- 환경변수: `OFFICE_MODEL`(기본 `claude-opus-5-5`), `OFFICE_EFFORT`(기본 `medium`), `OFFICE_HOST`, `OFFICE_PORT`.
  비용을 줄이려면 `OFFICE_MODEL=claude-sonnet-5-5`.

## 동작

- 팀 7개 기본 제공(기획·디자인·기구·전자·인허가QA·리서치·문서), 최대 8팀까지 추가 가능
- 팀마다 Claude 호출 1회(직원 1~3명은 화면 연출), 2팀 이상이면 GM 종합 호출 1회 추가
- 팀 역할 프롬프트는 `my-office-ai-town` 스킬의 회사/프로젝트 페르소나와 규칙을 따름
- 규제 관련 내용은 "검증 필요"로 표시하도록 지시되어 있으나, 최종 확인은 사람이 해야 함

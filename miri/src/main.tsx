import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// PWA 자동 갱신: 새 배포가 뜨면 백그라운드로 받아 즉시 적용·새로고침한다.
// (서비스워커가 옛 버전을 계속 보여주는 stale-cache 문제 방지)
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    // 앱이 떠 있는 동안 1분마다 업데이트 확인 → 최신 화면을 빠르게 반영
    if (registration) {
      setInterval(() => {
        void registration.update();
      }, 60_000);
    }
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

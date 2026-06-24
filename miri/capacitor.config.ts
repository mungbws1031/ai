import type { CapacitorConfig } from '@capacitor/cli';

// 미리 네이티브 앱 패키징 설정 (Android / iOS).
// 웹 빌드(dist)를 네이티브 셸에 담아 앱스토어 배포 가능한 앱으로 만든다.
const config: CapacitorConfig = {
  appId: 'com.miri.app',
  appName: '미리',
  webDir: 'dist',
  backgroundColor: '#FBF8F4',
  plugins: {
    LocalNotifications: {
      // 리마인더 알림 (앱이 닫혀 있어도 OS가 발송) — FR-A07.
      // smallIcon은 지정하지 않아 앱 기본 아이콘을 쓴다 (별도 drawable 리소스 불필요).
      iconColor: '#C8453B',
    },
  },
};

export default config;

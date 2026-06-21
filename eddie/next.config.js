/** @type {import('next').NextConfig} */

// GitHub Pages 배포 시(GITHUB_PAGES=true)에만 정적 export + 하위 경로(/ai/eddie) 적용.
// 로컬 dev/build는 영향 없이 루트(/)로 동작한다.
const isPages = process.env.GITHUB_PAGES === 'true';
const basePath = '/ai/eddie';

const nextConfig = {
  reactStrictMode: true,
  // 클라이언트에서 SW 등록·manifest 경로에 사용할 베이스 경로 노출.
  env: { NEXT_PUBLIC_BASE_PATH: isPages ? basePath : '' },
  ...(isPages
    ? {
        output: 'export',
        basePath,
        assetPrefix: `${basePath}/`,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

module.exports = nextConfig;

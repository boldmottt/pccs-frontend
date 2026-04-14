import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',

  // 각 테스트에 30 초 타임아웃
  timeout: 30 * 1000,

  // 각 테스트 시트 (시나리오) 에 10 초 타임아웃
  expectTimeout: 10 * 1000,

  // 병렬 테스트 실행
  fullyParallel: true,

  // 파일 하나당 최대 1 개의 테스트
  forbidOnly: !!process.env.CI,

  // 재시도 (CI 환경에서는 2 회)
  retries: process.env.CI ? 2 : 0,

  // 로컬 개발 환경에서는 80% 동시 실행
  workers: process.env.CI ? 1 : undefined,

  // 보고서 생성기
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // CI 환경에서는 브라우저 콘솔 로그를 생성
  use: {
    // 기본 브라우저 시냅스
    trace: 'on-first-retry',

    // 스크린샷
    screenshot: 'only-on-failure',

    // 비디오 (실패한 경우)
    video: 'retain-on-failure',

    // API URL
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },

  projects: [
    // Desktop Chrome
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Desktop Firefox
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // Desktop WebKit
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    // Mobile Safari
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // CI/CD 환경 변수 설정
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
});

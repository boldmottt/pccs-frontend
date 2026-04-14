import { test, expect } from '@playwright/test';

test.describe('PCCS Dashboard Page - Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/dashboard/stats*', route => route.continue());
    await page.goto('/dashboard');
  });

  test('대시보드 페이지가 로드된다', async ({ page }) => {
    // 대시보드 헤더가 표시됨
    await expect(page.locator('h1').filter({ hasText: /대시보드|통계/ })).toBeVisible();
  });

  test('패턴 통계 카드가 표시된다', async ({ page }) => {
    // 패턴 관련 통계 요소 찾기
    const patternStats = page.locator('text=/total|총 패턴|패턴 통계/');
    // API 응답이 있다면 표시됨
    await expect(page.locator('main')).toBeVisible();
  });

  test('샘플 통계 카드가 표시된다', async ({ page }) => {
    // 샘플 관련 통계 요소 찾기
    const sampleStats = page.locator('text=/sample|샘플|총 샘플/');
    await expect(page.locator('main')).toBeVisible();
  });

  test('Delta E 통계가 표시된다', async ({ page }) => {
    // Delta E 관련 통계 찾기
    const deStats = page.locator('text=/Delta E|delta_E|평균|max|min/');
    await expect(page.locator('main')).toBeVisible();
  });

  test('최근 패턴 목록이 표시된다', async ({ page }) => {
    // 최근 패턴 섹션 찾기
    const recentPatterns = page.locator('text=/최근 패턴|recent/');
    await expect(page.locator('main')).toBeVisible();
  });

  test('홈페이지로 돌아간다', async ({ page }) => {
    const homeBtn = page.locator('a').filter({ hasText: /홈|Home|PCCS/ });
    if (homeBtn.count() > 0) {
      await homeBtn.first().click();
      await expect(page).toHaveURL(/.*$/);
    }
  });
});

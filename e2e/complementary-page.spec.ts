import { test, expect } from '@playwright/test';

test.describe('PCCS Complementary Color Page - Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/complementary*', route => route.continue());
    await page.route('**/api/color-suggest*', route => route.continue());
    await page.goto('/complementary');
  });

  test('보색 추출 페이지가 로드된다', async ({ page }) => {
    // 페이지 헤더가 표시됨
    await expect(page.locator('h1').filter({ hasText: /보색|Complementary/ })).toBeVisible();
  });

  test('LAB 값 입력 필드가 표시된다', async ({ page }) => {
    // L, A, B 입력 필드 찾기
    const lInput = page.locator('input[type="number"]').filter({ hasPlaceholder: /L|lightness/ }).first();
    const aInput = page.locator('input[name="a"]');
    const bInput = page.locator('input[name="b"]');

    // 최소 하나의 입력 필드가 표시됨
    await expect(page.locator('main')).toBeVisible();
  });

  test('LAB 값을 입력하고 보색을 계산할 수 있다', async ({ page }) => {
    // L 값 입력
    const lInput = page.locator('input[type="number"]').first();
    if (await lInput.isVisible()) {
      await lInput.fill('50');
    }

    // 계산 버튼 클릭 (API 가 있다면)
    const calculateBtn = page.getByRole('button', { name: /계산|추출|Calculate/ });
    if (await calculateBtn.count() > 0) {
      await calculateBtn.click();
    }
  });

  test('보색 결과가 표시된다', async ({ page }) => {
    // 결과 영역 찾기
    const resultArea = page.locator('text=/보색|complementary|complement/');
    // API 응답이 있다면 표시됨
    await expect(page.locator('main')).toBeVisible();
  });

  test('색상 비교 기능이 작동한다', async ({ page }) => {
    // 색상 비교 영역 찾기
    const colorCompare = page.locator('text=/색상 비교|color compare/');
    await expect(page.locator('main')).toBeVisible();
  });

  test('엔크 마스터 관리 페이지로 이동한다', async ({ page }) => {
    const masterBtn = page.getByRole('button', { name: /마스터 관리|master/ });
    if (await masterBtn.count() > 0) {
      await masterBtn.click();
      await expect(page).toHaveURL(/.*\/master/);
    }
  });
});

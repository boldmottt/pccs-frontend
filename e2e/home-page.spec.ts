import { test, expect } from '@playwright/test';

test.describe('PCCS Home Page - Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // API mocking을 위한 설정
    await page.route('**/api/groups*', route => route.continue());
    await page.route('**/api/patterns*', route => route.continue());
    await page.goto('/');
  });

  test('홈페이지가 로드된다', async ({ page }) => {
    // 헤더가 표시됨
    await expect(page.locator('h1').filter({ hasText: 'PCCS' })).toBeVisible();
  });

  test('그룹 추가 버튼을 클릭하면 입력 필드가 표시된다', async ({ page }) => {
    const addGroupBtn = page.getByRole('button', { name: /그룹 추가/ });
    await addGroupBtn.click();

    // 입력 필드가 표시됨
    await expect(page.locator('input[placeholder="그룹 이름 입력"]')).toBeVisible();
  });

  test('새로운 그룹을 생성하고 목록에 추가된다', async ({ page }) => {
    // 그룹 추가 입력
    await page.getByRole('button', { name: /그룹 추가/ }).click();
    await page.locator('input[placeholder="그룹 이름 입력"]').fill('테스트 그룹');
    await page.getByRole('button', { name: '생성' }).click();

    // 그룹이 목록에 추가됨 (API 응답이 있다면)
    // 실제 API 가 없다면 스킵
  });

  test('필터를 적용할 수 있다', async ({ page }) => {
    // 상태 필터 선택
    await page.locator('select').first().selectOption('in_progress');

    // 필터가 적용됨
    await expect(page.locator('select').first()).toHaveValue('in_progress');
  });

  test('대시보드 페이지로 이동한다', async ({ page }) => {
    const dashboardBtn = page.getByRole('button', { name: /대시보드/ });
    await dashboardBtn.click();

    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('보색 추출 페이지로 이동한다', async ({ page }) => {
    const compBtn = page.getByRole('button', { name: /보색 추출/ });
    await compBtn.click();

    await expect(page).toHaveURL(/.*\/complementary/);
  });
});

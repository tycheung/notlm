import { expect, type Page } from '@playwright/test';

export async function loginAsUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/users/login') && res.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Sign in' }).click();
  const response = await loginResponse;
  expect(response.ok(), `Login failed: ${response.status()} ${await response.text()}`).toBeTruthy();

  await expect(page).toHaveURL(/\/(director|admin|dashboard)/, { timeout: 30000 });
}

export async function loginAsDirector(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await loginAsUser(page, email, password);
}

export async function loginAsAdmin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/users/login') && res.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Sign in' }).click();
  const response = await loginResponse;
  expect(response.ok(), `Login failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });
}

export async function loginAsBowler(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/users/login') && res.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Sign in' }).click();
  const response = await loginResponse;
  expect(response.ok(), `Login failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

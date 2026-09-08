import { expect, type Page } from '@playwright/test';

/** Collect unexpected runtime errors while a checklist smoke runs. */
export function attachPageErrorCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

export async function expectPageLoads(
  page: Page,
  path: string,
  options?: { heading?: string | RegExp; timeout?: number }
): Promise<void> {
  const errors = attachPageErrorCollector(page);
  await page.goto(path);
  await expect(page).not.toHaveURL(/\/login$/, { timeout: options?.timeout ?? 20000 });
  if (options?.heading) {
    await expect(page.getByRole('heading', { name: options.heading }).first()).toBeVisible({
      timeout: options?.timeout ?? 20000,
    });
  }
  expect(errors, `Runtime errors on ${path}: ${errors.join('; ')}`).toEqual([]);
}

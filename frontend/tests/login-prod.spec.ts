import { test, expect } from '@playwright/test';

test('login tecnocriollo on prod', async ({ page }) => {
  await page.goto('https://mylake.tecnocriollo.com/login');

  await page.fill('input#username', 'tecnocriollo');
  await page.fill('input#password', 'password');
  await page.click('button:has-text("Sign in")');

  await page.waitForFunction(() => localStorage.getItem('token') !== null, { timeout: 15000 });

  await expect(page.locator('nav, header, .layout, button:has-text("Logout")').first()).toBeVisible({ timeout: 10000 });

  console.log('Login OK. Token:', await page.evaluate(() => localStorage.getItem('token')));
});

import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Register a test user if not exists
  await page.goto('/login');
  
  // Try to register first
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="email"]', 'test@test.com');
  await page.fill('input[name="password"]', 'testpass123');
  await page.click('button:has-text("Register")');
  
  // Wait a bit for response
  await page.waitForTimeout(1000);
  
  // Login
  await page.goto('/login');
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'testpass123');
  await page.click('button:has-text("Login")');
  
  // Wait for redirect to workbench
  await page.waitForURL('/', { timeout: 10000 });
  
  // Save auth state
  await page.context().storageState({ path: authFile });
});
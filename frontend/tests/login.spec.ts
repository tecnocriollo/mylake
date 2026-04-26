import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button:has-text("Sign in")');
    
    // Esperar a que el token se guarde en localStorage (indica login exitoso)
    await page.waitForFunction(() => {
      return localStorage.getItem('token') !== null;
    }, { timeout: 10000 });
    
    // Ahora esperar a que el layout principal aparezca
    await expect(page.locator('nav, header, .layout, button:has-text("Logout")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input#username', 'wronguser');
    await page.fill('input#password', 'wrongpass');
    await page.click('button:has-text("Sign in")');
    
    // Esperar mensaje de error visible
    const errorMessage = page.locator('.bg-red-50, .text-red-700').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Verificar que seguimos en login
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  });
});